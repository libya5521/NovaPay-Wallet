import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

interface BalanceCardProps {
  balance: number;
  currency: string;
  accountNumber: string;
  userName: string;
}

export function BalanceCard({ balance, currency, accountNumber, userName }: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true);

  const displayBalance = showBalance
    ? balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "••••••";

  const maskedAccount = accountNumber.replace(/^(\d{4}).*(\d{4})$/, "$1 •••• •••• $2");

  return (
    <LinearGradient
      colors={["#1A73E8", "#0047CC", "#003399"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>Total Balance</Text>
          <Text style={styles.name}>{userName}</Text>
        </View>
        <Pressable onPress={() => setShowBalance((v) => !v)} style={styles.eyeBtn}>
          <Feather name={showBalance ? "eye" : "eye-off"} size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      <View style={styles.balanceRow}>
        <Text style={styles.currency}>{currency}</Text>
        <Text style={styles.balance}>{displayBalance}</Text>
      </View>

      <View style={styles.accountRow}>
        <Feather name="credit-card" size={14} color="rgba(255,255,255,0.6)" />
        <Text style={styles.account}>{maskedAccount}</Text>
      </View>

      <View style={styles.decoration1} />
      <View style={styles.decoration2} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 24,
    gap: 12,
    overflow: "hidden",
    shadowColor: "#1A73E8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  name: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginTop: 2,
  },
  eyeBtn: { padding: 4 },
  balanceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginTop: 4,
  },
  currency: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_500Medium",
    fontSize: 20,
    marginBottom: 4,
  },
  balance: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 38,
    letterSpacing: -0.5,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  account: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  decoration1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
    right: -60,
    top: -60,
  },
  decoration2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.04)",
    right: 60,
    bottom: -60,
  },
});
