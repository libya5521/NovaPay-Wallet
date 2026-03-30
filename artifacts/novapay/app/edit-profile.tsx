import React, { useState, useCallback, useEffect } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  getGetUserProfileQueryKey,
  useGetUserProfile,
  useUpdateUserProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { useApiError } from "@/hooks/useApiError";
import Colors from "@/constants/colors";

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { updateUser } = useAuth();
  const { getError } = useApiError();
  const queryClient = useQueryClient();

  const { data: profile } = useGetUserProfile();
  const { mutate: updateProfile, isPending } = useUpdateUserProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name required";
    if (!lastName.trim()) newErrors.lastName = "Last name required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [firstName, lastName]);

  const handleSave = useCallback(() => {
    if (!validate()) return;
    updateProfile(
      {
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
        },
      },
      {
        onSuccess: (updated) => {
          updateUser(updated);
          queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
          Alert.alert("Success", "Profile updated successfully.");
          router.back();
        },
        onError: (err: unknown) => {
          Alert.alert("Error", getError(err));
        },
      }
    );
  }, [firstName, lastName, phone, validate, updateProfile, updateUser, queryClient, getError]);

  const topPadding = Platform.OS === "web" ? insets.top + 67 : insets.top + 16;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPadding, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.tint} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>Edit Profile</Text>
          <View style={styles.navSpacer} />
        </View>

        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
            <Text style={styles.avatarText}>
              {firstName ? firstName[0].toUpperCase() : "?"}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="John"
              error={errors.firstName}
              leftIcon="user"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Doe"
              error={errors.lastName}
            />
          </View>
        </View>

        <Input
          label="Phone (optional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 234 567 8900"
          keyboardType="phone-pad"
          leftIcon="phone"
        />

        <View style={[styles.infoNote, { backgroundColor: colors.surfaceSecondary }]}>
          <Feather name="info" size={14} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Email cannot be changed after registration. Contact support for help.
          </Text>
        </View>

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={isPending}
          disabled={isPending}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 24, flexGrow: 1 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  navTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  navSpacer: { width: 40 },
  avatarSection: { alignItems: "center", marginBottom: 28 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 32, color: "#FFFFFF" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  infoNote: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, marginBottom: 20, alignItems: "flex-start" },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },
});
