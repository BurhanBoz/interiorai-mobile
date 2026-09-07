import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { tierAtLeast } from "@/utils/planTier";
import { isFlagSet } from "@/utils/oneShotFlag";
import { firstResultOfferFlag } from "@/hooks/useFirstResultPaywall";

/**
 * How long a launch will wait for the answers it routes on (subscription
 * state + the first-offer flag). Past this, fail INTO the app: a free user
 * slipping straight to Studio costs one impression; a paying subscriber held
 * on a spinner — or worse, shown a paywall they already bought past — is a
 * real failure.
 */
const SUBSCRIPTION_WAIT_MS = 4000;

/**
 * Cold-start latch. The return offer fires at most once per process, so a
 * navigation that lands back on the index cannot re-open it mid-session.
 * Deliberately NOT persisted: the next cold start is a new visit.
 */
let offerShownThisLaunch = false;

/**
 * The single place that decides where a launch lands.
 *
 * <p>Three eras, each taught by its own telemetry. Through 1.4.4 every
 * non-paying launch hit a paywall: all 16 purchase taps it produced came from
 * people who had generated nothing, median ~10 s in, every one abandoned at
 * Apple's sheet. 1.4.5 sent every launch straight to work and moved the offer
 * to the first result — activation jumped from ~45% to ~88% in a day.
 *
 * <p>This version adds the RETURN visit (founder, 2026-09-06): a free user
 * who has already MET the first-result offer — seen what the product does
 * with their own room, declined, left — opens the next session on the offer
 * again, dismissible as ever. First sessions stay frictionless; the ask
 * repeats only for people with something to remember. The flag it keys on is
 * the first-result offer's own per-user Keychain flag, so pre-1.4.5 users
 * grow into this the first time they render (self-healing, no history call
 * at launch).
 */
export default function RootIndex() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const userId = useAuthStore(s => s.user?.id ?? null);
  const subscription = useSubscriptionStore(s => s.subscription);
  const subscriptionResolved = useSubscriptionStore(s => s.subscriptionResolved);

  const [waitedLongEnough, setWaitedLongEnough] = useState(false);
  // null = not read yet; the flag read is async (Keychain) and the redirect
  // decision must not run ahead of it.
  const [metFirstOffer, setMetFirstOffer] = useState<boolean | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setWaitedLongEnough(true), SUBSCRIPTION_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    isFlagSet(firstResultOfferFlag(userId))
      .then(v => { if (!cancelled) setMetFirstOffer(v); })
      .catch(() => { if (!cancelled) setMetFirstOffer(false); });
    return () => { cancelled = true; };
  }, [userId]);

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

  if (!offerShownThisLaunch) {
    const answersPending = !subscriptionResolved || metFirstOffer === null;
    if (answersPending && !waitedLongEnough) return spinner;

    // Only a RESOLVED non-paying answer opens the offer; a timeout falls
    // through to Studio. tierAtLeast is false for FREE and for null alike.
    if (subscriptionResolved
        && !tierAtLeast(subscription?.planCode, "BASE")
        && metFirstOffer === true) {
      offerShownThisLaunch = true;
      return <Redirect href={{ pathname: "/paywall", params: { source: "APP_OPEN" } }} />;
    }
  }

  return <Redirect href="/(tabs)/studio" />;
}
