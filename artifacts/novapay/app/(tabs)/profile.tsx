import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  getGetKycStatusQueryKey,
  useGetKycStatus,
  useGetUserProfile,
  useSubmitKyc,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { useQueryClient } from "@tanstack/react-query";

function KycBadge({ status, colors }: { status: string; colors: typeof Colors.light }) {
  const config: Record<string, { color: string; bg: string; icon: keyof typeof Feather.glyphMap; label: string }> = {
    pending: { color: colors.warning, bg: colors.warningLight, icon: "clock", label: "Not Verified" },
    submitted: { color: colors.tint, bg: colors.tintLight, icon: "upload", label: "Under Review" },
    approved: { color: colors.success, bg: colors.successLight, icon: "check-circle", label: "Verified" },
    rejected: { color: colors.error, bg: colors.errorLight, icon: "x-circle", label: "Rejected" },
  };
  const c = config[status] ?? config.pending;
  return (
    <View style={[kycStyles.badge, { backgroundColor: c.bg }]}>
      <Feather name={c.icon} size={13} color={c.color} />
      <Text style={[kycStyles.label, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const kycStyles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});

function ProfileRow({ icon, label, value, colors }: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[rowStyles.container, { backgroundColor: colors.surface }]}>
      <View style={[rowStyles.iconBox, { backgroundColor: colors.tintLight }]}>
        <Feather name={icon} size={16} color={colors.tint} />
      </View>
      <View style={rowStyles.text}>
        <Text style={[rowStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[rowStyles.value, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, marginBottom: 8 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  text: { flex: 1 },
  label: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 2 },
  value: { fontFamily: "Inter_500Medium", fontSize: 14 },
});

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useGetUserProfile();
  const { data: kyc, isLoading: kycLoading } = useGetKycStatus();
  const { mutate: submitKyc, isPending: kycPending } = useSubmitKyc();
  const [kycSubmitted, setKycSubmitted] = useState(false);

  const topPadding = Platform.OS === "web" ? insets.top + 67 : insets.top + 16;

  const handleStartKyc = () => {
    Alert.alert(
      "KYC Verification",
      "This will submit a sample KYC request for demonstration.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: () => {
            submitKyc(
              {
                data: {
                  fullName: profile ? `${profile.firstName} ${profile.lastName}` : "Test User",
                  dateOfBirth: "1990-01-01",
                  nationality: "US",
                  documentType: "passport",
                  documentNumber: "P123456789",
                  addressLine1: "123 Main St",
                  city: "New York",
                  country: "US",
                },
              },
              {
                onSuccess: () => {
                  setKycSubmitted(true);
                  queryClient.invalidateQueries({ queryKey: getGetKycStatusQueryKey() });
                  Alert.alert("KYC Submitted", "Your verification is under review.");
                },
                onError: () => {
                  Alert.alert("Error", "Failed to submit KYC. Please try again.");
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  if (profileLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const initials = profile
    ? `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase()
    : "?";
  const kycStatus = kyc?.status ?? profile?.kycStatus ?? "pending";

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPadding, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 90 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.text }]}>Profile</Text>

      <View style={[styles.avatarSection, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.nameBlock}>
          <Text style={[styles.fullName, { color: colors.text }]}>
            {profile ? `${profile.firstName} ${profile.lastName}` : "—"}
          </Text>
          <Text style={[styles.emailText, { color: colors.textSecondary }]}>
            {profile?.email ?? "—"}
          </Text>
        </View>
        <View style={styles.avatarActions}>
          <KycBadge status={kycStatus} colors={colors} />
          <Pressable
            style={[styles.editBtn, { backgroundColor: colors.tintLight }]}
            onPress={() => router.push("/edit-profile")}
          >
            <Feather name="edit-2" size={14} color={colors.tint} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Info</Text>
        {profile && (
          <>
            <ProfileRow icon="user" label="Full Name" value={`${profile.firstName} ${profile.lastName}`} colors={colors} />
            <ProfileRow icon="mail" label="Email" value={profile.email} colors={colors} />
            <ProfileRow icon="phone" label="Phone" value={profile.phone ?? "Not set"} colors={colors} />
            <ProfileRow
              icon="calendar"
              label="Member Since"
              value={new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
              colors={colors}
            />
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>KYC Verification</Text>
        <View style={[styles.kycCard, { backgroundColor: colors.surface }]}>
          <View style={styles.kycHeader}>
            <View>
              <Text style={[styles.kycTitle, { color: colors.text }]}>Identity Verification</Text>
              <Text style={[styles.kycSubtitle, { color: colors.textSecondary }]}>
                Powered by Sumsub
              </Text>
            </View>
            {kycLoading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <KycBadge status={kycStatus} colors={colors} />
            )}
          </View>

          {kycStatus === "pending" && !kycSubmitted && (
            <View style={styles.kycCta}>
              <Text style={[styles.kycCtaText, { color: colors.textSecondary }]}>
                Complete verification to unlock higher limits and full features.
              </Text>
              <Button
                title="Start Verification"
                onPress={handleStartKyc}
                loading={kycPending}
                size="sm"
              />
            </View>
          )}

          {(kycStatus === "submitted" || kycSubmitted) && (
            <Text style={[styles.kycMsg, { color: colors.warning }]}>
              Your documents are under review. This typically takes 1–2 business days.
            </Text>
          )}

          {kycStatus === "approved" && (
            <Text style={[styles.kycMsg, { color: colors.success }]}>
              Your identity has been verified successfully.
            </Text>
          )}

          {kycStatus === "rejected" && (
            <Text style={[styles.kycMsg, { color: colors.error }]}>
              {(kyc as { rejectionReason?: string } | null | undefined)?.rejectionReason ?? "Verification was not successful. Please resubmit."}
            </Text>
          )}

          <View style={[styles.kycNote, { backgroundColor: colors.tintLight }]}>
            <Feather name="info" size={13} color={colors.tint} />
            <Text style={[styles.kycNoteText, { color: colors.tint }]}>
              Connect your Sumsub account in Settings to enable real identity verification.
            </Text>
          </View>
        </View>
      </View>

      <Button title="Sign Out" onPress={handleLogout} variant="danger" fullWidth testID="logout-btn" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { paddingHorizontal: 20, gap: 0 },
  pageTitle: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 20 },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 18, marginBottom: 24 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 18 },
  nameBlock: { flex: 1 },
  fullName: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 2 },
  emailText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  avatarActions: { alignItems: "flex-end", gap: 8 },
  editBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, marginBottom: 12 },
  kycCard: { borderRadius: 16, padding: 16, gap: 14 },
  kycHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  kycTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 2 },
  kycSubtitle: { fontFamily: "Inter_400Regular", fontSize: 11 },
  kycCta: { gap: 10 },
  kycCtaText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  kycMsg: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  kycNote: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 8, alignItems: "flex-start" },
  kycNoteText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 },
});
