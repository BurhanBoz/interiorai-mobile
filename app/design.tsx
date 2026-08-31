import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useCatalogStore } from "@/stores/catalogStore";
import { useStudioStore } from "@/stores/studioStore";
import type { DesignMode } from "@/types/api";
import { isFeatureLocked } from "@/components/studio/featureCatalog";
import { useEffectivePlanCode } from "@/hooks/useEntitlement";

/**
 * Deep-link entry point (V63).
 *
 * Reached from:
 *   • Universal Link — https://roomframeai.com/design?room=kitchen&style=coastal
 *   • Custom scheme  — roomframeai://design?room=kitchen&style=coastal
 *
 * This route exists so social posts, Custom Product Pages and Search Ads
 * creatives can land someone on a *pre-filled* studio instead of a generic home
 * screen. Every extra decision between the ad and the first render costs
 * conversion, and the ad already told us what they wanted.
 *
 * <p><b>Params are hints, never commands.</b> Anything unrecognised is dropped
 * and the user still lands in the studio. A deep link is attacker-controllable
 * input — a bad `style` must produce an ordinary studio screen, not an error, an
 * empty state, or a mismatched selection.
 */

// Mirrors the DesignMode union in types/api.ts. Spelled out rather than
// derived so a rename there fails the build here instead of silently
// dropping a mode from every marketing link.
const VALID_MODES: DesignMode[] = [
    "REDESIGN", "EMPTY_ROOM", "STYLE_TRANSFER", "INPAINT", "OUTDOOR",
];

export default function DesignDeepLink() {
    const params = useLocalSearchParams<{ room?: string; style?: string; mode?: string }>();
    const ensureLoaded = useCatalogStore((s) => s.ensureLoaded);
    // Guard against the effect running twice (fast refresh, remount) and
    // pushing two navigations onto the stack.
    const handled = useRef(false);
    const planCode = useEffectivePlanCode();

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        // Mode needs no catalogue, so apply it synchronously — before the auth
        // guard in _layout can bounce an unauthenticated arrival to onboarding.
        // A link can name any mode; the user's plan decides whether it opens.
        // Without this check a shared roomframeai.com/design?mode=OUTDOOR link
        // would walk a FREE user past the locked studio card, through photo
        // upload and style picking, to a refusal at job creation — the worst
        // possible place to learn a feature is not theirs. Locked modes are
        // dropped and the studio opens on its default flow, where the card
        // states the requirement up front.
        const mode = params.mode?.toUpperCase();
        if (mode && (VALID_MODES as string[]).includes(mode)
            && !isFeatureLocked(mode as DesignMode, planCode)) {
            useStudioStore.getState().setMode(mode as DesignMode);
        }

        (async () => {
            try {
                // The catalogue is what makes a slug meaningful; without it we
                // cannot tell "coastal" from garbage.
                await ensureLoaded();
            } catch {
                // Offline or the catalogue call failed — still land the user in
                // the studio rather than stranding them on a spinner.
            }

            const { roomTypes, designStyles } = useCatalogStore.getState();
            const studio = useStudioStore.getState();

            const room = matchByCode(roomTypes, params.room);
            if (room) studio.setRoomType(room);

            const style = matchByCode(designStyles, params.style);
            if (style) studio.setDesignStyle(style);

            // A brand-new install arrives here UNAUTHENTICATED: the ad was
            // tapped, the app installed, the link opened, and no account exists
            // yet. The auth guard sends them to onboarding — and that is fine,
            // because the selections above live in a module-level store that
            // survives the detour. Guest sign-in lands them in the studio with
            // the ad's room and style already chosen.
            //
            // Navigating ourselves here would fight the guard and risk
            // stranding them on a spinner, so we only steer when there is
            // nothing to steer around.
            if (useAuthStore.getState().isAuthenticated) {
                // `replace`, not `push`: this screen is a router, not a
                // destination. On the stack it becomes a blank spinner behind
                // the back gesture.
                router.replace("/(tabs)/studio");
            }
        })();
    }, [ensureLoaded, params.room, params.style, params.mode]);

    return (
        <View style={{ flex: 1, backgroundColor: "#131313", alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#C4A882" />
        </View>
    );
}

/**
 * Case- and separator-insensitive match against a catalogue code.
 *
 * A link is written by a human in a caption ("coastal", "Coastal",
 * "living-room"), while codes are backend constants ("LIVING_ROOM"). Being
 * strict here would turn a typo in a marketing post into a silently ignored
 * campaign parameter.
 */
function matchByCode<T extends { code: string }>(items: T[], raw?: string): T | null {
    if (!raw) return null;
    const wanted = raw.trim().toUpperCase().replace(/[-\s]+/g, "_");
    return items.find((i) => i.code.toUpperCase() === wanted) ?? null;
}
