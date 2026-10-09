import { randomUUID } from 'node:crypto';
import type { PaymentAdapter, Version, Order, ChainState } from './types.ts';
import { Store } from './store.ts';
// A persistent local test ledger. Never accepted by the Solana adapter or production config.
export class MockPayment implements PaymentAdapter {
  readonly kind = 'mock' as const;
  issuer: string;
  store: Store;
  now: () => number;
  constructor(store: Store, issuer: string, now = () => Date.now()) {
    this.store = store;
    this.issuer = issuer;
    this.now = now;
  }
  key(version: Version, order: Order) {
    if (!order.buyer) throw new Error('Buyer signature required');
    return version.id + ':' + order.buyer;
  }
  async register(version: Version) {
    this.store.run('INSERT OR IGNORE INTO mock_versions VALUES (?,?)', version.id, '[]');
  }
  async approvalTransaction() {
    return '';
  }
  async approve(version: Version, wallet: string) {
    if (!version.manifest.splits.some((s) => s.wallet === wallet))
      throw new Error('Unknown author');
    const list = await this.approvals(version);
    if (!list.includes(wallet)) list.push(wallet);
    this.store.run(
      'UPDATE mock_versions SET approvals=? WHERE id=?',
      JSON.stringify(list),
      version.id,
    );
  }
  async approvals(version: Version) {
    return JSON.parse(
      this.store.get<{ approvals: string }>(
        'SELECT approvals FROM mock_versions WHERE id=?',
        version.id,
      )?.approvals || '[]',
    ) as string[];
  }
  async paymentTransaction() {
    return '';
  }
  async state(version: Version, order: Order): Promise<ChainState> {
    if (!order.buyer) return { status: 'missing' };
    const row = this.store.get<{ payload: string }>(
      'SELECT payload FROM mock_orders WHERE id=?',
      this.key(version, order),
    );
    return row ? JSON.parse(row.payload) : { status: 'missing' };
  }
  async fund(version: Version, order: Order) {
    if ((await this.approvals(version)).length !== version.manifest.splits.length)
      throw new Error('All authors must approve');
    const state = await this.state(version, order);
    if (state.status === 'funded' || state.status === 'granted')
      throw new Error('Already purchased or funded');
    const paidAt = this.now();
    this.store.run(
      'INSERT INTO mock_orders VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
      this.key(version, order),
      JSON.stringify({
        status: 'funded',
        paidAt,
        expiresAt: paidAt + 600_000,
        signature: 'mock:' + randomUUID(),
        feeLamports: 5000,
      }),
    );
  }
  async settle(version: Version, order: Order) {
    const state = await this.state(version, order);
    if (state.status !== 'funded' || this.now() >= state.expiresAt!)
      throw new Error('Order cannot settle');
    const signature = 'mock:' + randomUUID();
    this.store.transaction(() => {
      const price = BigInt(version.manifest.price);
      let distributed = 0n;
      version.manifest.splits.forEach((split, i) => {
        const share =
          i === version.manifest.splits.length - 1
            ? price - distributed
            : (price * BigInt(split.bps)) / 10000n;
        distributed += share;
        const previous = BigInt(
          this.store.get<{ amount: string }>(
            'SELECT amount FROM mock_balances WHERE wallet=?',
            split.wallet,
          )?.amount || '0',
        );
        this.store.run(
          'INSERT INTO mock_balances VALUES (?,?) ON CONFLICT(wallet) DO UPDATE SET amount=excluded.amount',
          split.wallet,
          (previous + share).toString(),
        );
      });
      this.store.run(
        'UPDATE mock_orders SET payload=? WHERE id=?',
        JSON.stringify({ ...state, status: 'granted', signature, feeLamports: 5000 }),
        this.key(version, order),
      );
    });
    return { signature, feeLamports: 5000 };
  }
  async refundTransaction() {
    return '';
  }
  async refund(version: Version, order: Order) {
    const state = await this.state(version, order);
    if (state.status !== 'funded' || this.now() < state.expiresAt!)
      throw new Error('Refund not eligible');
    this.store.run(
      'UPDATE mock_orders SET payload=? WHERE id=?',
      JSON.stringify({ ...state, status: 'refunded' }),
      this.key(version, order),
    );
  }
}
