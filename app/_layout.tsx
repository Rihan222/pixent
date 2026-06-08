import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initAdMob } from "@/services/adsManager";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useSettingsStore } from "@/store/settingsStore";
import { ToastProvider } from "@/components/Toast";
import { useColors } from "@/hooks/useColors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="photo/[id]" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="video/[id]" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="sound/[id]" options={{ presentation: "modal", headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const themeSetting = useSettingsStore((s) => s.theme);
  const isDark = themeSetting === "dark" || (themeSetting === "system" && systemScheme === "dark");

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const loadFavorites = useFavoritesStore((s) => s.load);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    loadFavorites();
    loadSettings();
    initAdMob();
  }, [loadFavorites, loadSettings]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <ToastProvider>
                  <StatusBar style={isDark ? "light" : "dark"} />
                  <RootLayoutNav />
                </ToastProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
