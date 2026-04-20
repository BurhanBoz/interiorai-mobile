import { useSubscriptionStore, type PlanPermissionKey } from "@/stores/subscriptionStore";

/**
 * Lookup helpers for the active plan's entitlements.
 *
 * `useEntitlement(featureCode)` answers "can the user run this feature at all?"
 * `usePlanPermission(key)` answers "does the user have this fine-grained control?"
 *   (e.g. strength slider, seed field, commercial spaces)
 */
export function useEntitlement(featureCode: string) {
    const isFeatureEnabled = useSubscriptionStore((s) => s.isFeatureEnabled);
    const subscription = useSubscriptionStore((s) => s.subscription);

    return {
        enabled: isFeatureEnabled(featureCode),
        planCode: subscription?.planCode ?? "FREE",
    };
}

export function usePlanPermission(key: PlanPermissionKey) {
    const hasPermission = useSubscriptionStore((s) => s.hasPermission);
    const subscription = useSubscriptionStore((s) => s.subscription);
    return {
        allowed: hasPermission(key),
        planCode: subscription?.planCode ?? "FREE",
    };
}
