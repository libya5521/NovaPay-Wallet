import React, { useCallback, useEffect, useState, memo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  getGetTransactionsQueryKey,
  useGetTransactions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TransactionItem } from "@/components/TransactionItem";
import Colors from "@/constants/colors";

type TxRecord = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  counterpartyName?: string | null;
  counterpartyEmail?: string | null;
  createdAt: string;
};

const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  send: "arrow-up-right",
  receive: "arrow-down-left",
  topup: "plus-circle",
  deposit: "plus-circle",
  withdrawal: "arrow-down",
  card_payment: "credit-card",
  credit: "arrow-down-left",
  debit: "arrow-up-right",
};

const COLOR_MAP: Record<string, string> = {
  send: "#EF4444",
  receive: "#10B981",
  topup: "#3B82F6",
  deposit: "#3B82F6",
  withdrawal: "#F59E0B",
  card_payment: "#8B5CF6",
  credit: "#10B981",
  debit: "#EF4444",
};

function TransactionDetailModal({ tx, onClose, colors }: {
  tx: TxRecord | null;
  onClose: () => void;
  colors: typeof Colors.light;
}) {
  if (!tx) return null;
  const isCredit = ["receive", "topup", "deposit", "credit"].includes(tx.type);
  const iconName = ICON_MAP[tx.type] ?? "activity";
  const iconColor = COLOR_MAP[tx.type] ?? colors.tint;

  const dateStr = new Date(tx.createdAt).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusColor =
    tx.status === "completed" ? colors.success :
    tx.status === "failed" ? colors.error : colors.warning;

  return (
    <Modal visible={!!tx} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={dtStyles.overlay}>
        <Pressable style={dtStyles.backdrop} onPress={onClose} />
        <View style={[dtStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={dtStyles.handle} />

          <View style={[dtStyles.iconCircle, { backgroundColor: colors.surfaceSecondary }]}>
            <Feather name={iconName} size={28} color={iconColor} />
          </View>

          <Text style={[dtStyles.amount, { color: isCredit ? colors.success : colors.text }]}>
            {isCredit ? "+" : "-"}{tx.currency}{Math.abs(tx.amount).toFixed(2)}
          </Text>
          <Text style={[dtStyles.desc, { color: colors.textSecondary }]}>
            {tx.description ?? tx.type.replace(/_/g, " ")}
          </Text>

          <View style={[dtStyles.divider, { backgroundColor: colors.border }]} />

          <View style={dtStyles.rows}>
            <DetailRow label="Status" value={tx.status.toUpperCase()} valueColor={statusColor} colors={colors} />
            <DetailRow label="Type" value={tx.type.replace(/_/g, " ")} colors={colors} />
            {tx.counterpartyName ? <DetailRow label="Recipient" value={tx.counterpartyName} colors={colors} /> : null}
            {tx.counterpartyEmail ? <DetailRow label="Email" value={tx.counterpartyEmail} colors={colors} /> : null}
            <DetailRow label="Date" value={dateStr} colors={colors} />
            <DetailRow label="Transaction ID" value={`${tx.id.slice(0, 16)}...`} colors={colors} />
          </View>

          <Pressable style={[dtStyles.closeBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={onClose}>
            <Text style={[dtStyles.closeBtnText, { color: colors.text }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, valueColor, colors }: {
  label: string;
  value: string;
  valueColor?: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={dtStyles.row}>
      <Text style={[dtStyles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[dtStyles.rowValue, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

const dtStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 24 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  amount: { fontFamily: "Inter_700Bold", fontSize: 30, textAlign: "center", marginBottom: 4 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", marginBottom: 20 },
  divider: { height: 1, marginBottom: 20 },
  rows: { gap: 12, marginBottom: 24 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  rowLabel: { fontFamily: "Inter_400Regular", fontSize: 13 },
  rowValue: { fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "right", flex: 1, marginLeft: 16 },
  closeBtn: { borderRadius: 14, padding: 16, alignItems: "center" },
  closeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
});

const SkeletonItem = memo(function SkeletonItem({ colors }: { colors: typeof Colors.light }) {
  return (
    <View style={[skelStyles.row, { backgroundColor: colors.surface }]}>
      <View style={[skelStyles.circle, { backgroundColor: colors.surfaceSecondary }]} />
      <View style={skelStyles.lines}>
        <View style={[skelStyles.line, skelStyles.lineShort, { backgroundColor: colors.surfaceSecondary }]} />
        <View style={[skelStyles.line, skelStyles.lineLong, { backgroundColor: colors.surfaceSecondary }]} />
      </View>
      <View style={[skelStyles.amount, { backgroundColor: colors.surfaceSecondary }]} />
    </View>
  );
});

const skelStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, marginBottom: 8 },
  circle: { width: 44, height: 44, borderRadius: 22 },
  lines: { flex: 1, gap: 6 },
  line: { height: 10, borderRadius: 5 },
  lineShort: { width: "40%" },
  lineLong: { width: "65%" },
  amount: { width: 60, height: 14, borderRadius: 5 },
});

export default function TransactionsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<TxRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TxRecord | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useGetTransactions({ page, limit: 20 });

  useEffect(() => {
    if (!data) return;
    const incoming = data.transactions as TxRecord[];
    if (page === 1) {
      setAllTransactions(incoming);
    } else {
      setAllTransactions((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        return [...prev, ...incoming.filter((t) => !ids.has(t.id))];
      });
    }
  }, [data, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setAllTransactions([]);
    setPage(1);
    await queryClient.invalidateQueries({
      queryKey: getGetTransactionsQueryKey({ page: 1, limit: 20 }),
    });
    setRefreshing(false);
  }, [queryClient]);

  const loadMore = useCallback(() => {
    if (data?.hasMore && !isFetching) {
      setPage((p) => p + 1);
    }
  }, [data?.hasMore, isFetching]);

  const topPadding = Platform.OS === "web" ? insets.top + 67 : insets.top + 16;
  const bottomPadding = (Platform.OS === "web" ? 34 : insets.bottom) + 90;

  const renderFooter = () => {
    if (!isFetching || page === 1) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.tint} />
      </View>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Activity</Text>
        {data && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {data.total} transaction{data.total !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {isLoading && allTransactions.length === 0 ? (
        <View style={[styles.skeletonList, { paddingHorizontal: 20 }]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonItem key={i} colors={colors} />
          ))}
        </View>
      ) : error && allTransactions.length === 0 ? (
        <View style={styles.errorState}>
          <Feather name="alert-circle" size={44} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to load transactions</Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            Check your connection and try again
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.tint }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={allTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelectedTx(item)}>
              <TransactionItem transaction={item} />
            </Pressable>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="inbox" size={44} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Your transaction history will appear here
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TransactionDetailModal
        tx={selectedTx}
        onClose={() => setSelectedTx(null)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  pageTitle: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 2 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13 },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  skeletonList: { paddingTop: 8 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  errorState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  errorTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, textAlign: "center" },
  errorSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  retryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FFFFFF" },
});
