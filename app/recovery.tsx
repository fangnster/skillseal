'use client';
import { useState } from 'react';
import { api, FilePicker } from './ui';
import { sodiumClient } from './wallet';
import {
  decode64,
  digest,
  decryptPackage,
  checkedBundle,
  zipBundle,
  saveFile,
} from '../src/browser-package.ts';
import type { Order, Version } from '../src/types.ts';
export function Recovery({ expectedOrder }: { expectedOrder?: string }) {
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [checkout, setCheckout] = useState('');
  async function recover(file: File) {
    setBusy(true);
    setMessage('');
    setCheckout('');
    try {
      if (file.size > 24 * 1024 * 1024) throw new Error('Recovery file is too large');
      const session = JSON.parse(await file.text());
      if (
        session.origin !== window.location.origin ||
        typeof session.orderId !== 'string' ||
        !/^[0-9a-f-]{36}$/.test(session.orderId) ||
        (expectedOrder && session.orderId !== expectedOrder)
      )
        throw new Error('This recovery session belongs to another server or order');
      const s = await sodiumClient(),
        secret = decode64(session.privateKey),
        publicKey = decode64(session.publicKey);
      if (
        secret.length !== 32 ||
        publicKey.length !== 32 ||
        !s.memcmp(s.crypto_scalarmult_base(secret), publicKey)
      )
        throw new Error('Recovery encryption key is invalid');
      const order = await api<Order>('orders/' + session.orderId + '/sync', {});
      if (order.encryptionPublicKey !== session.publicKey)
        throw new Error('Recovery key does not match this order');
      if (order.status !== 'granted') {
        setCheckout('/checkout/' + order.id);
        throw new Error(
          'This order is ' +
            order.status +
            '. Continue its existing checkout; avoid starting a second payment.',
        );
      }
      const v = await api<Version>('versions/' + order.versionId),
        res = await api<{ envelope: string }>('orders/' + order.id + '/claim', {});
      let bytes: Uint8Array;
      if (session.encryptedBundle) bytes = decode64(session.encryptedBundle);
      else {
        const r = await fetch('/api/versions/' + v.id + '/bundle');
        if (!r.ok) throw new Error('Encrypted download failed');
        bytes = new Uint8Array(await r.arrayBuffer());
      }
      if ((await digest(bytes)) !== v.manifest.bundleHash)
        throw new Error('Encrypted package integrity check failed');
      const key = s.crypto_box_seal_open(decode64(res.envelope), publicKey, secret);
      let plain: Uint8Array | undefined;
      try {
        plain = await decryptPackage(bytes, key);
        saveFile(
          v.manifest.skillId + '-' + v.manifest.version + '.zip',
          zipBundle(checkedBundle(plain)),
          'application/zip',
        );
        setMessage(
          'Purchased files decrypted locally and downloaded. Extract the ZIP and load SKILL.md. No second payment or script execution.',
        );
      } finally {
        key.fill(0);
        secret.fill(0);
        plain?.fill(0);
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Recover & download purchased files</h2>
      <p>
        Choose your private skillseal-session.json. Its private key stays in this browser. Recovery
        uses the existing order.
      </p>
      <FilePicker
        label="Private purchase recovery session"
        buttonText="Choose recovery file"
        accept=".json"
        disabled={busy}
        onSelect={([file]) => recover(file)}
      />
      {busy && <p>Checking the existing license…</p>}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {checkout && (
        <a className="button" href={checkout}>
          Continue existing checkout →
        </a>
      )}
    </section>
  );
}
