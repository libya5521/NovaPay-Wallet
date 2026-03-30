import React, { useState, useCallback } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAddMoney } from "@workspace/api-client-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Colors from "@/constants/colors";

const QUICK_AMOUNTS = [50, 100, 200, 500];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddMoneyModal({ visible, onClose, onSuccess }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");

  const { mutate: addMoney, isPending } = useAddMoney();

  const handleClose = useCallback(() => {
    setAmount("");
    setAmountError("");
    onClose();
  }, [onClose]);

  const validate = useCallback(() => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setAmountError("Enter a valid amount");
      return false;
    }
    if (num > 10000) {
      setAmountError("Maximum top-up is $10,000");
      return false;
    }
    setAmountError("");
    return true;
  }, [amount]);

  const handleAdd = useCallback(() => {
    if (!validate()) return;
    addMoney(
      { data: { amount: parseFloat(amount) } },
      {
        onSuccess: () => {
          Alert.alert("Success", `$${parseFloat(amount).toFixed(2)} added to your wallet.`);
          handleClose();
          onSuccess?.();
        },
        onError: (err: unknown) => {
          const e = err as { message?: string };
          Alert.alert("Failed", e?.message ?? "Could not add money. Try again.");
        },
      }
    );
  }, [amount, validate, addMoney, handleClose, onSuccess]);

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
              <Text style={[styles.title, { color: colors.text }]}>Add Money</Text>
              <Pressable onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Quick amounts</Text>
            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((q) => (
                <Pressable
                  key={q}
                  style={[
                    styles.quickBtn,
                    {
                      backgroundColor: amount === String(q) ? colors.tint : colors.surfaceSecondary,
                      borderColor: amount === String(q) ? colors.tint : colors.border,
                    },
                  ]}
                  onPress={() => { setAmount(String(q)); setAmountError(""); }}
                >
                  <Text style={[styles.quickBtnText, { color: amount === String(q) ? "#fff" : colors.text }]}>
                    ${q}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Input
              label="Or enter custom amount"
              value={amount}
              onChangeText={(v) => { setAmount(v.replace(/[^0-9.]/g, "")); setAmountError(""); }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              leftIcon="dollar-sign"
              error={amountError}
            />

            <Button
              title="Add to Wallet"
              onPress={handleAdd}
              loading={isPending}
              disabled={isPending}
              fullWidth
              size="lg"
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

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
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 20,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 10 },
  quickAmounts: { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  quickBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
