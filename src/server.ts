import { readFileSync } from 'node:fs';
import { Keypair } from '@solana/web3.js';
import { loadConfig } from './config.ts';
import { Store } from './store.ts';
import { MockPayment } from './mock-payment.ts';
import { DisabledPayment } from './disabled-payment.ts';
import { SolanaPayment } from './solana-payment.ts';
import { VaultService } from './service.ts';
type Context = { service: VaultService; config: ReturnType<typeof loadConfig> };
const globalContext = globalThis as typeof globalThis & { skillVaultContext?: Context };
export function server(): Context {
  if (globalContext.skillVaultContext) return globalContext.skillVaultContext;
  const config = loadConfig(),
    store = new Store(config.dataDir, config.masterKey);
  const issuer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(config.issuerPath, 'utf8'))),
  ).publicKey.toBase58();
  const payments =
    config.backend === 'mock'
      ? new MockPayment(store, issuer)
      : config.backend === 'disabled'
        ? new DisabledPayment(issuer)
        : new SolanaPayment(config);
  const service = new VaultService(store, payments, config.origin, {
    moderationRequired: config.moderationRequired,
    adminWallet: config.adminWallet || issuer,
    publisherAllowlist: config.publisherAllowlist,
  });
  return (globalContext.skillVaultContext = { service, config });
}
