import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { Keypair } from '@solana/web3.js';
import { Store } from '../src/store.ts';
import { MockPayment } from '../src/mock-payment.ts';
import { VaultService } from '../src/service.ts';
import {
  encrypt,
  decrypt,
  canonical,
  sha256,
  signWallet,
  versionMessage,
  encryptionKeypair,
  openKey,
} from '../src/crypto.ts';
import { install } from '../src/bundle.ts';
import { DEVNET_USDC, type Manifest, type Order } from '../src/types.ts';
import { checkoutState } from '../src/checkout-state.ts';

async function fixture(t: TestContext) {
  const dir = await mkdtemp(path.join(tmpdir(), 'sv-buy-')),
    store = new Store(dir, randomBytes(32));
  t.after(async () => {
    store.close();
    await rm(dir, { recursive: true, force: true });
  });
  const issuer = Keypair.generate(),
    a = Keypair.generate(),
    b = Keypair.generate(),
    buyer = Keypair.generate();
  const payment = new MockPayment(store, issuer.publicKey.toBase58()),
    service = new VaultService(store, payment, 'http://127.0.0.1:3000');
  const original = Buffer.from(
      canonical({
        format: 'skill-vault-files-v1',
        files: [
          {
            path: 'SKILL.md',
            data: Buffer.from('Use the secret research method.').toString('base64'),
          },
        ],
      }),
    ),
    encrypted = encrypt(original);
  const manifest: Manifest = {
    skillId: 'test-skill',
    name: 'Test skill',
    description: 'Private reusable workflow',
    version: '1.0.0',
    price: '1000000',
    mint: DEVNET_USDC,
    splits: [
      { wallet: a.publicKey.toBase58(), bps: 7000 },
      { wallet: b.publicKey.toBase58(), bps: 3000 },
    ],
    license: 'Local use, no redistribution.',
    bundleHash: sha256(encrypted.ciphertext),
    publisher: a.publicKey.toBase58(),
    issuer: issuer.publicKey.toBase58(),
  };
  const id = sha256(canonical(manifest)),
    signature = await signWallet(versionMessage(id, service.origin), a.secretKey);
  const input = {
    manifest,
    bundle: encrypted.ciphertext.toString('base64'),
    key: encrypted.key.toString('base64'),
    signature,
  };
  const version = await service.publish(input);
  async function approve() {
    for (const signer of [a, b])
      await service.approve(
        id,
        signer.publicKey.toBase58(),
        await signWallet(versionMessage(id, service.origin), signer.secretKey),
      );
  }
  async function bind(
    keys = undefined as Awaited<ReturnType<typeof encryptionKeypair>> | undefined,
  ) {
    keys = keys || (await encryptionKeypair());
    const created = await service.createOrder(id, keys.publicKey);
    const challenge = service.challenge(created.id, buyer.publicKey.toBase58());
    await service.bind(
      created.id,
      challenge.id,
      await signWallet(challenge.message, buyer.secretKey),
    );
    return { order: service.order(created.id), keys, challenge };
  }
  return {
    dir,
    store,
    payment,
    service,
    a,
    b,
    buyer,
    version,
    input,
    original,
    encrypted,
    approve,
    bind,
  };
}
test('70/30 purchase decrypts and installs offline; reinstall does not pay twice', async (t) => {
  const f = await fixture(t);
  await f.approve();
  const { order, keys } = await f.bind();
  await f.service.demoFund(order.id);
  const claimed = await f.service.claim(order.id),
    key = await openKey(claimed.envelope, keys.publicKey, keys.privateKey);
  const plain = decrypt(f.store.bundle(f.version.id), key);
  assert.deepEqual(plain, f.original);
  await install(plain, path.join(f.dir, 'installed'));
  assert.match(
    await readFile(path.join(f.dir, 'installed', 'SKILL.md'), 'utf8'),
    /secret research/,
  );
  assert.equal(
    f.store.get<{ amount: string }>(
      'SELECT amount FROM mock_balances WHERE wallet=?',
      f.a.publicKey.toBase58(),
    )?.amount,
    '700000',
  );
  assert.equal(
    f.store.get<{ amount: string }>(
      'SELECT amount FROM mock_balances WHERE wallet=?',
      f.b.publicKey.toBase58(),
    )?.amount,
    '300000',
  );
  const next = await f.bind();
  assert.equal((await f.service.payment(next.order.id)).alreadyPurchased, true);
  const replacement = await f.service.claim(next.order.id);
  assert.deepEqual(
    await openKey(replacement.envelope, next.keys.publicKey, next.keys.privateKey),
    key,
  );
  assert.equal(
    f.store.get<{ amount: string }>(
      'SELECT amount FROM mock_balances WHERE wallet=?',
      f.a.publicKey.toBase58(),
    )?.amount,
    '700000',
  );
  assert.equal(f.service.metrics().unlocked, 2);
});
test('version is immutable and requires every author approval', async (t) => {
  const f = await fixture(t);
  await assert.rejects(() => f.service.publish(f.input), /already exists/);
  await assert.rejects(
    async () => f.service.createOrder(f.version.id, (await encryptionKeypair()).publicKey),
    /All authors/,
  );
  await assert.rejects(
    () => f.service.approve(f.version.id, f.b.publicKey.toBase58(), f.input.signature),
    /Author signature/,
  );
  const changed = { ...f.input, manifest: { ...f.input.manifest, price: '2000000' } };
  await assert.rejects(() => f.service.publish(changed), /Publisher signature/);
  await f.approve();
  assert.equal(f.service.version(f.version.id).active, true);
});
test('wrong mint, invalid split and tampered bundles cannot be published', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    () =>
      f.service.publish({
        ...f.input,
        manifest: { ...f.input.manifest, mint: Keypair.generate().publicKey.toBase58() },
      }),
    /Manifest fields/,
  );
  const bad = { ...f.input.manifest, splits: [{ wallet: f.a.publicKey.toBase58(), bps: 9000 }] };
  await assert.rejects(
    () => f.service.publish({ ...f.input, manifest: bad }),
    /split configuration/,
  );
  const altered = Buffer.from(f.encrypted.ciphertext);
  altered[40] ^= 1;
  const manifest = { ...f.input.manifest, version: '1.0.1', bundleHash: sha256(altered) };
  const signature = await signWallet(
    versionMessage(sha256(canonical(manifest)), f.service.origin),
    f.a.secretKey,
  );
  await assert.rejects(
    () =>
      f.service.publish({ ...f.input, manifest, signature, bundle: altered.toString('base64') }),
    /Encrypted package/,
  );
});
test('unpaid claims and forged database grants never release a key', async (t) => {
  const f = await fixture(t);
  await f.approve();
  const { order } = await f.bind();
  await assert.rejects(() => f.service.claim(order.id), /finalized purchase/);
  f.store.saveOrder({ ...order, status: 'granted', envelope: 'forged' });
  await assert.rejects(() => f.service.claim(order.id), /finalized purchase/);
  assert.equal('envelope' in f.service.publicOrder(f.service.order(order.id)), false);
});
test('wallet binding is nonce-scoped, key-scoped and rejects replay or expiry', async (t) => {
  const f = await fixture(t);
  await f.approve();
  const bound = await f.bind();
  await assert.rejects(
    async () =>
      f.service.bind(
        bound.order.id,
        bound.challenge.id,
        await signWallet(bound.challenge.message, f.buyer.secretKey),
      ),
    /already used/,
  );
  const keys = await encryptionKeypair(),
    other = await f.service.createOrder(f.version.id, keys.publicKey),
    c = f.service.challenge(other.id, f.buyer.publicKey.toBase58());
  await assert.rejects(
    async () => f.service.bind(other.id, c.id, await signWallet(c.message, f.a.secretKey)),
    /invalid/,
  );
  f.store.run('UPDATE challenges SET expires=? WHERE id=?', Date.now() - 1, c.id);
  await assert.rejects(
    async () => f.service.bind(other.id, c.id, await signWallet(c.message, f.buyer.secretKey)),
    /expired/,
  );
});
test('a crash after chain settlement can recover without paying or distributing twice', async (t) => {
  const f = await fixture(t);
  await f.approve();
  const { order } = await f.bind();
  await f.payment.fund(f.version, order);
  const settle = f.payment.settle.bind(f.payment);
  f.payment.settle = async (v, o) => {
    await settle(v, o);
    throw new Error('simulated process interruption');
  };
  await assert.rejects(() => f.service.sync(order.id), /interruption/);
  assert.ok(f.service.order(order.id).envelope);
  const recovered = await f.service.sync(order.id);
  assert.equal(recovered.status, 'granted');
  assert.ok((await f.service.claim(order.id)).envelope);
  await assert.rejects(() => f.payment.settle(f.version, order), /cannot settle/);
  assert.equal(
    f.store.get<{ amount: string }>(
      'SELECT amount FROM mock_balances WHERE wallet=?',
      f.a.publicKey.toBase58(),
    )?.amount,
    '700000',
  );
});
test('timeout refunds only funded unsettled orders, and refunded funds cannot unlock', async (t) => {
  const f = await fixture(t);
  await f.approve();
  const { order } = await f.bind();
  await f.payment.fund(f.version, order);
  await assert.rejects(() => f.payment.refund(f.version, order), /not eligible/);
  f.payment.now = () => Date.now() - 601_000;
  // Rewrite fixture funding time to exercise expiration without a blocking sleep.
  const state = await f.payment.state(f.version, order);
  f.store.run(
    'UPDATE mock_orders SET payload=? WHERE id=?',
    JSON.stringify({ ...state, paidAt: Date.now() - 601_000, expiresAt: Date.now() - 1000 }),
    f.payment.key(f.version, order),
  );
  f.payment.now = () => Date.now();
  await f.payment.refund(f.version, order);
  assert.equal((await f.service.sync(order.id)).status, 'refunded');
  await assert.rejects(() => f.service.claim(order.id), /finalized purchase/);
  await assert.rejects(() => f.payment.settle(f.version, order), /cannot settle/);
});
test('encrypted key vault is bound to version identity', async (t) => {
  const f = await fixture(t);
  const row = f.store.get<{ ciphertext: Uint8Array }>(
    'SELECT ciphertext FROM keys WHERE id=?',
    f.version.id,
  )!;
  assert.equal(Buffer.from(row.ciphertext).includes(f.encrypted.key), false);
  assert.deepEqual(f.store.key(f.version.id), f.encrypted.key);
  assert.throws(() =>
    decrypt(row.ciphertext, f.store.masterKey, 'skill-vault:key:another-version'),
  );
});
test('invalid low-order X25519 keys are rejected before a buyer can pay', async (t) => {
  const f = await fixture(t);
  await f.approve();
  await assert.rejects(
    () => f.service.createOrder(f.version.id, Buffer.alloc(32).toString('base64')),
    /valid X25519/,
  );
});
test('transaction costs are deduplicated when the same purchase is recovered', async (t) => {
  const f = await fixture(t);
  await f.approve();
  Object.assign(f.payment, {
    costs: async () => [
      { signature: 'payment-1', phase: 'payment', feeLamports: 5000, rentDepositLamports: 10000 },
      {
        signature: 'settlement-1',
        phase: 'settlement',
        feeLamports: 5000,
        rentDepositLamports: 20000,
      },
    ],
  });
  const first = await f.bind();
  await f.service.demoFund(first.order.id);
  const recovered = await f.bind();
  await f.service.claim(recovered.order.id);
  assert.equal(f.service.metrics().chainCosts.transactionFeesLamports, 10000);
  assert.equal(f.service.metrics().chainCosts.rentDepositsLamports, 30000);
  assert.equal(f.service.metrics().chainCosts.transactions.length, 2);
});

test('a competing settlement lease cannot make checkout announce a grant or pay twice', async (t) => {
  const f = await fixture(t);
  await f.approve();
  const { order } = await f.bind();
  await f.payment.fund(f.version, order);
  const chain = await f.payment.state(f.version, order);
  f.store.saveOrder({
    ...order,
    status: 'funded',
    fundedAt: chain.paidAt,
    expiresAt: chain.expiresAt,
  });
  assert.equal(f.store.lease('order:' + order.id), true);
  const pending = await f.service.sync(order.id);
  const checkout = checkoutState(pending);
  assert.equal(pending.status, 'funded');
  assert.equal(checkout.canPay, false);
  assert.equal(checkout.canRefund, false);
  assert.match(checkout.message, /license is still pending/);
  assert.equal('envelope' in pending, false);
  f.store.release('order:' + order.id);
  const settled = await f.service.sync(order.id);
  assert.equal(settled.status, 'granted');
  assert.match(checkoutState(settled).message, /license is confirmed/);
  assert.equal(checkoutState(settled).canPay, false);
});

test('an expired escrow exposes refund recovery without claiming a license', async (t) => {
  const f = await fixture(t);
  await f.approve();
  const { order } = await f.bind();
  await f.payment.fund(f.version, order);
  const chain = await f.payment.state(f.version, order);
  const expiresAt = Date.now() - 1000;
  f.store.run(
    'UPDATE mock_orders SET payload=? WHERE id=?',
    JSON.stringify({ ...chain, expiresAt }),
    f.payment.key(f.version, order),
  );
  const pending = await f.service.sync(order.id);
  assert.equal(pending.status, 'funded');
  assert.equal(checkoutState(pending).canPay, false);
  assert.equal(checkoutState(pending).canRefund, true);
  assert.match(checkoutState(pending).message, /No license was granted/);
  // Missing chain timing must never make an early refund look available.
  assert.equal(checkoutState({ ...pending, expiresAt: undefined }).canRefund, false);
  assert.equal(checkoutState(pending, expiresAt - 1).canRefund, false);
  await f.payment.refund(f.version, order);
  const refunded = await f.service.sync(order.id);
  assert.equal(checkoutState(refunded).canPay, false);
  assert.equal(checkoutState(refunded).canRefund, false);
  assert.match(checkoutState(refunded).message, /cannot unlock/);
  await assert.rejects(() => f.service.claim(order.id), /finalized purchase/);
});
