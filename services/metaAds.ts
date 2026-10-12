import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { isFlagSet, setFlag } from "@/utils/oneShotFlag";

/**
 * Meta (Facebook / Instagram) app-ads measurement — 2.4.1.
 *
 * <p><b>Off until configured.</b> Everything here is a no-op unless BOTH
 * `EXPO_PUBLIC_FB_APP_ID` and `EXPO_PUBLIC_FB_CLIENT_TOKEN` are set in the
 * build's env (.env.production). Info.plist carries
 * `FacebookAutoInitEnabled = false` and no FacebookAppID, so the native SDK
 * never starts by itself: a build without the two values behaves exactly like
 * a build without the SDK. Both values ship inside the app bundle anyway
 * (Meta designs the client token to be public), which is why they are
 * EXPO_PUBLIC_.
 *
 * <p><b>What it sends.</b>
 * <ul>
 *   <li>App activation / install — the SDK's automatic app events. They stay ON:
 *       react-native-fbsdk-next has no manual activateApp, and without them Meta
 *       cannot count installs for an app campaign.</li>
 *   <li>The Meta anonymous id, handed to RevenueCat (`$fbAnonId`) so RevenueCat's
 *       Meta Ads integration can send StartTrial / Subscribe server-side.</li>
 *   <li>"Completed tutorial" (`fb_mobile_tutorial_completion`, a standard event)
 *       once per identity, when the first design finishes — the in-app event a
 *       campaign can optimise for when installs are not enough.</li>
 * </ul>
 *
 * <p><b>Not sent.</b> The IDFA: there is no App Tracking Transparency prompt
 * (owner's decision pending), so advertiser-id collection is off and Meta
 * measures through SKAdNetwork / AEM.
 */
const APP_ID = process.env.EXPO_PUBLIC_FB_APP_ID ?? "";
const CLIENT_TOKEN = process.env.EXPO_PUBLIC_FB_CLIENT_TOKEN ?? "";

export const metaConfigured = Platform.OS === "ios" && APP_ID.length > 0 && CLIENT_TOKEN.length > 0;

let started: Promise<boolean> | null = null;

/** Starts the SDK once per process. Resolves false when Meta is not configured or the start failed. */
export function startMeta(): Promise<boolean> {
    if (!metaConfigured) return Promise.resolve(false);
    if (started) return started;
    started = (async () => {
        try {
            // Required lazily: a build without the env values never touches the module.
            const { Settings } = require("react-native-fbsdk-next");
            Settings.setAppID(APP_ID);
            Settings.setClientToken(CLIENT_TOKEN);
            Settings.setAdvertiserIDCollectionEnabled(false);
            Settings.setAutoLogAppEventsEnabled(true);
            Settings.initializeSDK();
            return true;
        } catch (e) {
            console.warn("[meta] SDK start failed:", e);
            return false;
        }
    })();
    return started;
}

/**
 * Gives RevenueCat the Meta anonymous id. Call after Purchases.configure / logIn;
 * RevenueCat requires `$fbAnonId` (or an ATT-authorised IDFA) for its Meta Ads integration.
 */
export async function linkMetaToRevenueCat(): Promise<void> {
    if (!(await startMeta())) return;
    try {
        const { AppEventsLogger } = require("react-native-fbsdk-next");
        const anon: string | null = await AppEventsLogger.getAnonymousID();
        if (anon) await Purchases.setFBAnonymousID(anon);
        await Purchases.collectDeviceIdentifiers();
    } catch (e) {
        console.warn("[meta] RevenueCat link failed:", e);
    }
}

/** First finished design for this identity → Meta's standard "completed tutorial", once. */
export async function logFirstDesignToMeta(userId: string | null | undefined): Promise<void> {
    if (!userId || !(await startMeta())) return;
    const key = `meta_first_design:${userId}`;
    try {
        if (await isFlagSet(key)) return;
        await setFlag(key);
        const { AppEventsLogger } = require("react-native-fbsdk-next");
        AppEventsLogger.logEvent(AppEventsLogger.AppEvents.CompletedTutorial);
    } catch (e) {
        console.warn("[meta] first-design event failed:", e);
    }
}
