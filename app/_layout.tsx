import { useFonts } from "expo-font";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { DrawerProvider } from "@/components/layout/DrawerProvider";
import "@/i18n";
import "../global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSerif: require("../assets/fonts/NotoSerif-Regular.ttf"),
    "NotoSerif-Medium": require("../assets/fonts/NotoSerif-Regular.ttf"),
    "NotoSerif-Bold": require("../assets/fonts/NotoSerif-Regular.ttf"),
    Inter: require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Light": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-Regular.ttf"),
  });

  const { isAuthenticated, isLoading, hydrate } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, []);

  // Guard: redirect away from protected routes if not authed,
  // and away from auth routes if already authed.
  // This only fires AFTER hydration completes — initial route
  // is handled by app/index.tsx so +not-found never flashes.
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/onboarding");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)/gallery");
    }
  }, [isAuthenticated, isLoading, segments, fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <DrawerProvider>
            <StatusBar style="light" />
            <Slot />
          </DrawerProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
