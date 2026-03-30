import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { TransactionRecord } from "@workspace/api-client-react";

interface Props {
  transaction: TransactionRecord;
}

export function TransactionItem({ transaction }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const isCredit = transaction.type === "credit";
  const amount = `${isCredit ? "+" : "-"}$${Math.abs(transaction.amount).toFixed(2)}`;
  const amountColor = isCredit ? colors.success : colors.error;

  const iconName: keyof typeof Feather.glyphMap = isCredit ? "arrow-down-left" : "arrow-up-right";
  const iconBg = isCredit ? "#DCFCE7" : "#FEE2E2";
  const iconColor = isCredit ? colors.success : colors.error;

  const date = new Date(transaction.createdAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const statusColor =
    transaction.status === "completed"
      ? colors.success
      : transaction.status === "failed"
      ? colors.error
      : colors.warning;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Feather name={iconName} size={18} color={iconColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
          {transaction.description}
        </Text>
        {transaction.counterpartyName ? (
          <Text style={[styles.counterparty, { color: colors.textSecondary }]} numberOfLines={1}>
            {transaction.counterpartyName}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {dateStr} · {timeStr}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>
    </View>
  );
}

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
  description: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginBottom: 2,
  },
  counterparty: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 2,
  },
  date: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  right: { alignItems: "flex-end", gap: 6 },
  amount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
