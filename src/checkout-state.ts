import type { Order } from './types.ts';

// A submitted payment is not a license. Only a verified grant enables installation.
export function checkoutState(order?: Order, now = Date.now()) {
  const seconds = order?.expiresAt ? Math.max(0, Math.ceil((order.expiresAt - now) / 1000)) : null;
  switch (order?.status) {
    case 'created':
    case 'bound':
      return {
        label: order.status === 'created' ? 'Awaiting wallet' : 'Wallet verified',
        message:
          'No license has been confirmed. Connect your wallet to pay, or sync an existing payment.',
        canPay: true,
        canRefund: false,
        seconds,
      };
    case 'funded':
      return {
        label: 'Payment in escrow',
        message:
          seconds === 0
            ? 'Settlement timed out. No license was granted. The original buyer can request a refund.'
            : 'Payment is in escrow. The license is still pending settlement. Sync this order; do not pay again.',
        canPay: false,
        canRefund: seconds === 0,
        seconds,
      };
    case 'granted':
      return {
        label: 'License granted',
        message:
          'Your version license is confirmed. Resume the installer to decrypt and install locally.',
        canPay: false,
        canRefund: false,
        seconds,
      };
    case 'refunded':
      return {
        label: 'Refund confirmed',
        message:
          'This order was refunded and cannot unlock the Skill. Start a new checkout to purchase.',
        canPay: false,
        canRefund: false,
        seconds,
      };
    default:
      return {
        label: 'Loading order',
        message: 'Loading the current order state…',
        canPay: false,
        canRefund: false,
        seconds,
      };
  }
}
