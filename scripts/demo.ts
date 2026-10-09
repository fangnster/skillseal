import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { Keypair } from '@solana/web3.js';
import { Store } from '../src/store.ts';
import { MockPayment } from '../src/mock-payment.ts';
import { VaultService } from '../src/service.ts';
import { pack, install } from '../src/bundle.ts';
import {
  encrypt,
  decrypt,
  encryptionKeypair,
  openKey,
  canonical,
  sha256,
  signWallet,
  versionMessage,
} from '../src/crypto.ts';
import { DEVNET_USDC, type Manifest } from '../src/types.ts';
const directory = await mkdtemp(path.join(tmpdir(), 'skill-vault-demo-')),
  store = new Store(directory, randomBytes(32));
try {
  const issuer = Keypair.generate(),
    a = Keypair.generate(),
    b = Keypair.generate(),
    buyer = Keypair.generate();
  const payments = new MockPayment(store, issuer.publicKey.toBase58()),
    service = new VaultService(store, payments, 'http://127.0.0.1:3000');
  const packaged = encrypt(await pack('examples/research-brief'));
  const manifest: Manifest = {
    skillId: 'research-brief',
    name: 'Research Brief',
    version: '1.0.0',
    description: 'Research workflow',
    price: '1000000',
    mint: DEVNET_USDC,
    splits: [
      { wallet: a.publicKey.toBase58(), bps: 7000 },
      { wallet: b.publicKey.toBase58(), bps: 3000 },
    ],
    license: 'This public demo is provided under the repository MIT license.',
    bundleHash: sha256(packaged.ciphertext),
    publisher: a.publicKey.toBase58(),
    issuer: payments.issuer,
  };
  const id = sha256(canonical(manifest));
  await service.publish({
    manifest,
    bundle: packaged.ciphertext.toString('base64'),
    key: packaged.key.toString('base64'),
    signature: await signWallet(versionMessage(id, service.origin), a.secretKey),
  });
  for (const author of [a, b])
    await service.approve(
      id,
      author.publicKey.toBase58(),
      await signWallet(versionMessage(id, service.origin), author.secretKey),
    );
  const keys = await encryptionKeypair(),
    order = await service.createOrder(id, keys.publicKey),
    challenge = service.challenge(order.id, buyer.publicKey.toBase58());
  await service.bind(order.id, challenge.id, await signWallet(challenge.message, buyer.secretKey));
  await service.demoFund(order.id);
  const claim = await service.claim(order.id),
    key = await openKey(claim.envelope, keys.publicKey, keys.privateKey),
    plain = decrypt(store.bundle(id), key);
  await install(plain, path.join(directory, 'installed'));
  const skill = await readFile(path.join(directory, 'installed', 'SKILL.md'), 'utf8');
  const balances = store
    .all<{
      amount: string;
    }>('SELECT amount FROM mock_balances ORDER BY CAST(amount AS INTEGER) DESC')
    .map((r) => r.amount);
  if (!skill.includes('research-brief') || balances.join(',') !== '700000,300000')
    throw new Error('Demo assertions failed');
  console.log(
    JSON.stringify(
      {
        backend: 'LOCAL MOCK — no on-chain transactions',
        flow: 'encrypted download → signature → simulated payment → 70/30 payout → local decryption → offline skill',
        balancesBaseUnits: balances,
        metrics: service.metrics(),
      },
      null,
      2,
    ),
  );
  key.fill(0);
  plain.fill(0);
} finally {
  store.close();
  await rm(directory, { recursive: true, force: true });
}
