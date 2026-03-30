import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  getGetVirtualCardQueryKey,
  useGetVirtualCard,
  useFreezeCard,
  useUnfreezeCard,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { VirtualCard } from "@/components/VirtualCard";
import { useApiError } from "@/hooks/useApiError";
import Colors from "@/constants/colors";

function CardFeatureRow({ icon, title, description, colors }: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[cardFeatureStyles.row, { backgroundColor: colors.surface }]}>
      <View style={[cardFeatureStyles.iconBox, { backgroundColor: colors.tintLight }]}>
        <Feather name={icon} size={20} color={colors.tint} />
      </View>
      <View style={cardFeatureStyles.text}>
        <Text style={[cardFeatureStyles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[cardFeatureStyles.desc, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </View>
  );
}

const cardFeatureStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, marginBottom: 8 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  text: { flex: 1 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 2 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 12 },
});

function LimitRow({
  label,
  used,
  total,
  currency,
  colors,
}: {
  label: string;
  used: number;
  total: number;
  currency: string;
  colors: typeof Colors.light;
}) {
  const pct = Math.min(1, used / total);
  return (
    <View style={[limitStyles.row, { backgroundColor: colors.surface }]}>
      <View style={limitStyles.labelRow}>
        <Text style={[limitStyles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[limitStyles.amount, { color: colors.textSecondary }]}>
          {currency}{used.toLocaleString()} / {currency}{total.toLocaleString()}
        </Text>
      </View>
      <View style={[limitStyles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            limitStyles.fill,
            {
              width: `${Math.round(pct * 100)}%`,
              backgroundColor: pct > 0.8 ? colors.error : pct > 0.5 ? colors.warning : colors.tint,
            },
          ]}
        />
      </View>
    </View>
  );
}

const limitStyles = StyleSheet.create({
  row: { padding: 14, borderRadius: 14, marginBottom: 8, gap: 10 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontFamily: "Inter_500Medium", fontSize: 13 },
  amount: { fontFamily: "Inter_400Regular", fontSize: 12 },
  track: { height: 6, borderRadius: 3, width: "100%" },
  fill: { height: 6, borderRadius: 3 },
  note: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, marginTop: 4, alignItems: "flex-start" },
  noteText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 16 },
});

export default function CardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: card, isLoading, error } = useGetVirtualCard();
  const { mutate: freezeCard, isPending: freezing } = useFreezeCard();
  const { mutate: unfreezeCard, isPending: unfreezing } = useUnfreezeCard();
  const [toggling, setToggling] = useState(false);
  const { getError } = useApiError();

  const isFrozen = card ? !card.isActive : false;
  const actionPending = freezing || unfreezing || toggling;

  const topPadding = Platform.OS === "web" ? insets.top + 67 : insets.top + 16;

  const handleToggleFreeze = useCallback(() => {
    if (!card || actionPending) return;
    setToggling(true);
    if (isFrozen) {
      unfreezeCard(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetVirtualCardQueryKey() });
          setToggling(false);
        },
        onError: (err: unknown) => {
          Alert.alert("Error", getError(err));
          setToggling(false);
        },
      });
    } else {
      Alert.alert(
        "Freeze Card",
        "Freezing your card will temporarily prevent all transactions. You can unfreeze at any time.",
        [
          { text: "Cancel", style: "cancel", onPress: () => setToggling(false) },
          {
            text: "Freeze",
            style: "destructive",
            onPress: () => {
              freezeCard(undefined, {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getGetVirtualCardQueryKey() });
                  setToggling(false);
                },
                onError: (err: unknown) => {
                  Alert.alert("Error", getError(err));
                  setToggling(false);
                },
              });
            },
          },
        ]
      );
    }
  }, [card, isFrozen, actionPending, freezeCard, unfreezeCard, queryClient]);

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
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.text }]}>Virtual Card</Text>
      <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
        Use for online payments worldwide
      </Text>

      {isLoading ? (
        <View style={[styles.cardSkeleton, { backgroundColor: colors.surfaceSecondary }]}>
          <ActivityIndicator color={colors.tint} />
        </View>
      ) : card ? (
        <VirtualCard
          cardNumber={card.cardNumber}
          cardHolder={card.cardHolder}
          expiryMonth={card.expiryMonth}
          expiryYear={card.expiryYear}
          cvv={card.cvv}
          cardType={card.cardType}
          isActive={card.isActive}
        />
      ) : (
        <View style={[styles.errorCard, { backgroundColor: colors.surface }]}>
          <Feather name="alert-circle" size={32} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error ? "Failed to load card" : "No card available"}
          </Text>
        </View>
      )}

      {card && (
        <View style={[styles.freezeRow, { backgroundColor: colors.surface }]}>
          <View style={styles.freezeInfo}>
            <Feather
              name={isFrozen ? "lock" : "unlock"}
              size={20}
              color={isFrozen ? colors.error : colors.success}
            />
            <View style={styles.freezeText}>
              <Text style={[styles.freezeTitle, { color: colors.text }]}>
                {isFrozen ? "Card Frozen" : "Card Active"}
              </Text>
              <Text style={[styles.freezeDesc, { color: colors.textSecondary }]}>
                {isFrozen
                  ? "Toggle to unfreeze and re-enable transactions"
                  : "Toggle to freeze and block all transactions"}
              </Text>
            </View>
          </View>
          <Switch
            value={!isFrozen}
            onValueChange={handleToggleFreeze}
            disabled={actionPending}
            trackColor={{ false: colors.error, true: colors.success }}
            thumbColor="#FFFFFF"
          />
        </View>
      )}

      {card && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Card Limits</Text>
          <LimitRow
            label="Daily spend limit"
            used={0}
            total={5000}
            currency="$"
            colors={colors}
          />
          <LimitRow
            label="Monthly spend limit"
            used={0}
            total={20000}
            currency="$"
            colors={colors}
          />
          <LimitRow
            label="Per-transaction limit"
            used={0}
            total={2000}
            currency="$"
            colors={colors}
          />
          <View style={[limitStyles.note, { backgroundColor: colors.tintLight }]}>
            <Feather name="info" size={13} color={colors.tint} />
            <Text style={[limitStyles.noteText, { color: colors.tint }]}>
              Limits may increase after completing identity verification.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Card Features</Text>
        <CardFeatureRow
          icon="globe"
          title="Worldwide Payments"
          description="Use at any online merchant globally"
          colors={colors}
        />
        <CardFeatureRow
          icon="shield"
          title="3D Secure"
          description="Extra protection for every transaction"
          colors={colors}
        />
        <CardFeatureRow
          icon="lock"
          title="Virtual Only"
          description="No physical card — safer and instant"
          colors={colors}
        />
        <CardFeatureRow
          icon="zap"
          title="Instant Issuance"
          description="Ready to use immediately after creation"
          colors={colors}
        />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20 },
  pageTitle: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 4 },
  pageSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 24 },
  cardSkeleton: {
    width: "100%",
    aspectRatio: 1.586,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  errorCard: {
    width: "100%",
    aspectRatio: 1.586,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  freezeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    marginBottom: 24,
  },
  freezeInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  freezeText: { flex: 1 },
  freezeTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 2 },
  freezeDesc: { fontFamily: "Inter_400Regular", fontSize: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, marginBottom: 12 },
});
