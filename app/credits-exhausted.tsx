import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/layout/TopBar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/Button";
import { theme } from "@/config/theme";

/**
 * The "you're out of credits" interstitial. Users land here when they try
 * to kick off a generation but their wallet is empty.
 *
 * Audit fixes:
 *   - Hardcoded Google decorative image URL removed (replaced with a
 *     soft gradient glow — no external fetch, no cache-miss UI)
 *   - Hardcoded brand text routed through <TopBar showBranding/>
 *   - Gold hex literals consolidated through theme tokens
 *   - Main CTA now uses the new <Button> primary variant; "buy credits
 *     pack" is a quiet <Button variant="tertiary">, not an ambiguous
 *     underlined link
 */
export default function CreditsExhaustedScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.color.surface }}
    >
      <TopBar
        showBranding
        rightElement={<UserAvatar size="sm" onPress />}
      />

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        {/* Credit ring — zero state. No fake progress fill. */}
        <View
          style={{
            width: 180,
            height: 180,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <View
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: 90,
              borderWidth: 8,
              borderColor: "rgba(77,70,60,0.35)",
            }}
          />
          <View style={{ alignItems: "center" }}>
            <Ionicons
              name="hourglass-outline"
              size={42}
              color={theme.color.onSurfaceMuted}
              style={{ opacity: 0.55, marginBottom: 8 }}
            />
            <Text
              style={{
                fontFamily: "NotoSerif",
                fontSize: 44,
                lineHeight: 48,
                letterSpacing: -0.5,
                color: theme.color.onSurface,
                fontVariant: ["tabular-nums"],
              }}
            >
              0
            </Text>
            <Text
              style={{
                fontFamily: "Inter-SemiBold",
                fontSize: 10,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                color: theme.color.onSurfaceVariant,
                marginTop: 6,
              }}
            >
              {t("profile.credits_label")}
            </Text>
          </View>
        </View>

        {/* Headline + body */}
        <Text
          style={{
            fontFamily: "NotoSerif",
            fontSize: 28,
            lineHeight: 34,
            letterSpacing: -0.3,
            color: theme.color.onSurface,
            textAlign: "center",
            marginBottom: 14,
          }}
        >
          {t("credits_exhausted.title")}
        </Text>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            lineHeight: 22,
            color: theme.color.onSurfaceVariant,
            textAlign: "center",
            maxWidth: 300,
            marginBottom: 40,
          }}
        >
          {t("credits_exhausted.description")}
        </Text>

        {/* Pro-recommendation card — editorial, no external image */}
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 24,
            borderRadius: 20,
            backgroundColor: "rgba(225,195,155,0.05)",
            borderWidth: 1,
            borderColor: "rgba(225,195,155,0.22)",
            overflow: "hidden",
            ...theme.elevation.goldGlowSoft,
          }}
        >
          {/* Soft gold halo in the corner — replaces the remote decorative
              image that was 404-prone and cache-miss-ugly. */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(253,222,181,0.08)",
            }}
          />

          <Text
            style={{
              fontFamily: "Inter-SemiBold",
              fontSize: 10,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              color: theme.color.goldMidday,
              marginBottom: 12,
            }}
          >
            {t("credits_exhausted.pro_recommendation")}
          </Text>

          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 14,
              lineHeight: 22,
              color: theme.color.onSurfaceVariant,
              marginBottom: 24,
            }}
          >
            {t("credits_exhausted.upgrade_copy")}
          </Text>

          <Button
            title={t("credits_exhausted.view_plans")}
            variant="primary"
            size="md"
            onPress={() => router.push("/plans")}
            icon="arrow-forward"
          />

          <View style={{ alignItems: "center", marginTop: 8 }}>
            <Button
              title={t("credits_bridge.or_buy_credits")}
              variant="tertiary"
              size="sm"
              onPress={() => router.push("/credits/packs")}
              fullWidth={false}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
