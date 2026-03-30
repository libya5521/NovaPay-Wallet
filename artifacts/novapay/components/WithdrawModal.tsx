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
import { useWithdrawMoney } from "@workspace/api-client-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApiError } from "@/hooks/useApiError";
import Colors from "@/constants/colors";

interface Props {
  visible: boolean;
  balance: number;
  currency: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function WithdrawModal({ visible, balance, currency, onClose, onSuccess }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");

  const { mutate: withdraw, isPending } = useWithdrawMoney();
  const { getError } = useApiError();

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
    if (num > balance) {
      setAmountError(`Insufficient balance (${currency}${balance.toFixed(2)} available)`);
      return false;
    }
    setAmountError("");
    return true;
  }, [amount, balance, currency]);

  const handleWithdraw = useCallback(() => {
    if (!validate()) return;
    withdraw(
      { data: { amount: parseFloat(amount) } },
      {
        onSuccess: () => {
          Alert.alert("Withdrawn", `${currency}${parseFloat(amount).toFixed(2)} withdrawn successfully.`);
          handleClose();
          onSuccess?.();
        },
        onError: (err: unknown) => {
          Alert.alert("Failed", getError(err));
        },
      }
    );
  }, [amount, validate, withdraw, handleClose, onSuccess, currency, getError]);

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
              <Text style={[styles.title, { color: colors.text }]}>Withdraw Funds</Text>
              <Pressable onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.balanceRow, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Available balance</Text>
              <Text style={[styles.balanceValue, { color: colors.text }]}>
                {currency}{balance.toFixed(2)}
              </Text>
            </View>

            <Input
              label="Amount to withdraw"
              value={amount}
              onChangeText={(v) => { setAmount(v.replace(/[^0-9.]/g, "")); setAmountError(""); }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              leftIcon="dollar-sign"
              error={amountError}
            />

            <Pressable
              style={[styles.maxBtn, { borderColor: colors.border }]}
              onPress={() => { setAmount(balance.toFixed(2)); setAmountError(""); }}
            >
              <Text style={[styles.maxBtnText, { color: colors.tint }]}>Use max balance</Text>
            </Pressable>

            <Button
              title="Withdraw"
              onPress={handleWithdraw}
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
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  balanceLabel: { fontFamily: "Inter_400Regular", fontSize: 13 },
  balanceValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  maxBtn: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: -8,
    marginBottom: 16,
  },
  maxBtnText: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
