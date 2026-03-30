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
import { useAuthForgotPassword } from "@workspace/api-client-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Colors from "@/constants/colors";

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutate: forgotPassword, isPending } = useAuthForgotPassword();

  const validate = useCallback(() => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  }, [email]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    forgotPassword(
      { data: { email: email.trim().toLowerCase() } },
      {
        onSuccess: () => setSubmitted(true),
        onError: () => setSubmitted(true),
      }
    );
  }, [email, validate, forgotPassword]);

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
          <Text style={[styles.backText, { color: colors.tint }]}>Back to login</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.tintLight }]}>
            <Feather name="lock" size={28} color={colors.tint} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email and we'll send instructions to reset your password.
          </Text>
        </View>

        {submitted ? (
          <View style={[styles.successCard, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
            <Feather name="check-circle" size={22} color={colors.success} />
            <View style={styles.successText}>
              <Text style={[styles.successTitle, { color: colors.success }]}>Check your inbox</Text>
              <Text style={[styles.successBody, { color: colors.textSecondary }]}>
                If an account exists for {email}, you'll receive reset instructions shortly.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              error={emailError}
            />
            <Button
              title="Send Reset Instructions"
              onPress={handleSubmit}
              loading={isPending}
              disabled={isPending}
              fullWidth
              size="lg"
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 24, flexGrow: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 32 },
  backText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  header: { alignItems: "center", marginBottom: 32 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, marginBottom: 8 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
  form: { gap: 0 },
  successCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "flex-start",
  },
  successText: { flex: 1 },
  successTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 4 },
  successBody: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
});
