'use client';
import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { api, Header, type Config } from './ui';
import {
  createIdentity,
  connectIdentity,
  importIdentity,
  signMessage,
  approveTransaction,
  type SigningIdentity,
} from './wallet';
import { canonical, type Bundle } from '../src/portable.ts';
import {
  packageFiles,
  encryptPackage,
  digest,
  encode64,
  saveFile,
} from '../src/browser-package.ts';
import { DEVNET_USDC, type Manifest, type Version } from '../src/types.ts';
export function CreatorStudio() {
  const [config, setConfig] = useState<Config>(),
    [identity, setIdentity] = useState<SigningIdentity>(),
    [backedUp, setBackedUp] = useState(false),
    [versions, setVersions] = useState<Version[]>([]),
    [pkg, setPkg] = useState<{ bytes: Uint8Array; bundle: Bundle }>(),
    [name, setName] = useState(''),
    [slug, setSlug] = useState(''),
    [slugEdited, setSlugEdited] = useState(false),
    [description, setDescription] = useState(''),
    [version, setVersion] = useState('1.0.0'),
    [paid, setPaid] = useState(false),
    [price, setPrice] = useState('1.00'),
    [license, setLicense] = useState(
      'MIT: recipients may use, copy, modify and distribute this free Skill under the included MIT license.',
    ),
    [splits, setSplits] = useState<{ wallet: string; percent: string }[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [preview, setPreview] = useState(false),
    [consent, setConsent] = useState(false);
  async function refresh() {
    setVersions(await api<Version[]>('versions'));
  }
  useEffect(() => {
    Promise.all([api<Config>('config'), refresh()])
      .then(([c]) => setConfig(c))
      .catch((e) => setMessage(e.message));
  }, []);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function useIdentity(i: SigningIdentity, backup: boolean) {
    identity?.secret?.fill(0);
    setIdentity(i);
    if (i.secret) {
      setPaid(false);
      setLicense(
        'MIT: recipients may use, copy, modify and distribute this free Skill under the included MIT license.',
      );
    }
    setBackedUp(backup);
    setSplits([{ wallet: i.address, percent: '100' }]);
    setPreview(false);
  }
  async function selectFiles(files: File[], folder: boolean) {
    await act(async () => {
      setPkg(await packageFiles(files, folder));
      setPreview(false);
      setMessage('Package validated locally. Review your release before publishing.');
    });
  }
  function metadata(): Omit<Manifest, 'bundleHash' | 'contentHash'> {
    if (!identity || !config || !pkg)
      throw new Error('Select a creator identity and a Skill package');
    if (identity.secret && (!backedUp || paid))
      throw new Error(
        paid
          ? 'Paid releases require a wallet extension'
          : 'Save your private creator identity before publishing',
      );
    if (
      !/^[a-z][a-z0-9-]{1,63}$/.test(slug) ||
      !/^\d+\.\d+\.\d+$/.test(version) ||
      !name.trim() ||
      name.length > 100 ||
      description.length > 1000 ||
      license.trim().length < 10
    )
      throw new Error('Check the Skill ID, name, version, description and license');
    if (paid && !/^([1-9][0-9]{0,5}|0)(\.[0-9]{1,6})?$/.test(price))
      throw new Error('Enter a positive test-USDC price with at most six decimal places');
    const units = paid ? Math.round(Number(price) * 1e6) : 0;
    if (paid && units < 1) throw new Error('Paid releases need a positive price');
    if (splits.some((x) => !/^\d{1,3}(\.\d{1,2})?$/.test(x.percent)))
      throw new Error('Shares need at most two decimal places');
    const s = splits.map((x) => ({
      wallet: new PublicKey(x.wallet).toBase58(),
      bps: Math.round(Number(x.percent) * 100),
    }));
    if (
      s.length < 1 ||
      s.length > 5 ||
      s.some((x) => x.bps < 1) ||
      s.reduce((n, x) => n + x.bps, 0) !== 10000 ||
      new Set(s.map((x) => x.wallet)).size !== s.length ||
      !s.some((x) => x.wallet === identity.address)
    )
      throw new Error('Up to five unique authors, including you, must share exactly 100%');
    return {
      skillId: slug,
      name: name.trim(),
      description,
      version,
      price: String(units),
      mint: DEVNET_USDC,
      splits: s,
      license,
      publisher: identity.address,
      issuer: config.issuer,
    };
  }
  async function approve(v: Version) {
    if (!identity || !config) throw new Error('Select your author identity');
    const m = `Skill Vault version approval\nOrigin: ${config.origin}\nVersion hash: ${v.id}\nI accept this version's price, license and revenue split.`;
    const result = await api<{ transaction: string | null }>('versions/' + v.id + '/approve', {
      wallet: identity.address,
      signature: await signMessage(identity, m),
    });
    if (result.transaction) await approveTransaction(result.transaction, identity, v, config);
    await api('versions/' + v.id + '/sync', {});
    await refresh();
  }
  async function publish() {
    const meta = metadata();
    if (!consent) throw new Error('Confirm ownership and the displayed release terms');
    const e = await encryptPackage(pkg!.bytes);
    try {
      const manifest: Manifest = {
          ...meta,
          bundleHash: await digest(e.ciphertext),
          ...(meta.price === '0' ? { contentHash: await digest(pkg!.bytes) } : {}),
        },
        id = await digest(new TextEncoder().encode(canonical(manifest)));
      const signature = await signMessage(
        identity!,
        `Skill Vault version approval\nOrigin: ${config!.origin}\nVersion hash: ${id}\nI accept this version's price, license and revenue split.`,
      );
      const v = await api<Version>('versions', {
        manifest,
        bundle: encode64(e.ciphertext),
        key: encode64(e.key),
        signature,
      });
      await approve(v);
      setMessage(
        'Release saved. ' +
          (config!.moderationRequired
            ? 'An operator review is required before listing.'
            : 'Check author approvals and availability.') +
          ' Share: ' +
          window.location.origin +
          '/skills/' +
          v.id,
      );
      setPreview(false);
      setConsent(false);
    } finally {
      e.key.fill(0);
    }
  }
  const mine = versions.filter(
    (v) => identity && v.manifest.splits.some((s) => s.wallet === identity.address),
  );
  return (
    <main>
      <Header backend={config?.backend} />
      <section className="hero compact">
        <p className="eyebrow">CREATOR STUDIO</p>
        <h1>
          Upload your Skill.
          <br />
          <em>Publish a clear version.</em>
        </h1>
        <p className="lede">
          Free distribution or a fixed Devnet test price. Your private signing key stays on your
          device.
        </p>
      </section>
      <div className="studio-grid">
        <section className="panel">
          <h2>1 · Creator identity</h2>
          <div className="actions">
            <button
              disabled={busy}
              onClick={() => act(async () => useIdentity(await connectIdentity(), true))}
            >
              Connect wallet
            </button>
            <button
              disabled={busy}
              onClick={() => act(async () => useIdentity(await createIdentity(), false))}
            >
              Create free publishing identity
            </button>
          </div>
          <label className="field">
            Restore private creator identity
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) act(async () => useIdentity(await importIdentity(f), true));
                e.target.value = '';
              }}
            />
          </label>
          {identity && (
            <>
              <p className="address">{identity.address}</p>
              {identity.secret && (
                <button
                  onClick={() => {
                    saveFile(
                      'skillseal-creator-private.json',
                      new TextEncoder().encode(
                        JSON.stringify({
                          format: 'skillseal-creator-v1',
                          address: identity.address,
                          secret: encode64(identity.secret!),
                        }),
                      ),
                      'application/json',
                    );
                    setBackedUp(true);
                  }}
                >
                  Save private creator identity
                </button>
              )}
              <p className="fine">
                Keep this private file. It is needed to sign later versions and author approvals.
                Share your public address only.
              </p>
            </>
          )}
          <h2>2 · Skill files</h2>
          <p>
            Choose a folder with SKILL.md at its root, or a single SKILL.md. Up to 500 files / 10
            MiB. No ZIP upload.
          </p>
          <label className="field">
            Choose Skill folder
            <input
              type="file"
              {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
              multiple
              onChange={(e) => selectFiles(Array.from(e.target.files || []), true)}
            />
          </label>
          <label className="field">
            Or choose SKILL.md
            <input
              type="file"
              accept=".md"
              onChange={(e) => selectFiles(Array.from(e.target.files || []), false)}
            />
          </label>
          {pkg && (
            <details open>
              <summary>{pkg.bundle.files.length} files validated</summary>
              <ul className="file-list">
                {pkg.bundle.files.map((f) => (
                  <li key={f.path}>{f.path}</li>
                ))}
              </ul>
              <pre className="skill-preview">
                {new TextDecoder()
                  .decode(
                    Uint8Array.from(
                      atob(pkg.bundle.files.find((f) => f.path === 'SKILL.md')!.data),
                      (c) => c.charCodeAt(0),
                    ),
                  )
                  .slice(0, 6000)}
              </pre>
            </details>
          )}
        </section>
        <section className="panel">
          <h2>3 · Release details</h2>
          <label className="field">
            Skill name
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited)
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/-$/, ''),
                  );
                setPreview(false);
              }}
              maxLength={100}
            />
          </label>
          <label className="field">
            Skill ID
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
                setPreview(false);
              }}
              placeholder="my-research-skill"
            />
          </label>
          <label className="field">
            Version
            <input
              value={version}
              onChange={(e) => {
                setVersion(e.target.value);
                setPreview(false);
              }}
            />
          </label>
          <label className="field">
            Description
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setPreview(false);
              }}
              maxLength={1000}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={paid}
              disabled={Boolean(identity?.secret)}
              onChange={(e) => {
                setPaid(e.target.checked);
                setLicense(
                  e.target.checked
                    ? 'The buyer may permanently use this purchased version locally. Redistribution of the original package is not permitted.'
                    : 'MIT: recipients may use, copy, modify and distribute this free Skill under the included MIT license.',
                );
                setPreview(false);
              }}
            />
            Charge a fixed price (Devnet test funds)
          </label>
          {paid && (
            <label className="field">
              Price in test USDC
              <input
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setPreview(false);
                }}
                inputMode="decimal"
              />
              <span className="fine">
                {config?.backend === 'disabled'
                  ? 'You can prepare this release; paid checkout is not enabled.'
                  : 'Paid releases require operator onboarding and Devnet wallets.'}
              </span>
            </label>
          )}
          <h3>Creator shares</h3>
          {splits.map((s, i) => (
            <div className="split-input" key={i}>
              <label>
                Author public address
                <input
                  value={s.wallet}
                  onChange={(e) => {
                    setSplits(
                      splits.map((x, j) => (j === i ? { ...x, wallet: e.target.value } : x)),
                    );
                    setPreview(false);
                  }}
                />
              </label>
              <label>
                Percent
                <input
                  value={s.percent}
                  inputMode="decimal"
                  onChange={(e) => {
                    setSplits(
                      splits.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)),
                    );
                    setPreview(false);
                  }}
                />
              </label>
              {splits.length > 1 && (
                <button
                  onClick={() => {
                    setSplits(splits.filter((_, j) => j !== i));
                    setPreview(false);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            disabled={splits.length >= 5 || !identity}
            onClick={() => {
              setSplits([...splits, { wallet: '', percent: '0' }]);
              setPreview(false);
            }}
          >
            Add collaborator
          </button>
          <label className="field">
            Version license
            <textarea
              value={license}
              onChange={(e) => {
                setLicense(e.target.value);
                setPreview(false);
              }}
              maxLength={10000}
            />
          </label>
          <button
            disabled={busy || !pkg || !identity}
            onClick={() => {
              try {
                metadata();
                setPreview(true);
                setMessage('');
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Preview release
          </button>
          {preview && (
            <div className="notice">
              <h3>
                {name} · v{version}
              </h3>
              <p>
                {paid ? price + ' test USDC' : 'Free'} ·{' '}
                {splits.map((s) => s.percent + '%').join(' / ')}
              </p>
              <p>{description}</p>
              <pre>{license}</pre>
              <label className="check">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I have the rights to publish these files and approve the exact version, license and
                creator shares shown above.
              </label>
              <button disabled={busy || !consent} onClick={() => act(publish)}>
                {busy ? 'Saving release…' : 'Sign & publish release'}
              </button>
            </div>
          )}
        </section>
      </div>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <section className="content-section">
        <h2>Your releases & author approvals</h2>
        <p>
          Every author approves the exact version and split. An operator reviews the listing.
          Changes require a new version.
        </p>
        <button disabled={busy} onClick={() => act(refresh)}>
          Refresh releases
        </button>
        {mine.length === 0 && (
          <p className="fine">
            Select your identity to see releases you created or collaborated on.
          </p>
        )}
        <div className="cards">
          {mine.map((v) => (
            <article className="card" key={v.id}>
              <h3>
                <a href={'/skills/' + v.id}>
                  {v.manifest.name} · v{v.manifest.version}
                </a>
              </h3>
              <p>
                {v.active
                  ? 'Available'
                  : v.reviewStatus === 'pending'
                    ? 'Awaiting operator review'
                    : v.reviewStatus === 'rejected'
                      ? 'Listing rejected'
                      : 'Awaiting author approval or checkout activation'}
              </p>
              <p>
                {v.approvals.length}/{v.manifest.splits.length} authors approved
              </p>
              <a className="text-link" href={'/skills/' + v.id}>
                Details, terms & share →
              </a>
              <details>
                <summary>Review terms before approving</summary>
                <pre>{v.manifest.license}</pre>
                {v.manifest.splits.map((s) => (
                  <p className="address" key={s.wallet}>
                    {s.wallet} · {s.bps / 100}%
                  </p>
                ))}
                <button disabled={busy} onClick={() => act(() => approve(v))}>
                  Sign author approval
                </button>
              </details>
              <button
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await api('versions/' + v.id + '/sync', {});
                    await refresh();
                  })
                }
              >
                Sync status
              </button>
            </article>
          ))}
        </div>
        <a href="/manage" className="text-link">
          Operator review →
        </a>
      </section>
    </main>
  );
}
