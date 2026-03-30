import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Colors from "@/constants/colors";

const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: "home",
  card: "credit-card",
  transactions: "activity",
  profile: "user",
  settings: "settings",
};

const TAB_LABELS: Record<string, string> = {
  index: "Home",
  card: "Card",
  transactions: "Activity",
  profile: "Profile",
  settings: "Settings",
};

function TabPill({
  route,
  isFocused,
  onPress,
  colors,
  isDark,
}: {
  route: string;
  isFocused: boolean;
  onPress: () => void;
  colors: typeof Colors.light;
  isDark: boolean;
}) {
  const widthAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: false,
        tension: 120,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(iconScaleAnim, {
          toValue: isFocused ? 1.15 : 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(iconScaleAnim, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [isFocused]);

  const iconColor = isFocused ? colors.tint : colors.tabIconDefault;
  const icon = TAB_ICONS[route] ?? "circle";
  const label = TAB_LABELS[route] ?? route;

  return (
    <Pressable
      onPress={onPress}
      style={styles.pill}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View
        style={[
          styles.activeBg,
          {
            backgroundColor: isDark ? colors.tintLight : colors.tintLight,
            transform: [{ scaleX: widthAnim }],
            opacity: widthAnim,
          },
        ]}
      />
      <View style={styles.pillContent}>
        <Animated.View style={{ transform: [{ scale: iconScaleAnim }] }}>
          <Feather name={icon} size={22} color={iconColor} />
        </Animated.View>
        <Animated.View
          style={[styles.labelWrapper, { opacity: opacityAnim, maxWidth: opacityAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 80] }) }]}
        >
          <Text style={[styles.tabLabel, { color: colors.tint }]} numberOfLines={1}>
            {label}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FloatingTabBar({ state, descriptors, navigation }: any) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const bottomInset = Platform.OS === "web" ? 24 : Math.max(insets.bottom, 8);

  return (
    <View style={[styles.container, { bottom: bottomInset }]}>
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={70}
          tint={isDark ? "dark" : "light"}
          style={[StyleSheet.absoluteFill, styles.blurContainer]}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.blurContainer,
            { backgroundColor: isDark ? "rgba(11,17,32,0.95)" : "rgba(255,255,255,0.97)" },
          ]}
        />
      )}
      <View style={styles.inner}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          return (
            <TabPill
              key={route.key}
              route={route.name}
              isFocused={isFocused}
              onPress={onPress}
              colors={colors}
              isDark={isDark}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  blurContainer: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(150,150,150,0.15)",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 2,
  },
  pill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    height: 50,
    overflow: "hidden",
  },
  activeBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    transform: [{ scaleX: 1 }],
  },
  pillContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 1,
  },
  labelWrapper: {
    overflow: "hidden",
  },
  tabLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
