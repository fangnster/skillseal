import { randomUUID } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { Store } from './store.ts';
import {
  canonical,
  sha256,
  fromBase64,
  decrypt,
  sealKey,
  verifyWallet,
  versionMessage,
} from './crypto.ts';
import { parseBundle } from './bundle.ts';
import {
  DEVNET_USDC,
  type Manifest,
  type Version,
  type Order,
  type PaymentAdapter,
} from './types.ts';
import { MockPayment } from './mock-payment.ts';

export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const wallet = z.string().refine((s) => {
  try {
    return new PublicKey(s).toBase58() === s;
  } catch {
    return false;
  }
}, 'Invalid wallet');
const manifestSchema = z
  .object({
    skillId: z.string().regex(/^[a-z][a-z0-9-]{1,63}$/),
    name: z.string().min(1).max(100),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string().max(1000),
    price: z.string().regex(/^(0|[1-9][0-9]{0,11})$/),
    contentHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    mint: z.literal(DEVNET_USDC),
    splits: z
      .array(z.object({ wallet, bps: z.number().int().min(1).max(10000) }).strict())
      .min(1)
      .max(5),
    license: z.string().min(10).max(10000),
    bundleHash: z.string().regex(/^[a-f0-9]{64}$/),
    publisher: wallet,
    issuer: wallet,
  })
  .strict();
type Challenge = {
  id: string;
  wallet: string;
  action: string;
  resource: string;
  public_key: string | null;
  message: string;
  expires: number;
  consumed: number;
};

export class VaultService {
  store: Store;
  payments: PaymentAdapter;
  origin: string;
  options: {
    moderationRequired?: boolean;
    adminWallet?: string;
    publisherAllowlist?: string[];
    storageLimitBytes?: number;
  };
  constructor(
    store: Store,
    payments: PaymentAdapter,
    origin: string,
    options: VaultService['options'] = {},
  ) {
    this.options = options;
    this.store = store;
    this.payments = payments;
    this.origin = origin;
  }
  version(id: string) {
    const v = this.store.version(id);
    if (!v) throw new AppError(404, 'NOT_FOUND', 'Version not found');
    return v;
  }
  order(id: string) {
    const o = this.store.order(id);
    if (!o) throw new AppError(404, 'NOT_FOUND', 'Order not found');
    return o;
  }
  async publish(input: { manifest: Manifest; bundle: string; key: string; signature: string }) {
    const parsed = manifestSchema.safeParse(input.manifest);
    if (!parsed.success) throw new AppError(400, 'INVALID_MANIFEST', 'Manifest fields are invalid');
    const manifest = parsed.data;
    if (
      manifest.issuer !== this.payments.issuer ||
      !manifest.splits.some((s) => s.wallet === manifest.publisher) ||
      manifest.splits.reduce((n, s) => n + s.bps, 0) !== 10000 ||
      new Set(manifest.splits.map((s) => s.wallet)).size !== manifest.splits.length
    )
      throw new AppError(
        400,
        'INVALID_SPLITS',
        'Issuer, publisher or split configuration is invalid',
      );
    if (manifest.price === '0' && !manifest.contentHash)
      throw new AppError(400, 'CONTENT_HASH', 'Free releases require a signed content hash');
    if (
      manifest.price !== '0' &&
      this.payments.kind === 'solana' &&
      this.options.publisherAllowlist &&
      !this.options.publisherAllowlist.includes(manifest.publisher)
    )
      throw new AppError(
        403,
        'ONBOARDING',
        'Paid publishing requires creator onboarding; ask the operator to approve your wallet',
      );
    const id = sha256(canonical(manifest));
    if (!(await verifyWallet(versionMessage(id, this.origin), input.signature, manifest.publisher)))
      throw new AppError(
        401,
        'INVALID_SIGNATURE',
        'Publisher signature does not match this version',
      );
    if (this.store.version(id))
      throw new AppError(409, 'IMMUTABLE_VERSION', 'Version already exists');
    let bundle: Buffer, key: Buffer;
    try {
      bundle = fromBase64(input.bundle);
      key = fromBase64(input.key, 32);
      if (bundle.length > 16 * 1024 * 1024 || sha256(bundle) !== manifest.bundleHash)
        throw new Error();
      const plain = decrypt(bundle, key);
      try {
        parseBundle(plain);
        if (manifest.contentHash && sha256(plain) !== manifest.contentHash)
          throw new Error('Content hash mismatch');
      } finally {
        plain.fill(0);
      }
    } catch {
      throw new AppError(
        400,
        'INVALID_BUNDLE',
        'Encrypted package, key or file structure is invalid',
      );
    }
    if (
      this.store.storageBytes() + bundle.length >
      (this.options.storageLimitBytes ?? 256 * 1024 * 1024)
    ) {
      key.fill(0);
      throw new AppError(
        507,
        'STORAGE_LIMIT',
        'Catalog storage limit reached; contact the operator',
      );
    }
    const recent = this.store
      .versions()
      .filter(
        (v) => v.manifest.publisher === manifest.publisher && v.createdAt > Date.now() - 86400000,
      );
    if (recent.length >= 10) {
      key.fill(0);
      throw new AppError(429, 'PUBLISH_QUOTA', 'Creator release limit reached; retry tomorrow');
    }
    const version: Version = {
      id,
      manifest,
      approvals: [],
      active: false,
      createdAt: Date.now(),
      reviewStatus: this.options.moderationRequired ? 'pending' : 'approved',
    };
    try {
      this.store.insertVersion(version, bundle, key);
    } catch {
      throw new AppError(
        409,
        'IMMUTABLE_VERSION',
        'Publisher already registered this skill version',
      );
    } finally {
      key.fill(0);
    }
    if (manifest.price !== '0' && version.reviewStatus === 'approved')
      await this.payments.register(version);
    this.store.event('version_published', id);
    return version;
  }
  async refreshVersion(id: string) {
    const version = this.version(id);
    const reviewed = (version.reviewStatus || 'approved') === 'approved';
    if (version.manifest.price === '0' || this.payments.kind === 'disabled' || !reviewed) {
      version.approvals = this.store
        .all<{ wallet: string }>('SELECT wallet FROM author_approvals WHERE version_id=?', id)
        .map((r) => r.wallet);
    } else {
      await this.payments.register(version);
      version.approvals = await this.payments.approvals(version);
    }
    version.reviewStatus = this.version(id).reviewStatus;
    version.active =
      (version.reviewStatus || 'approved') === 'approved' &&
      version.manifest.splits.every((s) => version.approvals.includes(s.wallet)) &&
      (version.manifest.price === '0' || this.payments.kind !== 'disabled');
    this.store.saveVersion(version);
    return version;
  }
  freeBundle(id: string) {
    const v = this.version(id);
    if (
      v.manifest.price !== '0' ||
      !v.active ||
      v.reviewStatus === 'rejected' ||
      v.reviewStatus === 'pending'
    )
      throw new AppError(403, 'NOT_FREE', 'Only approved, active free releases can be downloaded');
    const key = this.store.key(id);
    try {
      const plain = decrypt(this.store.bundle(id), key);
      parseBundle(plain);
      if (sha256(plain) !== v.manifest.contentHash) {
        plain.fill(0);
        throw new AppError(503, 'INTEGRITY', 'Content integrity check failed');
      }
      return plain;
    } finally {
      key.fill(0);
    }
  }
  reviewChallenge(id: string, address: string, decision: string) {
    this.version(id);
    if (
      address !== this.options.adminWallet ||
      !['approved', 'rejected', 'inspect'].includes(decision)
    )
      throw new AppError(403, 'ADMIN', 'Only the configured reviewer can review releases');
    const challengeId = randomUUID(),
      expires = Date.now() + 300_000;
    const message = `SkillSeal listing review\nOrigin: ${this.origin}\nVersion: ${id}\nDecision: ${decision}\nNonce: ${challengeId}\nExpires: ${expires}`;
    this.store.run(
      'INSERT INTO challenges (id,wallet,action,resource,public_key,message,expires) VALUES (?,?,?,?,?,?,?)',
      challengeId,
      address,
      'review-listing',
      id,
      decision,
      message,
      expires,
    );
    return { id: challengeId, message, expires };
  }
  async reviewPreview(id: string, challengeId: string, signature: string) {
    const c = this.store.get<Challenge>('SELECT * FROM challenges WHERE id=?', challengeId);
    if (
      !c ||
      c.action !== 'review-listing' ||
      c.resource !== id ||
      c.public_key !== 'inspect' ||
      c.wallet !== this.options.adminWallet ||
      c.consumed ||
      c.expires < Date.now() ||
      !(await verifyWallet(c.message, signature, c.wallet))
    )
      throw new AppError(
        401,
        'REVIEW_SIGNATURE',
        'Inspection authorization is invalid, expired or already used',
      );
    this.store.transaction(() => {
      if (
        this.store.run(
          'UPDATE challenges SET consumed=1 WHERE id=? AND consumed=0 AND expires>=?',
          challengeId,
          Date.now(),
        ).changes !== 1
      )
        throw new AppError(401, 'REPLAY', 'Inspection already used');
    });
    const key = this.store.key(id);
    let plain: Buffer | undefined;
    try {
      plain = decrypt(this.store.bundle(id), key);
      parseBundle(plain);
      return { bundle: plain.toString('base64') };
    } finally {
      key.fill(0);
      plain?.fill(0);
    }
  }
  async review(id: string, challengeId: string, signature: string) {
    const c = this.store.get<Challenge>('SELECT * FROM challenges WHERE id=?', challengeId);
    if (
      !c ||
      c.action !== 'review-listing' ||
      c.resource !== id ||
      !['approved', 'rejected'].includes(c.public_key || '') ||
      c.wallet !== this.options.adminWallet ||
      c.consumed ||
      c.expires < Date.now() ||
      !(await verifyWallet(c.message, signature, c.wallet))
    )
      throw new AppError(
        401,
        'REVIEW_SIGNATURE',
        'Review authorization is invalid, expired or already used',
      );
    this.store.transaction(() => {
      if (
        this.store.run(
          'UPDATE challenges SET consumed=1 WHERE id=? AND consumed=0 AND expires>=?',
          challengeId,
          Date.now(),
        ).changes !== 1
      )
        throw new AppError(401, 'REPLAY', 'Review authorization already used');
      const v = this.version(id);
      v.reviewStatus = c.public_key as Version['reviewStatus'];
      v.active = false;
      this.store.saveVersion(v);
      this.store.event('review:' + challengeId, id, { decision: v.reviewStatus });
    });
    return this.refreshVersion(id);
  }
  async approve(id: string, address: string, signature: string) {
    const version = this.version(id);
    if (
      !version.manifest.splits.some((s) => s.wallet === address) ||
      !(await verifyWallet(versionMessage(id, this.origin), signature, address))
    )
      throw new AppError(
        401,
        'INVALID_SIGNATURE',
        'Author signature does not approve this configuration',
      );
    if (
      version.manifest.price === '0' ||
      this.payments.kind === 'disabled' ||
      (version.reviewStatus && version.reviewStatus !== 'approved')
    ) {
      this.store.run('INSERT OR IGNORE INTO author_approvals VALUES (?,?)', id, address);
      return { version: await this.refreshVersion(id), transaction: null };
    }
    await this.payments.register(version);
    if (this.payments instanceof MockPayment) {
      await this.payments.approve(version, address);
      return { version: await this.refreshVersion(id), transaction: null };
    }
    return { version, transaction: await this.payments.approvalTransaction(version, address) };
  }
  async createOrder(versionId: string, publicKey: string) {
    try {
      fromBase64(publicKey, 32);
      await sealKey(Buffer.alloc(32), publicKey);
    } catch {
      throw new AppError(400, 'INVALID_KEY', 'A valid X25519 encryption public key is required');
    }
    const version = await this.refreshVersion(versionId);
    if (version.manifest.price === '0')
      throw new AppError(
        400,
        'FREE_DOWNLOAD',
        'This release is free; download it without checkout',
      );
    if (this.payments.kind === 'disabled')
      throw new AppError(503, 'CHECKOUT_DISABLED', 'Paid checkout is not enabled');
    if (!version.active)
      throw new AppError(409, 'UNAPPROVED', 'All authors must approve before purchase');
    const order: Order = {
      id: randomUUID(),
      versionId,
      encryptionPublicKey: publicKey,
      buyer: null,
      status: 'created',
      createdAt: Date.now(),
    };
    this.store.saveOrder(order);
    this.store.event('checkout_started', order.id);
    return this.publicOrder(order);
  }
  challenge(orderId: string, address: string) {
    if (!wallet.safeParse(address).success)
      throw new AppError(400, 'INVALID_WALLET', 'Invalid buyer wallet');
    const order = this.order(orderId),
      version = this.version(order.versionId);
    if (order.buyer && order.buyer !== address)
      throw new AppError(409, 'BOUND', 'Order belongs to another wallet');
    const id = randomUUID(),
      expires = Date.now() + 300_000;
    const message = [
      'Skill Vault purchase authorization',
      `Origin: ${this.origin}`,
      `Nonce: ${id}`,
      `Expires: ${expires}`,
      `Order: ${orderId}`,
      `Version: ${version.id}`,
      `Wallet: ${address}`,
      `Encryption key: ${order.encryptionPublicKey}`,
      `License hash: ${sha256(version.manifest.license)}`,
      'I accept the license and bind this encryption key to my purchase.',
    ].join('\n');
    this.store.run(
      'INSERT INTO challenges (id,wallet,action,resource,public_key,message,expires) VALUES (?,?,?,?,?,?,?)',
      id,
      address,
      'bind-order',
      orderId,
      order.encryptionPublicKey,
      message,
      expires,
    );
    return { id, message, expires };
  }
  async bind(orderId: string, challengeId: string, signature: string) {
    const challenge = this.store.get<Challenge>('SELECT * FROM challenges WHERE id=?', challengeId),
      order = this.order(orderId);
    if (
      !challenge ||
      challenge.action !== 'bind-order' ||
      challenge.resource !== orderId ||
      challenge.public_key !== order.encryptionPublicKey ||
      challenge.consumed ||
      challenge.expires < Date.now() ||
      !(await verifyWallet(challenge.message, signature, challenge.wallet))
    )
      throw new AppError(
        401,
        'INVALID_CHALLENGE',
        'Authorization is invalid, expired or already used',
      );
    this.store.transaction(() => {
      const changed = this.store.run(
        'UPDATE challenges SET consumed=1 WHERE id=? AND consumed=0 AND expires>=?',
        challengeId,
        Date.now(),
      );
      if (changed.changes !== 1) throw new AppError(401, 'REPLAY', 'Authorization already used');
      const current = this.order(orderId);
      if (current.buyer && current.buyer !== challenge.wallet)
        throw new AppError(409, 'BOUND', 'Order belongs to another wallet');
      order.buyer = challenge.wallet;
      order.status = 'bound';
      this.store.saveOrder(order);
    });
    return this.publicOrder(order);
  }
  async payment(orderId: string) {
    const order = this.order(orderId),
      version = this.version(order.versionId);
    if (!order.buyer) throw new AppError(401, 'UNBOUND', 'Wallet authorization required');
    const state = await this.payments.state(version, order);
    if (state.status === 'granted') return { alreadyPurchased: true, transaction: null };
    if (state.status === 'funded')
      throw new AppError(409, 'FUNDED', 'Payment already exists; synchronize the order');
    return {
      alreadyPurchased: false,
      transaction: await this.payments.paymentTransaction(version, order),
    };
  }
  publicOrder(order: Order) {
    const { envelope, ...publicData } = order;
    return publicData;
  }
  async sync(orderId: string) {
    if (!this.store.lease('order:' + orderId)) return this.publicOrder(this.order(orderId));
    try {
      const order = this.order(orderId),
        version = this.version(order.versionId);
      if (!order.buyer) return this.publicOrder(order);
      const state = await this.payments.state(version, order);
      if (state.status === 'missing') return this.publicOrder(order);
      order.fundedAt = state.paidAt;
      order.expiresAt = state.expiresAt;
      if (state.status === 'refunded') {
        order.status = 'refunded';
        delete order.envelope;
        this.store.saveOrder(order);
        this.store.event('refunded', order.id);
        await this.recordCosts(version, order);
        return this.publicOrder(order);
      }
      if (state.status === 'funded') {
        order.status = 'funded';
        order.paymentSignature = state.signature;
        this.store.saveOrder(order);
        this.store.event('funded', order.id, { feeLamports: state.feeLamports || 0 });
        if (Date.now() >= state.expiresAt!) return this.publicOrder(order);
      }
      // Durable encrypted envelope is prepared before submitting the irreversible settlement.
      if (!order.envelope) {
        const key = this.store.key(version.id);
        try {
          order.envelope = await sealKey(key, order.encryptionPublicKey);
        } finally {
          key.fill(0);
        }
        this.store.saveOrder(order);
      }
      if (state.status === 'funded') {
        const settled = await this.payments.settle(version, order);
        order.settlementSignature = settled.signature;
        order.feeLamports = settled.feeLamports;
      }
      // Never release based on a client-submitted signature or a cached database status.
      const verified = await this.payments.state(version, order);
      if (verified.status !== 'granted')
        throw new AppError(503, 'NOT_FINALIZED', 'Settlement has not finalized; retry this order');
      order.status = 'granted';
      order.grantedAt = order.grantedAt || Date.now();
      this.store.saveOrder(order);
      this.store.event('granted', order.id, {
        elapsedMs: order.grantedAt - order.createdAt,
        unlockMs: Math.max(
          0,
          order.grantedAt - Math.max(order.createdAt, order.fundedAt || order.createdAt),
        ),
        feeLamports: order.feeLamports || 0,
      });
      await this.recordCosts(version, order);
      return this.publicOrder(order);
    } catch (error) {
      this.store.event('failure', orderId, {
        code: error instanceof AppError ? error.code : 'PAYMENT_UNAVAILABLE',
      });
      throw error;
    } finally {
      this.store.release('order:' + orderId);
    }
  }
  async claim(orderId: string) {
    await this.sync(orderId);
    const order = this.order(orderId);
    if (
      !order.buyer ||
      (await this.payments.state(this.version(order.versionId), order)).status !== 'granted' ||
      !order.envelope
    )
      throw new AppError(402, 'PAYMENT_REQUIRED', 'A finalized purchase is required to unlock');
    return {
      versionId: order.versionId,
      envelope: order.envelope,
      encryptionPublicKey: order.encryptionPublicKey,
    };
  }
  async refund(orderId: string) {
    const order = this.order(orderId),
      version = this.version(order.versionId);
    const state = await this.payments.state(version, order);
    if (state.status !== 'funded' || Date.now() < state.expiresAt!)
      throw new AppError(
        409,
        'NOT_REFUNDABLE',
        'Only funded, unsettled orders older than ten minutes can be refunded',
      );
    return { transaction: await this.payments.refundTransaction(version, order) };
  }
  async demoFund(orderId: string) {
    if (!(this.payments instanceof MockPayment))
      throw new AppError(404, 'NOT_FOUND', 'Local demo unavailable');
    const order = this.order(orderId);
    await this.payments.fund(this.version(order.versionId), order);
    return this.sync(orderId);
  }
  async recordCosts(version: Version, order: Order) {
    if (
      !this.payments.costs ||
      this.store.get(
        'SELECT id FROM events WHERE kind=? AND resource=?',
        'costs_recorded',
        order.id,
      )
    )
      return;
    try {
      for (const cost of await this.payments.costs(version, order))
        this.store.run(
          'INSERT OR IGNORE INTO chain_costs VALUES (?,?,?,?,?)',
          cost.signature,
          `${version.id}:${order.buyer}`,
          cost.phase,
          cost.feeLamports,
          cost.rentDepositLamports,
        );
      this.store.event('costs_recorded', order.id);
    } catch {
      this.store.event('costs_unavailable', order.id);
    }
  }
  metrics() {
    const events = this.store.all<{
      kind: string;
      resource: string;
      time: number;
      details: string;
    }>('SELECT kind,resource,time,details FROM events');
    const count = (kind: string) => events.filter((e) => e.kind === kind).length;
    const grants = events.filter((e) => e.kind === 'granted').map((e) => JSON.parse(e.details));
    const costs = this.store.all<{
      signature: string;
      resource: string;
      phase: string;
      fee: number;
      rent: number;
    }>('SELECT * FROM chain_costs');
    const unmeasured = events.filter(
      (e) =>
        e.kind === 'costs_unavailable' &&
        !events.some((ok) => ok.kind === 'costs_recorded' && ok.resource === e.resource),
    ).length;
    return {
      checkouts: count('checkout_started'),
      funded: count('funded'),
      unlocked: count('granted'),
      failures: count('failure'),
      refunds: count('refunded'),
      completionRate: count('checkout_started') ? count('granted') / count('checkout_started') : 0,
      failureRate: count('checkout_started') ? count('failure') / count('checkout_started') : 0,
      averageCheckoutMs: grants.length
        ? grants.reduce((n, g) => n + g.elapsedMs, 0) / grants.length
        : 0,
      averageUnlockMs: grants.length
        ? grants.reduce((n, g) => n + (g.unlockMs ?? g.elapsedMs), 0) / grants.length
        : 0,
      settlementFeesLamports: grants.reduce((n, g) => n + g.feeLamports, 0),
      chainCosts: {
        transactions: costs,
        transactionFeesLamports: costs.reduce((n, c) => n + c.fee, 0),
        rentDepositsLamports: costs.reduce((n, c) => n + c.rent, 0),
        ordersWithUnavailableHistory: unmeasured,
      },
    };
  }
}
