import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from "react-native";
import { useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/layout/TopBar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { EMAIL_REGEX } from "@/utils/validation";
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

  // ── Account shape decides the email section (2026-08-09) ──
  //   guest        → "add email" card (upgrade flow; a guest has no real email)
  //   social       → read-only + "managed by Apple/Google" (provider owns it)
  //   password     → real change form: new email + CURRENT password.
  // The password requirement mirrors the backend contract: a live JWT is
  // possession of the phone, not proof of ownership.
  const isGuest = user?.guest === true;
  const socialProvider = !isGuest && user?.externalProvider ? user.externalProvider : null;
  const canChangeEmail = !isGuest && !socialProvider;

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const changeEmail = useAuthStore((s) => s.changeEmail);

  const handleChangeEmail = async () => {
    const trimmedEmail = newEmail.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError(t("auth.invalid_email"));
      return;
    }
    if (!emailPassword) {
      setEmailError(t("auth.password_required"));
      return;
    }
    setEmailError("");
    setEmailBusy(true);
    try {
      await changeEmail(trimmedEmail, emailPassword);
      setNewEmail("");
      setEmailPassword("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("settings.profile_edit_email_success"));
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const status = e?.response?.status;
      const code = e?.response?.data?.code;
      setEmailError(
        status === 409 || code === "EMAIL_ALREADY_EXISTS"
          ? t("settings.profile_edit_email_in_use")
          : code === "ACCOUNT_LOCKED"
            ? (e?.response?.data?.message ?? t("errors.generic"))
            : status === 401 || code === "INVALID_CREDENTIALS"
              ? t("settings.delete_account_invalid_password")
              : (e?.response?.data?.message ?? t("errors.generic")),
      );
    } finally {
      setEmailBusy(false);
    }
  };

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
      edges={[]}
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
          contentContainerStyle={{ paddingHorizontal: theme.space.gutter, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Editorial hero — live avatar preview + eyebrow + serif ── */}
          <View style={{ alignItems: "center", marginTop: 20, marginBottom: 36 }}>
            <UserAvatar size="hero" initialsOverride={previewInitials} />
            <Text
              style={{
                ...theme.text.caption,
                color: theme.color.goldMidday,
                marginTop: 20,
              }}
            >
              {t("settings.profile_edit_eyebrow")}
            </Text>
            <Text
              style={{
                ...theme.text.display,
                color: theme.color.onSurface,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              {t("settings.profile_edit_title")}
            </Text>
            <Text
              style={{
                ...theme.text.body,
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

            {isGuest ? (
              /* R3 (2026-08-09): the durable upgrade path. The 3rd-generation
                 alert is one-shot by design — anyone who tapped "Later" had NO
                 discoverable way back to attaching an email. This card is that
                 way back, exactly where the founder placed it: the screen you
                 open to edit your identity. Reuses the alert's own i18n keys. */
              <Pressable
                onPress={() => router.push({ pathname: "/register", params: { upgrade: "1" } })}
                accessibilityRole="button"
                accessibilityLabel={t("auth.secure_account_cta")}
              >
                <View
                  style={{
                    padding: 20,
                    borderRadius: theme.radius.md,
                    backgroundColor: "rgba(225,195,155,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(225,195,155,0.28)",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="mail-outline" size={theme.iconSize.md} color={theme.color.goldMidday} />
                    <Text style={{ ...theme.text.subtitle, color: theme.color.onSurface }}>
                      {t("auth.secure_account_title")}
                    </Text>
                  </View>
                  <Text
                    style={{
                      ...theme.text.caption,
                      color: theme.color.onSurfaceVariant,
                      marginTop: 8,
                      lineHeight: 18,
                    }}
                  >
                    {t("auth.secure_account_body")}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
                    <Text style={{ ...theme.text.subtitle, color: theme.color.goldMidday }}>
                      {t("auth.secure_account_cta")}
                    </Text>
                    <Ionicons name="arrow-forward" size={theme.iconSize.sm} color={theme.color.goldMidday} />
                  </View>
                </View>
              </Pressable>
            ) : socialProvider ? (
              /* Provider-owned account: our copy of the email mirrors Apple/
                 Google; changing it here would desync the identity source. */
              <Input
                label={t("settings.profile_edit_email")}
                value={user?.email ?? ""}
                onChangeText={() => {}}
                icon="lock-closed-outline"
                disabled
                helper={t("settings.profile_edit_email_managed", { provider: socialProvider === "APPLE" ? "Apple" : "Google" })}
              />
            ) : (
              /* Password account: the real change flow. */
              <View style={{ gap: 16 }}>
                <Input
                  label={t("settings.profile_edit_email")}
                  value={user?.email ?? ""}
                  onChangeText={() => {}}
                  icon="mail-outline"
                  disabled
                />
                <Input
                  label={t("settings.profile_edit_new_email")}
                  placeholder={t("settings.profile_edit_email_placeholder")}
                  value={newEmail}
                  onChangeText={(v) => {
                    if (emailError) setEmailError("");
                    setNewEmail(v);
                  }}
                  icon="mail-unread-outline"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  disabled={emailBusy}
                />
                <Input
                  label={t("settings.delete_account_password_label")}
                  placeholder={t("settings.delete_account_password_placeholder")}
                  value={emailPassword}
                  onChangeText={(v) => {
                    if (emailError) setEmailError("");
                    setEmailPassword(v);
                  }}
                  icon="lock-closed-outline"
                  secureTextEntry
                  disabled={emailBusy}
                  error={emailError || null}
                  helper={emailError ? undefined : t("settings.profile_edit_email_hint")}
                />
                <Button
                  title={t("settings.profile_edit_email_cta")}
                  onPress={handleChangeEmail}
                  variant="secondary"
                  icon="swap-horizontal"
                  iconLeft
                  fullWidth
                  disabled={emailBusy || !newEmail.trim() || !emailPassword}
                  loading={emailBusy}
                />
              </View>
            )}
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

          {/* ── Everything else the account screen has to carry ──────────
           *
           * 🔴 Account deletion is an App Store requirement (5.1.1(v)) and
           * used to be reachable only from the old settings list. That list
           * was removed on 2026-09-19, so these rows moved here — this IS the
           * account screen now, and deletion has to have a door.
           *
           * Billing history and Terms come along for the same reason in
           * weaker form: nothing else in the app reaches them.
           */}
          <View
            style={{
              marginTop: 36,
              borderWidth: 1,
              borderColor: theme.umber.lineNeutral,
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <AccountRow
              label={t("profile.billing_history")}
              onPress={() => router.push("/credits" as never)}
            />
            <AccountRow
              label={t("profile.terms")}
              onPress={() => router.push("/settings/terms" as never)}
            />
            <AccountRow
              label={t("drawer.help")}
              onPress={() => router.push("/settings/help" as never)}
            />
            <AccountRow
              label={t("settings.delete_account")}
              tone="danger"
              last
              onPress={() => router.push("/settings/delete-account" as never)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** One row of the account list. Same shape as the Settings rows. */
function AccountRow({
  label,
  tone = "ink",
  last,
  onPress,
}: {
  label: string;
  tone?: "ink" | "danger";
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.umber.lineNeutral,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 44,
      }}
    >
      <Text
        style={{
          ...theme.v2.row,
          color: tone === "danger" ? theme.color.danger : theme.umber.ink,
        }}
      >
        {label}
      </Text>
      <Text style={{ color: theme.umber.inkMuted, fontSize: 16 }}>›</Text>
    </Pressable>
  );
}
