import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { DEVNET_GENESIS } from '../src/types.ts';
import { signFreshDevnetTransaction } from '../src/wallet-transaction.ts';

function fixture() {
  const payer = Keypair.generate();
  const tx = new Transaction({
    feePayer: payer.publicKey,
    recentBlockhash: PublicKey.unique().toBase58(),
  }).add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 1,
    }),
  );
  const fresh = PublicKey.unique().toBase58();
  let prompts = 0;
  const wallet = {
    async signTransaction(t: Transaction) {
      prompts++;
      t.sign(payer);
      return t;
    },
  };
  const rpc = {
    async getGenesisHash() {
      return DEVNET_GENESIS;
    },
    async getLatestBlockhash() {
      return { blockhash: fresh, lastValidBlockHeight: 200 };
    },
    async isBlockhashValid() {
      return { context: { slot: 1 }, value: true };
    },
  };
  return { tx, payer, fresh, wallet, rpc, prompts: () => prompts };
}
test('human wallet signing refreshes a stale blockhash without changing the payment', async () => {
  const f = fixture();
  const originalInstruction = Buffer.from(f.tx.instructions[0].data);
  const signed = await signFreshDevnetTransaction(f.tx, f.wallet, f.rpc);
  assert.equal(signed.recentBlockhash, f.fresh);
  assert.deepEqual(signed.instructions[1].data, originalInstruction);
  assert(signed.verifySignatures());
  assert.equal(f.prompts(), 1);
});
test('a non-Devnet RPC is rejected before requesting a wallet signature', async () => {
  const f = fixture();
  f.rpc.getGenesisHash = async () => 'mainnet';
  await assert.rejects(signFreshDevnetTransaction(f.tx, f.wallet, f.rpc), /Devnet only/);
  assert.equal(f.prompts(), 0);
});
test('an approval that expires in the human prompt cannot proceed to broadcast', async () => {
  const f = fixture();
  f.rpc.isBlockhashValid = async () => ({ context: { slot: 1 }, value: false });
  await assert.rejects(
    signFreshDevnetTransaction(f.tx, f.wallet, f.rpc),
    /No transaction was sent/,
  );
  assert.equal(f.prompts(), 1);
});
test('wallet mutation after review is rejected instead of submitting altered instructions', async () => {
  const f = fixture();
  f.wallet.signTransaction = async (tx: Transaction) => {
    tx.instructions[1].data[4] ^= 1;
    tx.sign(f.payer);
    return tx;
  };
  await assert.rejects(signFreshDevnetTransaction(f.tx, f.wallet, f.rpc), /wallet changed/);
});
test('Phantom-style automatic fees see the explicit zero priority fee before signing', async () => {
  const f = fixture();
  let enhanced = false;
  f.wallet.signTransaction = async (tx: Transaction) => {
    if (!tx.instructions.some((ix) => ix.programId.equals(ComputeBudgetProgram.programId))) {
      enhanced = true;
      tx.instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }));
    }
    tx.sign(f.payer);
    return tx;
  };
  const signed = await signFreshDevnetTransaction(f.tx, f.wallet, f.rpc);
  assert.equal(enhanced, false);
  assert(signed.instructions[0].programId.equals(ComputeBudgetProgram.programId));
  assert.equal(signed.instructions[0].data.readBigUInt64LE(1), 0n);
  assert(signed.verifySignatures());
});
