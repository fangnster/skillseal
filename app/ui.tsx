'use client';
import { useState, useEffect } from 'react';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { DEVNET_GENESIS, type Version, type Order } from '../src/types.ts';
import { validateWalletTransaction } from '../src/transactions.ts';
import { checkoutState } from '../src/checkout-state.ts';

type Config = {
  backend: 'mock' | 'solana';
  issuer: string;
  network: string;
  origin: string;
  programId: string;
};
type Wallet = {
  connect(): Promise<{ publicKey: PublicKey }>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
};
declare global {
  interface Window {
    solana?: Wallet;
    phantom?: { solana: Wallet };
    solflare?: Wallet;
  }
}
export async function api<T = any>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    '/api/' + url,
    body === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
const shorten = (s: string) => s.slice(0, 5) + '…' + s.slice(-4);
function Header({ backend }: { backend?: string }) {
  return (
    <header>
      <a className="brand" href="/">
        ◈ <span>SKILLSEAL</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="/install">Install</a>
        <a href="/creators">Creators</a>
        <a href="https://github.com/fangnster/skillseal">GitHub ↗</a>
      </nav>
      <div className="badge">
        {backend === 'mock'
          ? 'LOCAL MOCK · NO ON-CHAIN FUNDS'
          : backend === 'solana'
            ? 'SOLANA DEVNET · TEST FUNDS'
            : 'CHECKING ENVIRONMENT…'}
      </div>
    </header>
  );
}
export function Marketplace() {
  const [versions, setVersions] = useState<Version[]>([]),
    [config, setConfig] = useState<Config>(),
    [error, setError] = useState(''),
    [buying, setBuying] = useState('');
  useEffect(() => {
    Promise.all([api<Version[]>('versions'), api<Config>('config')])
      .then(([v, c]) => {
        setVersions(v);
        setConfig(c);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main>
      <Header backend={config?.backend} />
      <section className="hero">
        <p className="eyebrow">WORKFLOWS WORTH OWNING</p>
        <h1>
          A useful workflow,
          <br />
          <em>sealed by its creators.</em>
        </h1>
        <p className="lede">
          Download an encrypted Skill. Pay to unlock it locally.
          <br />
          Every version license comes with an agreed creator split.
        </p>
        <div className="actions">
          <a className="button" href="/install">
            Install the free MIT example ↗
          </a>
          <a className="text-link" href="/creators">
            Publish a Skill →
          </a>
        </div>
        <div className="steps">
          <span>01 Download ciphertext</span>
          <span>02 Pay with your wallet</span>
          <span>03 Unlock locally</span>
        </div>
      </section>
      <section className="section-heading">
        <h2>
          Explore Skills <small>{versions.length.toString().padStart(2, '0')}</small>
        </h2>
        <span>One purchase · Keep the purchased version</span>
      </section>
      {error && (
        <div role="alert" className="notice error">
          {error} Please retry in a moment.
        </div>
      )}
      <div className="cards">
        {versions.map((v) => (
          <article className="card" key={v.id}>
            <div className="card-top">
              <span className="glyph">⌘</span>
              <span className="tag">v{v.manifest.version}</span>
            </div>
            <h3>{v.manifest.name}</h3>
            <p>{v.manifest.description}</p>
            <div className="author-line">
              {v.manifest.splits.length} creators ·{' '}
              {v.active ? 'Split approved' : 'Awaiting author approval'}
            </div>
            <div className="card-bottom">
              <strong>
                {(Number(v.manifest.price) / 1_000_000).toFixed(2)} <small>USDC</small>
              </strong>
              <button
                disabled={!v.active || !config || Boolean(buying)}
                onClick={async () => {
                  setBuying(v.id);
                  try {
                    const sodium = (await import('libsodium-wrappers-sumo')).default;
                    await sodium.ready;
                    const bundleResponse = await fetch('/api/versions/' + v.id + '/bundle');
                    if (!bundleResponse.ok)
                      throw new Error('Encrypted download failed. Please retry.');
                    const ciphertext = new Uint8Array(await bundleResponse.arrayBuffer());
                    const digest = Array.from(
                      new Uint8Array(await crypto.subtle.digest('SHA-256', ciphertext)),
                      (b) => b.toString(16).padStart(2, '0'),
                    ).join('');
                    if (digest !== v.manifest.bundleHash)
                      throw new Error('The encrypted bundle hash does not match. Please retry.');
                    const pair = sodium.crypto_box_keypair();
                    const toB64 = (b: Uint8Array) =>
                      sodium.to_base64(b, sodium.base64_variants.ORIGINAL);
                    const o = await api<Order>('orders', {
                      versionId: v.id,
                      encryptionPublicKey: toB64(pair.publicKey),
                    });
                    const file = JSON.stringify({
                      orderId: o.id,
                      origin: config!.origin,
                      publicKey: toB64(pair.publicKey),
                      privateKey: toB64(pair.privateKey),
                      encryptedBundle: toB64(ciphertext),
                    });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(new Blob([file], { type: 'application/json' }));
                    link.download = 'skillseal-session.json';
                    link.click();
                    URL.revokeObjectURL(link.href);
                    window.location.href = '/checkout/' + o.id;
                  } catch (e) {
                    setError((e as Error).message);
                    setBuying('');
                  }
                }}
              >
                {buying === v.id ? 'Preparing download…' : 'Buy version ↗'}
              </button>
            </div>
          </article>
        ))}
      </div>
      {!versions.length && !error && (
        <div className="notice">No Skills have been published yet. Check back soon.</div>
      )}
      <aside className="trust">
        <div>
          <strong>Keep your workflow local</strong>
          <p>Use installed files offline. No per-run charge for local use.</p>
        </div>
        <div>
          <strong>Know where the payment goes</strong>
          <p>Authors approve the split before release. Changes require a new version.</p>
        </div>
        <div>
          <strong>Understand what is protected</strong>
          <p>Encryption gates first access. Unlocked files can still be copied.</p>
        </div>
      </aside>
      <footer>
        SKILLSEAL / DEVNET MVP <span>Use test funds during the beta.</span>
      </footer>
    </main>
  );
}
export function Checkout({ id }: { id: string }) {
  const [order, setOrder] = useState<Order>(),
    [version, setVersion] = useState<Version>(),
    [config, setConfig] = useState<Config>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [address, setAddress] = useState(''),
    [pendingSignature, setPendingSignature] = useState(''),
    [now, setNow] = useState(Date.now());
  const state = checkoutState(order, now);
  async function refresh() {
    const o = await api<Order>('orders/' + id);
    setOrder(o);
    setVersion(await api<Version>('versions/' + o.versionId));
    setConfig(await api<Config>('config'));
  }
  useEffect(() => {
    refresh().catch((e) => setMessage(e.message));
  }, [id]);
  useEffect(() => {
    if (order?.status !== 'funded') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order?.status]);
  useEffect(() => {
    if (order?.status !== 'funded' || busy || (order.expiresAt && Date.now() >= order.expiresAt))
      return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const synced = await api<Order>('orders/' + id + '/sync', {});
        if (!cancelled) {
          setOrder(synced);
          setMessage(checkoutState(synced).message);
        }
      } catch (e) {
        if (!cancelled) setMessage((e as Error).message);
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, order, busy]);
  async function syncOrder() {
    setBusy(true);
    try {
      if (pendingSignature) {
        const connection = new Connection('https://api.devnet.solana.com', 'finalized');
        const status = (
          await connection.getSignatureStatuses([pendingSignature], {
            searchTransactionHistory: true,
          })
        ).value[0];
        if (status?.err) {
          setPendingSignature('');
          setOrder(await api<Order>('orders/' + id + '/sync', {}));
          setMessage(
            'The submitted transaction failed. The order has been synced; you can retry if it is still unpaid.',
          );
          return;
        }
        if (status?.confirmationStatus !== 'finalized') {
          setMessage(
            'Final confirmation is still pending. Sync this order again; do not pay again.',
          );
          return;
        }
        setPendingSignature('');
      }
      const synced = await api<Order>('orders/' + id + '/sync', {});
      setOrder(synced);
      setMessage(checkoutState(synced).message);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function perform(refund = false) {
    setBusy(true);
    setMessage('');
    try {
      if (config?.backend === 'mock')
        throw new Error(
          'This local demo uses the installer with --demo-wallet. Browser payments require Devnet.',
        );
      const wallet = window.phantom?.solana || window.solana || window.solflare;
      if (!wallet) throw new Error('Install Phantom or Solflare and connect to Devnet.');
      const { publicKey } = await wallet.connect();
      setAddress(publicKey.toBase58());
      if (!refund) {
        const c = await api<{ id: string; message: string }>('orders/' + id + '/challenge', {
          wallet: publicKey.toBase58(),
        });
        const signed = await wallet.signMessage(new TextEncoder().encode(c.message));
        const signature = btoa(String.fromCharCode(...signed.signature));
        await api('orders/' + id + '/bind', { challengeId: c.id, signature });
      } else if (order?.buyer !== publicKey.toBase58())
        throw new Error('Connect the original buyer wallet to request a refund.');
      const payment = await api<{ transaction: string | null; alreadyPurchased?: boolean }>(
        'orders/' + id + (refund ? '/refund' : '/pay'),
        {},
      );
      if (payment.transaction) {
        const transaction = Transaction.from(
          Uint8Array.from(atob(payment.transaction), (c) => c.charCodeAt(0)),
        );
        validateWalletTransaction(
          transaction,
          config!.programId,
          config!.issuer,
          version!,
          publicKey.toBase58(),
          refund ? 'refund' : 'pay',
          order,
        );
        const connection = new Connection('https://api.devnet.solana.com', 'finalized');
        if ((await connection.getGenesisHash()) !== DEVNET_GENESIS)
          throw new Error('Wallet payments support Solana Devnet only.');
        const signed = await wallet.signTransaction(transaction);
        const sig = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
        });
        setPendingSignature(sig);
        setMessage('Transaction submitted. Waiting for final confirmation…');
        for (let attempt = 0; attempt < 60; attempt++) {
          const status = (await connection.getSignatureStatuses([sig])).value[0];
          if (status?.err) {
            setPendingSignature('');
            throw new Error('The transaction failed. Sync this order before retrying.');
          }
          if (status?.confirmationStatus === 'finalized') {
            setPendingSignature('');
            break;
          }
          if (attempt === 59)
            throw new Error(
              'Final confirmation is still pending. Keep your session file and sync this order; do not pay again.',
            );
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      const synced = await api<Order>('orders/' + id + '/sync', {});
      setOrder(synced);
      setMessage(checkoutState(synced).message);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <Header backend={config?.backend} />
      <div className="checkout">
        <a className="back" href="/">
          ← Back to Skills
        </a>
        <p className="eyebrow">ENCRYPTED DELIVERY</p>
        <h1>
          Unlock your
          <br />
          <em>next workflow.</em>
        </h1>
        {version && (
          <div className="purchase">
            <div>
              <h2>{version.manifest.name}</h2>
              <span className="tag">v{version.manifest.version}</span>
            </div>
            <strong className="price">
              {Number(version.manifest.price) / 1_000_000} <small>USDC</small>
            </strong>
            <p>{version.manifest.description}</p>
            <hr />
            <h3>Creator payouts</h3>
            {version.manifest.splits.map((s) => (
              <div className="split" key={s.wallet}>
                <code>{shorten(s.wallet)}</code>
                <strong>{s.bps / 100}%</strong>
              </div>
            ))}
            <details>
              <summary>View version license</summary>
              <pre>{version.manifest.license}</pre>
            </details>
            <p className="fine">
              By paying and signing, you accept this version’s license. Transaction fees and account
              creation costs are additional. Payment enters escrow; an unsettled order becomes
              refundable after ten minutes.
            </p>
            <button
              className="primary"
              disabled={
                busy || !state.canPay || Boolean(pendingSignature) || config?.backend !== 'solana'
              }
              onClick={() => perform()}
            >
              {busy
                ? 'Processing…'
                : pendingSignature
                  ? 'Confirmation pending'
                  : !state.canPay
                    ? state.label
                    : config?.backend === 'mock'
                      ? 'Local demo · use the installer'
                      : 'Connect wallet and pay ↗'}
            </button>
            <button className="secondary" disabled={busy} onClick={syncOrder}>
              Sync / recover order
            </button>
            {state.canRefund && config?.backend === 'solana' && (
              <button
                className="secondary"
                disabled={busy || Boolean(pendingSignature)}
                onClick={() => perform(true)}
              >
                Request timeout refund
              </button>
            )}
            <div className="status">
              Status: {state.label} {address && ' / ' + shorten(address)}
            </div>
            {order?.status === 'funded' && state.seconds !== null && state.seconds > 0 && (
              <p className="fine">
                Refund available in {Math.floor(state.seconds / 60)}m {state.seconds % 60}s if
                settlement remains incomplete.
              </p>
            )}
            {pendingSignature && (
              <p className="fine">
                <a
                  className="back"
                  href={'https://explorer.solana.com/tx/' + pendingSignature + '?cluster=devnet'}
                  target="_blank"
                  rel="noreferrer"
                >
                  View submitted transaction ↗
                </a>
              </p>
            )}
            {config?.backend === 'mock' && (
              <div className="notice">
                This local demo uses simulated payments through the signed installer flow. Browser
                wallet checkout becomes available after public Devnet deployment.
              </div>
            )}
            {(message || order) && (
              <div className="notice" role="status">
                {message || state.message}
              </div>
            )}
            {order?.status === 'granted' && (
              <div className="notice">
                <strong>Finish the local install</strong>
                <pre>
                  skillseal resume --session skillseal-session.json --destination ./skills/
                  {version.manifest.skillId}
                </pre>
                <p>
                  The CLI resumes automatically if you started there. For a browser purchase, keep
                  the downloaded session file private: it contains your decryption key. Resume with
                  the command above, then remove the session when no longer needed.
                </p>
              </div>
            )}
          </div>
        )}
        <p className="fine">
          Order {id} ·{' '}
          {!config
            ? 'Checking environment…'
            : config.backend === 'mock'
              ? 'Local simulated ledger'
              : 'Solana Devnet only'}
        </p>
      </div>
    </main>
  );
}
