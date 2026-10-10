import { router } from "expo-router";
import { InteractionManager } from "react-native";

type Tab = "studio" | "gallery" | "profile";

/**
 * Back to the app's ONE tab navigator, on the given tab.
 *
 * <p>🔴 Why not `router.replace("/(tabs)/studio")` or `router.push("/studio/…")`
 * (TestFlight 2.4.0, 11 Oct). The result, progress and paywall screens live on
 * the ROOT stack, above the tabs. From there, a push or replace into a tab
 * route stacks a SECOND tab navigator on top of the first. The two keep their
 * own Studio stacks, so a catalogue opened in one came back when the user
 * returned to Studio through the other, its × "did not close" (it popped into
 * the copy underneath), and a Generate pushed from one copy could land behind
 * the other.
 *
 * <p>`dismissTo` is a POP_TO: when the tabs are already in the root stack it
 * pops back to them and switches to `tab`; only when they are not (a cold
 * deep link) does it add them. Never a second copy.
 */
export function backToTab(tab: Tab = "studio") {
    router.dismissTo(`/(tabs)/${tab}` as never);
}

/**
 * Back to the tabs, then one screen of the Studio stack on top
 * (e.g. the composer). The push waits for the pop's transition: two native
 * transitions started in the same frame can drop the second on iOS.
 */
export function backToStudioThen(href: string) {
    backToTab("studio");
    InteractionManager.runAfterInteractions(() => {
        router.push(href as never);
    });
}
