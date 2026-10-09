import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { Keypair } from '@solana/web3.js';
const mock = process.argv.includes('--mock');
try {
  await access('.env.local');
  throw new Error(
    '.env.local already exists; initialization never replaces keys. Edit its payment backend explicitly if needed.',
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
await mkdir('.data', { recursive: true, mode: 0o700 });
await mkdir('anchor/target/deploy', { recursive: true, mode: 0o700 });
const issuer = Keypair.generate(),
  program = Keypair.generate();
await writeFile('.data/issuer.json', JSON.stringify([...issuer.secretKey]), {
  mode: 0o600,
  flag: 'wx',
});
await writeFile(
  'anchor/target/deploy/skill_vault-keypair.json',
  JSON.stringify([...program.secretKey]),
  { mode: 0o600, flag: 'wx' },
);
const programId = program.publicKey.toBase58();
for (const file of ['anchor/Anchor.toml', 'anchor/programs/skill-vault/src/lib.rs']) {
  const source = await readFile(file, 'utf8');
  const updated = file.endsWith('.rs')
    ? source.replace(/declare_id!\("[1-9A-HJ-NP-Za-km-z]+"\)/, `declare_id!("${programId}")`)
    : source.replace(/skill_vault = "[1-9A-HJ-NP-Za-km-z]+"/g, `skill_vault = "${programId}"`);
  await writeFile(file, updated);
}
const env =
  [
    `APP_ORIGIN=http://127.0.0.1:3000`,
    `DATA_DIR=.data`,
    `PAYMENT_BACKEND=${mock ? 'mock' : 'solana'}`,
    `LOCAL_DEMO=${mock ? '1' : '0'}`,
    `SOLANA_RPC_URL=https://api.devnet.solana.com`,
    `SOLANA_PROGRAM_ID=${programId}`,
    `SOLANA_ISSUER_KEYPAIR=.data/issuer.json`,
    `KEY_VAULT_MASTER_KEY=${randomBytes(32).toString('base64')}`,
  ].join('\n') + '\n';
await writeFile('.env.local', env, { mode: 0o600, flag: 'wx' });
console.log(
  `Initialized ${mock ? 'LOCAL MOCK (no blockchain funds)' : 'Devnet'} configuration. Issuer: ${issuer.publicKey.toBase58()}. Program: ${programId}. Keep .env.local and .data private and backed up.`,
);
