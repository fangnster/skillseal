import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { Keypair } from '@solana/web3.js';
import { Store } from '../src/store.ts';
import { VaultService } from '../src/service.ts';
import { DisabledPayment } from '../src/disabled-payment.ts';
import {
  canonical,
  encrypt,
  decrypt,
  sha256,
  signWallet,
  versionMessage,
  encryptionKeypair,
} from '../src/crypto.ts';
import { DEVNET_USDC, type Manifest } from '../src/types.ts';
import {
  encryptPackage,
  decryptPackage,
  zipBundle,
  checkedBundle,
} from '../src/browser-package.ts';
async function fixture(t: TestContext, price = '0') {
  const dir = await mkdtemp(path.join(tmpdir(), 'ss-catalog-')),
    master = randomBytes(32),
    store = new Store(dir, master),
    author = Keypair.generate(),
    admin = Keypair.generate(),
    issuer = Keypair.generate();
  t.after(async () => {
    store.close();
    await rm(dir, { recursive: true, force: true });
  });
  const service = new VaultService(
      store,
      new DisabledPayment(issuer.publicKey.toBase58()),
      'https://catalog.example',
      { moderationRequired: true, adminWallet: admin.publicKey.toBase58() },
    ),
    plain = Buffer.from(
      canonical({
        format: 'skill-vault-files-v1',
        files: [
          { path: 'SKILL.md', data: Buffer.from('Useful instructions').toString('base64') },
          { path: 'references/review.md', data: Buffer.from('Verify sources').toString('base64') },
        ],
      }),
    ),
    e = encrypt(plain);
  const manifest: Manifest = {
      skillId: 'test-release',
      name: 'Test release',
      description: 'A useful test',
      version: '1.0.0',
      price,
      mint: DEVNET_USDC,
      splits: [{ wallet: author.publicKey.toBase58(), bps: 10000 }],
      license: 'MIT: use, copy, modify and distribute.',
      bundleHash: sha256(e.ciphertext),
      contentHash: sha256(plain),
      publisher: author.publicKey.toBase58(),
      issuer: issuer.publicKey.toBase58(),
    },
    id = sha256(canonical(manifest));
  const input = {
      manifest,
      bundle: e.ciphertext.toString('base64'),
      key: e.key.toString('base64'),
      signature: await signWallet(versionMessage(id, service.origin), author.secretKey),
    },
    v = await service.publish(input);
  async function approve() {
    return service.approve(
      id,
      author.publicKey.toBase58(),
      await signWallet(versionMessage(id, service.origin), author.secretKey),
    );
  }
  async function review(decision = 'approved') {
    const c = service.reviewChallenge(id, admin.publicKey.toBase58(), decision),
      signature = await signWallet(c.message, admin.secretKey);
    return { c, signature, result: await service.review(id, c.id, signature) };
  }
  return { dir, store, master, service, author, admin, plain, input, v, approve, review };
}
test('free catalog requires author approval and operator review, downloads exact files and survives restart', async (t) => {
  const f = await fixture(t);
  assert.throws(() => f.service.freeBundle(f.v.id), /approved/);
  await f.approve();
  assert.equal(f.service.version(f.v.id).active, false);
  await f.review();
  assert.deepEqual(f.service.freeBundle(f.v.id), f.plain);
  assert.equal(f.store.orders().length, 0);
  f.store.close();
  f.store.db = new Store(f.dir, f.master).db;
  assert.deepEqual(f.service.freeBundle(f.v.id), f.plain);
  await f.review('rejected');
  assert.throws(() => f.service.freeBundle(f.v.id), /approved/);
});
test('review signatures reject impostors, replay, expired challenges and decision substitution', async (t) => {
  const f = await fixture(t),
    evil = Keypair.generate();
  assert.throws(
    () => f.service.reviewChallenge(f.v.id, evil.publicKey.toBase58(), 'approved'),
    /reviewer/,
  );
  const c = f.service.reviewChallenge(f.v.id, f.admin.publicKey.toBase58(), 'approved');
  await assert.rejects(() => f.service.review(f.v.id, c.id, f.input.signature), /authorization/);
  const signature = await signWallet(c.message, f.admin.secretKey);
  await f.service.review(f.v.id, c.id, signature);
  await assert.rejects(() => f.service.review(f.v.id, c.id, signature), /authorization/);
  const expired = f.service.reviewChallenge(f.v.id, f.admin.publicKey.toBase58(), 'rejected');
  f.store.run('UPDATE challenges SET expires=0 WHERE id=?', expired.id);
  await assert.rejects(
    async () =>
      f.service.review(f.v.id, expired.id, await signWallet(expired.message, f.admin.secretKey)),
    /authorization/,
  );
});
test('reviewers inspect encrypted packages with single-use authorization; inspection does not approve', async (t) => {
  const f = await fixture(t),
    c = f.service.reviewChallenge(f.v.id, f.admin.publicKey.toBase58(), 'inspect'),
    signature = await signWallet(c.message, f.admin.secretKey);
  await assert.rejects(() => f.service.review(f.v.id, c.id, signature), /authorization/);
  const preview = await f.service.reviewPreview(f.v.id, c.id, signature);
  assert.deepEqual(Buffer.from(preview.bundle, 'base64'), f.plain);
  assert.equal(f.service.version(f.v.id).reviewStatus, 'pending');
  await assert.rejects(() => f.service.reviewPreview(f.v.id, c.id, signature), /authorization/);
});
test('disabled checkout can store a priced draft but never grants payment or leaks paid content', async (t) => {
  const f = await fixture(t, '1000000');
  await f.approve();
  await f.review();
  assert.equal(f.service.version(f.v.id).active, false);
  assert.throws(() => f.service.freeBundle(f.v.id), /approved/);
  await assert.rejects(
    async () => f.service.createOrder(f.v.id, (await encryptionKeypair()).publicKey),
    /not enabled/,
  );
  assert.equal(f.store.orders().length, 0);
});
test('free release digest and storage quota are checked before saving a version', async (t) => {
  const f = await fixture(t);
  const m = { ...f.input.manifest, version: '1.0.1', contentHash: 'f'.repeat(64) },
    input = {
      ...f.input,
      manifest: m,
      signature: await signWallet(
        versionMessage(sha256(canonical(m)), f.service.origin),
        f.author.secretKey,
      ),
    };
  await assert.rejects(() => f.service.publish(input), /Encrypted package/);
  const good = { ...m, contentHash: f.input.manifest.contentHash! };
  input.manifest = good;
  input.signature = await signWallet(
    versionMessage(sha256(canonical(good)), f.service.origin),
    f.author.secretKey,
  );
  f.service.options.storageLimitBytes = 1;
  await assert.rejects(() => f.service.publish(input), /storage limit/);
  assert.equal(f.store.versions().length, 1);
});
test('browser AES format interoperates with server encryption and ZIP files are portable', async () => {
  const plain = new TextEncoder().encode(
    canonical({
      format: 'skill-vault-files-v1',
      files: [
        { path: 'SKILL.md', data: btoa('Instructions') },
        { path: 'references/notes.md', data: btoa('Sources') },
      ],
    }),
  );
  const browser = await encryptPackage(plain);
  assert.deepEqual(decrypt(browser.ciphertext, browser.key), Buffer.from(plain));
  const server = encrypt(plain);
  assert.deepEqual(
    Buffer.from(await decryptPackage(server.ciphertext, server.key)),
    Buffer.from(plain),
  );
  const tampered = new Uint8Array(browser.ciphertext);
  tampered[35] ^= 1;
  await assert.rejects(() => decryptPackage(tampered, browser.key));
  const zip = zipBundle(checkedBundle(plain));
  assert.equal(new DataView(zip.buffer).getUint32(0, true), 0x04034b50);
  const dir = await mkdtemp(path.join(tmpdir(), 'ss-zip-'));
  try {
    await writeFile(path.join(dir, 'test.zip'), zip);
    const { execFileSync } = await import('node:child_process');
    const python = process.env.TEST_PYTHON || '/usr/bin/python3';
    assert.equal(
      execFileSync(
        python,
        [
          '-c',
          'import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert z.read("SKILL.md")==b"Instructions";assert z.read("references/notes.md")==b"Sources";print("ok")',
          path.join(dir, 'test.zip'),
        ],
        { encoding: 'utf8' },
      ).trim(),
      'ok',
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
