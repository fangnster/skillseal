import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const root = await mkdtemp(path.join(tmpdir(), 'skillseal-release-test-'));
const archive = path.resolve('site-dist/downloads/skillseal-cli-0.2.0.tgz');
const sample = await readFile('site-dist/downloads/research-brief-v1.bundle.json');
function run(command: string, args: string[], cwd = root) {
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, pnpm_config_verify_deps_before_run: 'false' },
    });
    let output = '';
    child.stdout.on('data', (value) => (output += value));
    child.stderr.on('data', (value) => (output += value));
    child.once('error', reject);
    child.once('exit', (code) => resolve({ code, output }));
  });
}
let http: ReturnType<typeof createServer> | undefined;
try {
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ private: true }));
  const installed = await run('pnpm', ['add', '--ignore-scripts', archive]);
  assert.equal(installed.code, 0, installed.output);
  const bin = path.join(root, 'node_modules/@fangnster/skillseal-cli/bin/skillseal.mjs');
  const help = await run(process.execPath, [bin, '--help']);
  assert.equal(help.code, 0, help.output);
  assert.match(help.output, /SkillSeal CLI/);
  http = createServer((req, res) => {
    if (req.url === '/project/downloads/research-brief-v1.bundle.json') res.end(sample);
    else {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((resolve) => http!.listen(0, '127.0.0.1', resolve));
  const address = http.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/project`;
  const destination = path.join(root, 'installed-skill');
  const first = await run(process.execPath, [
    bin,
    'sample',
    '--server',
    base,
    '--destination',
    destination,
  ]);
  assert.equal(first.code, 0, first.output);
  assert.match(first.output, /MIT licensed/);
  assert.match(await readFile(path.join(destination, 'SKILL.md'), 'utf8'), /Research Brief/);
  const duplicate = await run(process.execPath, [
    bin,
    'sample',
    '--server',
    base,
    '--destination',
    destination,
  ]);
  assert.equal(duplicate.code, 1);
  assert.match(duplicate.output, /Destination already exists/);
  console.log(
    'Standalone release installed in a clean directory: help, HTTP project-path download, hash verification, local files and overwrite refusal passed.',
  );
} finally {
  if (http) await new Promise<void>((resolve) => http!.close(() => resolve()));
  await rm(root, { recursive: true, force: true });
}
