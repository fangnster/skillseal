import type { PaymentAdapter, Version, Order, ChainState } from './types.ts';
// Catalog mode deliberately has no ledger, no test funding and no paid grants.
export class DisabledPayment implements PaymentAdapter {
  readonly kind = 'disabled' as const;
  issuer: string;
  constructor(issuer: string) {
    this.issuer = issuer;
  }
  async register(_version: Version) {}
  async approvals(_version: Version) {
    return [];
  }
  async approvalTransaction(): Promise<string> {
    throw new Error('Devnet checkout is not enabled');
  }
  async paymentTransaction(): Promise<string> {
    throw new Error('Devnet checkout is not enabled');
  }
  async state(_version: Version, _order: Order): Promise<ChainState> {
    return { status: 'missing' };
  }
  async settle(): Promise<{ signature: string; feeLamports: number }> {
    throw new Error('Devnet checkout is not enabled');
  }
  async refundTransaction(): Promise<string> {
    throw new Error('Devnet checkout is not enabled');
  }
}
