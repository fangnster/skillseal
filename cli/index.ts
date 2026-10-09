import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { Keypair, Connection, Transaction } from '@solana/web3.js';
import { pack, install } from '../src/bundle.ts';
import {
  encrypt,
  decrypt,
  sha256,
  canonical,
  encryptionKeypair,
  openKey,
  signWallet,
  versionMessage,
} from '../src/crypto.ts';
import { DEVNET_GENESIS, type Version, type Manifest, type Order } from '../src/types.ts';
import { validateWalletTransaction } from '../src/transactions.ts';
import {
  serverOrigin,
  distributionBase,
  orderId,
  versionId,
  parseSession,
  download,
  type Session,
} from '../src/client.ts';
import { SAMPLE_SHA256 } from '../src/sample.ts';

const args = process.argv.slice(2),
  command = args.shift(),
  flags = new Map<string, string>();
const positional: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--'))
    flags.set(args[i].slice(2), args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : '1');
  else positional.push(args[i]);
}
let origin = (command === 'sample' ? distributionBase : serverOrigin)(
  flags.get('server') || process.env.APP_ORIGIN || 'http://127.0.0.1:3000',
);
async function request<T = any>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(
    origin + '/api/' + url,
    body === undefined
      ? { signal: AbortSignal.timeout(30000), redirect: 'error' }
      : {
          signal: AbortSignal.timeout(30000),
          redirect: 'error',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API request failed');
  return data;
}
async function wallet(file?: string) {
  if (!file) throw new Error('--wallet keypair.json is required for this command');
  const values = JSON.parse(await readFile(file, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(values));
}
async function broadcast(
  encoded: string,
  signer: Keypair,
  config: { programId: string; issuer: string },
  version: Version,
  action: 'pay' | 'refund' | 'approve',
  order?: Order,
) {
  const connection = new Connection('https://api.devnet.solana.com', 'finalized');
  if ((await connection.getGenesisHash()) !== DEVNET_GENESIS) throw new Error('Expected Devnet');
  const tx = Transaction.from(Buffer.from(encoded, 'base64'));
  validateWalletTransaction(
    tx,
    config.programId,
    config.issuer,
    version,
    signer.publicKey.toBase58(),
    action,
    order,
  );
  tx.sign(signer);
  const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  for (let i = 0; i < 90; i++) {
    const status = (await connection.getSignatureStatuses([signature])).value[0];
    if (status?.err) throw new Error('Devnet transaction failed');
    if (status?.confirmationStatus === 'finalized') return signature;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Finality still pending. Resume the existing order instead of paying again.');
}
async function finish(session: Session, destination: string) {
  const result = await request<{ envelope: string; versionId: string }>(
      'orders/' + session.orderId + '/claim',
      {},
    ),
    version = await request<Version>('versions/' + versionId(result.versionId));
  const bytes = session.encryptedBundle
    ? Buffer.from(session.encryptedBundle, 'base64')
    : session.bundlePath
      ? await readFile(session.bundlePath)
      : await download(origin + '/api/versions/' + versionId(result.versionId) + '/bundle');
  if (sha256(bytes) !== version.manifest.bundleHash)
    throw new Error('Encrypted bundle hash mismatch');
  const key = await openKey(result.envelope, session.publicKey, session.privateKey);
  let plain: Buffer | undefined;
  try {
    plain = decrypt(bytes, key);
    const target = await install(plain, destination);
    console.log(
      `Installed ${version.manifest.name} v${version.manifest.version} at ${target}. No scripts were executed.`,
    );
  } finally {
    key.fill(0);
    plain?.fill(0);
  }
}
async function approve(version: Version, signer: Keypair) {
  const result = await request('versions/' + version.id + '/approve', {
    wallet: signer.publicKey.toBase58(),
    signature: await signWallet(versionMessage(version.id, origin), signer.secretKey),
  });
  if (result.transaction) {
    const config = await request('config');
    await broadcast(result.transaction, signer, config, version, 'approve');
  }
  return request<Version>('versions/' + version.id + '/sync', {});
}
async function main() {
  if (command === 'sample') {
    const bytes = await download(origin + '/downloads/research-brief-v1.bundle.json');
    if (sha256(bytes) !== SAMPLE_SHA256) throw new Error('Sample integrity check failed');
    const target = await install(bytes, flags.get('destination') || './skills/research-brief');
    console.log(
      `Installed Research Brief v1.0.0 at ${target}. MIT licensed; no payment, scripts or wallet required.`,
    );
    console.log(
      'Open SKILL.md with your agent tool, supply your own source notes, and use references/review-checklist.md to review its output.',
    );
    return;
  }
  if (command === 'list') {
    const versions = await request<Version[]>('versions');
    for (const v of versions)
      console.log(
        `${v.id}  ${v.manifest.name}@${v.manifest.version}  ${Number(v.manifest.price) / 1e6} USDC  ${v.active ? 'active' : 'awaiting approvals'}`,
      );
    return;
  }
  if (command === 'publish') {
    const signer = await wallet(flags.get('wallet')),
      config = await request('config');
    const source = flags.get('skill'),
      manifestFile = flags.get('manifest');
    if (!source || !manifestFile)
      throw new Error(
        'Use publish --skill directory --manifest manifest.json --wallet author.json',
      );
    const packed = await pack(source),
      encrypted = encrypt(packed);
    packed.fill(0);
    const metadata = JSON.parse(await readFile(manifestFile, 'utf8'));
    const manifest: Manifest = {
      ...metadata,
      publisher: signer.publicKey.toBase58(),
      issuer: config.issuer,
      bundleHash: sha256(encrypted.ciphertext),
    };
    const id = sha256(canonical(manifest));
    console.log(
      `Immutable version ID: ${id}. If registration is interrupted, use this ID to resume author approval.`,
    );
    let version: Version;
    try {
      version = await request<Version>('versions', {
        manifest,
        bundle: encrypted.ciphertext.toString('base64'),
        key: encrypted.key.toString('base64'),
        signature: await signWallet(versionMessage(id, origin), signer.secretKey),
      });
    } finally {
      encrypted.key.fill(0);
    }
    const approved = await approve(version, signer);
    console.log(`Version ${approved.id}: ${approved.active ? 'active' : 'awaiting other authors'}`);
    return;
  }
  if (command === 'approve') {
    const version = await request<Version>('versions/' + versionId(positional[0]));
    const updated = await approve(version, await wallet(flags.get('wallet')));
    console.log(`Version ${updated.id}: ${updated.active ? 'active' : 'awaiting other authors'}`);
    return;
  }
  if (command === 'metrics') {
    console.log(JSON.stringify(await request('metrics'), null, 2));
    return;
  }
  if (command === 'refund') {
    const signer = await wallet(flags.get('wallet')),
      order = await request<Order>('orders/' + orderId(positional[0]));
    if (order.buyer !== signer.publicKey.toBase58())
      throw new Error('Original buyer wallet required');
    const result = await request('orders/' + order.id + '/refund', {}),
      config = await request('config');
    if (config.backend !== 'solana')
      throw new Error('Refund CLI targets Devnet; use the local demo test for mock refunds');
    const version = await request<Version>('versions/' + order.versionId);
    await broadcast(result.transaction, signer, config, version, 'refund', order);
    console.log(await request('orders/' + order.id + '/sync', {}));
    return;
  }
  if (command === 'resume') {
    const file = flags.get('session');
    if (!file) throw new Error('--session session.json required');
    const session = parseSession(JSON.parse(await readFile(file, 'utf8')));
    origin = session.origin;
    const order = await request<Order>('orders/' + session.orderId),
      version = await request<Version>('versions/' + order.versionId);
    if (order.encryptionPublicKey !== session.publicKey)
      throw new Error('Recovery session does not match the order');
    await finish(
      session,
      flags.get('destination') ||
        path.join('skills', version.manifest.skillId + '@' + version.manifest.version),
    );
    return;
  }
  if (command === 'install') {
    if (!positional[0]) throw new Error('Use install <version hash> --destination directory');
    const version = await request<Version>('versions/' + versionId(positional[0]));
    const waitSeconds = Number(flags.get('wait-seconds') || 300);
    if (!Number.isFinite(waitSeconds) || waitSeconds < 0 || waitSeconds > 3600)
      throw new Error('--wait-seconds must be between 0 and 3600');
    const bytes = await download(origin + '/api/versions/' + versionId(version.id) + '/bundle');
    if (sha256(bytes) !== version.manifest.bundleHash)
      throw new Error('Encrypted bundle hash mismatch');
    const keys = await encryptionKeypair(),
      order = await request<Order>('orders', {
        versionId: version.id,
        encryptionPublicKey: keys.publicKey,
      });
    orderId(order.id);
    if (order.versionId !== version.id || order.encryptionPublicKey !== keys.publicKey)
      throw new Error('Order does not match this installation session');
    const dir = path.resolve(process.env.DATA_DIR || '.data', 'sessions');
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const bundlePath = path.join(dir, order.id + '.enc'),
      sessionFile = path.join(dir, order.id + '.json');
    const session: Session = {
      orderId: order.id,
      origin,
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      bundlePath,
    };
    await writeFile(bundlePath, bytes, { mode: 0o600, flag: 'wx' });
    await writeFile(sessionFile, JSON.stringify(session), { mode: 0o600, flag: 'wx' });
    console.log(`Encrypted bundle downloaded. Recovery session: ${sessionFile}`);
    const checkout = origin + '/checkout/' + order.id;
    if (flags.has('demo-wallet') || flags.has('wallet')) {
      const signer = await wallet(flags.get('demo-wallet') || flags.get('wallet')),
        config = await request('config');
      const challenge = await request('orders/' + order.id + '/challenge', {
        wallet: signer.publicKey.toBase58(),
      });
      await request('orders/' + order.id + '/bind', {
        challengeId: challenge.id,
        signature: await signWallet(challenge.message, signer.secretKey),
      });
      const payment = await request('orders/' + order.id + '/pay', {});
      if (config.backend === 'mock') {
        if (!flags.has('demo-wallet'))
          throw new Error('Mock purchases require the explicit --demo-wallet option');
        if (!payment.alreadyPurchased) await request('demo/' + order.id + '/fund', {});
      } else {
        if (flags.has('demo-wallet'))
          throw new Error('--demo-wallet is never accepted for a Solana payment');
        if (payment.transaction)
          await broadcast(payment.transaction, signer, config, version, 'pay', order);
      }
    } else {
      console.log(`Open checkout: ${checkout}`);
      if (!flags.has('no-open'))
        execFile(
          process.platform === 'darwin'
            ? 'open'
            : process.platform === 'win32'
              ? 'cmd'
              : 'xdg-open',
          process.platform === 'win32' ? ['/c', 'start', '', checkout] : [checkout],
          () => {},
        );
    }
    const deadline = Date.now() + waitSeconds * 1000;
    while (Date.now() < deadline) {
      const state = await request<Order>('orders/' + order.id + '/sync', {});
      if (state.status === 'granted') {
        await finish(
          session,
          flags.get('destination') ||
            path.join('skills', version.manifest.skillId + '@' + version.manifest.version),
        );
        return;
      }
      if (state.status === 'refunded') throw new Error('Order refunded');
      await new Promise((r) => setTimeout(r, 2000));
    }
    console.log(
      `Purchase is still pending. Resume with: skillseal resume --session ${sessionFile}`,
    );
    return;
  }
  console.log(
    'SkillSeal CLI (Node.js 24+)\n  sample --server https://your-site --destination ./skills/research-brief\n  list\n  publish --skill directory --manifest manifest.json --wallet author.json\n  approve <version hash> --wallet author.json\n  install <version hash> --destination directory [--wallet devnet.json]\n  resume --session session.json --destination directory\n  refund <order id> --wallet buyer.json\n  metrics',
  );
}
main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
