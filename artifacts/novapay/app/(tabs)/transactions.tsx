import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
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
import { TransactionItem } from "@/components/TransactionItem";
import Colors from "@/constants/colors";
import { useQueryClient } from "@tanstack/react-query";

export default function TransactionsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error } = useGetTransactions({ page, limit: 20 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: getGetTransactionsQueryKey({ page: 1, limit: 20 }),
    });
    setPage(1);
    setRefreshing(false);
  }, [queryClient]);

  const topPadding = Platform.OS === "web" ? insets.top + 67 : insets.top + 16;
  const bottomPadding = (Platform.OS === "web" ? 34 : insets.bottom) + 90;

  if (isLoading && !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding, backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Transactions</Text>
        {data && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {data.total} total
          </Text>
        )}
      </View>

      <FlatList
        data={data?.transactions ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem transaction={item} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPadding },
        ]}
        scrollEnabled={!!(data?.transactions.length)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyState}>
              <Feather name="alert-circle" size={40} color={colors.error} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Failed to load</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Pull down to retry
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={44} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Your transaction history will appear here
              </Text>
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  pageTitle: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 2 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13 },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
});
