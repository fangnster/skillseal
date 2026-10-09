import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { DEVNET_GENESIS } from '../src/types.ts';
import { loadConfig } from '../src/config.ts';

if (
  !['solana', 'disabled'].includes(process.env.PAYMENT_BACKEND || '') ||
  process.env.PERSISTENT_STORAGE !== '1'
)
  throw new Error(
    'Hosted service requires a persistent disk and either disabled checkout or Solana Devnet',
  );
const dir = process.env.DATA_DIR;
if (!dir || !path.isAbsolute(dir)) throw new Error('Set an absolute persistent DATA_DIR');
process.env.APP_ORIGIN ||= process.env.RENDER_EXTERNAL_URL;
if (!process.env.APP_ORIGIN?.startsWith('https://'))
  throw new Error('Set the public HTTPS APP_ORIGIN');
await mkdir(dir, { recursive: true, mode: 0o700 });
async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
const hasDatabase = await exists(path.join(dir, 'vault.sqlite'));
const masterFile = path.join(dir, 'vault-master.key');
if (!process.env.KEY_VAULT_MASTER_KEY) {
  if (!(await exists(masterFile))) {
    if (hasDatabase)
      throw new Error('Existing vault master key is missing; restore the original key');
    await writeFile(masterFile, randomBytes(32).toString('base64'), { mode: 0o600, flag: 'wx' });
  }
  process.env.KEY_VAULT_MASTER_KEY = (await readFile(masterFile, 'utf8')).trim();
}
process.env.SOLANA_ISSUER_KEYPAIR ||= path.join(dir, 'issuer.json');
if (!(await exists(process.env.SOLANA_ISSUER_KEYPAIR))) {
  if (hasDatabase) throw new Error('Existing issuer key is missing; restore it before starting');
  await writeFile(
    process.env.SOLANA_ISSUER_KEYPAIR,
    JSON.stringify(Array.from(Keypair.generate().secretKey)),
    { mode: 0o600, flag: 'wx' },
  );
}
const config = loadConfig();
if (!config.adminWallet || new PublicKey(config.adminWallet).toBase58() !== config.adminWallet)
  throw new Error('Set ADMIN_WALLET to the reviewer public signing identity');
if (config.backend === 'solana' && !config.publisherAllowlist?.length)
  throw new Error('Set PUBLISHER_ALLOWLIST before enabling hosted Devnet publishing');
if (config.backend === 'solana') {
  const rpc = new Connection(config.rpc, 'finalized');
  if ((await rpc.getGenesisHash()) !== DEVNET_GENESIS)
    throw new Error('Hosted checkout requires Devnet');
  const program = await rpc.getAccountInfo(new PublicKey(config.programId));
  if (!program?.executable)
    throw new Error('Deploy the configured program on public Devnet before starting checkout');
}
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
Object.assign(process.env, { NODE_ENV: 'production' });
const children = [
  spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', String(port)],
    { stdio: 'inherit', env: process.env },
  ),
  spawn(process.execPath, ['--experimental-strip-types', 'scripts/worker.ts'], {
    stdio: 'inherit',
    env: process.env,
  }),
];
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  const timeout = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
    process.exit(code);
  }, 5000);
  Promise.all(
    children.map(
      (child) =>
        new Promise<void>((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) resolve();
          else child.once('exit', () => resolve());
        }),
    ),
  ).then(() => {
    clearTimeout(timeout);
    process.exit(code);
  });
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', () => {
    if (!stopping) stop(1);
  });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
console.log('Hosted web service and settlement worker started on the same persistent vault.');
