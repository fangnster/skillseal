import { PublicKey, SystemProgram, type Transaction } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { DEVNET_USDC, type Version, type Order } from './types.ts';

const tags = {
  pay: [119, 18, 216, 65, 192, 117, 122, 220],
  refund: [2, 96, 183, 251, 63, 208, 46, 46],
  approve: [74, 71, 70, 155, 98, 225, 170, 141],
};
// The browser and headless CLI both verify the exact operation before requesting a signature.
export function validateWalletTransaction(
  tx: Transaction,
  programId: string,
  issuer: string,
  version: Version,
  signer: string,
  action: 'pay' | 'refund' | 'approve',
  order?: Pick<Order, 'encryptionPublicKey'>,
) {
  const program = new PublicKey(programId),
    wallet = new PublicKey(signer),
    mint = new PublicKey(DEVNET_USDC);
  const hash = Uint8Array.from(version.id.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const v = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('version'), new PublicKey(issuer).toBytes(), hash],
    program,
  )[0];
  const o = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('order'), v.toBytes(), wallet.toBytes()],
    program,
  )[0];
  const expected =
    action === 'approve'
      ? [
          [v, true, false],
          [wallet, false, true],
        ]
      : action === 'pay'
        ? [
            [v, false, false],
            [wallet, true, true],
            [o, true, false],
            [mint, false, false],
            [getAssociatedTokenAddressSync(mint, wallet), true, false],
            [getAssociatedTokenAddressSync(mint, o, true), true, false],
            [TOKEN_PROGRAM_ID, false, false],
            [ASSOCIATED_TOKEN_PROGRAM_ID, false, false],
            [SystemProgram.programId, false, false],
          ]
        : [
            [v, false, false],
            [wallet, true, true],
            [o, true, false],
            [mint, false, false],
            [getAssociatedTokenAddressSync(mint, o, true), true, false],
            [getAssociatedTokenAddressSync(mint, wallet), true, false],
            [TOKEN_PROGRAM_ID, false, false],
            [ASSOCIATED_TOKEN_PROGRAM_ID, false, false],
            [SystemProgram.programId, false, false],
          ];
  const ix = tx.instructions[0],
    keyBytes =
      action === 'pay' && order
        ? Uint8Array.from(atob(order.encryptionPublicKey), (c) => c.charCodeAt(0))
        : new Uint8Array();
  const data = [...tags[action], ...keyBytes];
  if (action === 'pay' && keyBytes.length !== 32)
    throw new Error('Invalid encryption key in payment');
  if (
    tx.instructions.length !== 1 ||
    !tx.feePayer?.equals(wallet) ||
    !ix?.programId.equals(program) ||
    ix.keys.length !== expected.length ||
    ix.data.length !== data.length ||
    !ix.data.every((b, i) => b === data[i])
  )
    throw new Error('Unexpected wallet transaction');
  for (let i = 0; i < expected.length; i++) {
    const [key, writable, signing] = expected[i] as [PublicKey, boolean, boolean],
      actual = ix.keys[i];
    // Compiled transactions mark a fee payer writable even when the original instruction did not.
    const effectiveWritable = writable || key.equals(wallet);
    if (
      !actual.pubkey.equals(key) ||
      actual.isSigner !== signing ||
      actual.isWritable !== effectiveWritable
    )
      throw new Error('Unexpected transaction accounts');
  }
}
