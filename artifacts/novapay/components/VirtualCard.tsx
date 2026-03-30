// artifacts/novapay/components/VirtualCard.tsx
//
// SECURITY: This component never receives, renders, or copies a real CVV
// or full card number.  The API only provides the last 4 digits (maskedNumber)
// and an expiry string; that is all that is displayed.
//
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

export interface VirtualCardProps {
  /** Last 4 digits only — e.g. "4321".  Full PAN is never accepted. */
  maskedNumber: string;
  cardHolder: string;
  /** ISO "YYYY-MM" expiry string returned by the API */
  expiresAt: string;
  cardType: "visa" | "mastercard";
  isActive: boolean;
}

// ── Formatted display values ─────────────────────────────────────────────────

function formatMaskedPan(last4: string) {
  return `•••• •••• •••• ${last4}`;
}

function formatExpiry(expiresAt: string) {
  // expiresAt is "YYYY-MM" — convert to "MM/YY"
  const parts = expiresAt.split("-");
  if (parts.length >= 2) {
    return `${parts[1]}/${parts[0]?.slice(-2)}`;
  }
  return expiresAt;
}

// ── Sub-component: field with toggle + optional copy ────────────────────────

function RevealField({
  label,
  visible,
  displayValue,
  hiddenValue,
  copyValue,
  onToggle,
  allowCopy = true,
}: {
  label: string;
  visible: boolean;
  displayValue: string;   // shown when visible=true
  hiddenValue: string;    // shown when visible=false (always "••/••" etc.)
  copyValue?: string;     // value placed on clipboard when copied
  onToggle: () => void;
  allowCopy?: boolean;
}) {
  const handleCopy = async () => {
    if (!copyValue) return;
    await Clipboard.setStringAsync(copyValue);
    Alert.alert("Copied", `${label} copied to clipboard.`);
  };

  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.row}>
        <Text style={fieldStyles.value}>{visible ? displayValue : hiddenValue}</Text>
        <Pressable onPress={onToggle} style={fieldStyles.icon} hitSlop={8}>
          <Feather name={visible ? "eye-off" : "eye"} size={14} color="rgba(255,255,255,0.65)" />
        </Pressable>
        {allowCopy && copyValue ? (
          <Pressable onPress={handleCopy} style={fieldStyles.icon} hitSlop={8}>
            <Feather name="copy" size={14} color="rgba(255,255,255,0.65)" />
          </Pressable>
        ) : null}
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

// ── Main card component ──────────────────────────────────────────────────────

export function VirtualCard({
  maskedNumber,
  cardHolder,
  expiresAt,
  cardType,
  isActive,
}: VirtualCardProps) {
  const [showExpiry, setShowExpiry] = useState(false);

  const pan = formatMaskedPan(maskedNumber);
  const expiry = formatExpiry(expiresAt);

  return (
    <LinearGradient
      colors={["#1A3A6E", "#0D1F3C", "#091830"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Top row: chip + status */}
      <View style={styles.cardTop}>
        <View style={styles.chipContainer}>
          <View style={styles.chip} />
        </View>
        <View style={styles.statusBadge}>
          <View style={[styles.dot, { backgroundColor: isActive ? "#10B981" : "#EF4444" }]} />
          <Text style={styles.statusText}>{isActive ? "Active" : "Frozen"}</Text>
        </View>
      </View>

      {/* Card number — always masked, no reveal of full PAN */}
      <View style={styles.numberRow}>
        <Text style={styles.cardNumber}>{pan}</Text>
      </View>

      {/* Bottom row: holder + expiry + CVV placeholder */}
      <View style={styles.cardBottom}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>Card Holder</Text>
          <Text style={styles.cardValue} numberOfLines={1}>{cardHolder.toUpperCase()}</Text>
        </View>

        <RevealField
          label="Expires"
          visible={showExpiry}
          displayValue={expiry}
          hiddenValue="••/••"
          copyValue={expiry}
          onToggle={() => setShowExpiry((v) => !v)}
        />

        {/* CVV: placeholder only — real CVV is never stored or returned */}
        <View style={fieldStyles.wrapper}>
          <Text style={fieldStyles.label}>CVV</Text>
          <View style={fieldStyles.row}>
            <Text style={fieldStyles.value}>•••</Text>
            <Pressable
              hitSlop={8}
              style={fieldStyles.icon}
              onPress={() =>
                Alert.alert(
                  "CVV Hidden",
                  "For your security, the CVV is not available digitally. Find it printed on your physical card."
                )
              }
            >
              <Feather name="info" size={14} color="rgba(255,255,255,0.65)" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Card network logo */}
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

      {/* Decorative shimmer circle */}
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
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  numberRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardNumber: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2.5,
    textAlign: "center",
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
  mastercardContainer: { flexDirection: "row" },
  mcCircle: { width: 28, height: 28, borderRadius: 14, opacity: 0.9 },
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
