'use client';
import { useEffect, useState } from 'react';
import { api, Header, type Config } from './ui';
import { digest, checkedBundle, zipBundle, saveFile, encode64 } from '../src/browser-package.ts';
import { type Version, type Order } from '../src/types.ts';
import { sodiumClient } from './wallet';
export function SkillDetail({ id }: { id: string }) {
  const [version, setVersion] = useState<Version>(),
    [config, setConfig] = useState<Config>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [copied, setCopied] = useState(false),
    [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
    Promise.all([api<Version>('versions/' + id), api<Config>('config')])
      .then(([v, c]) => {
        setVersion(v);
        setConfig(c);
      })
      .catch((e) => setMessage(e.message));
  }, [id]);
  async function download() {
    setBusy(true);
    try {
      const res = await fetch('/api/versions/' + id + '/free-bundle');
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error || 'Download failed');
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if ((await digest(bytes)) !== version?.manifest.contentHash)
        throw new Error('Package integrity check failed');
      saveFile(
        version.manifest.skillId + '-' + version.manifest.version + '.zip',
        zipBundle(checkedBundle(bytes)),
        'application/zip',
      );
      setMessage(
        'Verified download ready. Extract the ZIP and load SKILL.md in your agent. No scripts were run.',
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function checkout() {
    if (!version || !config) return;
    setBusy(true);
    try {
      const s = await sodiumClient(),
        res = await fetch('/api/versions/' + id + '/bundle');
      if (!res.ok) throw new Error('Encrypted download failed');
      const bytes = new Uint8Array(await res.arrayBuffer());
      if ((await digest(bytes)) !== version.manifest.bundleHash)
        throw new Error('Encrypted package integrity check failed');
      const keys = s.crypto_box_keypair(),
        order = await api<Order>('orders', {
          versionId: id,
          encryptionPublicKey: encode64(keys.publicKey),
        });
      saveFile(
        'skillseal-session.json',
        new TextEncoder().encode(
          JSON.stringify({
            orderId: order.id,
            origin: config.origin,
            publicKey: encode64(keys.publicKey),
            privateKey: encode64(keys.privateKey),
            encryptedBundle: encode64(bytes),
          }),
        ),
        'application/json',
      );
      keys.privateKey.fill(0);
      window.location.href = '/checkout/' + order.id;
    } catch (e) {
      setMessage((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main>
      <Header backend={config?.backend} />
      <section className="hero compact">
        <a className="back" href="/">
          ← Explore Skills
        </a>
        {version ? (
          <>
            <p className="eyebrow">IMMUTABLE RELEASE · v{version.manifest.version}</p>
            <h1>{version.manifest.name}</h1>
            <p className="lede">{version.manifest.description}</p>
            <span className="tag">
              {version.active
                ? 'Available'
                : version.reviewStatus === 'rejected'
                  ? 'Not listed'
                  : version.reviewStatus === 'pending'
                    ? 'Awaiting review'
                    : 'Awaiting author approval / checkout'}
            </span>
          </>
        ) : (
          <h1>Skill release</h1>
        )}
      </section>
      {version && (
        <div className="studio-grid">
          <section className="panel">
            <h2>
              {version.manifest.price === '0'
                ? 'Free'
                : Number(version.manifest.price) / 1e6 + ' test USDC'}
            </h2>
            <p>
              {version.manifest.price === '0'
                ? 'No wallet or payment required. Review the license before use.'
                : 'One purchase covers this exact version. Reinstall with the same wallet without another payment.'}
            </p>
            <button
              disabled={!version.active || busy}
              onClick={version.manifest.price === '0' ? download : checkout}
            >
              {busy
                ? 'Preparing…'
                : version.manifest.price === '0'
                  ? 'Download Skill (.zip)'
                  : 'Download ciphertext & checkout'}
            </button>
            {config?.backend === 'disabled' && version.manifest.price !== '0' && (
              <p className="notice">
                Paid checkout is not enabled on this server. This price is a prepared Devnet test
                price.
              </p>
            )}
            <h3>Install with the CLI</h3>
            <pre className="command-box">
              skillseal install {id} --server {origin} --destination ./skills/
              {version.manifest.skillId}
            </pre>
            <a className="text-link" href="/install">
              Install the CLI first →
            </a>
            <h3>Share this version</h3>
            <p className="address">{origin + '/skills/' + id}</p>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(origin + '/skills/' + id);
                  setCopied(true);
                } catch {
                  setMessage('Copy the version URL shown above.');
                }
              }}
            >
              {copied ? 'Link copied' : 'Copy share link'}
            </button>
            <p className="fine">
              Share this page. Keep private creator identities and purchase recovery sessions
              private.
            </p>
          </section>
          <section className="panel">
            <h2>Version license</h2>
            <pre className="skill-preview">{version.manifest.license}</pre>
            <h3>Creator shares & approvals</h3>
            {version.manifest.splits.map((s) => (
              <div className="creator-row" key={s.wallet}>
                <p className="address">{s.wallet}</p>
                <strong>
                  {s.bps / 100}% · {version.approvals.includes(s.wallet) ? 'Approved' : 'Pending'}
                </strong>
              </div>
            ))}
            <p>Platform commission: 0% in the MVP. All authors approve before activation.</p>
            <details>
              <summary>Verify this release</summary>
              <p>Publisher</p>
              <p className="address">{version.manifest.publisher}</p>
              <p>Signed version hash</p>
              <p className="address">{id}</p>
              <p>Ciphertext SHA-256</p>
              <p className="address">{version.manifest.bundleHash}</p>
              {version.manifest.contentHash && (
                <>
                  <p>Content SHA-256</p>
                  <p className="address">{version.manifest.contentHash}</p>
                </>
              )}
            </details>
          </section>
        </div>
      )}
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
    </main>
  );
}
