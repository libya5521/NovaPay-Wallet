import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  getGetTransactionsQueryKey,
  getGetWalletBalanceQueryKey,
  useGetTransactions,
  useGetWalletBalance,
} from "@workspace/api-client-react";
import { BalanceCard } from "@/components/BalanceCard";
import { QuickAction } from "@/components/QuickAction";
import { TransactionItem } from "@/components/TransactionItem";
import { SendMoneyModal } from "@/components/SendMoneyModal";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sendVisible, setSendVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: walletData, isLoading: walletLoading } = useGetWalletBalance();
  const { data: txData, isLoading: txLoading } = useGetTransactions({ page: 1, limit: 5 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetWalletBalanceQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey({ page: 1, limit: 5 }) }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const topPadding = Platform.OS === "web" ? insets.top + 67 : insets.top + 16;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: topPadding,
          paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 90,
        },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Good morning 👋</Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
          </Text>
        </View>
      </View>

      {walletLoading ? (
        <View style={[styles.balanceSkeleton, { backgroundColor: colors.surfaceSecondary }]}>
          <ActivityIndicator color={colors.tint} />
        </View>
      ) : walletData ? (
        <BalanceCard
          balance={walletData.balance}
          currency={walletData.currency}
          accountNumber={walletData.accountNumber}
          userName={user ? `${user.firstName} ${user.lastName}` : ""}
        />
      ) : null}

      <View style={[styles.section, styles.quickActionsRow]}>
        <QuickAction
          icon="send"
          label="Send"
          onPress={() => setSendVisible(true)}
          testID="send-btn"
        />
        <QuickAction
          icon="download"
          label="Receive"
          onPress={() => {}}
          color="#10B981"
        />
        <QuickAction
          icon="credit-card"
          label="Card"
          onPress={() => router.push("/(tabs)/card")}
          color="#8B5CF6"
        />
        <QuickAction
          icon="list"
          label="History"
          onPress={() => router.push("/(tabs)/transactions")}
          color="#F59E0B"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          <Text
            style={[styles.seeAll, { color: colors.tint }]}
            onPress={() => router.push("/(tabs)/transactions")}
          >
            See all
          </Text>
        </View>

        {txLoading ? (
          <View style={[styles.txSkeleton, { backgroundColor: colors.surfaceSecondary }]}>
            <ActivityIndicator color={colors.tint} />
          </View>
        ) : txData?.transactions.length ? (
          txData.transactions.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No transactions yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Send money to get started
            </Text>
          </View>
        )}
      </View>

      <SendMoneyModal
        visible={sendVisible}
        onClose={() => setSendVisible(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: getGetWalletBalanceQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey({ page: 1, limit: 5 }) });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20, gap: 0 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 2,
  },
  userName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  balanceSkeleton: {
    height: 160,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  section: { marginBottom: 24 },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  seeAll: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  txSkeleton: {
    height: 80,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
});
