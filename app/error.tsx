import { View, Text } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/layout/TopBar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/Button";
import { theme } from "@/config/theme";

/**
 * The generic error screen. Shown when a render explodes or a navigation
 * target is invalid. Keeps the editorial tone (serif headline, calm body)
 * and a two-tier CTA: primary "Try Again", quiet "Contact Support".
 *
 * Audit fixes applied:
 *   - Hardcoded Google avatar URL replaced with <UserAvatar/>
 *   - Hardcoded "ROOMFRAME AI" replaced via <TopBar/> + brand
 *     mark
 *   - Hand-rolled LinearGradient button replaced with <Button variant="primary">
 *   - Debug-looking "ERROR LOG REF: 0X8A4_CURATOR" removed — that was
 *     support/debug info that users neither needed nor understood. A real
 *     error ID belongs in Sentry, not the UI.
 */
export default function ErrorScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.color.surface }}>
      <TopBar
        showBranding
        rightElement={<UserAvatar size="sm" onPress />}
      />

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        {/* Ambient glow — subtle editorial halo, not a spotlight */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 480,
            height: 480,
            borderRadius: 240,
            backgroundColor: "rgba(225,195,155,0.04)",
          }}
        />

        {/* Warning glyph tile */}
        <View
          style={{
            width: 112,
            height: 112,
            borderRadius: 24,
            backgroundColor: "rgba(225,195,155,0.06)",
            borderWidth: 1,
            borderColor: "rgba(225,195,155,0.22)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 36,
            ...theme.elevation.md,
          }}
        >
          <Ionicons
            name="warning-outline"
            size={48}
            color={theme.color.goldMidday}
          />
        </View>

        <Text
          style={{
            fontFamily: "NotoSerif",
            fontSize: 30,
            lineHeight: 36,
            letterSpacing: -0.3,
            color: theme.color.onSurface,
            textAlign: "center",
            marginBottom: 14,
          }}
        >
          {t("errors.title", { defaultValue: "Something went wrong." })}
        </Text>

        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            lineHeight: 22,
            color: theme.color.onSurfaceVariant,
            textAlign: "center",
            maxWidth: 320,
            marginBottom: 40,
          }}
        >
          {t("errors.description", {
            defaultValue:
              "We hit an unexpected error while rendering. Any credits you reserved have already been refunded to your studio.",
          })}
        </Text>

        {/* Action cluster */}
        <View style={{ width: "100%", maxWidth: 320, gap: 10 }}>
          <Button
            title={t("common.try_again", { defaultValue: "Try Again" })}
            variant="primary"
            size="md"
            onPress={() => router.back()}
            icon="arrow-forward"
          />
          <Button
            title={t("errors.contact_support", {
              defaultValue: "Contact Support",
            })}
            variant="tertiary"
            size="sm"
            onPress={() => router.push("/settings/help")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
