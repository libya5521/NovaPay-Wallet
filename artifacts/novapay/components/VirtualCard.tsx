import React, { useState } from "react";
import {
  Alert,
  Clipboard,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface VirtualCardProps {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  cardType: "visa" | "mastercard";
  isActive: boolean;
}

function formatCardNumber(num: string): string {
  const clean = num.replace(/\s/g, "");
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

function RevealField({
  label,
  visible,
  value,
  masked,
  onToggle,
  onCopy,
}: {
  label: string;
  visible: boolean;
  value: string;
  masked: string;
  onToggle: () => void;
  onCopy: () => void;
}) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.row}>
        <Text style={fieldStyles.value}>{visible ? value : masked}</Text>
        <Pressable onPress={onToggle} style={fieldStyles.icon} hitSlop={8}>
          <Feather name={visible ? "eye-off" : "eye"} size={14} color="rgba(255,255,255,0.65)" />
        </Pressable>
        <Pressable onPress={onCopy} style={fieldStyles.icon} hitSlop={8}>
          <Feather name="copy" size={14} color="rgba(255,255,255,0.65)" />
        </Pressable>
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { gap: 3 },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  value: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  icon: { padding: 2 },
});

export function VirtualCard({
  cardNumber,
  cardHolder,
  expiryMonth,
  expiryYear,
  cvv,
  cardType,
  isActive,
}: VirtualCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  void isDark;

  const [showNumber, setShowNumber] = useState(false);
  const [showExpiry, setShowExpiry] = useState(false);
  const [showCvv, setShowCvv] = useState(false);

  const cleanNumber = cardNumber.replace(/\s/g, "");
  const formattedNumber = formatCardNumber(cleanNumber);
  const maskedNumber = `•••• •••• •••• ${cleanNumber.slice(-4)}`;
  const expiryFull = `${String(expiryMonth).padStart(2, "0")}/${String(expiryYear).slice(-2)}`;
  const maskedExpiry = "••/••";
  const maskedCvv = "•••";

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert("Copied", `${label} copied to clipboard.`);
  };

  return (
    <LinearGradient
      colors={["#1A3A6E", "#0D1F3C", "#091830"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={styles.chipContainer}>
          <View style={styles.chip} />
        </View>
        <View style={styles.statusBadge}>
          <View style={[styles.dot, { backgroundColor: isActive ? "#10B981" : "#EF4444" }]} />
          <Text style={styles.statusText}>{isActive ? "Active" : "Inactive"}</Text>
        </View>
      </View>

      <View style={styles.numberRow}>
        <Text style={styles.cardNumber}>{showNumber ? formattedNumber : maskedNumber}</Text>
        <View style={styles.numberActions}>
          <Pressable onPress={() => setShowNumber((v) => !v)} style={styles.iconBtn} hitSlop={8}>
            <Feather name={showNumber ? "eye-off" : "eye"} size={16} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <Pressable
            onPress={() => copyToClipboard(cleanNumber, "Card number")}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Feather name="copy" size={16} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.cardLabel}>Card Holder</Text>
          <Text style={styles.cardValue}>{cardHolder.toUpperCase()}</Text>
        </View>

        <RevealField
          label="Expires"
          visible={showExpiry}
          value={expiryFull}
          masked={maskedExpiry}
          onToggle={() => setShowExpiry((v) => !v)}
          onCopy={() => copyToClipboard(expiryFull, "Expiry date")}
        />

        <RevealField
          label="CVV"
          visible={showCvv}
          value={cvv}
          masked={maskedCvv}
          onToggle={() => setShowCvv((v) => !v)}
          onCopy={() => copyToClipboard(cvv, "CVV")}
        />
      </View>

      <View style={styles.cardTypeContainer}>
        {cardType === "visa" ? (
          <Text style={styles.visaText}>VISA</Text>
        ) : (
          <View style={styles.mastercardContainer}>
            <View style={[styles.mcCircle, { backgroundColor: "#EB001B" }]} />
            <View style={[styles.mcCircle, { backgroundColor: "#F79E1B", marginLeft: -12 }]} />
          </View>
        )}
      </View>

      <View style={styles.shimmer} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    aspectRatio: 1.586,
    borderRadius: 20,
    padding: 22,
    justifyContent: "space-between",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chipContainer: {
    width: 40,
    height: 30,
    borderRadius: 5,
    backgroundColor: "rgba(255,220,80,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  chip: {
    width: 28,
    height: 20,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(180,140,0,0.6)",
    backgroundColor: "rgba(255,230,100,0.7)",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cardNumber: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2.5,
    textAlign: "center",
  },
  numberActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    padding: 4,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
  },
  cardLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  cardValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  cardTypeContainer: {
    position: "absolute",
    bottom: 20,
    right: 22,
  },
  visaText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  mastercardContainer: {
    flexDirection: "row",
  },
  mcCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    opacity: 0.9,
  },
  shimmer: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
});
