import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform } from "react-native";
import { FloatingTabBar } from "@/components/FloatingTabBar";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="card">
        <Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
        <Label>Card</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transactions">
        <Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <Label>Activity</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function FloatingTabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : undefined,
        }}
      />
      <Tabs.Screen
        name="card"
        options={{
          title: "Card",
          tabBarIcon: ({ color }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="creditcard" tintColor={color} size={24} />
            ) : undefined,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Activity",
          tabBarIcon: ({ color }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="list.bullet" tintColor={color} size={24} />
            ) : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="gearshape" tintColor={color} size={24} />
            ) : undefined,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <FloatingTabLayout />;
}
