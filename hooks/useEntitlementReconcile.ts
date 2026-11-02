import { useEffect } from "react";
import { AppState } from "react-native";

import { reconcilePaidEntitlement } from "@/services/iap";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCreditStore } from "@/stores/creditStore";

/**
 * Launch + foreground: make sure a payment Apple took is a plan on our server (3.0.0, 21 Oct 2026).
 * See {@link reconcilePaidEntitlement}. When it changed something, the plan and the wallet are
 * re-read so the screen shows Pro and the credits without a restart.
 */
export function useEntitlementReconcile(enabled: boolean): void {
    useEffect(() => {
        if (!enabled) return;
        const run = async () => {
            const outcome = await reconcilePaidEntitlement();
            if (outcome === "CONFIRMED" || outcome === "SYNCED") {
                // RevenueCat's webhook lands a moment after a sync; read twice.
                for (const wait of [0, 4000]) {
                    if (wait) await new Promise((r) => setTimeout(r, wait));
                    await useSubscriptionStore.getState().fetchSubscription().catch(() => {});
                    await useCreditStore.getState().fetchBalance().catch(() => {});
                }
            }
        };
        run();
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") run();
        });
        return () => sub.remove();
    }, [enabled]);
}
