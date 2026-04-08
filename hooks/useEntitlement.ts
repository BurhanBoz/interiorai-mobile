import { useSubscriptionStore } from "@/stores/subscriptionStore";

export function useEntitlement(featureCode: string) {
    const isFeatureEnabled = useSubscriptionStore((s) => s.isFeatureEnabled);
    const subscription = useSubscriptionStore((s) => s.subscription);

    return {
        enabled: isFeatureEnabled(featureCode),
        planCode: subscription?.planCode ?? "FREE",
    };
}
