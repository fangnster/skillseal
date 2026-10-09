import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import bs58 from 'bs58';
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import {
  DEVNET_GENESIS,
  DEVNET_USDC,
  type PaymentAdapter,
  type Version,
  type Order,
  type ChainState,
  type PaymentCost,
} from './types.ts';
import type { Config } from './config.ts';

const discriminator = (name: string) => createHash('sha256').update(name).digest().subarray(0, 8);
const u64 = (n: bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
};
const u32 = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
};
const u16 = (n: number) => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
};
const meta = (pubkey: PublicKey, isWritable = false, isSigner = false) => ({
  pubkey,
  isWritable,
  isSigner,
});
export class Cursor {
  bytes: Buffer;
  position = 8;
  constructor(bytes: Buffer, account: string) {
    if (bytes.length < 8 || !bytes.subarray(0, 8).equals(discriminator('account:' + account)))
      throw new Error('Unexpected account discriminator');
    this.bytes = bytes;
  }
  take(length: number) {
    if (this.position + length > this.bytes.length) throw new Error('Truncated account');
    const value = this.bytes.subarray(this.position, this.position + length);
    this.position += length;
    return value;
  }
  pub() {
    return new PublicKey(this.take(32));
  }
  byte() {
    return this.take(1)[0];
  }
  amount() {
    return this.take(8).readBigUInt64LE();
  }
  time() {
    return Number(this.take(8).readBigInt64LE()) * 1000;
  }
  length() {
    return this.take(4).readUInt32LE();
  }
}
export class SolanaPayment implements PaymentAdapter {
  readonly kind = 'solana' as const;
  issuer: string;
  signer: Keypair;
  program: PublicKey;
  connection: Connection;
  constructor(config: Config) {
    if (!config.programId)
      throw new Error('SOLANA_PROGRAM_ID must reference the deployed Devnet program');
    this.signer = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(readFileSync(config.issuerPath, 'utf8'))),
    );
    this.issuer = this.signer.publicKey.toBase58();
    this.program = new PublicKey(config.programId);
    this.connection = new Connection(config.rpc, {
      commitment: 'finalized',
      confirmTransactionInitialTimeout: 45_000,
    });
  }
  async checkNetwork() {
    if ((await this.connection.getGenesisHash()) !== DEVNET_GENESIS)
      throw new Error('Only Solana Devnet is supported');
  }
  versionAddress(version: Version) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('version'),
        new PublicKey(this.issuer).toBuffer(),
        Buffer.from(version.id, 'hex'),
      ],
      this.program,
    )[0];
  }
  orderAddress(version: Version, order: Order) {
    if (!order.buyer) throw new Error('Buyer authorization required');
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('order'),
        this.versionAddress(version).toBuffer(),
        new PublicKey(order.buyer).toBuffer(),
      ],
      this.program,
    )[0];
  }
  ix(name: string, keys: ReturnType<typeof meta>[], args = Buffer.alloc(0)) {
    return new TransactionInstruction({
      programId: this.program,
      keys,
      data: Buffer.concat([discriminator('global:' + name), args]),
    });
  }
  async account(address: PublicKey, accountType: string) {
    const info = await this.connection.getAccountInfo(address, 'finalized');
    if (!info) return undefined;
    if (!info.owner.equals(this.program)) throw new Error('Invalid account owner');
    return new Cursor(info.data, accountType);
  }
  async validateVersion(version: Version) {
    const cursor = await this.account(this.versionAddress(version), 'VersionState');
    if (!cursor) return undefined;
    if (
      cursor.pub().toBase58() !== this.issuer ||
      cursor.pub().toBase58() !== DEVNET_USDC ||
      cursor.take(32).toString('hex') !== version.id ||
      cursor.amount() !== BigInt(version.manifest.price)
    )
      throw new Error('Version configuration mismatch');
    const length = cursor.length();
    if (length !== version.manifest.splits.length || length > 5)
      throw new Error('Split count mismatch');
    const approved: string[] = [];
    for (let i = 0; i < length; i++) {
      const wallet = cursor.pub().toBase58(),
        bps = cursor.take(2).readUInt16LE(),
        ok = cursor.byte();
      if (wallet !== version.manifest.splits[i].wallet || bps !== version.manifest.splits[i].bps)
        throw new Error('Split configuration mismatch');
      if (ok === 1) approved.push(wallet);
    }
    const active = cursor.byte() === 1;
    if (active !== (approved.length === length)) throw new Error('Invalid active state');
    return approved;
  }
  async unsigned(tx: Transaction, payer: PublicKey) {
    await this.checkNetwork();
    tx.feePayer = payer;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash('finalized')).blockhash;
    return tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString('base64');
  }
  async send(tx: Transaction) {
    await this.checkNetwork();
    tx.feePayer = this.signer.publicKey;
    const block = await this.connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = block.blockhash;
    tx.sign(this.signer);
    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    const confirmation = await this.connection.confirmTransaction(
      { signature, ...block },
      'finalized',
    );
    if (confirmation.value.err) throw new Error('Solana transaction failed');
    const record = await this.connection.getTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });
    if (!record || record.meta?.err) throw new Error('Transaction has not finalized');
    return { signature, feeLamports: record.meta?.fee || 0 };
  }
  async register(version: Version) {
    await this.checkNetwork();
    if (await this.validateVersion(version)) return;
    const args = Buffer.concat([
      Buffer.from(version.id, 'hex'),
      u64(BigInt(version.manifest.price)),
      u32(version.manifest.splits.length),
      ...version.manifest.splits.map((s) =>
        Buffer.concat([new PublicKey(s.wallet).toBuffer(), u16(s.bps)]),
      ),
    ]);
    await this.send(
      new Transaction().add(
        this.ix(
          'register_version',
          [
            meta(this.signer.publicKey, true, true),
            meta(this.versionAddress(version), true),
            meta(new PublicKey(DEVNET_USDC)),
            meta(SystemProgram.programId),
          ],
          args,
        ),
      ),
    );
  }
  async approvalTransaction(version: Version, wallet: string) {
    if (!version.manifest.splits.some((s) => s.wallet === wallet))
      throw new Error('Unknown author');
    return this.unsigned(
      new Transaction().add(
        this.ix('approve_version', [
          meta(this.versionAddress(version), true),
          meta(new PublicKey(wallet), false, true),
        ]),
      ),
      new PublicKey(wallet),
    );
  }
  async approvals(version: Version) {
    await this.checkNetwork();
    return (await this.validateVersion(version)) || [];
  }
  async paymentTransaction(version: Version, order: Order) {
    await this.checkNetwork();
    if (version.manifest.mint !== DEVNET_USDC) throw new Error('Unsupported mint');
    const buyer = new PublicKey(order.buyer!),
      mint = new PublicKey(DEVNET_USDC),
      address = this.orderAddress(version, order);
    return this.unsigned(
      new Transaction().add(
        this.ix(
          'pay',
          [
            meta(this.versionAddress(version)),
            meta(buyer, true, true),
            meta(address, true),
            meta(mint),
            meta(getAssociatedTokenAddressSync(mint, buyer), true),
            meta(getAssociatedTokenAddressSync(mint, address, true), true),
            meta(TOKEN_PROGRAM_ID),
            meta(ASSOCIATED_TOKEN_PROGRAM_ID),
            meta(SystemProgram.programId),
          ],
          Buffer.from(order.encryptionPublicKey, 'base64'),
        ),
      ),
      buyer,
    );
  }
  async state(version: Version, order: Order): Promise<ChainState> {
    await this.checkNetwork();
    if (!order.buyer) return { status: 'missing' };
    await this.validateVersion(version);
    const cursor = await this.account(this.orderAddress(version, order), 'OrderState');
    if (!cursor) return { status: 'missing' };
    if (
      cursor.pub().toBase58() !== order.buyer ||
      !cursor.pub().equals(this.versionAddress(version))
    )
      throw new Error('Order identity mismatch');
    cursor.take(32);
    const paidAt = cursor.time(),
      expiresAt = cursor.time(),
      state = cursor.byte();
    if (expiresAt - paidAt !== 600_000) throw new Error('Invalid escrow timeout');
    const status = ({ 1: 'funded', 2: 'granted', 3: 'refunded' } as const)[state as 1 | 2 | 3];
    if (!status) throw new Error('Invalid order state');
    return { status, paidAt, expiresAt };
  }
  async settle(version: Version, order: Order) {
    const mint = new PublicKey(DEVNET_USDC),
      address = this.orderAddress(version, order),
      tx = new Transaction();
    for (const split of version.manifest.splits)
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          this.signer.publicKey,
          getAssociatedTokenAddressSync(mint, new PublicKey(split.wallet)),
          new PublicKey(split.wallet),
          mint,
        ),
      );
    tx.add(
      this.ix('settle', [
        meta(this.versionAddress(version)),
        meta(this.signer.publicKey, true, true),
        meta(new PublicKey(order.buyer!)),
        meta(address, true),
        meta(mint),
        meta(getAssociatedTokenAddressSync(mint, address, true), true),
        meta(TOKEN_PROGRAM_ID),
        ...version.manifest.splits.map((s) =>
          meta(getAssociatedTokenAddressSync(mint, new PublicKey(s.wallet)), true),
        ),
      ]),
    );
    return this.send(tx);
  }
  async refundTransaction(version: Version, order: Order) {
    const buyer = new PublicKey(order.buyer!),
      mint = new PublicKey(DEVNET_USDC),
      address = this.orderAddress(version, order);
    return this.unsigned(
      new Transaction().add(
        this.ix('refund', [
          meta(this.versionAddress(version)),
          meta(buyer, true, true),
          meta(address, true),
          meta(mint),
          meta(getAssociatedTokenAddressSync(mint, address, true), true),
          meta(getAssociatedTokenAddressSync(mint, buyer), true),
          meta(TOKEN_PROGRAM_ID),
          meta(ASSOCIATED_TOKEN_PROGRAM_ID),
          meta(SystemProgram.programId),
        ]),
      ),
      buyer,
    );
  }
  async costs(version: Version, order: Order): Promise<PaymentCost[]> {
    await this.checkNetwork();
    const address = this.orderAddress(version, order),
      mint = new PublicKey(DEVNET_USDC);
    const history = await this.connection.getSignaturesForAddress(
      address,
      { limit: 100 },
      'finalized',
    );
    if (history.length === 100) throw new Error('Cost history exceeds the MVP scan limit');
    const costs: PaymentCost[] = [];
    for (const item of history) {
      if (item.err) continue;
      const tx = await this.connection.getParsedTransaction(item.signature, {
        commitment: 'finalized',
        maxSupportedTransactionVersion: 0,
      });
      if (!tx?.meta || tx.meta.err) throw new Error('Cost history is unavailable from this RPC');
      const ix = tx.transaction.message.instructions.find(
        (i) => i.programId.equals(this.program) && 'data' in i,
      );
      if (!ix || !('data' in ix)) continue;
      const data = Buffer.from(bs58.decode(ix.data));
      const name = ['pay', 'settle', 'refund'].find((n) =>
        data.subarray(0, 8).equals(discriminator('global:' + n)),
      );
      if (!name) continue;
      const expected =
        name === 'pay'
          ? [address, getAssociatedTokenAddressSync(mint, address, true)]
          : name === 'settle'
            ? version.manifest.splits.map((s) =>
                getAssociatedTokenAddressSync(mint, new PublicKey(s.wallet)),
              )
            : [getAssociatedTokenAddressSync(mint, new PublicKey(order.buyer!))];
      let rentDepositLamports = 0;
      for (const account of expected) {
        const index = tx.transaction.message.accountKeys.findIndex((k) => k.pubkey.equals(account));
        if (index >= 0 && tx.meta.preBalances[index] === 0)
          rentDepositLamports += tx.meta.postBalances[index];
      }
      costs.push({
        signature: item.signature,
        phase: name === 'pay' ? 'payment' : name === 'settle' ? 'settlement' : 'refund',
        feeLamports: tx.meta.fee,
        rentDepositLamports,
      });
    }
    if (!costs.some((c) => c.phase === 'payment'))
      throw new Error('Funding transaction history is unavailable');
    return costs;
  }
}
