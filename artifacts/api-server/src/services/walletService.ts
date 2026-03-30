import { db, walletsTable, transactionsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export async function getWalletBalance(userId: string) {
  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId))
    .limit(1);

  if (!wallet) {
    throw Object.assign(new Error("Wallet not found"), { code: "WALLET_NOT_FOUND" });
  }

  return {
    balance: parseFloat(wallet.balance),
    currency: wallet.currency,
    accountNumber: wallet.accountNumber,
  };
}

export async function addMoney(
  userId: string,
  amount: number,
  note?: string,
  idempotencyKey?: string
) {
  if (amount <= 0) {
    throw Object.assign(new Error("Amount must be greater than 0"), { code: "INVALID_AMOUNT" });
  }

  return await db.transaction(async (tx) => {
    if (idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.idempotencyKey, idempotencyKey))
        .limit(1);
      if (existing) {
        const [w] = await tx.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
        return { balance: parseFloat(w?.balance ?? "0"), currency: w?.currency ?? "USD" };
      }
    }

    const [wallet] = await tx
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, userId))
      .limit(1);

    if (!wallet) {
      throw Object.assign(new Error("Wallet not found"), { code: "WALLET_NOT_FOUND" });
    }

    const [updated] = await tx
      .update(walletsTable)
      .set({
        balance: sql`${walletsTable.balance} + ${amount.toFixed(2)}::numeric`,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.id, wallet.id))
      .returning();

    await tx.insert(transactionsTable).values({
      userId,
      type: "deposit",
      amount: amount.toFixed(2),
      currency: "USD",
      description: note ? `Deposit: ${note}` : "Account deposit",
      status: "completed",
      idempotencyKey: idempotencyKey ?? null,
    });

    return { balance: parseFloat(updated.balance), currency: updated.currency };
  });
}

export async function withdrawMoney(
  userId: string,
  amount: number,
  note?: string,
  idempotencyKey?: string
) {
  if (amount <= 0) {
    throw Object.assign(new Error("Amount must be greater than 0"), { code: "INVALID_AMOUNT" });
  }

  return await db.transaction(async (tx) => {
    if (idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.idempotencyKey, idempotencyKey))
        .limit(1);
      if (existing) {
        const [w] = await tx.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
        return { balance: parseFloat(w?.balance ?? "0"), currency: w?.currency ?? "USD" };
      }
    }

    const [wallet] = await tx
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, userId))
      .limit(1);

    if (!wallet) {
      throw Object.assign(new Error("Wallet not found"), { code: "WALLET_NOT_FOUND" });
    }

    if (parseFloat(wallet.balance) < amount) {
      throw Object.assign(new Error("Insufficient funds"), { code: "INSUFFICIENT_FUNDS" });
    }

    // Atomic SQL subtraction — CHECK (balance >= 0) constraint is the DB-level backstop
    const [updated] = await tx
      .update(walletsTable)
      .set({
        balance: sql`${walletsTable.balance} - ${amount.toFixed(2)}::numeric`,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.id, wallet.id))
      .returning();

    await tx.insert(transactionsTable).values({
      userId,
      type: "withdrawal",
      amount: amount.toFixed(2),
      currency: "USD",
      description: note ? `Withdrawal: ${note}` : "Bank withdrawal",
      status: "completed",
      idempotencyKey: idempotencyKey ?? null,
    });

    return { balance: parseFloat(updated.balance), currency: updated.currency };
  });
}

export async function sendMoney(
  senderId: string,
  recipientEmail: string,
  amount: number,
  note?: string,
  idempotencyKey?: string
) {
  if (amount <= 0) {
    throw Object.assign(new Error("Amount must be greater than 0"), { code: "INVALID_AMOUNT" });
  }

  const [recipient] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, recipientEmail.toLowerCase()))
    .limit(1);

  if (!recipient) {
    throw Object.assign(new Error("Recipient not found"), { code: "RECIPIENT_NOT_FOUND" });
  }

  if (recipient.id === senderId) {
    throw Object.assign(new Error("Cannot send money to yourself"), { code: "SELF_TRANSFER" });
  }

  return await db.transaction(async (tx) => {
    if (idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.idempotencyKey, idempotencyKey))
        .limit(1);
      if (existing) {
        return {
          id: existing.id,
          type: existing.type,
          amount: parseFloat(existing.amount),
          currency: existing.currency,
          description: existing.description,
          status: existing.status,
          counterpartyName: existing.counterpartyName,
          counterpartyEmail: existing.counterpartyEmail,
          createdAt: existing.createdAt.toISOString(),
        };
      }
    }

    const [senderWallet] = await tx
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, senderId))
      .limit(1);

    if (!senderWallet) {
      throw Object.assign(new Error("Wallet not found"), { code: "WALLET_NOT_FOUND" });
    }

    if (parseFloat(senderWallet.balance) < amount) {
      throw Object.assign(new Error("Insufficient funds"), { code: "INSUFFICIENT_FUNDS" });
    }

    const [recipientWallet] = await tx
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, recipient.id))
      .limit(1);

    if (!recipientWallet) {
      throw Object.assign(new Error("Recipient wallet not found"), { code: "RECIPIENT_WALLET_NOT_FOUND" });
    }

    await tx
      .update(walletsTable)
      .set({
        balance: sql`${walletsTable.balance} - ${amount.toFixed(2)}::numeric`,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.id, senderWallet.id));

    await tx
      .update(walletsTable)
      .set({
        balance: sql`${walletsTable.balance} + ${amount.toFixed(2)}::numeric`,
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.id, recipientWallet.id));

    const description = note
      ? `Transfer: ${note}`
      : `Sent to ${recipient.firstName} ${recipient.lastName}`;

    const [txRecord] = await tx
      .insert(transactionsTable)
      .values({
        userId: senderId,
        type: "send",
        amount: amount.toFixed(2),
        currency: "USD",
        description,
        status: "completed",
        counterpartyName: `${recipient.firstName} ${recipient.lastName}`,
        counterpartyEmail: recipient.email,
        idempotencyKey: idempotencyKey ?? null,
      })
      .returning();

    const [sender] = await tx
      .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, senderId))
      .limit(1);

    await tx.insert(transactionsTable).values({
      userId: recipient.id,
      type: "receive",
      amount: amount.toFixed(2),
      currency: "USD",
      description: `Received from ${sender?.firstName ?? "User"} ${sender?.lastName ?? ""}`.trim(),
      status: "completed",
      counterpartyEmail: sender?.email,
    });

    return {
      id: txRecord.id,
      type: txRecord.type,
      amount: parseFloat(txRecord.amount),
      currency: txRecord.currency,
      description: txRecord.description,
      status: txRecord.status,
      counterpartyName: txRecord.counterpartyName,
      counterpartyEmail: txRecord.counterpartyEmail,
      createdAt: txRecord.createdAt.toISOString(),
    };
  });
}
