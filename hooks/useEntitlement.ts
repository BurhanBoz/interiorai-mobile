import { useSubscriptionStore, type PlanPermissionKey } from "@/stores/subscriptionStore";

/**
 * Lookup helpers for the active plan's entitlements.
 *
 * Subscribe to the underlying data arrays/objects directly so that React
 * re-renders whenever `features` or `permissions` change — not just when
 * the store action function reference changes (which never happens).
 *
 * `useEntitlement(featureCode)` answers "can the user run this feature at all?"
 * `usePlanPermission(key)` answers "does the user have this fine-grained control?"
 */
export function useEntitlement(featureCode: string) {
    const features = useSubscriptionStore((s) => s.features);
    const subscription = useSubscriptionStore((s) => s.subscription);
    const feature = features.find((f) => f.featureCode === featureCode);
    return {
        enabled: feature?.enabled ?? false,
        planCode: subscription?.planCode ?? "FREE",
    };
}

export function usePlanPermission(key: PlanPermissionKey) {
    const permissions = useSubscriptionStore((s) => s.permissions);
    const subscription = useSubscriptionStore((s) => s.subscription);
    return {
        allowed: permissions[key] === true,
        planCode: subscription?.planCode ?? "FREE",
    };
}
