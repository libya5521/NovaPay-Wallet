import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useCallback, useEffect } from "react";
import {
  Alert,
  FlatList,
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
import { useApiError } from "@/hooks/useApiError";
import Colors from "@/constants/colors";

const RECIPIENTS_STORAGE_KEY = "novapay_recent_recipients";
const MAX_RECENT_RECIPIENTS = 5;

type Recipient = { email: string; name?: string };
type Step = "form" | "confirm";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

async function loadRecipients(): Promise<Recipient[]> {
  try {
    const raw = await AsyncStorage.getItem(RECIPIENTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Recipient[];
  } catch {
    return [];
  }
}

async function saveRecipient(email: string) {
  try {
    const current = await loadRecipients();
    const updated = [
      { email },
      ...current.filter((r) => r.email.toLowerCase() !== email.toLowerCase()),
    ].slice(0, MAX_RECENT_RECIPIENTS);
    await AsyncStorage.setItem(RECIPIENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
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
  const [recentRecipients, setRecentRecipients] = useState<Recipient[]>([]);

  useEffect(() => {
    if (visible) {
      loadRecipients().then(setRecentRecipients);
    }
  }, [visible]);

  const { mutate: sendMoney, isPending } = useSendMoney();
  const { getError } = useApiError();

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
    const trimmedEmail = email.trim().toLowerCase();
    sendMoney(
      { data: { recipientEmail: trimmedEmail, amount: parseFloat(amount), note } },
      {
        onSuccess: () => {
          saveRecipient(trimmedEmail).then(() => {
            loadRecipients().then(setRecentRecipients);
          });
          reset();
          onSuccess?.();
          onClose();
        },
        onError: (err: unknown) => {
          Alert.alert("Transfer Failed", getError(err));
        },
      }
    );
  }, [email, amount, note, sendMoney, reset, onSuccess, onClose, getError]);

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
                {recentRecipients.length > 0 && !email && (
                  <View style={styles.recentSection}>
                    <Text style={[styles.recentLabel, { color: colors.textSecondary }]}>Recent</Text>
                    <FlatList
                      horizontal
                      data={recentRecipients}
                      keyExtractor={(item) => item.email}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.recentList}
                      renderItem={({ item }) => (
                        <Pressable
                          style={[styles.recentChip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                          onPress={() => {
                            setEmail(item.email);
                            setEmailError("");
                          }}
                        >
                          <View style={[styles.recentAvatar, { backgroundColor: colors.tintLight }]}>
                            <Text style={[styles.recentAvatarText, { color: colors.tint }]}>
                              {item.email.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={[styles.recentEmail, { color: colors.text }]} numberOfLines={1}>
                            {item.email.split("@")[0]}
                          </Text>
                        </Pressable>
                      )}
                    />
                  </View>
                )}

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
                    {email.length > 0 && (
                      <Pressable onPress={() => setEmail("")}>
                        <Feather name="x-circle" size={16} color={colors.textSecondary} />
                      </Pressable>
                    )}
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
  recentSection: { marginBottom: 12 },
  recentLabel: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 8 },
  recentList: { gap: 8, paddingRight: 4 },
  recentChip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 80 },
  recentAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  recentAvatarText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  recentEmail: { fontFamily: "Inter_500Medium", fontSize: 13, maxWidth: 80 },
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
