import React, { useState, useCallback } from "react";
import {
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
import { useAuthRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
];

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  const { login } = useAuth();
  const { mutate: authRegister, isPending } = useAuthRegister();

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name required";
    if (!lastName.trim()) newErrors.lastName = "Last name required";
    if (!email || !/\S+@\S+\.\S+/.test(email)) newErrors.email = "Valid email required";
    const failedRules = PASSWORD_RULES.filter((r) => !r.test(password));
    if (failedRules.length > 0) {
      newErrors.password = failedRules[0].label;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [firstName, lastName, email, password]);

  const handleRegister = useCallback(() => {
    if (!validate()) return;
    setApiError("");
    authRegister(
      {
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() || undefined,
        },
      },
      {
        onSuccess: (data) => {
          login(data.token, data.user as never);
          router.replace("/(tabs)");
        },
        onError: (err: unknown) => {
          const e = err as { message?: string };
          setApiError(e?.message ?? "Registration failed. Please try again.");
        },
      }
    );
  }, [firstName, lastName, email, phone, password, validate, authRegister, login]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 24), paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.tint} />
          <Text style={[styles.backText, { color: colors.tint }]}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join NovaPay today
          </Text>
        </View>

        {apiError ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{apiError}</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="John"
              error={errors.firstName}
              leftIcon="user"
              testID="firstname-input"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Doe"
              error={errors.lastName}
              testID="lastname-input"
            />
          </View>
        </View>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail"
          error={errors.email}
          testID="email-input"
        />
        <Input
          label="Phone (optional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 234 567 8900"
          keyboardType="phone-pad"
          leftIcon="phone"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Create a strong password"
          leftIcon="lock"
          secureToggle
          error={errors.password}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          testID="password-input"
        />

        {(passwordFocused || password.length > 0) && (
          <View style={[styles.rulesBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            {PASSWORD_RULES.map((rule) => {
              const passed = rule.test(password);
              return (
                <View key={rule.label} style={styles.ruleRow}>
                  <Feather
                    name={passed ? "check-circle" : "circle"}
                    size={13}
                    color={passed ? colors.success : colors.textTertiary}
                  />
                  <Text style={[styles.ruleText, { color: passed ? colors.success : colors.textTertiary }]}>
                    {rule.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={isPending}
          disabled={isPending}
          fullWidth
          size="lg"
          testID="register-btn"
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{" "}
          </Text>
          <Pressable onPress={() => router.replace("/(auth)/login")} testID="go-login">
            <Text style={[styles.footerLink, { color: colors.tint }]}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 24, flexGrow: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
  backText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  header: { marginBottom: 24 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 4 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15 },
  errorBanner: { borderRadius: 10, padding: 12, marginBottom: 16 },
  errorBannerText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  rulesBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ruleText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  footerLink: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
