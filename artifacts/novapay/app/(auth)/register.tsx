import React, { useState } from "react";
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
import { useAuthRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login } = useAuth();
  const { mutate: authRegister, isPending } = useAuthRegister();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name required";
    if (!lastName.trim()) newErrors.lastName = "Last name required";
    if (!email || !/\S+@\S+\.\S+/.test(email)) newErrors.email = "Valid email required";
    if (!password || password.length < 8) newErrors.password = "At least 8 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    if (!validate()) return;
    authRegister(
      {
        data: {
          firstName,
          lastName,
          email,
          password,
          phone: phone || undefined,
        },
      },
      {
        onSuccess: (data) => {
          login(data.token, data.user as any);
          router.replace("/(tabs)");
        },
        onError: (err: any) => {
          Alert.alert("Registration Failed", err?.message ?? "Something went wrong");
        },
      }
    );
  };

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
          <Text style={[styles.backText, { color: colors.tint }]}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join NovaPay today
          </Text>
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
          placeholder="Min. 8 characters"
          leftIcon="lock"
          secureToggle
          error={errors.password}
          testID="password-input"
        />

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={isPending}
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
  backBtn: { marginBottom: 20 },
  backText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  header: { marginBottom: 28 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 4 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  footerLink: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
