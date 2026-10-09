import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import { DEVNET_GENESIS, type Version } from '../src/types.ts';
import { validateWalletTransaction } from '../src/transactions.ts';
import { decode64, encode64 } from '../src/browser-package.ts';
export type SigningIdentity = { address: string; secret?: Uint8Array };
export async function sodiumClient() {
  const s = (await import('libsodium-wrappers-sumo')).default;
  await s.ready;
  return s;
}
export async function connectIdentity(): Promise<SigningIdentity> {
  const w = window.phantom?.solana || window.solana || window.solflare;
  if (!w) throw new Error('Install Phantom or Solflare, or use a local identity for a free Skill');
  return { address: (await w.connect()).publicKey.toBase58() };
}
export async function createIdentity(): Promise<SigningIdentity> {
  const s = await sodiumClient(),
    p = s.crypto_sign_keypair();
  return { address: new PublicKey(p.publicKey).toBase58(), secret: p.privateKey };
}
export async function importIdentity(file: File): Promise<SigningIdentity> {
  if (file.size > 4096) throw new Error('Invalid identity file');
  const d = JSON.parse(await file.text());
  if (d.format !== 'skillseal-creator-v1') throw new Error('Invalid creator identity');
  const s = await sodiumClient(),
    key = decode64(d.secret);
  if (key.length !== 64) throw new Error('Invalid creator key');
  const pair = s.crypto_sign_seed_keypair(key.subarray(0, 32)),
    address = new PublicKey(pair.publicKey).toBase58();
  if (encode64(pair.privateKey) !== d.secret || address !== d.address)
    throw new Error('Creator key does not match the public identity');
  return { address, secret: key };
}
export async function signMessage(identity: SigningIdentity, message: string) {
  if (identity.secret) {
    const s = await sodiumClient();
    return encode64(s.crypto_sign_detached(new TextEncoder().encode(message), identity.secret));
  }
  const w = window.phantom?.solana || window.solana || window.solflare;
  if (!w || (await w.connect()).publicKey.toBase58() !== identity.address)
    throw new Error('Connect the selected author wallet');
  return encode64((await w.signMessage(new TextEncoder().encode(message))).signature);
}
export async function approveTransaction(
  encoded: string,
  identity: SigningIdentity,
  version: Version,
  config: { programId: string; issuer: string },
) {
  if (identity.secret) throw new Error('Paid Devnet author approval requires a wallet extension');
  const w = window.phantom?.solana || window.solana || window.solflare;
  if (!w || (await w.connect()).publicKey.toBase58() !== identity.address)
    throw new Error('Connect the selected author wallet');
  const tx = Transaction.from(decode64(encoded));
  validateWalletTransaction(
    tx,
    config.programId,
    config.issuer,
    version,
    identity.address,
    'approve',
  );
  const rpc = new Connection('https://api.devnet.solana.com', 'finalized');
  if ((await rpc.getGenesisHash()) !== DEVNET_GENESIS) throw new Error('Expected Solana Devnet');
  const signed = await w.signTransaction(tx),
    signature = await rpc.sendRawTransaction(signed.serialize(), { skipPreflight: false });
  for (let n = 0; n < 45; n++) {
    const st = (await rpc.getSignatureStatuses([signature])).value[0];
    if (st?.err) throw new Error('Approval failed; sync the version before retrying');
    if (st?.confirmationStatus === 'finalized') return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Approval submitted; confirmation pending. Sync before trying again.');
}
