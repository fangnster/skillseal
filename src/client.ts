import { fromBase64 } from './crypto.ts';

export function serverOrigin(value: string) {
  const u = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  if (!['https:', 'http:'].includes(u.protocol) || (u.protocol !== 'https:' && !loopback))
    throw new Error('Remote servers require HTTPS');
  if (u.username || u.password || u.search || u.hash || u.pathname !== '/')
    throw new Error('Use a server origin without credentials, path, query or fragment');
  return u.origin;
}
// Static distribution may live under a project path (e.g. GitHub Pages).
// Paid API origins remain root-only through serverOrigin.
export function distributionBase(value: string) {
  const u = new URL(value);
  serverOrigin(u.origin);
  if (u.username || u.password || u.search || u.hash || /%|\\/.test(u.pathname))
    throw new Error('Invalid distribution URL');
  return u.origin + u.pathname.replace(/\/$/, '');
}
export function orderId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
    throw new Error('Invalid order ID');
  return value;
}
export function versionId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value))
    throw new Error('Invalid version hash');
  return value;
}
export type Session = {
  orderId: string;
  origin: string;
  publicKey: string;
  privateKey: string;
  bundlePath?: string;
  encryptedBundle?: string;
};
export function parseSession(value: unknown): Session {
  if (!value || typeof value !== 'object') throw new Error('Invalid recovery session');
  const s = value as Session;
  orderId(s.orderId);
  const origin = serverOrigin(s.origin);
  fromBase64(s.publicKey, 32);
  fromBase64(s.privateKey, 32);
  if (s.bundlePath !== undefined && (typeof s.bundlePath !== 'string' || !s.bundlePath))
    throw new Error('Invalid bundle path');
  if (s.encryptedBundle !== undefined) {
    if (typeof s.encryptedBundle !== 'string' || s.encryptedBundle.length > 22 * 1024 * 1024)
      throw new Error('Invalid encrypted bundle');
    fromBase64(s.encryptedBundle);
  }
  return { ...s, origin };
}
export async function download(url: string, maxBytes = 16 * 1024 * 1024) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok || !response.body) throw new Error('Download unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new Error('Download exceeds size limit');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}
