import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { tierAtLeast } from "@/utils/planTier";

/**
 * How long we will wait for the subscription before letting the user in anyway.
 *
 * <p>The gate below must never hang. If the plan cannot be determined — offline,
 * a slow network, an API that never answers — the safe direction is INTO the
 * app: a free user reaching Studio without seeing the paywall costs one
 * impression, while a paying subscriber stuck on a spinner (or worse, shown a
 * paywall they already bought past) is a real failure.
 */
const SUBSCRIPTION_WAIT_MS = 4000;

/**
 * The single place that decides where a launch lands.
 *
 * <p>It used to redirect on {@code isAuthenticated} alone, straight to Studio,
 * which meant the paywall was reachable only through onboarding. The guest
 * identity lives in the Keychain and therefore SURVIVES APP DELETION, so a
 * reinstall arrived already authenticated and went straight past the offer —
 * reproduced from the App Store build on 2026-09-01. The same held for every
 * existing user updating into 1.4.0: authenticated already, so none of them
 * were ever shown the paywall at all.
 *
 * <p>The gate is now the subscription, not the session. One question, asked in
 * one place: does this person pay us? Paid tiers go to Studio; everyone else
 * meets the offer, and dismissing it takes them into the app. Routing the
 * decision through here also means onboarding no longer needs to know about
 * the paywall — it hands back to the root and the answer is computed once.
 *
 * <p><b>The flag is load-bearing.</b> `subscription === null` means both "not
 * fetched yet" and "no subscription", so gating on it during boot would flash
 * a paywall at a paying customer for the length of the request.
 * {@code subscriptionResolved} separates the absence from the answer, and the
 * timeout above keeps a silent network from turning the wait into a hang.
 */
export default function RootIndex() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const subscription = useSubscriptionStore(s => s.subscription);
  const subscriptionResolved = useSubscriptionStore(s => s.subscriptionResolved);

  const [waitedLongEnough, setWaitedLongEnough] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWaitedLongEnough(true), SUBSCRIPTION_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  const spinner = (
    <View
      style={{
        flex: 1,
        backgroundColor: "#131313",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="large" color="#C4A882" />
    </View>
  );

  if (isLoading) return spinner;

  // No identity yet — onboarding creates one, then hands back here.
  if (!isAuthenticated) return <Redirect href="/(auth)/onboarding" />;

  // Do not guess while the plan is still in flight; do not wait forever either.
  if (!subscriptionResolved && !waitedLongEnough) return spinner;

  // Anything at BASE or above has already paid. Everyone else — including a
  // plan we could not resolve — meets the offer, which is dismissible.
  if (tierAtLeast(subscription?.planCode, "BASE")) {
    return <Redirect href="/(tabs)/studio" />;
  }
  if (!subscriptionResolved) {
    // Timed out rather than answered: fail into the app, not into a paywall.
    return <Redirect href="/(tabs)/studio" />;
  }
  return <Redirect href="/paywall" />;
}
