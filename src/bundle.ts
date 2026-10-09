import {
  lstat,
  readdir,
  readFile,
  mkdir,
  mkdtemp,
  writeFile,
  rename,
  rm,
  realpath,
} from 'node:fs/promises';
import path from 'node:path';
import { canonical, fromBase64 } from './crypto.ts';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 500;
type Bundle = { format: 'skill-vault-files-v1'; files: { path: string; data: string }[] };
export function safePath(name: string) {
  if (
    !name ||
    name.length > 240 ||
    name.includes('\\') ||
    /[\x00-\x1f:]/.test(name) ||
    name.startsWith('/') ||
    name.split('/').some((s) => !s || s === '.' || s === '..') ||
    path.posix.normalize(name) !== name
  )
    throw new Error('Unsafe bundle path');
  if (
    name
      .split('/')
      .some(
        (s) =>
          /[. ]$/.test(s) ||
          /[<>|?*]/.test(s) ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s),
      )
  )
    throw new Error('Unsafe portable bundle path');
  return name;
}
export function parseBundle(bytes: Uint8Array): Bundle {
  if (bytes.length > MAX_BYTES * 1.5) throw new Error('Bundle too large');
  const bundle = JSON.parse(Buffer.from(bytes).toString('utf8')) as Bundle;
  if (
    bundle.format !== 'skill-vault-files-v1' ||
    !Array.isArray(bundle.files) ||
    bundle.files.length < 1 ||
    bundle.files.length > MAX_FILES
  )
    throw new Error('Invalid bundle');
  const seen = new Set<string>();
  let total = 0;
  for (const file of bundle.files) {
    if (typeof file.path !== 'string' || typeof file.data !== 'string')
      throw new Error('Invalid bundle file');
    safePath(file.path);
    // Case folding also prevents collisions on default macOS/Windows filesystems.
    const folded = file.path.normalize('NFC').toLowerCase();
    if (seen.has(folded)) throw new Error('Duplicate bundle path');
    seen.add(folded);
    total += fromBase64(file.data).length;
    if (total > MAX_BYTES) throw new Error('Bundle too large');
  }
  for (const name of seen)
    for (const other of seen)
      if (name !== other && other.startsWith(name + '/'))
        throw new Error('File/directory collision');
  const skill = bundle.files.find((f) => f.path === 'SKILL.md');
  if (!skill || !fromBase64(skill.data).toString('utf8').trim())
    throw new Error('A nonempty SKILL.md is required at the bundle root');
  return bundle;
}
export async function pack(directory: string): Promise<Buffer> {
  const files: Bundle['files'] = [];
  let total = 0;
  async function walk(dir: string, prefix: string) {
    for (const name of (await readdir(dir)).sort()) {
      const full = path.join(dir, name),
        relative = prefix + name,
        stat = await lstat(full);
      if (stat.isSymbolicLink()) throw new Error('Symlinks are not allowed in a skill bundle');
      if (stat.isDirectory()) await walk(full, relative + '/');
      else if (stat.isFile()) {
        safePath(relative);
        total += stat.size;
        if (total > MAX_BYTES || files.length >= MAX_FILES)
          throw new Error('Bundle exceeds size/file limit');
        files.push({ path: relative, data: (await readFile(full)).toString('base64') });
      } else throw new Error('Only regular files and directories are allowed');
    }
  }
  if ((await lstat(directory)).isSymbolicLink()) throw new Error('Bundle root cannot be a symlink');
  await walk(directory, '');
  const bytes = Buffer.from(canonical({ format: 'skill-vault-files-v1', files }));
  parseBundle(bytes);
  return bytes;
}
export async function install(bytes: Uint8Array, destination: string) {
  const bundle = parseBundle(bytes);
  const resolved = path.resolve(destination);
  await mkdir(path.dirname(resolved), { recursive: true });
  const parent = await realpath(path.dirname(resolved));
  const target = path.join(parent, path.basename(resolved));
  try {
    await lstat(target);
    throw new Error('Destination already exists; choose an empty new directory');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const staging = await mkdtemp(path.join(parent, '.skill-vault-'));
  try {
    for (const file of bundle.files) {
      const full = path.join(staging, ...file.path.split('/'));
      await mkdir(path.dirname(full), { recursive: true, mode: 0o700 });
      await writeFile(full, fromBase64(file.data), { mode: 0o600, flag: 'wx' });
    }
    // No archive symlinks and no script execution. Stage fully before exposing the skill.
    await rename(staging, target);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return target;
}
