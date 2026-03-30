import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetVirtualCard } from "@workspace/api-client-react";
import { VirtualCard } from "@/components/VirtualCard";
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

export default function CardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { data: card, isLoading, error } = useGetVirtualCard();

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

      <View style={[styles.integrationNote, { backgroundColor: colors.tintLight, borderColor: colors.tint }]}>
        <Feather name="info" size={16} color={colors.tint} />
        <Text style={[styles.integrationText, { color: colors.tint }]}>
          Card issuing powered by Wallester API integration (placeholder — connect your Wallester account in settings)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20, gap: 0 },
  pageTitle: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 4 },
  pageSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 24 },
  cardSkeleton: {
    width: "100%",
    aspectRatio: 1.586,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  errorCard: {
    width: "100%",
    aspectRatio: 1.586,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 28,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, marginBottom: 12 },
  integrationNote: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
    marginBottom: 16,
  },
  integrationText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
});
