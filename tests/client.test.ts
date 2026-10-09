import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { serverOrigin, distributionBase, orderId, parseSession, download } from '../src/client.ts';
import { pack } from '../src/bundle.ts';
import { sha256, encryptionKeypair } from '../src/crypto.ts';
import { SAMPLE_SHA256 } from '../src/sample.ts';

test('remote client rejects credentials, paths and non-HTTPS origins', () => {
  assert.equal(serverOrigin('https://example.com/'), 'https://example.com');
  assert.equal(serverOrigin('http://127.0.0.1:3000'), 'http://127.0.0.1:3000');
  for (const value of [
    'http://example.com',
    'https://user:secret@example.com',
    'https://example.com/api',
    'https://example.com?token=x',
    'https://example.com#x',
    'file:///tmp/x',
    'ftp://localhost',
  ])
    assert.throws(() => serverOrigin(value));
});
test('order IDs cannot escape the private session directory', () => {
  for (const value of ['../../outside', '..', 'x/y', 'not-an-id', null])
    assert.throws(() => orderId(value));
  assert.equal(
    orderId('d1d66777-fbdd-4eb3-9fa1-9fa26941f180'),
    'd1d66777-fbdd-4eb3-9fa1-9fa26941f180',
  );
});
test('recovery sessions require an explicit secure origin and valid encryption keys', async () => {
  const keys = await encryptionKeypair();
  const value = {
    orderId: 'd1d66777-fbdd-4eb3-9fa1-9fa26941f180',
    origin: 'https://example.com/',
    ...keys,
  };
  assert.equal(parseSession(value).origin, 'https://example.com');
  assert.throws(() => parseSession({ ...value, privateKey: 'invalid' }));
  assert.throws(() => parseSession({ ...value, origin: 'http://untrusted.test' }));
});
test('sample download refuses oversized content and cross-origin redirects', async (t) => {
  const http = createServer((req, res) => {
    if (req.url === '/redirect') {
      res.writeHead(302, { Location: 'https://example.com' });
      res.end();
    } else res.end('too many bytes');
  });
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve) => http.close(() => resolve())));
  const address = http.address() as { port: number };
  const origin = `http://127.0.0.1:${address.port}`;
  await assert.rejects(() => download(origin, 4), /size limit/);
  await assert.rejects(() => download(origin + '/redirect'));
});
test('the public sample is pinned to the reviewed MIT source package', async () => {
  assert.equal(sha256(await pack('examples/research-brief')), SAMPLE_SHA256);
});
// CLI subprocesses are asynchronous so the fixture HTTP server can actually serve them.
import { spawn } from 'node:child_process';
test('CLI installs the remote sample, refuses overwrite and detects tampering', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'skillseal-client-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bundle = await pack('examples/research-brief');
  let tamper = false;
  const http = createServer((_req, res) => res.end(tamper ? Buffer.from('tampered') : bundle));
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve) => http.close(() => resolve())));
  const address = http.address() as { port: number };
  const origin = `http://127.0.0.1:${address.port}`;
  const run = (dest: string) =>
    new Promise<{ code: number | null; text: string }>((resolve) => {
      const child = spawn(
        process.execPath,
        [
          '--experimental-strip-types',
          'cli/index.ts',
          'sample',
          '--server',
          origin,
          '--destination',
          dest,
        ],
        { env: { ...process.env, APP_ORIGIN: '' } },
      );
      let text = '';
      child.stdout.on('data', (v) => (text += v));
      child.stderr.on('data', (v) => (text += v));
      child.once('exit', (code) => resolve({ code, text }));
    });
  const dest = path.join(root, 'installed');
  const first = await run(dest);
  assert.equal(first.code, 0, first.text);
  assert.match(first.text, /MIT licensed/);
  assert.match(await readFile(path.join(dest, 'SKILL.md'), 'utf8'), /Research Brief/);
  const second = await run(dest);
  assert.equal(second.code, 1);
  assert.match(second.text, /Destination already exists/);
  tamper = true;
  const third = await run(path.join(root, 'tampered'));
  assert.equal(third.code, 1);
  assert.match(third.text, /integrity check failed/);
});

test('static distribution supports a project path without relaxing paid API origins', () => {
  assert.equal(distributionBase('https://example.com/skillseal/'), 'https://example.com/skillseal');
  assert.throws(() => serverOrigin('https://example.com/skillseal/'));
  for (const u of [
    'https://user:secret@example.com/project',
    'https://example.com/project?token=x',
    'http://remote.test/project',
    'https://example.com/%2Fsecret',
  ])
    assert.throws(() => distributionBase(u));
});
