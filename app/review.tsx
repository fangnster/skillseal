'use client';
import { useEffect, useState } from 'react';
import { api, Header, type Config } from './ui';
import { connectIdentity, importIdentity, signMessage, type SigningIdentity } from './wallet';
import { decode64, checkedBundle } from '../src/browser-package.ts';
import type { Bundle } from '../src/portable.ts';
import type { Version } from '../src/types.ts';
export function ReviewQueue() {
  const [config, setConfig] = useState<Config>(),
    [versions, setVersions] = useState<Version[]>([]),
    [identity, setIdentity] = useState<SigningIdentity>(),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [inspection, setInspection] = useState<{ id: string; bundle: Bundle }>();
  async function refresh() {
    const [c, v] = await Promise.all([api<Config>('config'), api<Version[]>('versions')]);
    setConfig(c);
    setVersions(v);
  }
  useEffect(() => {
    refresh().catch((e) => setMessage(e.message));
  }, []);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function review(v: Version, decision: string) {
    if (!identity || identity.address !== config?.adminWallet)
      throw new Error('Connect the configured operator identity');
    const c = await api<{ id: string; message: string }>('versions/' + v.id + '/review-challenge', {
      wallet: identity.address,
      decision,
    });
    await api('versions/' + v.id + '/review', {
      challengeId: c.id,
      signature: await signMessage(identity, c.message),
    });
    await refresh();
    setMessage(
      'Listing ' + decision + '. Author approval and checkout availability are checked separately.',
    );
  }
  async function inspect(v: Version) {
    if (!identity || identity.address !== config?.adminWallet)
      throw new Error('Connect the configured reviewer');
    const c = await api<{ id: string; message: string }>('versions/' + v.id + '/review-challenge', {
      wallet: identity.address,
      decision: 'inspect',
    });
    const b = await api<{ bundle: string }>('versions/' + v.id + '/review-preview', {
      challengeId: c.id,
      signature: await signMessage(identity, c.message),
    });
    setInspection({ id: v.id, bundle: checkedBundle(decode64(b.bundle)) });
  }
  return (
    <main>
      <Header backend={config?.backend} />
      <section className="hero compact">
        <p className="eyebrow">OPERATOR REVIEW</p>
        <h1>Review each release.</h1>
        <p className="lede">
          Only the configured reviewer can approve or reject a listing. Reviews use single-use
          signed challenges.
        </p>
        <p className="address">Reviewer: {config?.adminWallet}</p>
        <button
          disabled={busy}
          onClick={() => act(async () => setIdentity(await connectIdentity()))}
        >
          Connect reviewer wallet
        </button>
        <label className="field">
          Restore reviewer identity for free catalog
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) act(async () => setIdentity(await importIdentity(f)));
              e.target.value = '';
            }}
          />
        </label>
        {identity && <p className="address">Connected: {identity.address}</p>}
      </section>
      <div className="cards">
        {versions.map((v) => (
          <article className="card" key={v.id}>
            <h3>
              {v.manifest.name} · {v.manifest.version}
            </h3>
            <p>{v.manifest.description}</p>
            <p>
              Review: {v.reviewStatus || 'approved'} ·{' '}
              {v.manifest.price === '0' ? 'Free' : Number(v.manifest.price) / 1e6 + ' test USDC'}
            </p>
            <p className="address">Publisher: {v.manifest.publisher}</p>
            <pre>{v.manifest.license}</pre>
            <a className="text-link" href={'/skills/' + v.id}>
              Inspect version and shares →
            </a>
            <button
              disabled={busy || identity?.address !== config?.adminWallet}
              onClick={() => act(() => inspect(v))}
            >
              Inspect package files
            </button>
            {inspection?.id === v.id && (
              <details open>
                <summary>{inspection.bundle.files.length} files · local preview</summary>
                {inspection.bundle.files.map((f) => (
                  <details key={f.path}>
                    <summary>{f.path}</summary>
                    <pre>{new TextDecoder().decode(decode64(f.data)).slice(0, 12000)}</pre>
                  </details>
                ))}
              </details>
            )}
            <div className="actions">
              <button
                disabled={
                  busy || identity?.address !== config?.adminWallet || inspection?.id !== v.id
                }
                onClick={() => act(() => review(v, 'approved'))}
              >
                Approve listing
              </button>
              <button
                disabled={busy || identity?.address !== config?.adminWallet}
                onClick={() => act(() => review(v, 'rejected'))}
              >
                Reject listing
              </button>
            </div>
          </article>
        ))}
      </div>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
    </main>
  );
}
