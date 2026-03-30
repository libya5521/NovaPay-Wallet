import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSendMoney } from "@workspace/api-client-react";
import { Button } from "@/components/ui/Button";
import Colors from "@/constants/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SendMoneyModal({ visible, onClose, onSuccess }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [emailError, setEmailError] = useState("");
  const [amountError, setAmountError] = useState("");

  const { mutate: sendMoney, isPending } = useSendMoney();

  const validate = () => {
    let valid = true;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Valid email required");
      valid = false;
    } else {
      setEmailError("");
    }
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setAmountError("Enter a valid amount");
      valid = false;
    } else {
      setAmountError("");
    }
    return valid;
  };

  const handleSend = () => {
    if (!validate()) return;
    sendMoney(
      { data: { recipientEmail: email, amount: parseFloat(amount), note } },
      {
        onSuccess: () => {
          setEmail("");
          setAmount("");
          setNote("");
          onSuccess();
          onClose();
        },
        onError: (err: any) => {
          Alert.alert("Transfer Failed", err?.message ?? "Something went wrong");
        },
      }
    );
  };

  const handleClose = () => {
    setEmail("");
    setAmount("");
    setNote("");
    setEmailError("");
    setAmountError("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheet}
        >
          <View style={[styles.sheetInner, { backgroundColor: colors.surface }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Send Money</Text>
              <Pressable onPress={handleClose} style={styles.closeBtn}>
                <Feather name="x" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Recipient Email
                  </Text>
                  <View
                    style={[
                      styles.inputRow,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: emailError ? colors.error : colors.border,
                      },
                    ]}
                  >
                    <Feather name="mail" size={16} color={colors.textSecondary} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="name@example.com"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                  {emailError ? (
                    <Text style={[styles.errorText, { color: colors.error }]}>{emailError}</Text>
                  ) : null}
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Amount (USD)</Text>
                  <View
                    style={[
                      styles.inputRow,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: amountError ? colors.error : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.dollarSign, { color: colors.textSecondary }]}>$</Text>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                  {amountError ? (
                    <Text style={[styles.errorText, { color: colors.error }]}>{amountError}</Text>
                  ) : null}
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Note (optional)
                  </Text>
                  <View
                    style={[
                      styles.inputRow,
                      { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    ]}
                  >
                    <Feather name="edit-3" size={16} color={colors.textSecondary} />
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="What's it for?"
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                </View>

                <Button
                  title={isPending ? "Sending..." : "Send Money"}
                  onPress={handleSend}
                  loading={isPending}
                  fullWidth
                  size="lg"
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: { flex: 1, justifyContent: "flex-end" },
  sheetInner: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(150,150,150,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 20 },
  closeBtn: { padding: 4 },
  form: { gap: 4 },
  field: { marginBottom: 16 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    minHeight: 50,
  },
  dollarSign: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    paddingVertical: 12,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
});
