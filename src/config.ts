import path from 'node:path';
import { fromBase64 } from './crypto.ts';
export type Config = {
  origin: string;
  dataDir: string;
  masterKey: Buffer;
  backend: 'solana' | 'mock';
  rpc: string;
  programId: string;
  issuerPath: string;
};
export function loadConfig(): Config {
  const origin = new URL(process.env.APP_ORIGIN || 'http://127.0.0.1:3000').origin;
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname);
  const backend = process.env.PAYMENT_BACKEND || 'solana';
  if (backend !== 'solana' && backend !== 'mock') throw new Error('Unsupported payment backend');
  if (
    backend === 'mock' &&
    (process.env.LOCAL_DEMO !== '1' || !loopback || process.env.NODE_ENV === 'production')
  )
    throw new Error(
      'Mock payments require LOCAL_DEMO=1, a loopback origin, and non-production mode',
    );
  if (!loopback && new URL(origin).protocol !== 'https:')
    throw new Error('Remote deployments require HTTPS');
  if (!process.env.KEY_VAULT_MASTER_KEY)
    throw new Error('Run pnpm run setup to provision the encryption key vault');
  return {
    origin,
    dataDir: path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || '.data'),
    masterKey: fromBase64(process.env.KEY_VAULT_MASTER_KEY, 32),
    backend,
    rpc: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    programId: process.env.SOLANA_PROGRAM_ID || '',
    issuerPath: path.resolve(
      /*turbopackIgnore: true*/ process.env.SOLANA_ISSUER_KEYPAIR || '.data/issuer.json',
    ),
  };
}
