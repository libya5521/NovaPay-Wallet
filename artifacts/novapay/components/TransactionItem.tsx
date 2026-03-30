import React, { memo } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency?: string;
  description?: string | null;
  status: string;
  counterpartyName?: string | null;
  counterpartyEmail?: string | null;
  createdAt: string;
}

interface Props {
  transaction: Transaction;
}

const ICON_CONFIG: Record<string, { icon: keyof typeof Feather.glyphMap; bg: string; color: string }> = {
  send: { icon: "arrow-up-right", bg: "#FEE2E2", color: "#EF4444" },
  receive: { icon: "arrow-down-left", bg: "#DCFCE7", color: "#10B981" },
  topup: { icon: "plus-circle", bg: "#DBEAFE", color: "#3B82F6" },
  deposit: { icon: "plus-circle", bg: "#DBEAFE", color: "#3B82F6" },
  withdrawal: { icon: "arrow-down", bg: "#FEF9C3", color: "#F59E0B" },
  card_payment: { icon: "credit-card", bg: "#EDE9FE", color: "#8B5CF6" },
  credit: { icon: "arrow-down-left", bg: "#DCFCE7", color: "#10B981" },
  debit: { icon: "arrow-up-right", bg: "#FEE2E2", color: "#EF4444" },
};

export const TransactionItem = memo(function TransactionItem({ transaction }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const cfg = ICON_CONFIG[transaction.type] ?? { icon: "activity" as const, bg: "#F1F5F9", color: "#64748B" };
  const isCredit = ["receive", "topup", "deposit", "credit"].includes(transaction.type);
  const amount = `${isCredit ? "+" : "-"}$${Math.abs(transaction.amount).toFixed(2)}`;
  const amountColor = isCredit ? colors.success : colors.text;

  const date = new Date(transaction.createdAt);
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  const statusColor =
    transaction.status === "completed" ? colors.success :
    transaction.status === "failed" ? colors.error : colors.warning;

  const label = transaction.description ||
    transaction.counterpartyName ||
    transaction.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconContainer, { backgroundColor: cfg.bg }]}>
        <Feather name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
          {label}
        </Text>
        {transaction.counterpartyName && transaction.description !== transaction.counterpartyName ? (
          <Text style={[styles.counterparty, { color: colors.textSecondary }]} numberOfLines={1}>
            {transaction.counterpartyName}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {dateStr} · {timeStr}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  description: { fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 2 },
  counterparty: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 2 },
  date: { fontFamily: "Inter_400Regular", fontSize: 12 },
  right: { alignItems: "flex-end", gap: 6 },
  amount: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
});
