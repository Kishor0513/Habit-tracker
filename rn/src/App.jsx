import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, Text, View } from "react-native";
import { AppProvider, useApp } from "./state/AppState";
import TodayScreen from "./screens/TodayScreen";
import HabitsScreen from "./screens/HabitsScreen";
import ProjectsScreen from "./screens/ProjectsScreen";
import InsightsScreen from "./screens/InsightsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AuthScreen from "./screens/AuthScreen";
import { ToastProvider } from "./state/ToastState";
import { colors, radius, shadow } from "./ui/components";

const Tab = createBottomTabNavigator();

const navTheme = {
  dark: true,
  colors: {
    primary: colors.brand,
    background: colors.bg,
    card: colors.panelStrong,
    text: colors.text,
    border: colors.line,
    notification: colors.brandStrong,
  },
  fonts: {
    regular: { fontFamily: undefined, fontWeight: "400" },
    medium: { fontFamily: undefined, fontWeight: "600" },
    bold: { fontFamily: undefined, fontWeight: "700" },
    heavy: { fontFamily: undefined, fontWeight: "800" },
  },
};

function TabLabel({ focused, label }) {
  return (
    <Text
      style={{
        color: focused ? colors.brandStrong : colors.faint,
        fontSize: 11,
        fontWeight: focused ? "800" : "700",
        letterSpacing: 0.3,
      }}
    >
      {label}
    </Text>
  );
}

function TabIcon({ focused, icon }) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "rgba(168,85,247,0.18)" : "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: focused ? "rgba(244,114,182,0.24)" : colors.line,
      }}
    >
      <Text style={{ color: focused ? colors.brandStrong : colors.muted, fontSize: 15, fontWeight: "800" }}>{icon}</Text>
    </View>
  );
}

function loadingView(message) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.bg,
        gap: 12,
      }}
    >
      <ActivityIndicator color={colors.brandStrong} />
      <Text style={{ color: colors.muted, fontWeight: "600" }}>{message}</Text>
    </View>
  );
}

function AuthedTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 80,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: "rgba(24,14,37,0.96)",
          borderTopColor: colors.line,
          borderTopWidth: 1,
          ...shadow.card,
        },
        tabBarItemStyle: {
          borderRadius: radius.lg,
          marginHorizontal: 4,
        },
        tabBarIcon: ({ focused }) => {
          const icons = { Today: "◌", Habits: "✓", Projects: "◈", Insights: "⌁", Settings: "•" };
          return <TabIcon focused={focused} icon={icons[route.name] ?? "•"} />;
        },
        tabBarLabel: ({ focused }) => <TabLabel focused={focused} label={route.name} />,
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Habits" component={HabitsScreen} />
      <Tab.Screen name="Projects" component={ProjectsScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function Gate() {
  const { isReady, supabaseConfigured, user, authLoading } = useApp();

  if (authLoading) return loadingView("Loading workspace...");
  if (supabaseConfigured && !user) return <AuthScreen />;
  if (!isReady) return loadingView("Preparing your data...");
  return <AuthedTabs />;
}

export function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AppProvider>
          <NavigationContainer theme={navTheme}>
            <Gate />
          </NavigationContainer>
        </AppProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
