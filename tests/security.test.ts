import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { encrypt, decrypt, encryptionKeypair, sealKey, openKey } from '../src/crypto.ts';
import { pack, parseBundle, install, safePath } from '../src/bundle.ts';
import { loadConfig } from '../src/config.ts';

test('AES-GCM authenticates ciphertext, key and context', () => {
  const plain = Buffer.from('private skill instructions'),
    e = encrypt(plain);
  assert.deepEqual(decrypt(e.ciphertext, e.key), plain);
  assert.throws(() => decrypt(e.ciphertext, randomBytes(32)));
  const tampered = Buffer.from(e.ciphertext);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decrypt(tampered, e.key));
  assert.throws(() => decrypt(e.ciphertext, e.key, 'another-version'));
});
test('sealed content keys are only accessible with the bound encryption key', async () => {
  const a = await encryptionKeypair(),
    b = await encryptionKeypair(),
    key = randomBytes(32),
    sealed = await sealKey(key, a.publicKey);
  assert.deepEqual(await openKey(sealed, a.publicKey, a.privateKey), key);
  await assert.rejects(() => openKey(sealed, b.publicKey, b.privateKey));
});
test('unsafe paths, duplicate names and file/directory collisions are rejected', () => {
  for (const name of [
    '../outside',
    '/absolute',
    'C:/outside',
    'a\\b',
    'a//b',
    'a/./b',
    'a/../b',
    'a\0b',
  ])
    assert.throws(() => safePath(name));
  const make = (files: any[]) =>
    Buffer.from(JSON.stringify({ format: 'skill-vault-files-v1', files }));
  const skill = { path: 'SKILL.md', data: Buffer.from('instructions').toString('base64') };
  assert.throws(() => parseBundle(make([skill, { ...skill, path: 'skill.md' }])));
  assert.throws(() =>
    parseBundle(make([skill, { path: 'a', data: '' }, { path: 'a/b', data: '' }])),
  );
  assert.throws(() => parseBundle(make([{ path: 'asset.txt', data: '' }])));
});
test('pack rejects symlinks; installation is offline, atomic and executes no scripts', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'sv-install-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'source');
  await mkdir(source);
  await writeFile(path.join(source, 'SKILL.md'), 'private instructions');
  await writeFile(path.join(source, 'run.sh'), 'touch ' + path.join(dir, 'EXECUTED'));
  const bundle = await pack(source),
    target = path.join(dir, 'installed');
  await install(bundle, target);
  assert.equal(await readFile(path.join(target, 'SKILL.md'), 'utf8'), 'private instructions');
  await assert.rejects(() => readFile(path.join(dir, 'EXECUTED')));
  await assert.rejects(() => install(bundle, target), /Destination already exists/);
  await symlink(path.join(source, 'SKILL.md'), path.join(source, 'link'));
  await assert.rejects(() => pack(source), /Symlinks/);
});
test('mock payments cannot be selected remotely or in production', () => {
  const saved = { ...process.env };
  try {
    process.env.KEY_VAULT_MASTER_KEY = randomBytes(32).toString('base64');
    process.env.PAYMENT_BACKEND = 'mock';
    process.env.LOCAL_DEMO = '1';
    process.env.APP_ORIGIN = 'https://example.com';
    assert.throws(() => loadConfig(), /Mock payments require/);
    process.env.APP_ORIGIN = 'http://127.0.0.1:3000';
    Object.assign(process.env, { NODE_ENV: 'production' });
    assert.throws(() => loadConfig(), /Mock payments require/);
    Object.assign(process.env, { NODE_ENV: 'test' });
    assert.equal(loadConfig().backend, 'mock');
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
});
