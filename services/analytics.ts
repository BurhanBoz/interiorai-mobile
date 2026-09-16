import { PostHog } from "posthog-react-native";
import type { PostHogEventProperties } from "@posthog/core";

/**
 * Product analytics — what happens INSIDE a screen.
 *
 * <p><b>What this is not for.</b> The server already knows who registered,
 * which campaign they came from, whether they generated, whether they saved
 * the result, whether they returned and whether they paid — see
 * {@code paywall_events}, {@code user_sessions}, {@code user_acquisition},
 * {@code jobs}. That is server truth and it stays the authority. Nothing here
 * duplicates it; every event below answers something the backend cannot see.
 *
 * <p><b>The rule for adding an event.</b> Name the decision the number will
 * change. If there is no such decision, there is no event. Four hundred button
 * taps produce a dataset nobody reads and, on some backends, a hard cap on
 * distinct event names. Prefer one event with properties over ten events:
 * {@code style_selected {style: "japandi"}}, never eighteen event names.
 *
 * <p><b>Identity.</b> distinctId is the backend user UUID — the same id
 * RevenueCat uses as its app_user_id and the same one our own tables key on.
 * One id across three systems means a session here can be lined up against a
 * wallet there without a join table.
 *
 * <p><b>Privacy.</b> Session replay runs with masking ON: images become
 * placeholders, text inputs are masked, and the system photo picker is
 * excluded. This app's screens are full of photographs of people's homes and
 * those are not ours to ship to a third party. What survives the mask —
 * layout, navigation, where a finger went, how long a screen held — is
 * exactly what we are trying to learn. No email, no name, no photo ever goes
 * into an event property.
 *
 * <p><b>Why there is no config plugin in app.json.</b> PostHog ships one
 * ("posthog-react-native/expo") and it was added, then removed on
 * 2026-09-16: everything it does on iOS is source-map and dSYM upload for
 * error-tracking symbolication, which we do not use. What it actually did
 * was add a build phase that shells out to {@code posthog-cli}, and an
 * archive died on "error: posthog-cli not found".
 *
 * <p>Session replay does NOT come from that plugin — it comes from the
 * {@code @posthog/react-native-plugin} pod, which Expo autolinking picks up
 * from package.json on its own. Podfile.lock carries it with the plugin
 * gone. Re-add the config plugin only alongside error tracking, and install
 * posthog-cli in the same change.
 *
 * <p><b>Failure contract.</b> Same as the rest of our instrumentation: it
 * cannot throw and it cannot block. Every call swallows. Measurement that can
 * break the thing it measures is worse than no measurement.
 */

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
/**
 * EU cloud by default. Our users are in France, the Netherlands and Austria;
 * their events should not cross the Atlantic to be counted.
 */
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

/** No key, no analytics — and no crash. Lets a build ship before the project exists. */
export const isAnalyticsEnabled = KEY.length > 0;

let client: PostHog | null = null;

/**
 * Start PostHog and bind it to the signed-in account.
 *
 * <p>Called once at boot, after the user id is known (app/_layout.tsx), the
 * same place and for the same reason as RevenueCat's own init.
 */
export async function initAnalytics(userId: string | null): Promise<void> {
    if (!isAnalyticsEnabled) return;
    // Already started: the only thing left to do is bind the identity, which
    // usually arrives AFTER the first call. The early return used to skip
    // that too, so every event shipped under PostHog's own anonymous id and
    // the "one identity across three systems" promise was never kept —
    // visible in the console as a PERSON that is not our user UUID.
    if (client) {
        identifyUser(userId);
        return;
    }
    try {
        client = new PostHog(KEY, {
            host: HOST,
            // Foreground/background/launch, for free and without a call site.
            captureAppLifecycleEvents: true,
            enableSessionReplay: true,
            sessionReplayConfig: {
                // Written out rather than inherited. These are the defaults
                // today, but a default is a decision someone else can change
                // in a minor release, and the cost of that change here would
                // be other people's living rooms on a third-party server.
                maskAllImages: true,
                maskAllTextInputs: true,
                maskAllSandboxedViews: true,
                captureLog: false,
            },
        });
        if (userId) {
            client.identify(userId);
        }
    } catch {
        // A failed analytics init must not cost the user their first screen.
        client = null;
    }
}

/** Bind events to an account after a late sign-in or an account switch. */
export function identifyUser(userId: string | null): void {
    try {
        if (userId) client?.identify(userId);
    } catch {
        /* never throws */
    }
}

/** Unbind on sign-out so the next person on this device is not the last one. */
export function resetAnalytics(): void {
    try {
        client?.reset();
    } catch {
        /* never throws */
    }
}

/**
 * One event. Properties carry the detail; do not mint a new name per value.
 *
 * <p>The property type is PostHog's own rather than a loose record, so the
 * compiler refuses anything that is not JSON — an entity, a Date, a whole
 * user object. That is a privacy guard as much as a serialisation one.
 */
export function track(event: AnalyticsEvent, properties?: PostHogEventProperties): void {
    try {
        client?.capture(event, properties);
    } catch {
        /* never throws */
    }
}

/** A screen view, for the in-app funnel the server cannot reconstruct. */
export function trackScreen(name: string, properties?: PostHogEventProperties): void {
    try {
        client?.screen(name, properties);
    } catch {
        /* never throws */
    }
}

/**
 * The closed set of events, and the question each one exists to answer.
 *
 * <p>Adding to this list is a decision, not a convenience — which is the
 * whole point of it being a type rather than a free string.
 */
export type AnalyticsEvent =
    /**
     * How long the paywall actually held someone, and what they touched.
     * The server records that it was SHOWN and that it was DISMISSED; it
     * cannot record that 43 of 46 people were gone in under five seconds
     * without ever scrolling to the price.
     */
    | "paywall_viewed"
    /**
     * Which step of the studio flow someone was on when they stopped. The
     * server sees a job or no job; the abandoned middle is invisible to it.
     */
    | "studio_step_viewed"
    /**
     * Which of the eighteen styles and twenty room types people actually
     * choose — and, joined against the wallet, which ones lead to paying.
     */
    | "style_selected"
    /**
     * Whether the furniture catalogue is used at all, and whether people
     * reach for our pieces or their own photographs. It shipped in 1.5.0
     * with no way to tell.
     */
    | "furniture_used"
    /**
     * A result leaving the app, and by which door.
     *
     * <p>App Store Connect says 44 downloads came from "App Referrer" — a tap
     * inside some other app — and we cannot tell which. The share sheet is one
     * candidate, Pinterest-in-app is another, and they point at completely
     * different next moves.
     *
     * <p>🔴 It is worth knowing the answer is probably NOT the share sheet:
     * {@code useImageActions.shareImage} sends the image FILE and nothing else
     * — no message, no link — so whoever receives it has nothing to tap. Until
     * that changes, sharing cannot produce an install by construction. This
     * event measures how often people try anyway, which is what decides
     * whether adding a link is worth the change.
     */
    | "result_shared";
