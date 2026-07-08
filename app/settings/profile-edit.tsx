import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/layout/TopBar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuthStore } from "@/stores/authStore";
import { useBackHandler } from "@/utils/navigation";
import * as userService from "@/services/user";
import { theme } from "@/config/theme";

/**
 * Edit profile — display-name editing surface.
 *
 * <p>Design: TopBar + editorial hero (live avatar preview that re-inks its
 * initials as you type) + the shared {@link Input} primitive, matching the
 * auth screens. Premium/soft — quiet borders, gold accents, generous
 * spacing; no raw TextInputs.
 *
 * <p>Email is intentionally READ-ONLY here. It's the sign-in identifier and
 * the password-reset destination, and the backend applies an email change
 * with no ownership verification ({@code UserServiceImpl.updateProfile}). A
 * proper "change email" flow belongs with the upcoming email-verification
 * work (GAPS P1-10) — until then we don't expose an unverified-change vector.
 * The field is shown, locked, with a helper pointing at support.
 */

/** First letters of the first two words, uppercased — mirrors UserAvatar. */
function initialsOf(name: string): string | null {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0][0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + second).toUpperCase() || null;
}

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const handleBack = useBackHandler("/(tabs)/profile");
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmed = displayName.trim();
  const original = (user?.displayName ?? "").trim();
  const hasChanges = trimmed !== original;

  const previewInitials = useMemo(() => initialsOf(displayName), [displayName]);

  const handleSave = async () => {
    if (!hasChanges) {
      handleBack();
      return;
    }
    setError("");
    setLoading(true);
    try {
      const updated = await userService.updateProfile({ displayName: trimmed });
      setUser(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleBack();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.response?.data?.message ?? t("settings.profile_edit_fail"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.color.surface }}
    >
      <TopBar
        title={t("settings.profile_edit_title")}
        showBack
        onBack={handleBack}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Editorial hero — live avatar preview + eyebrow + serif ── */}
          <View style={{ alignItems: "center", marginTop: 20, marginBottom: 36 }}>
            <UserAvatar size="hero" initialsOverride={previewInitials} />
            <Text
              style={{
                fontFamily: "Inter-SemiBold",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: theme.color.goldMidday,
                marginTop: 20,
              }}
            >
              {t("settings.profile_edit_eyebrow")}
            </Text>
            <Text
              style={{
                fontFamily: "NotoSerif",
                fontSize: 28,
                lineHeight: 34,
                letterSpacing: -0.3,
                color: theme.color.onSurface,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              {t("settings.profile_edit_title")}
            </Text>
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 13,
                lineHeight: 19,
                color: theme.color.onSurfaceVariant,
                marginTop: 8,
                textAlign: "center",
                maxWidth: 300,
              }}
            >
              {t("settings.profile_edit_subtitle")}
            </Text>
          </View>

          {/* ── Form ── */}
          <View style={{ gap: 22 }}>
            <Input
              label={t("settings.profile_edit_display_name")}
              placeholder={t("settings.profile_edit_display_name_placeholder")}
              value={displayName}
              onChangeText={(v) => {
                if (error) setError("");
                setDisplayName(v);
              }}
              icon="person-outline"
              autoCapitalize="words"
              disabled={loading}
              error={error || null}
            />

            {/* Email — locked. Sign-in identity; change flow ships with
                email verification (GAPS P1-10). */}
            <Input
              label={t("settings.profile_edit_email")}
              value={user?.email ?? ""}
              onChangeText={() => {}}
              icon="lock-closed-outline"
              disabled
              helper={t("settings.profile_edit_email_locked")}
            />
          </View>

          {/* ── Save ── */}
          <View style={{ marginTop: 32 }}>
            <Button
              title={
                loading
                  ? t("settings.profile_edit_saving")
                  : t("settings.profile_edit_save")
              }
              onPress={handleSave}
              variant="primary"
              icon="checkmark"
              iconLeft
              fullWidth
              disabled={!hasChanges || loading}
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
