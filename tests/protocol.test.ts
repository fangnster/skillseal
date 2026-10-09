import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { SolanaPayment } from '../src/solana-payment.ts';
import { validateWalletTransaction } from '../src/transactions.ts';
import { DEVNET_GENESIS, DEVNET_USDC, type Version, type Order } from '../src/types.ts';

async function fixture(t: TestContext) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-protocol-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const issuer = Keypair.generate(),
    buyer = Keypair.generate(),
    author = Keypair.generate(),
    program = Keypair.generate().publicKey;
  const file = path.join(directory, 'issuer.json');
  await writeFile(file, JSON.stringify([...issuer.secretKey]), { mode: 0o600 });
  const payments = new SolanaPayment({
    origin: 'http://127.0.0.1:3000',
    dataDir: directory,
    masterKey: randomBytes(32),
    backend: 'solana',
    rpc: 'https://api.devnet.solana.com',
    programId: program.toBase58(),
    issuerPath: file,
  });
  payments.connection.getGenesisHash = async () => DEVNET_GENESIS;
  payments.connection.getLatestBlockhash = async () => ({
    blockhash: PublicKey.unique().toBase58(),
    lastValidBlockHeight: 100,
  });
  const version: Version = {
    id: '07'.repeat(32),
    createdAt: Date.now(),
    approvals: [author.publicKey.toBase58()],
    active: true,
    manifest: {
      skillId: 'protocol-test',
      name: 'Protocol',
      description: 'Wire format validation',
      version: '1.0.0',
      price: '1000000',
      mint: DEVNET_USDC,
      splits: [{ wallet: author.publicKey.toBase58(), bps: 10000 }],
      license: 'Local version license.',
      bundleHash: '08'.repeat(32),
      publisher: author.publicKey.toBase58(),
      issuer: issuer.publicKey.toBase58(),
    },
  };
  const order: Order = {
    id: 'local-order',
    versionId: version.id,
    buyer: buyer.publicKey.toBase58(),
    encryptionPublicKey: randomBytes(32).toString('base64'),
    status: 'bound',
    createdAt: Date.now(),
  };
  return { payments, version, order, buyer, author, issuer, program };
}
const tag = (name: string) =>
  createHash('sha256')
    .update('account:' + name)
    .digest()
    .subarray(0, 8);
function versionData(version: Version) {
  const number = Buffer.alloc(8);
  number.writeBigUInt64LE(BigInt(version.manifest.price));
  const count = Buffer.alloc(4);
  count.writeUInt32LE(1);
  const bps = Buffer.alloc(2);
  bps.writeUInt16LE(10000);
  return Buffer.concat([
    tag('VersionState'),
    new PublicKey(version.manifest.issuer).toBuffer(),
    new PublicKey(DEVNET_USDC).toBuffer(),
    Buffer.from(version.id, 'hex'),
    number,
    count,
    new PublicKey(version.manifest.publisher).toBuffer(),
    bps,
    Buffer.from([1, 1, 0]),
  ]);
}
test('Solana adapter rejects a non-Devnet genesis before creating a transaction', async (t) => {
  const f = await fixture(t);
  f.payments.connection.getGenesisHash = async () => 'mainnet-genesis';
  await assert.rejects(
    () => f.payments.paymentTransaction(f.version, f.order),
    /Only Solana Devnet/,
  );
});
test('account reads reject an unexpected owner, price, mint or discriminator', async (t) => {
  const f = await fixture(t);
  let data = versionData(f.version),
    owner = f.program;
  f.payments.connection.getAccountInfo = async () => ({
    data,
    owner,
    lamports: 1,
    executable: false,
    rentEpoch: 0,
  });
  assert.deepEqual(await f.payments.validateVersion(f.version), [f.author.publicKey.toBase58()]);
  owner = Keypair.generate().publicKey;
  await assert.rejects(() => f.payments.validateVersion(f.version), /Invalid account owner/);
  owner = f.program;
  data = versionData(f.version);
  data.writeBigUInt64LE(2n, 104);
  await assert.rejects(() => f.payments.validateVersion(f.version), /configuration mismatch/);
  data = versionData(f.version);
  data.fill(0, 40, 72);
  await assert.rejects(() => f.payments.validateVersion(f.version), /configuration mismatch/);
  data = versionData(f.version);
  data[0] ^= 1;
  await assert.rejects(() => f.payments.validateVersion(f.version), /discriminator/);
});
test('wallet transaction validation rejects wrong accounts, altered key and extra instructions', async (t) => {
  const f = await fixture(t),
    decode = (s: string) => Transaction.from(Buffer.from(s, 'base64'));
  const original = await f.payments.paymentTransaction(f.version, f.order);
  const valid = decode(original);
  validateWalletTransaction(
    valid,
    f.program.toBase58(),
    f.issuer.publicKey.toBase58(),
    f.version,
    f.buyer.publicKey.toBase58(),
    'pay',
    f.order,
  );
  const wrong = decode(original);
  wrong.instructions[0].keys[4].pubkey = Keypair.generate().publicKey;
  assert.throws(
    () =>
      validateWalletTransaction(
        wrong,
        f.program.toBase58(),
        f.issuer.publicKey.toBase58(),
        f.version,
        f.buyer.publicKey.toBase58(),
        'pay',
        f.order,
      ),
    /accounts/,
  );
  const key = decode(original);
  key.instructions[0].data[8] ^= 1;
  assert.throws(
    () =>
      validateWalletTransaction(
        key,
        f.program.toBase58(),
        f.issuer.publicKey.toBase58(),
        f.version,
        f.buyer.publicKey.toBase58(),
        'pay',
        f.order,
      ),
    /Unexpected/,
  );
  valid.add(valid.instructions[0]);
  assert.throws(
    () =>
      validateWalletTransaction(
        valid,
        f.program.toBase58(),
        f.issuer.publicKey.toBase58(),
        f.version,
        f.buyer.publicKey.toBase58(),
        'pay',
        f.order,
      ),
    /Unexpected/,
  );
  const approval = decode(
    await f.payments.approvalTransaction(f.version, f.author.publicKey.toBase58()),
  );
  validateWalletTransaction(
    approval,
    f.program.toBase58(),
    f.issuer.publicKey.toBase58(),
    f.version,
    f.author.publicKey.toBase58(),
    'approve',
  );
  const refund = decode(await f.payments.refundTransaction(f.version, f.order));
  validateWalletTransaction(
    refund,
    f.program.toBase58(),
    f.issuer.publicKey.toBase58(),
    f.version,
    f.buyer.publicKey.toBase58(),
    'refund',
    f.order,
  );
});
