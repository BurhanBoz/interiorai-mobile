import { useFonts } from "expo-font";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCreditStore } from "@/stores/creditStore";
import { DrawerProvider } from "@/components/layout/DrawerProvider";
import i18n from "@/i18n";
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
  // Subscribing to useTranslation here guarantees the entire app tree
  // re-renders when the language changes (via i18n.changeLanguage), because
  // every child that uses t() is descendant of <Slot /> below.
  const { i18n: i18nInstance } = useTranslation();

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
  const storedLanguage = useSettingsStore((s) => s.language);
  const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const fetchBalance = useCreditStore((s) => s.fetchBalance);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, []);

  // Bootstrap subscription + credit data as soon as the user is authenticated.
  // Without this, the subscription store stays empty on first app-open and
  // MAX/Pro users see free-tier gating until they visit the profile screen.
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    fetchPlans()
      .then(() => fetchSubscription())
      .catch(() => {});
    fetchBalance().catch(() => {});
  }, [isAuthenticated, isLoading]);

  // Sync i18next with the persisted language store on mount and on change.
  // The persist middleware rehydrates async after i18n.init runs, so
  // without this sync the first render would use the device locale.
  useEffect(() => {
    if (storedLanguage && i18nInstance.language !== storedLanguage) {
      i18nInstance.changeLanguage(storedLanguage).catch(() => {});
    }
  }, [storedLanguage, i18nInstance]);

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
            {/* `key` forces the whole tree to remount when language changes.
                This is a belt-and-suspenders guarantee on top of useTranslation()
                — any screen that forgot to hook into t() will still pick up
                the new language the next time it mounts. */}
            <Slot key={i18nInstance.language} />
          </DrawerProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
