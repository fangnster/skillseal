import { type Connection, type Transaction } from '@solana/web3.js';
import { DEVNET_GENESIS } from './types.ts';

export async function signFreshDevnetTransaction(
  transaction: Transaction,
  wallet: { signTransaction(transaction: Transaction): Promise<Transaction> },
  connection: Pick<Connection, 'getGenesisHash' | 'getLatestBlockhash' | 'isBlockhashValid'>,
) {
  if ((await connection.getGenesisHash()) !== DEVNET_GENESIS)
    throw new Error('Wallet payments support Solana Devnet only.');
  // Refresh before the human signing prompt; never alter an already signed message.
  transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  const message = transaction.serializeMessage();
  const signed = await wallet.signTransaction(transaction);
  if (!signed.serializeMessage().equals(message))
    throw new Error('The wallet changed the transaction. No transaction was sent.');
  if (
    !(await connection.isBlockhashValid(signed.recentBlockhash!, { commitment: 'confirmed' })).value
  )
    throw new Error(
      'The wallet approval expired before submission. No transaction was sent. Sync this order, then retry to review a fresh transaction.',
    );
  return signed;
}
