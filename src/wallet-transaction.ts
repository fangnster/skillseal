import { ComputeBudgetProgram, type Connection, type Transaction } from '@solana/web3.js';
import { DEVNET_GENESIS } from './types.ts';

export async function signFreshDevnetTransaction(
  transaction: Transaction,
  wallet: { signTransaction(transaction: Transaction): Promise<Transaction> },
  connection: Pick<Connection, 'getGenesisHash' | 'getLatestBlockhash' | 'isBlockhashValid'>,
) {
  if ((await connection.getGenesisHash()) !== DEVNET_GENESIS)
    throw new Error('Wallet payments support Solana Devnet only.');
  if (transaction.instructions.some((ix) => ix.programId.equals(ComputeBudgetProgram.programId)))
    throw new Error('Unexpected fee instructions before wallet approval.');
  // Phantom otherwise adds priority-fee instructions while signing. Specify zero
  // priority fee for this Devnet flow before review and keep exact-message checks.
  transaction.instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 0 }));
  // Refresh before the human signing prompt; never alter an already signed message.
  transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  const message = transaction.serializeMessage(),
    expectedBlockhash = transaction.recentBlockhash,
    expectedInstructionCount = transaction.instructions.length;
  const signed = await wallet.signTransaction(transaction);
  if (!signed.serializeMessage().equals(message)) {
    const detail =
      signed.recentBlockhash !== expectedBlockhash
        ? 'blockhash'
        : signed.instructions.length !== expectedInstructionCount
          ? 'instructions'
          : 'message contents';
    throw new Error(`The wallet changed the transaction (${detail}). No transaction was sent.`);
  }
  if (
    !(await connection.isBlockhashValid(signed.recentBlockhash!, { commitment: 'confirmed' })).value
  )
    throw new Error(
      'The wallet approval expired before submission. No transaction was sent. Sync this order, then retry to review a fresh transaction.',
    );
  return signed;
}
