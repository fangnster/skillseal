import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { sha256 } from '../src/crypto.ts';
// Explicit allowlist: runtime code + compiled pages, never .env, vaults or identities.
await readFile('.next/BUILD_ID');
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
  ],
  { stdio: 'pipe' },
);
const release = JSON.parse(await readFile('site-dist/downloads/release.json', 'utf8'));
Object.assign(release, {
  serverVersion: '0.2.0',
  serverSha256: sha256(await readFile(archive)),
  serverSourceCommit: process.env.GITHUB_SHA || 'local-review',
  serverArtifact: 'skillseal-server-0.2.0.tgz',
  serverPlatform:
    'Build on the GitHub Linux runner for deployment; dependencies install on the target OS.',
});
await writeFile('site-dist/downloads/release.json', JSON.stringify(release, null, 2) + '\n');
console.log('Allowlisted runtime archive built; private data and build cache excluded.');
