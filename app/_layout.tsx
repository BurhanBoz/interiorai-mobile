import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCreditStore } from "@/stores/creditStore";
import { useStorePricesStore } from "@/stores/storePricesStore";
import { initializeIAP } from "@/services/iap";
import { AppSplash } from "@/components/ui/AppSplash";
import { AiConsentSheet } from "@/components/ui/AiConsentSheet";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import i18n from "@/i18n";
import "../global.css";

// How long to dwell on the branded splash AFTER fonts/bootstrap are ready.
// Adjust for feel — <1200ms feels rushed, >2500ms feels slow on subsequent launches.
const SPLASH_DWELL_MS = 1800;

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
  // every child that uses t() is descendant of the root <Stack /> below.
  const { i18n: i18nInstance } = useTranslation();

  // Real weight TTFs now land in assets/fonts/ — no more synthesized
  // bold. Previously every non-regular alias pointed at the Regular
  // file and the OS faked the boldness, which degrades anti-aliasing
  // noticeably on dark backgrounds. Source TTFs:
  //   - NotoSerif-Bold from notofonts/NotoSerif (hinted/instance_ttf)
  //   - Inter-{Medium,SemiBold,Bold} from rsms/inter v4.1 extras/ttf
  // sha256 verified against the remote-agent report.
  const [fontsLoaded, fontError] = useFonts({
    NotoSerif: require("../assets/fonts/NotoSerif-Regular.ttf"),
    "NotoSerif-Medium": require("../assets/fonts/NotoSerif-Regular.ttf"),
    "NotoSerif-Bold": require("../assets/fonts/NotoSerif-Bold.ttf"),
    Inter: require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Light": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
  });

  const { isAuthenticated, isLoading, hydrate, user } = useAuthStore();
  const storedLanguage = useSettingsStore((s) => s.language);
  const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const fetchBalance = useCreditStore((s) => s.fetchBalance);
  const segments = useSegments();
  const router = useRouter();
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    hydrate();
  }, []);

  // Foreground token refresh (2026-07-18): the JWT lives 24h, so a user who
  // reopens the app the next day used to race an expired token into their
  // first request and get bounced to login. On every return to foreground we
  // silently exchange the token (backend accepts expired ones within a
  // 30-day sliding window), so the session just continues.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        import("@/services/api").then(({ ensureFreshSession }) => ensureFreshSession());
      }
    });
    return () => sub.remove();
  }, []);

  // Dismiss the branded splash once fonts have loaded AND the dwell timer
  // has elapsed. This runs over the native Expo splash — user sees one
  // continuous brand moment, not a flash of black between the two.
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    const timer = setTimeout(() => setSplashVisible(false), SPLASH_DWELL_MS);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

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

  // Initialize RevenueCat SDK once user identity is known. Linking RC's
  // customer record to our backend user UUID ensures purchases attribute
  // to the right wallet and that entitlements survive cross-device login.
  //
  // Dummy mode (no RC API key) is a no-op — initializeIAP returns early
  // and the rest of the app continues to use the backend's dummy
  // activation endpoint.
  useEffect(() => {
    if (isLoading) return;
    // Pass null for anonymous mode; RC creates an anonymous customer that
    // gets aliased to the real userId on the next initializeIAP call.
    initializeIAP(user?.id ?? null)
      // Warm the storefront-localized price map right after RC is
      // configured so the paywall opens with ₺/€/¥ prices already in
      // memory (screens keep a USD fallback + their own retry).
      .then(() => useStorePricesStore.getState().hydrate())
      .catch((e) => {
        console.warn("[ROOT] initializeIAP failed:", e);
      });
  }, [user?.id, isLoading]);

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
    // Password reset is reachable even for authed users — a reset email
    // tapped from the same device while still logged in should open the
    // form, not bounce to Studio.
    const isPasswordReset = (segments as string[])[1] === "reset-password";
    // V53 guest-first — a GUEST deliberately routed to register (the
    // 3rd-generation "secure your account" prompt) must not be bounced:
    // guests ARE authenticated, so without this exception the upgrade
    // screen closed itself instantly (founder-reported, 2026-08-03).
    // login is included so register's "Sign in" link keeps working for
    // returning account holders. Onboarding/trial screens stay guarded.
    const isUpgradeReachable =
      (segments as string[])[1] === "register" ||
      (segments as string[])[1] === "login";
    // Public legal screens — Terms of Service and Privacy Policy are
    // reachable BEFORE login (Apple §5.1.1(ix), GDPR Art. 13). The
    // LegalFooter on onboarding/login/register routes here, so the
    // pre-login user must be allowed to read them without being
    // bounced back to onboarding by the auth guard.
    const inPublicLegal =
      segments[0] === "settings" &&
      ((segments as string[])[1] === "terms" ||
        (segments as string[])[1] === "privacy");

    if (!isAuthenticated && !inAuthGroup && !inPublicLegal) {
      router.replace("/(auth)/onboarding");
    } else if (isAuthenticated && inAuthGroup && !isPasswordReset && !isUpgradeReachable) {
      router.replace("/(tabs)/studio");
    }
  }, [isAuthenticated, isLoading, segments, fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (splashVisible) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppSplash />
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="light" />
            {/* `key` forces the whole tree to remount when language changes.
                This is a belt-and-suspenders guarantee on top of useTranslation()
                — any screen that forgot to hook into t() will still pick up
                the new language the next time it mounts. */}
            {/* Root is a real Stack (was Slot) — gives every pushed screen
                deterministic back behavior AND native iOS swipe-back
                (2026-07 tester findings: back from result landed on the
                wrong tab; no edge-swipe anywhere). */}
            <Stack
              key={i18nInstance.language}
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#131313" },
              }}
            />
            <OfflineBanner />
            {/* AI-processing consent (5.1.2(i)) — mounted once, shown by
                aiConsentStore right before the first photo pick. */}
            <AiConsentSheet />
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
