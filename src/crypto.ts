import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import sodium from 'libsodium-wrappers-sumo';
import bs58 from 'bs58';

export const sha256 = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}
export function fromBase64(value: string, size?: number): Buffer {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
    throw new Error('Invalid base64');
  const bytes = Buffer.from(value, 'base64');
  if (size !== undefined && bytes.length !== size) throw new Error('Invalid key length');
  return bytes;
}
export function encrypt(
  bytes: Uint8Array,
  key: Buffer = randomBytes(32),
  aad = 'skill-vault:bundle:v1',
) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return {
    key,
    ciphertext: Buffer.concat([Buffer.from('SV01'), nonce, cipher.getAuthTag(), ciphertext]),
  };
}
export function decrypt(bytes: Uint8Array, key: Uint8Array, aad = 'skill-vault:bundle:v1'): Buffer {
  const input = Buffer.from(bytes);
  if (input.length < 32 || input.subarray(0, 4).toString() !== 'SV01')
    throw new Error('Invalid encrypted bundle');
  const cipher = createDecipheriv('aes-256-gcm', key, input.subarray(4, 16));
  cipher.setAAD(Buffer.from(aad));
  cipher.setAuthTag(input.subarray(16, 32));
  return Buffer.concat([cipher.update(input.subarray(32)), cipher.final()]);
}
export async function encryptionKeypair() {
  await sodium.ready;
  const keys = sodium.crypto_box_keypair();
  return {
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
  };
}
export async function sealKey(key: Uint8Array, publicKey: string) {
  await sodium.ready;
  return Buffer.from(sodium.crypto_box_seal(key, fromBase64(publicKey, 32))).toString('base64');
}
export async function openKey(envelope: string, publicKey: string, privateKey: string) {
  await sodium.ready;
  return Buffer.from(
    sodium.crypto_box_seal_open(
      fromBase64(envelope, 80),
      fromBase64(publicKey, 32),
      fromBase64(privateKey, 32),
    ),
  );
}
export async function verifyWallet(message: string, signature: string, wallet: string) {
  await sodium.ready;
  try {
    return sodium.crypto_sign_verify_detached(
      fromBase64(signature, 64),
      Buffer.from(message),
      bs58.decode(wallet),
    );
  } catch {
    return false;
  }
}
export async function signWallet(message: string, secret: Uint8Array) {
  await sodium.ready;
  return Buffer.from(sodium.crypto_sign_detached(Buffer.from(message), secret)).toString('base64');
}
export function versionMessage(id: string, origin: string) {
  return `Skill Vault version approval\nOrigin: ${origin}\nVersion hash: ${id}\nI accept this version's price, license and revenue split.`;
}
