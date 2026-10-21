import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import * as SecureStore from "expo-secure-store";

import Reanimated, { FadeInDown } from "react-native-reanimated";

import { theme } from "@/config/theme";
import { useAuthStore } from "@/stores/authStore";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { HexMark } from "@/components/brand/HexMark";
import { ShimmerButton } from "@/components/ui/ShimmerButton";
import { HalloweenHero } from "@/components/onboarding/Heroes";

const U = theme.umber;
const V = theme.v2;

/**
 * First run — one page (3.0.0, owner 20 Oct 2026).
 *
 * <p><b>What it replaces.</b> The three-page tour (Halloween / Christmas / the empty room, build
 * 117): the data said 62% of installs never generate, and a pager with Next ×3 and a Skip stood
 * between the install and the camera. This screen says the one sentence the app is — "Your room.
 * Any style. One photo." — over the Halloween before/after, with one door: "Try it on my room".
 * No dots, no Skip, no body copy. It is shown once; the root gate never sends a signed-in user
 * back here.
 *
 * <p>🔴 The hero is BUNDLED and MOVES (components/onboarding/Heroes.tsx): a real output of the
 * app, the handle sweeping on its own with the first-run shine. The brand lockup rides above it.
 */
export default function OnboardingScreen() {
    const { t } = useTranslation();
    const { width, height } = useWindowDimensions();
    // The picture takes ~70% of the screen; the headline and the one button sit under its fade.
    const HERO_HEIGHT = Math.round(Math.min(height * 0.7, 660));
    const guestLogin = useAuthStore((st) => st.guestLogin);
    const reduceMotion = useReduceMotion();

    const [busy, setBusy] = useState(false);

    // Returning account holders only (R1, 2026-08-09): a dead session past the
    // refresh window would otherwise be forked into a fresh empty guest by the
    // only button on screen. The hint is written by persistAuth, so a new
    // install never sees this.
    const [hadAccount, setHadAccount] = useState(false);
    useEffect(() => {
        let alive = true;
        SecureStore.getItemAsync("last_registered_email")
            .then((v) => {
                if (alive) setHadAccount(!!v);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, []);

    /**
     * V53 guest-first: start creates a silent device account and hands back to
     * the root gate. The gate — not this screen — decides whether the next
     * thing is Studio or the paywall; three screens each deciding for
     * themselves is how the reinstall case slipped through before.
     */
    const start = useCallback(async () => {
        if (busy) return;
        setBusy(true);
        try {
            await guestLogin();
            router.replace("/");
        } catch {
            router.push("/register");
        } finally {
            setBusy(false);
        }
    }, [busy, guestLogin]);

    return (
        <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: U.ground }}>
            <View
                style={{ position: "absolute", top: 0, left: 0, right: 0, height: HERO_HEIGHT }}
                accessible
                accessibilityRole="image"
                accessibilityLabel={t("onboarding.v3_headline")}
            >
                <HalloweenHero width={width} height={HERO_HEIGHT} active />
                <LinearGradient
                    pointerEvents="none"
                    colors={[U.overlayScrim, "transparent", U.ground]}
                    locations={[0, 0.3, 0.97]}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                />
            </View>

            {/* Brand lockup rides above the hero. */}
            <View
                style={{
                    position: "absolute",
                    top: 62,
                    left: 26,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                }}
            >
                <HexMark width={19} height={21} color={U.accent} />
                <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 13, letterSpacing: 3, color: U.accentBright }}>
                    ROOMFRAME
                </Text>
            </View>

            <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 26, paddingBottom: 34 }}>
                {/* The one sentence, rising in. Three short lines by design — the full stops are the
                    rhythm; long languages shrink instead of wrapping past three lines. */}
                <Reanimated.View entering={reduceMotion ? undefined : FadeInDown.duration(520).springify().damping(18)}>
                    <Text
                        style={{ ...V.displayL, color: U.ink }}
                        numberOfLines={3}
                        adjustsFontSizeToFit
                        minimumFontScale={0.6}
                    >
                        {/* One sentence per line (owner, 21 Oct): the full stops are the line breaks, in
                            every language — "。" in Japanese, ". " elsewhere. */}
                        {t("onboarding.v3_headline").replace(/([.。])\s*(?=\S)/g, "$1\n")}
                    </Text>
                </Reanimated.View>

                <ShimmerButton onPress={start} disabled={busy} reduceMotion={reduceMotion} style={{ marginTop: 26 }}>
                    <View style={{ height: 58, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        {busy ? (
                            <ActivityIndicator color={U.buttonInk} />
                        ) : (
                            <>
                                <Text style={{ ...V.button, color: U.buttonInk }} numberOfLines={1} adjustsFontSizeToFit>
                                    {t("onboarding.v3_cta")}
                                </Text>
                                <Text style={{ color: U.buttonInk, fontSize: 18 }}>→</Text>
                            </>
                        )}
                    </View>
                </ShimmerButton>

                {hadAccount && (
                    <Pressable onPress={() => router.push("/login")} hitSlop={10} accessibilityRole="button">
                        <Text style={{ ...V.caption, color: U.inkMuted, marginTop: 16 }}>
                            {t("onboarding.sign_in_existing")}
                        </Text>
                    </Pressable>
                )}
            </View>
        </SafeAreaView>
    );
}
