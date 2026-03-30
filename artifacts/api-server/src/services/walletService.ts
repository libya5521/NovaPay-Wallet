import { db, walletsTable, transactionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

export async function addMoney(userId: string, amount: number, note?: string) {
  if (amount <= 0) {
    throw Object.assign(new Error("Amount must be greater than 0"), { code: "INVALID_AMOUNT" });
  }

  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId))
    .limit(1);

  if (!wallet) {
    throw Object.assign(new Error("Wallet not found"), { code: "WALLET_NOT_FOUND" });
  }

  const newBalance = (parseFloat(wallet.balance) + amount).toFixed(2);

  await db
    .update(walletsTable)
    .set({ balance: newBalance, updatedAt: new Date() })
    .where(eq(walletsTable.id, wallet.id));

  await db.insert(transactionsTable).values({
    userId,
    type: "credit",
    amount: amount.toFixed(2),
    currency: "USD",
    description: note ? `Top-up: ${note}` : "Account top-up",
    status: "completed",
  });

  return { balance: parseFloat(newBalance), currency: wallet.currency };
}

export async function withdrawMoney(userId: string, amount: number, note?: string) {
  if (amount <= 0) {
    throw Object.assign(new Error("Amount must be greater than 0"), { code: "INVALID_AMOUNT" });
  }

  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId))
    .limit(1);

  if (!wallet) {
    throw Object.assign(new Error("Wallet not found"), { code: "WALLET_NOT_FOUND" });
  }

  const currentBalance = parseFloat(wallet.balance);
  if (currentBalance < amount) {
    throw Object.assign(new Error("Insufficient funds"), { code: "INSUFFICIENT_FUNDS" });
  }

  const newBalance = (currentBalance - amount).toFixed(2);

  await db
    .update(walletsTable)
    .set({ balance: newBalance, updatedAt: new Date() })
    .where(eq(walletsTable.id, wallet.id));

  await db.insert(transactionsTable).values({
    userId,
    type: "debit",
    amount: amount.toFixed(2),
    currency: "USD",
    description: note ? `Withdrawal: ${note}` : "Bank withdrawal",
    status: "completed",
  });

  return { balance: parseFloat(newBalance), currency: wallet.currency };
}

export async function sendMoney(
  senderId: string,
  recipientEmail: string,
  amount: number,
  note?: string
) {
  if (amount <= 0) {
    throw Object.assign(new Error("Amount must be greater than 0"), { code: "INVALID_AMOUNT" });
  }

  const [senderWallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, senderId))
    .limit(1);

  if (!senderWallet) {
    throw Object.assign(new Error("Wallet not found"), { code: "WALLET_NOT_FOUND" });
  }

  const currentBalance = parseFloat(senderWallet.balance);
  if (currentBalance < amount) {
    throw Object.assign(new Error("Insufficient funds"), { code: "INSUFFICIENT_FUNDS" });
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

  const [recipientWallet] = await db
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, recipient.id))
    .limit(1);

  if (!recipientWallet) {
    throw Object.assign(new Error("Recipient wallet not found"), { code: "RECIPIENT_WALLET_NOT_FOUND" });
  }

  const newSenderBalance = (currentBalance - amount).toFixed(2);
  const newRecipientBalance = (parseFloat(recipientWallet.balance) + amount).toFixed(2);

  await db
    .update(walletsTable)
    .set({ balance: newSenderBalance, updatedAt: new Date() })
    .where(eq(walletsTable.id, senderWallet.id));

  await db
    .update(walletsTable)
    .set({ balance: newRecipientBalance, updatedAt: new Date() })
    .where(eq(walletsTable.id, recipientWallet.id));

  const description = note
    ? `Transfer: ${note}`
    : `Sent to ${recipient.firstName} ${recipient.lastName}`;

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId: senderId,
      type: "debit",
      amount: amount.toFixed(2),
      currency: "USD",
      description,
      status: "completed",
      counterpartyName: `${recipient.firstName} ${recipient.lastName}`,
      counterpartyEmail: recipient.email,
    })
    .returning();

  const [sender] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, senderId))
    .limit(1);

  await db.insert(transactionsTable).values({
    userId: recipient.id,
    type: "credit",
    amount: amount.toFixed(2),
    currency: "USD",
    description: `Received from ${sender?.firstName ?? "User"} ${sender?.lastName ?? ""}`.trim(),
    status: "completed",
    counterpartyEmail: sender?.email,
  });

  return {
    id: tx.id,
    type: tx.type,
    amount: parseFloat(tx.amount),
    currency: tx.currency,
    description: tx.description,
    status: tx.status,
    counterpartyName: tx.counterpartyName,
    counterpartyEmail: tx.counterpartyEmail,
    createdAt: tx.createdAt.toISOString(),
  };
}
