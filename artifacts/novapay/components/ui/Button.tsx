import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Colors from "@/constants/colors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  testID,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const isDisabled = disabled || loading;

  const bgColors: Record<string, string> = {
    primary: isDisabled ? colors.tintLight : colors.tint,
    secondary: colors.surfaceSecondary,
    ghost: "transparent",
    danger: isDisabled ? "#FEE2E2" : colors.error,
  };

  const textColors: Record<string, string> = {
    primary: "#FFFFFF",
    secondary: colors.text,
    ghost: colors.tint,
    danger: "#FFFFFF",
  };

  const heights: Record<string, number> = { sm: 36, md: 48, lg: 56 };
  const fontSizes: Record<string, number> = { sm: 13, md: 15, lg: 16 };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bgColors[variant],
          height: heights[size],
          opacity: pressed ? 0.85 : 1,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: colors.border,
        },
        fullWidth && { width: "100%" },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#FFF" : colors.tint}
        />
      ) : (
        <Text
          style={[
            styles.label,
            { color: textColors[variant], fontSize: fontSizes[size] },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
});
