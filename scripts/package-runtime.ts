import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { sha256 } from '../src/crypto.ts';
// Explicit allowlist: runtime code + compiled pages, never .env, vaults or identities.
if (process.platform !== 'linux' || process.arch !== 'x64' || !process.env.CI)
  throw new Error('Build the deployment archive on the clean Linux x64 CI runner');
if (!/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || ''))
  throw new Error('A public source commit is required for the runtime archive');
await readFile('.next/BUILD_ID');
await readFile('node_modules/next/package.json');
const marker = '.skillseal-runtime.json';
await writeFile(
  marker,
  JSON.stringify({ platform: 'linux', arch: 'x64', sourceCommit: process.env.GITHUB_SHA }),
);
await mkdir('site-dist/downloads', { recursive: true });
const archive = 'site-dist/downloads/skillseal-server-0.2.0.tgz';
execFileSync(
  'tar',
  [
    '--exclude=.next/cache',
    '--exclude=.next/dev',
    '--exclude=.next/trace',
    '--exclude=deploy/aliyun/.env',
    '--exclude=*.tsbuildinfo',
    '--exclude=node_modules/.cache',
    '--exclude=**/.npmrc',
    '-czf',
    archive,
    'package.json',
    'pnpm-lock.yaml',
    'next.config.ts',
    'src',
    'scripts',
    'app',
    'public',
    '.next',
    'deploy',
    'LICENSE',
    'node_modules',
    marker,
  ],
  { stdio: 'pipe' },
);
await rm(marker);
const release = JSON.parse(await readFile('site-dist/downloads/release.json', 'utf8'));
Object.assign(release, {
  serverVersion: '0.2.0',
  serverSha256: sha256(await readFile(archive)),
  serverSourceCommit: process.env.GITHUB_SHA || 'local-review',
  serverArtifact: 'skillseal-server-0.2.0.tgz',
  serverPlatform:
    'Linux x64 glibc; compiled pages and production dependencies are bundled by CI. No dependency installation or Next compilation on the target host.',
});
await writeFile('site-dist/downloads/release.json', JSON.stringify(release, null, 2) + '\n');
console.log(
  'Allowlisted Linux runtime with dependencies built; private data and build cache excluded.',
);
