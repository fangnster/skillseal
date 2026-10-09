import { canonical, validatePaths, type Bundle } from './portable.ts';
export const encode64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 32768)
    s += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(s);
};
export function decode64(value: string) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
    throw new Error('Invalid base64');
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
export async function digest(bytes: Uint8Array) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
export function checkedBundle(bytes: Uint8Array): Bundle {
  if (bytes.length > 15 * 1024 * 1024) throw new Error('Bundle is too large');
  const b = JSON.parse(new TextDecoder().decode(bytes)) as Bundle;
  if (
    b.format !== 'skill-vault-files-v1' ||
    !Array.isArray(b.files) ||
    b.files.some((f) => typeof f.path !== 'string' || typeof f.data !== 'string')
  )
    throw new Error('Invalid bundle');
  validatePaths(b.files);
  if (b.files.reduce((n, f) => n + decode64(f.data).length, 0) > 10 * 1024 * 1024)
    throw new Error('Package exceeds 10 MiB');
  if (!new TextDecoder().decode(decode64(b.files.find((f) => f.path === 'SKILL.md')!.data)).trim())
    throw new Error('SKILL.md must not be empty');
  return b;
}
export async function packageFiles(files: File[], folder = false) {
  if (files.reduce((n, f) => n + f.size, 0) > 10 * 1024 * 1024 || files.length > 500)
    throw new Error('Choose up to 500 files totaling at most 10 MiB');
  const entries = await Promise.all(
    files.map(async (f) => ({
      path: folder
        ? (f as File & { webkitRelativePath: string }).webkitRelativePath
            .split('/')
            .slice(1)
            .join('/')
        : f.name,
      data: encode64(new Uint8Array(await f.arrayBuffer())),
    })),
  );
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const bytes = new TextEncoder().encode(
    canonical({ format: 'skill-vault-files-v1', files: entries }),
  );
  return { bytes, bundle: checkedBundle(bytes) };
}
export async function encryptPackage(bytes: Uint8Array) {
  const key = crypto.getRandomValues(new Uint8Array(32)),
    nonce = crypto.getRandomValues(new Uint8Array(12));
  const imported = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
        additionalData: new TextEncoder().encode('skill-vault:bundle:v1'),
        tagLength: 128,
      },
      imported,
      new Uint8Array(bytes),
    ),
  );
  const ciphertext = new Uint8Array(32 + bytes.length);
  ciphertext.set(new TextEncoder().encode('SV01'));
  ciphertext.set(nonce, 4);
  ciphertext.set(encrypted.subarray(encrypted.length - 16), 16);
  ciphertext.set(encrypted.subarray(0, -16), 32);
  return { key, ciphertext };
}
export async function decryptPackage(bytes: Uint8Array, key: Uint8Array) {
  if (bytes.length < 32 || new TextDecoder().decode(bytes.subarray(0, 4)) !== 'SV01')
    throw new Error('Invalid encrypted package');
  const imported = await crypto.subtle.importKey('raw', new Uint8Array(key), 'AES-GCM', false, [
    'decrypt',
  ]);
  const combined = new Uint8Array(bytes.length - 16);
  combined.set(bytes.subarray(32));
  combined.set(bytes.subarray(16, 32), bytes.length - 32);
  return new Uint8Array(
    await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(bytes.subarray(4, 16)),
        additionalData: new TextEncoder().encode('skill-vault:bundle:v1'),
        tagLength: 128,
      },
      imported,
      combined,
    ),
  );
}
export function saveFile(name: string, bytes: Uint8Array, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type })),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function crc32(bytes: Uint8Array) {
  let n = 0xffffffff;
  for (const b of bytes) {
    n ^= b;
    for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
  }
  return (n ^ 0xffffffff) >>> 0;
}
// Store-only ZIP: paths already validated, no symlinks and no scripts are run.
export function zipBundle(bundle: Bundle) {
  checkedBundle(new TextEncoder().encode(canonical(bundle)));
  const chunks: Uint8Array[] = [],
    directory: Uint8Array[] = [];
  let offset = 0,
    centralSize = 0;
  for (const file of bundle.files) {
    const name = new TextEncoder().encode(file.path),
      data = decode64(file.data),
      crc = crc32(data);
    const h = new Uint8Array(30 + name.length),
      v = new DataView(h.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true);
    v.setUint16(12, 0x21, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, data.length, true);
    v.setUint32(22, data.length, true);
    v.setUint16(26, name.length, true);
    h.set(name, 30);
    const c = new Uint8Array(46 + name.length),
      cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x800, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    c.set(name, 46);
    chunks.push(h, data);
    directory.push(c);
    offset += h.length + data.length;
    centralSize += c.length;
  }
  const end = new Uint8Array(22),
    ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, bundle.files.length, true);
  ev.setUint16(10, bundle.files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralSize + 22);
  let cursor = 0;
  for (const b of [...chunks, ...directory, end]) {
    output.set(b, cursor);
    cursor += b.length;
  }
  return output;
}
