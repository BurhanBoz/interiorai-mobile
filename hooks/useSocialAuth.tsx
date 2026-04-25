import { useCallback, useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import env from "@/config/environment";

/**
 * Unified hook for Apple + Google native sign-in.
 *
 * Usage:
 *   const { appleAvailable, signInWithApple, signInWithGoogle, loading } = useSocialAuth();
 *
 * After a successful sign-in the root layout's auth guard redirects to (tabs),
 * so callers don't need to navigate manually.
 */
export function useSocialAuth() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState<null | "apple" | "google">(null);
    const [appleAvailable, setAppleAvailable] = useState(false);

    const loginWithAppleStore = useAuthStore((s) => s.loginWithApple);
    const loginWithGoogleStore = useAuthStore((s) => s.loginWithGoogle);

    useEffect(() => {
        if (Platform.OS !== "ios") return;
        AppleAuthentication.isAvailableAsync()
            .then(setAppleAvailable)
            .catch(() => setAppleAvailable(false));
    }, []);

    // Google OAuth — uses expo-auth-session; client IDs come from EXPO_PUBLIC_* env
    const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
        iosClientId: env.google.iosClientId || undefined,
        webClientId: env.google.webClientId || undefined,
    });

    useEffect(() => {
        if (!googleResponse) return;
        if (googleResponse.type === "success") {
            const idToken = googleResponse.params?.id_token;
            if (idToken) {
                handleGoogleToken(idToken).catch(() =>
                    Alert.alert(t("auth.google_failed_title"), t("auth.social_retry"))
                );
            }
        } else if (googleResponse.type === "error") {
            setLoading(null);
            Alert.alert(t("auth.google_failed_title"), t("auth.social_retry"));
        } else if (googleResponse.type === "dismiss" || googleResponse.type === "cancel") {
            setLoading(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [googleResponse]);

    const handleGoogleToken = useCallback(
        async (idToken: string) => {
            try {
                await loginWithGoogleStore({ identityToken: idToken });
                router.replace("/(tabs)/gallery");
            } finally {
                setLoading(null);
            }
        },
        [loginWithGoogleStore]
    );

    const signInWithApple = useCallback(async () => {
        if (Platform.OS !== "ios" || !appleAvailable) {
            Alert.alert(t("auth.apple_not_available_title"), t("auth.apple_not_available_description"));
            return;
        }
        setLoading("apple");
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });
            if (!credential.identityToken) {
                throw new Error("Apple did not return an identity token");
            }
            const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
                .filter(Boolean)
                .join(" ")
                .trim();
            await loginWithAppleStore({
                identityToken: credential.identityToken,
                fullName: fullName || undefined,
            });
            router.replace("/(tabs)/gallery");
        } catch (e: any) {
            if (e?.code !== "ERR_REQUEST_CANCELED") {
                Alert.alert(t("auth.apple_failed_title"), t("auth.social_retry"));
            }
        } finally {
            setLoading(null);
        }
    }, [appleAvailable, loginWithAppleStore, t]);

    const signInWithGoogle = useCallback(async () => {
        if (!env.google.iosClientId && !env.google.webClientId) {
            Alert.alert(t("auth.social_not_configured_title"), t("auth.social_not_configured_description"));
            return;
        }
        setLoading("google");
        try {
            await promptGoogle();
        } catch {
            setLoading(null);
            Alert.alert(t("auth.google_failed_title"), t("auth.social_retry"));
        }
    }, [promptGoogle, t]);

    return {
        appleAvailable,
        loading,
        signInWithApple,
        signInWithGoogle,
    };
}
