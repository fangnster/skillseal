import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { Keypair } from '@solana/web3.js';
import { server } from '../src/server.ts';
import { MockPayment } from '../src/mock-payment.ts';
import { pack } from '../src/bundle.ts';
import { encrypt, sha256, canonical, signWallet, versionMessage } from '../src/crypto.ts';
import { DEVNET_USDC, type Manifest } from '../src/types.ts';

await mkdir('.data', { recursive: true, mode: 0o700 });
async function identity(name: string) {
  const file = '.data/' + name + '.json';
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(file, 'utf8'))));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const key = Keypair.generate();
    await writeFile(file, JSON.stringify([...key.secretKey]), { mode: 0o600, flag: 'wx' });
    return key;
  }
}
const authorA = await identity('author-a'),
  authorB = await identity('author-b');
await identity('demo-buyer');
const { service, config } = server();
const manifest = {
  skillId: 'research-brief',
  name: 'Research Brief',
  version: '1.0.0',
  description:
    'Turn supplied sources into a cited decision brief, with contradictions and questions to verify.',
  price: '1000000',
  mint: DEVNET_USDC,
  splits: [
    { wallet: authorA.publicKey.toBase58(), bps: 7000 },
    { wallet: authorB.publicKey.toBase58(), bps: 3000 },
  ],
  license:
    'This public Research Brief demo is provided under the repository MIT license. Its test purchase demonstrates version authorization and creator payouts. Creator-published Skill releases may have separate per-version license terms.',
};
await writeFile('.data/demo-manifest.json', JSON.stringify(manifest, null, 2), { mode: 0o600 });
if (
  service.store
    .versions()
    .some(
      (v) =>
        v.manifest.publisher === authorA.publicKey.toBase58() &&
        v.manifest.skillId === manifest.skillId &&
        v.manifest.version === manifest.version,
    )
) {
  console.log('Demo version already exists.');
  process.exit(0);
}
const encrypted = encrypt(await pack('examples/research-brief'));
const full: Manifest = {
  ...manifest,
  bundleHash: sha256(encrypted.ciphertext),
  publisher: authorA.publicKey.toBase58(),
  issuer: service.payments.issuer,
};
const id = sha256(canonical(full));
const version = await service.publish({
  manifest: full,
  bundle: encrypted.ciphertext.toString('base64'),
  key: encrypted.key.toString('base64'),
  signature: await signWallet(versionMessage(id, config.origin), authorA.secretKey),
});
encrypted.key.fill(0);
if (service.payments instanceof MockPayment) {
  for (const key of [authorA, authorB])
    await service.approve(
      version.id,
      key.publicKey.toBase58(),
      await signWallet(versionMessage(id, config.origin), key.secretKey),
    );
  console.log(
    `LOCAL MOCK seeded: ${version.id}. Author split 70/30. Buyer key: .data/demo-buyer.json`,
  );
} else
  console.log(
    `Devnet draft registered: ${version.id}. Fund both author wallets with test SOL, then run cli approve for each author.`,
  );
