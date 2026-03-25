import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "./state/AppState";
import TodayScreen from "./screens/TodayScreen";
import HabitsScreen from "./screens/HabitsScreen";
import ProjectsScreen from "./screens/ProjectsScreen";
import InsightsScreen from "./screens/InsightsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AuthScreen from "./screens/AuthScreen";
import { ToastProvider } from "./state/ToastState";
import { View, ActivityIndicator, Text } from "react-native";

const Tab = createBottomTabNavigator();

function AuthedTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: "center" }}>
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

  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, opacity: 0.7 }}>Loading…</Text>
      </View>
    );
  }

  if (supabaseConfigured && !user) return <AuthScreen />;
  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <AuthedTabs />;
}

export function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AppProvider>
          <NavigationContainer theme={DefaultTheme}>
            <Gate />
          </NavigationContainer>
        </AppProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

