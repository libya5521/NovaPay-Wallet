import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  useColorScheme,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
  secureToggle?: boolean;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureToggle = false,
  secureTextEntry,
  style,
  ...props
}: InputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  const isSecure = secureToggle ? !showPassword : secureTextEntry;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : focused ? colors.tint : colors.border,
            borderWidth: focused || error ? 1.5 : 1,
          },
        ]}
      >
        {leftIcon && (
          <Feather
            name={leftIcon}
            size={18}
            color={focused ? colors.tint : colors.textSecondary}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          {...props}
          secureTextEntry={isSecure}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: colors.text, flex: 1 },
            style,
          ]}
          placeholderTextColor={colors.textSecondary}
        />
        {secureToggle && (
          <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.rightIcon}>
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
        {rightIcon && !secureToggle && (
          <Pressable onPress={onRightIconPress} style={styles.rightIcon}>
            <Feather name={rightIcon} size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  leftIcon: { marginRight: 10 },
  rightIcon: { padding: 4 },
  input: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    paddingVertical: 12,
  },
  error: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
  },
});
