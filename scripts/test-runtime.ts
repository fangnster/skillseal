import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

if (process.platform !== 'linux' || process.arch !== 'x64' || !process.env.CI)
  throw new Error('Container acceptance runs on Linux x64 CI');
const dir = await mkdtemp(path.join(tmpdir(), 'skillseal-runtime-'));
const suffix = `${process.pid}-${Date.now()}`;
const image = `skillseal-runtime:${suffix}`;
const container = `skillseal-runtime-${suffix}`;
const volume = `skillseal-runtime-${suffix}`;
function docker(...args: string[]) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
const healthScript = `
const r=await fetch('http://127.0.0.1:3000/api/health');
const j=await r.json();
if(!r.ok||j.status!=='ready'||j.backend!=='disabled')throw new Error('Unready runtime');
const c=await fetch('http://127.0.0.1:3000/api/config').then(r=>r.json());
if(c.paidPublishing!==false||c.moderationRequired!==true)throw new Error('Wrong catalog configuration');
console.log(c.issuer);
`;
async function ready() {
  for (let n = 0; n < 45; n++) {
    try {
      return docker('exec', container, 'node', '--input-type=module', '-e', healthScript);
    } catch {
      if (docker('inspect', '-f', '{{.State.Running}}', container) !== 'true')
        throw new Error('Runtime container stopped before readiness');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Runtime readiness timeout');
}
try {
  const archive = path.resolve('site-dist/downloads/skillseal-server-0.2.0.tgz');
  execFileSync('tar', ['-xzf', archive, '-C', dir]);
  docker(
    'build',
    '-q',
    '-f',
    path.join(dir, 'deploy/aliyun/Dockerfile.prebuilt'),
    '-t',
    image,
    dir,
  );
  docker('volume', 'create', volume);
  docker(
    'run',
    '-d',
    '--name',
    container,
    '--network',
    'none',
    '--memory',
    '384m',
    '--cpus',
    '1',
    '--pids-limit',
    '128',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges:true',
    '-v',
    `${volume}:/var/lib/skillseal`,
    '-e',
    'APP_ORIGIN=https://skillseal.example',
    '-e',
    'PAYMENT_BACKEND=disabled',
    '-e',
    'PERSISTENT_STORAGE=1',
    '-e',
    'MODERATION_REQUIRED=1',
    '-e',
    'ADMIN_WALLET=F3ADhGzw3fwz4WfHntLvwinUVnva635sKZYSfLPGx6XZ',
    image,
  );
  const issuer = await ready();
  const fingerprintScript = `
const fs=require('node:fs'),crypto=require('node:crypto');
for(const name of ['vault-master.key','issuer.json']) {
const p='/var/lib/skillseal/'+name;
if((fs.statSync(p).mode&0o777)!==0o600)throw new Error('Private file permissions');
process.stdout.write(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'));
}
if(!fs.existsSync('/var/lib/skillseal/vault.sqlite'))throw new Error('Vault database missing');
`;
  const before = docker('exec', container, 'node', '-e', fingerprintScript);
  docker('restart', container);
  assert.equal(await ready(), issuer, 'Persistent issuer changed after restart');
  assert.equal(docker('exec', container, 'node', '-e', fingerprintScript), before);
  console.log(
    'Linux archive container passed: 384 MiB, no network, ready free catalog, private persistent keys unchanged after restart.',
  );
} catch (error) {
  try {
    console.error(docker('logs', '--tail', '60', container));
  } catch {
    /* Not created yet. */
  }
  throw error;
} finally {
  try {
    docker('rm', '-f', container);
  } catch {
    /* Disposable CI container only. */
  }
  try {
    docker('volume', 'rm', volume);
  } catch {
    /* Disposable CI test vault only. */
  }
  await rm(dir, { recursive: true, force: true });
}
