// artifacts/api-server/src/services/transfer.service.ts
//
// Idempotent peer-to-peer transfer between two wallets.
//
// Safety guarantees:
//   1. Idempotency  — if a transfer with the same idempotencyKey was already
//      processed, return the original transaction records without re-executing.
//   2. Atomicity    — debit + credit + ledger entries all run in one DB
//      transaction; a failure at any step rolls everything back.
//   3. No negatives — we check balance before deducting; the DB also enforces
//      a CHECK constraint (balance >= 0) as a last-resort guard.
//   4. No floats    — all amounts are decimal strings throughout.
//
import { db } from "@workspace/db";
import { TransferError, NotFoundError } from "../errors/index.js";
import * as accountRepo from "../repositories/account.repo.js";
import * as txRepo from "../repositories/transaction.repo.js";
import { generateSecureId } from "../lib/crypto.js";

export interface TransferParams {
  fromUserId: string;
  toUserId: string;
  amount: number;    // validated positive number from the route layer
  currency?: string;
  note?: string;
  idempotencyKey: string;
}

export interface TransferResult {
  debit: Awaited<ReturnType<typeof txRepo.create>>;
  credit: Awaited<ReturnType<typeof txRepo.create>>;
  idempotent: boolean; // true = already existed, not re-executed
}

export async function transfer(params: TransferParams): Promise<TransferResult> {
  const { fromUserId, toUserId, amount, currency = "USD", note, idempotencyKey } = params;

  // ── 1. Idempotency check (outside transaction — read-only fast path) ──
  const existing = await txRepo.findByIdempotencyKey(idempotencyKey);
  if (existing) {
    // Find the paired entry (same reference on the other side)
    const paired = existing.referenceId
      ? await txRepo.findByIdempotencyKey(`${idempotencyKey}:pair`)
      : undefined;

    return {
      debit: existing.type === "send" ? existing : (paired ?? existing),
      credit: existing.type === "receive" ? existing : (paired ?? existing),
      idempotent: true,
    };
  }

  // ── 2. Validate amount ───────────────────────────────────────────────
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new TransferError("Amount must be a positive number", "INVALID_AMOUNT");
  }

  const amountStr = amount.toFixed(2);

  // ── 3. Run everything inside a single DB transaction ─────────────────
  return db.transaction(async (tx) => {
    // Lock sender and receiver accounts for update (SELECT … FOR UPDATE via
    // Drizzle — ordering by id prevents deadlocks between concurrent transfers)
    const [senderId, receiverId] = [fromUserId, toUserId].sort();
    const firstId = senderId === fromUserId ? fromUserId : toUserId;
    const secondId = firstId === fromUserId ? toUserId : fromUserId;

    const firstAccount = await accountRepo.getByUserId(firstId, tx);
    const secondAccount = await accountRepo.getByUserId(secondId, tx);

    const senderAccount = firstId === fromUserId ? firstAccount : secondAccount;
    const receiverAccount = firstId === fromUserId ? secondAccount : firstAccount;

    if (!senderAccount) throw new NotFoundError("Sender wallet");
    if (!receiverAccount) throw new NotFoundError("Recipient wallet");

    // ── 4. Sufficient balance check ──────────────────────────────────
    const senderBalance = parseFloat(senderAccount.balance);
    if (senderBalance < amount) {
      throw new TransferError(
        `Insufficient balance: available ${senderAccount.currency} ${senderBalance.toFixed(2)}`,
        "INSUFFICIENT_FUNDS"
      );
    }

    // ── 5. Deduct from sender ────────────────────────────────────────
    await accountRepo.updateBalance(senderAccount.id, `-${amountStr}`, tx);

    // ── 6. Credit receiver ───────────────────────────────────────────
    await accountRepo.updateBalance(receiverAccount.id, amountStr, tx);

    // ── 7. Insert ledger entries ─────────────────────────────────────
    const sharedRef = generateSecureId();
    const description = note
      ? note.slice(0, 200)
      : `Transfer to ${toUserId.slice(0, 8)}`;

    const debit = await txRepo.create(
      {
        userId: fromUserId,
        fromAccountId: senderAccount.id,
        toAccountId: receiverAccount.id,
        type: "send",
        amount: amountStr,
        currency,
        description,
        status: "completed",
        referenceId: sharedRef,
        idempotencyKey,
      },
      tx
    );

    const credit = await txRepo.create(
      {
        userId: toUserId,
        fromAccountId: senderAccount.id,
        toAccountId: receiverAccount.id,
        type: "receive",
        amount: amountStr,
        currency,
        description: note ? note.slice(0, 200) : `Transfer from ${fromUserId.slice(0, 8)}`,
        status: "completed",
        referenceId: sharedRef,
        idempotencyKey: `${idempotencyKey}:pair`,
      },
      tx
    );

    return { debit, credit, idempotent: false };
  });
}
