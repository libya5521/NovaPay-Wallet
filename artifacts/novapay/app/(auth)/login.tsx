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
import { useAuthLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");

  const { login } = useAuth();
  const { mutate: authLogin, isPending } = useAuthLogin();

  const validate = useCallback(() => {
    let valid = true;
    setApiError("");
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email");
      valid = false;
    } else {
      setEmailError("");
    }
    if (!password || password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      valid = false;
    } else {
      setPasswordError("");
    }
    return valid;
  }, [email, password]);

  const handleLogin = useCallback(() => {
    if (!validate()) return;
    authLogin(
      { data: { email: email.trim().toLowerCase(), password } },
      {
        onSuccess: (data) => {
          login(data.token, data.user as never);
          router.replace("/(tabs)");
        },
        onError: (err: unknown) => {
          const e = err as { message?: string };
          setApiError(e?.message ?? "Invalid credentials. Please try again.");
        },
      }
    );
  }, [email, password, validate, authLogin, login]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40), paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: colors.tint }]}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>NovaPay</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Welcome back
          </Text>
        </View>

        <View style={styles.form}>
          {apiError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
              <Text style={[styles.errorBannerText, { color: colors.error }]}>{apiError}</Text>
            </View>
          ) : null}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail"
            error={emailError}
            testID="email-input"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            leftIcon="lock"
            secureToggle
            error={passwordError}
            testID="password-input"
          />

          <Pressable
            style={styles.forgotBtn}
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text style={[styles.forgotText, { color: colors.tint }]}>Forgot password?</Text>
          </Pressable>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isPending}
            disabled={isPending}
            fullWidth
            size="lg"
            testID="login-btn"
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Don't have an account?{" "}
          </Text>
          <Pressable onPress={() => router.push("/(auth)/register")} testID="go-register">
            <Text style={[styles.footerLink, { color: colors.tint }]}>Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 24, flexGrow: 1 },
  header: { alignItems: "center", marginBottom: 36 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoText: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: "#FFFFFF",
  },
  appName: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 6 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15 },
  form: { gap: 0 },
  errorBanner: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  forgotBtn: { alignSelf: "flex-end", marginBottom: 20, marginTop: -4 },
  forgotText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  footerLink: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
