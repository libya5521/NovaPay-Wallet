// artifacts/novapay/components/TransactionList.tsx
//
// Renders a list of transactions with loading skeleton and empty state.
// Amounts are formatted via Intl.NumberFormat — never raw floats.
//
import React, { memo } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import Colors from "@/constants/colors";
import { TransactionItem } from "./TransactionItem";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TransactionRecord {
  id: string;
  type: string;
  /** Amount as a string (from server) or number — we format via Intl */
  amount: number | string;
  currency?: string;
  description?: string | null;
  status: string;
  counterpartyName?: string | null;
  counterpartyEmail?: string | null;
  createdAt: string;
}

interface TransactionListProps {
  transactions: TransactionRecord[];
  isLoading?: boolean;
  emptyMessage?: string;
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonRow() {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[skeletonStyles.row, { opacity }]}>
      <View style={skeletonStyles.icon} />
      <View style={skeletonStyles.content}>
        <View style={skeletonStyles.line} />
        <View style={[skeletonStyles.line, skeletonStyles.lineShort]} />
      </View>
      <View style={skeletonStyles.amount} />
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 8,
    backgroundColor: "#F1F5F9",
  },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E2E8F0" },
  content: { flex: 1, gap: 6 },
  line: { height: 12, borderRadius: 6, backgroundColor: "#E2E8F0", width: "70%" },
  lineShort: { width: "45%", height: 10 },
  amount: { width: 60, height: 14, borderRadius: 6, backgroundColor: "#E2E8F0" },
});

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message, isDark }: { message: string; isDark: boolean }) {
  const colors = isDark ? Colors.dark : Colors.light;
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>🧾</Text>
      <Text style={[emptyStyles.title, { color: colors.text }]}>No transactions yet</Text>
      <Text style={[emptyStyles.subtitle, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 48, gap: 8 },
  icon: { fontSize: 40 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});

// ── Main component ───────────────────────────────────────────────────────────

export const TransactionList = memo(function TransactionList({
  transactions,
  isLoading = false,
  emptyMessage = "Your transactions will appear here once you start using NovaPay.",
}: TransactionListProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  if (isLoading) {
    return (
      <View>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    );
  }

  if (transactions.length === 0) {
    return <EmptyState message={emptyMessage} isDark={isDark} />;
  }

  // Normalize amount: API returns decimal string, local state may be number
  const normalized = transactions.map((t) => ({
    ...t,
    amount: typeof t.amount === "string" ? parseFloat(t.amount) : t.amount,
    currency: t.currency ?? "USD",
  }));

  return (
    <View>
      {normalized.map((tx) => (
        <TransactionItem key={tx.id} transaction={tx} />
      ))}
    </View>
  );
});

// ── Amount formatter (exported for use in screens) ───────────────────────────

export function formatAmount(
  amount: number | string,
  currency = "USD",
  locale = "en-US"
): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}
