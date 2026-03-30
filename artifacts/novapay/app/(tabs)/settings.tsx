import React, { useCallback } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

function SettingRow({
  icon,
  label,
  subtitle,
  onPress,
  rightNode,
  tintIcon,
  colors,
  destructive,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  rightNode?: React.ReactNode;
  tintIcon?: boolean;
  colors: typeof Colors.light;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        rowStyles.container,
        { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[rowStyles.iconBox, {
        backgroundColor: destructive ? colors.errorLight : tintIcon ? colors.tintLight : colors.surfaceSecondary,
      }]}>
        <Feather
          name={icon}
          size={17}
          color={destructive ? colors.error : tintIcon ? colors.tint : colors.textSecondary}
        />
      </View>
      <View style={rowStyles.text}>
        <Text style={[rowStyles.label, { color: destructive ? colors.error : colors.text }]}>{label}</Text>
        {subtitle && <Text style={[rowStyles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightNode ?? (
        onPress ? <Feather name="chevron-right" size={16} color={colors.textTertiary} /> : null
      )}
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, marginBottom: 8 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  text: { flex: 1 },
  label: { fontFamily: "Inter_500Medium", fontSize: 14 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
});

function SectionTitle({ title, colors }: { title: string; colors: typeof Colors.light }) {
  return <Text style={[sectionStyles.title, { color: colors.textSecondary }]}>{title}</Text>;
}
const sectionStyles = StyleSheet.create({ title: { fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 0.8, marginBottom: 8, marginTop: 8, textTransform: "uppercase" } });

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();

  const topPadding = Platform.OS === "web" ? insets.top + 67 : insets.top + 16;

  const handleLogout = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  }, [logout]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => Alert.alert("Contact Support", "Please contact support@novapay.app to delete your account.") },
      ]
    );
  }, []);

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPadding, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 90 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.text }]}>Settings</Text>

      <SectionTitle title="Account" colors={colors} />
      <SettingRow
        icon="user"
        label="Edit Profile"
        subtitle={user ? `${user.firstName} ${user.lastName}` : ""}
        onPress={() => router.push("/edit-profile")}
        tintIcon
        colors={colors}
      />
      <SettingRow
        icon="shield"
        label="Security"
        subtitle="Password, 2FA, biometrics"
        onPress={() => Alert.alert("Coming Soon", "Security settings coming in a future update.")}
        colors={colors}
      />
      <SettingRow
        icon="bell"
        label="Notifications"
        subtitle="Push, email preferences"
        onPress={() => Alert.alert("Coming Soon", "Notification settings coming in a future update.")}
        colors={colors}
      />

      <SectionTitle title="Integrations" colors={colors} />
      <SettingRow
        icon="credit-card"
        label="Wallester"
        subtitle="Card issuing — not connected"
        onPress={() => Alert.alert("Wallester", "To issue real cards, connect your Wallester account. This is a placeholder for the Wallester API integration.")}
        colors={colors}
      />
      <SettingRow
        icon="user-check"
        label="Sumsub KYC"
        subtitle="Identity verification — not connected"
        onPress={() => Alert.alert("Sumsub", "To run real KYC flows, connect your Sumsub account. This is a placeholder for the Sumsub API integration.")}
        colors={colors}
      />

      <SectionTitle title="App" colors={colors} />
      <SettingRow
        icon="help-circle"
        label="Help & Support"
        subtitle="FAQs, contact us"
        onPress={() => Alert.alert("Support", "Email us at support@novapay.app")}
        colors={colors}
      />
      <SettingRow
        icon="file-text"
        label="Terms of Service"
        onPress={() => Alert.alert("Terms", "Terms of Service coming soon.")}
        colors={colors}
      />
      <SettingRow
        icon="lock"
        label="Privacy Policy"
        onPress={() => Alert.alert("Privacy", "Privacy Policy coming soon.")}
        colors={colors}
      />

      <SectionTitle title="Danger Zone" colors={colors} />
      <SettingRow
        icon="log-out"
        label="Sign Out"
        onPress={handleLogout}
        colors={colors}
        destructive
      />
      <SettingRow
        icon="trash-2"
        label="Delete Account"
        subtitle="Permanently delete all data"
        onPress={handleDeleteAccount}
        colors={colors}
        destructive
      />

      <Text style={[styles.version, { color: colors.textTertiary }]}>NovaPay v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20 },
  pageTitle: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 16 },
  version: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", marginTop: 24 },
});
