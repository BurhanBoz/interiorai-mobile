import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/stores/authStore";

/**
 * The single place that decides where a launch lands.
 *
 * <p>Through 1.4.4 this gate sent every non-paying launch to the paywall. The
 * placement's own telemetry ended that: all 16 taps on "buy" it ever produced
 * came from people who had generated nothing, a median ~10 seconds after the
 * screen appeared, and every one backed out at Apple's sheet — three of them
 * then went and rendered twice. The offer now belongs to the first result and
 * to the empty wallet (see app/paywall.tsx); a launch goes straight to work.
 *
 * <p>Subscription state is no longer needed to route, so there is nothing to
 * wait for beyond the session itself; the stores hydrate in the background as
 * before.
 */
export default function RootIndex() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) {
    return (
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
  }

  // No identity yet — onboarding creates one, then hands back here.
  if (!isAuthenticated) return <Redirect href="/(auth)/onboarding" />;

  return <Redirect href="/(tabs)/studio" />;
}
