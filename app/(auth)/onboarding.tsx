import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
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

import { theme, track } from "@/config/theme";
import { useAuthStore } from "@/stores/authStore";
import { HexMark } from "@/components/brand/HexMark";

const U = theme.umber;
const V = theme.v2;

/**
 * First run (Umber redesign, 2026-09-19).
 *
 * <p><b>What it replaces.</b> A splash carrying the retired brand name
 * "ARCHITECTURAL LENS / DIGITAL CURATOR" — dropped in April 2026 — over a
 * logo PNG with a Photoshop transparency checkerboard baked into it. Then a
 * three-dot carousel whose dots did not track anything: the button skipped
 * all three pages and swiping moved nothing.
 *
 * <p>The dots now track the page and the button advances one page at a time,
 * with SKIP always visible for anyone who does not want the tour.
 *
 * <p>🔴 The three heroes are BUNDLED. They used to be remote
 * {@code lh3.googleusercontent.com/aida-public/…} URLs — design-tool
 * placeholders fetched over the network on the very first screen of a first
 * launch, where the user has the least patience and the connection is least
 * proven, and which 404 the day that bucket is cleaned up.
 */
const SLIDES = [
    {
        id: "restyled",
        headlineKey: "onboarding.v2_slide1_headline",
        bodyKey: "onboarding.v2_slide1_body",
        image: require("@/assets/onboarding/hall.png"),
    },
    {
        id: "six-ways",
        headlineKey: "onboarding.v2_slide2_headline",
        bodyKey: "onboarding.v2_slide2_body",
        image: require("@/assets/onboarding/restyled.png"),
    },
    {
        id: "free-today",
        headlineKey: "onboarding.v2_slide3_headline",
        bodyKey: "onboarding.v2_slide3_body",
        image: require("@/assets/onboarding/minimal.png"),
    },
] as const;

const HERO_HEIGHT = 455;

export default function OnboardingScreen() {
    const { t } = useTranslation();
    const { width } = useWindowDimensions();
    const guestLogin = useAuthStore((st) => st.guestLogin);

    const [busy, setBusy] = useState(false);
    const [index, setIndex] = useState(0);
    const listRef = useRef<FlatList>(null);

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

    const advance = () => {
        if (index < SLIDES.length - 1) {
            const next = index + 1;
            setIndex(next);
            listRef.current?.scrollToOffset({ offset: next * width, animated: true });
            return;
        }
        start();
    };

    const last = index === SLIDES.length - 1;

    return (
        <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: U.ground }}>
            <FlatList
                ref={listRef}
                data={SLIDES}
                keyExtractor={(s) => s.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{ position: "absolute", top: 0, left: 0, right: 0, height: HERO_HEIGHT }}
                onMomentumScrollEnd={(e) =>
                    setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
                }
                renderItem={({ item }) => (
                    <View style={{ width, height: HERO_HEIGHT }}>
                        <Image
                            source={item.image}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                            accessible
                            accessibilityLabel={t(item.headlineKey)}
                        />
                        <LinearGradient
                            colors={[U.overlayScrim, "transparent", U.ground]}
                            locations={[0, 0.3, 0.97]}
                            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                        />
                    </View>
                )}
            />

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
                <View style={{ flexDirection: "row", gap: 7, marginBottom: 20 }}>
                    {SLIDES.map((s, i) => (
                        <Dot key={s.id} active={i === index} />
                    ))}
                </View>

                <Text style={{ ...V.displayXL, color: U.ink }}>{t(SLIDES[index].headlineKey)}</Text>
                <Text style={{ ...V.body, color: U.inkMuted, maxWidth: 290, marginTop: 12 }}>
                    {t(SLIDES[index].bodyKey)}
                </Text>

                <Pressable
                    onPress={advance}
                    disabled={busy}
                    accessibilityRole="button"
                    style={{
                        height: 56,
                        borderRadius: 16,
                        backgroundColor: U.buttonFill,
                        opacity: busy ? 0.6 : 1,
                        marginTop: 28,
                        paddingHorizontal: 22,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    {busy ? (
                        <ActivityIndicator color={U.buttonInk} />
                    ) : (
                        <>
                            <Text style={{ ...V.button, color: U.buttonInk }}>
                                {t(last ? "onboarding.v2_start" : "onboarding.v2_next")}
                            </Text>
                            <Text style={{ color: U.buttonInk, fontSize: 18 }}>→</Text>
                        </>
                    )}
                </Pressable>

                {/* Always visible — a tour nobody can leave is not a tour. */}
                <Pressable onPress={start} disabled={busy} hitSlop={10} accessibilityRole="button">
                    <Text
                        style={{
                            fontFamily: "Inter-SemiBold",
                            fontSize: 13,
                            letterSpacing: track(1.2),
                            color: U.inkMuted,
                            marginTop: 16,
                        }}
                    >
                        {t("onboarding.v2_skip")}
                    </Text>
                </Pressable>

                {hadAccount && (
                    <Pressable onPress={() => router.push("/login")} hitSlop={10} accessibilityRole="button">
                        <Text style={{ ...V.caption, color: U.inkMuted, marginTop: 12 }}>
                            {t("onboarding.sign_in_existing")}
                        </Text>
                    </Pressable>
                )}
            </View>
        </SafeAreaView>
    );
}

/** 28 × 4 when active, 4 × 4 when not — the spec's tracking pager. */
function Dot({ active }: { active: boolean }) {
    const w = useRef(new Animated.Value(active ? 28 : 4)).current;
    useEffect(() => {
        Animated.timing(w, {
            toValue: active ? 28 : 4,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [active, w]);
    return (
        <Animated.View
            style={{
                width: w,
                height: 4,
                borderRadius: 2,
                backgroundColor: active ? U.accentBright : U.lineNeutral,
            }}
        />
    );
}
