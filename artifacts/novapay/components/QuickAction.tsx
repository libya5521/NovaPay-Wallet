import * as Haptics from "expo-haptics";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface QuickActionProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  testID?: string;
}

export const QuickAction = memo(function QuickAction({ icon, label, onPress, color, testID }: QuickActionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const iconColor = color ?? colors.tint;
  const bgColor = isDark ? colors.surfaceSecondary : colors.tintLight;

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.container, { opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={22} color={iconColor} />
      </View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 8, flex: 1 },
  iconBox: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Inter_500Medium", fontSize: 12 },
});
