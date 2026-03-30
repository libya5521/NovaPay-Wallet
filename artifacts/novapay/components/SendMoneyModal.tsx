import React, { useState, useCallback } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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

type Step = "form" | "confirm";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendMoneyModal({ visible, onClose, onSuccess }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [emailError, setEmailError] = useState("");
  const [amountError, setAmountError] = useState("");

  const { mutate: sendMoney, isPending } = useSendMoney();

  const reset = useCallback(() => {
    setStep("form");
    setEmail("");
    setAmount("");
    setNote("");
    setEmailError("");
    setAmountError("");
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const validate = useCallback(() => {
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
    } else if (num > 50000) {
      setAmountError("Maximum single transfer is $50,000");
      valid = false;
    } else {
      setAmountError("");
    }
    return valid;
  }, [email, amount]);

  const handleReview = useCallback(() => {
    if (validate()) setStep("confirm");
  }, [validate]);

  const handleConfirm = useCallback(() => {
    sendMoney(
      { data: { recipientEmail: email.trim().toLowerCase(), amount: parseFloat(amount), note } },
      {
        onSuccess: () => {
          reset();
          onSuccess?.();
          onClose();
        },
        onError: (err: unknown) => {
          const e = err as { message?: string };
          Alert.alert("Transfer Failed", e?.message ?? "Something went wrong. Please try again.");
        },
      }
    );
  }, [email, amount, note, sendMoney, reset, onSuccess, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.kavContainer}
        >
          <Pressable style={styles.backdrop} onPress={handleClose} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {step === "confirm" && (
                  <Pressable onPress={() => setStep("form")} style={styles.backBtn}>
                    <Feather name="arrow-left" size={20} color={colors.tint} />
                  </Pressable>
                )}
                <Text style={[styles.title, { color: colors.text }]}>
                  {step === "form" ? "Send Money" : "Confirm Transfer"}
                </Text>
              </View>
              <Pressable onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {step === "form" ? (
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Recipient Email</Text>
                  <View style={[styles.inputRow, {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: emailError ? colors.error : colors.border,
                  }]}>
                    <Feather name="mail" size={16} color={colors.textSecondary} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="name@example.com"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                  {emailError ? <Text style={[styles.errorText, { color: colors.error }]}>{emailError}</Text> : null}
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Amount (USD)</Text>
                  <View style={[styles.inputRow, {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: amountError ? colors.error : colors.border,
                  }]}>
                    <Text style={[styles.currencySign, { color: colors.textSecondary }]}>$</Text>
                    <TextInput
                      value={amount}
                      onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                      placeholder="0.00"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="decimal-pad"
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                  {amountError ? <Text style={[styles.errorText, { color: colors.error }]}>{amountError}</Text> : null}
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Note (optional)</Text>
                  <View style={[styles.inputRow, {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  }]}>
                    <Feather name="edit-3" size={16} color={colors.textSecondary} />
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="What's it for?"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, { color: colors.text }]}
                    />
                  </View>
                </View>

                <Button title="Review Transfer" onPress={handleReview} fullWidth size="lg" />
              </View>
            ) : (
              <View style={styles.confirmContent}>
                <View style={[styles.amountDisplay, { backgroundColor: colors.tintLight }]}>
                  <Text style={[styles.amountLabel, { color: colors.tint }]}>Sending</Text>
                  <Text style={[styles.amountValue, { color: colors.tint }]}>
                    ${parseFloat(amount).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.confirmRows}>
                  <ConfirmRow label="To" value={email} colors={colors} />
                  {note ? <ConfirmRow label="Note" value={note} colors={colors} /> : null}
                  <ConfirmRow
                    label="Fee"
                    value="Free"
                    valueColor={colors.success}
                    colors={colors}
                  />
                </View>

                <View style={[styles.warningNote, { backgroundColor: colors.warningLight }]}>
                  <Feather name="alert-triangle" size={14} color={colors.warning} />
                  <Text style={[styles.warningText, { color: colors.warning }]}>
                    Transfers cannot be reversed once confirmed.
                  </Text>
                </View>

                <Button
                  title="Confirm & Send"
                  onPress={handleConfirm}
                  loading={isPending}
                  disabled={isPending}
                  fullWidth
                  size="lg"
                />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ConfirmRow({ label, value, valueColor, colors }: {
  label: string;
  value: string;
  valueColor?: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={confStyles.row}>
      <Text style={[confStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[confStyles.value, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

const confStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontFamily: "Inter_400Regular", fontSize: 14 },
  value: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  kavContainer: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 20 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  form: { gap: 0 },
  field: { marginBottom: 16 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 6 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, minHeight: 50 },
  currencySign: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, paddingVertical: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
  confirmContent: { gap: 16 },
  amountDisplay: { borderRadius: 16, padding: 20, alignItems: "center" },
  amountLabel: { fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 4 },
  amountValue: { fontFamily: "Inter_700Bold", fontSize: 36 },
  confirmRows: { gap: 12 },
  warningNote: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, alignItems: "center" },
  warningText: { fontFamily: "Inter_500Medium", fontSize: 12, flex: 1 },
});
