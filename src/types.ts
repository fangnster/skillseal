export const DEVNET_USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
export const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export type Split = { wallet: string; bps: number };
export type Manifest = {
  skillId: string;
  name: string;
  version: string;
  description: string;
  price: string;
  mint: string;
  splits: Split[];
  license: string;
  bundleHash: string;
  publisher: string;
  issuer: string;
};
export type Version = {
  id: string;
  manifest: Manifest;
  approvals: string[];
  active: boolean;
  createdAt: number;
};
export type Order = {
  id: string;
  versionId: string;
  encryptionPublicKey: string;
  buyer: string | null;
  status: 'created' | 'bound' | 'funded' | 'granted' | 'refunded';
  createdAt: number;
  fundedAt?: number;
  expiresAt?: number;
  grantedAt?: number;
  feeLamports?: number;
  paymentSignature?: string;
  settlementSignature?: string;
  envelope?: string;
};
export type ChainState = {
  status: 'missing' | 'funded' | 'granted' | 'refunded';
  paidAt?: number;
  expiresAt?: number;
  signature?: string;
  feeLamports?: number;
};
export type PaymentCost = {
  signature: string;
  phase: 'payment' | 'settlement' | 'refund';
  feeLamports: number;
  rentDepositLamports: number;
};
export type PaymentAdapter = {
  readonly kind: 'solana' | 'mock';
  readonly issuer: string;
  register(version: Version): Promise<void>;
  approvalTransaction(version: Version, wallet: string): Promise<string>;
  approvals(version: Version): Promise<string[]>;
  paymentTransaction(version: Version, order: Order): Promise<string>;
  state(version: Version, order: Order): Promise<ChainState>;
  settle(version: Version, order: Order): Promise<{ signature: string; feeLamports: number }>;
  refundTransaction(version: Version, order: Order): Promise<string>;
  costs?(version: Version, order: Order): Promise<PaymentCost[]>;
};
