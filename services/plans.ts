import api from "./api";
import type { PlanResponse, SubscriptionResponse } from "@/types/api";

export async function listPlans(): Promise<PlanResponse[]> {
    const { data } = await api.get<PlanResponse[]>("/api/plans");
    return data;
}

export async function getActiveSubscription(): Promise<SubscriptionResponse> {
    const { data } = await api.get<SubscriptionResponse>("/api/subscriptions/active");
    return data;
}

/**
 * Dev-only: activate a paid plan with no real payment. Backend rejects this
 * when `app.allow-dummy-purchases=false` (production). Mobile should only
 * call this while in RevenueCat dummy mode.
 */
export async function activateDummySubscription(planCode: string): Promise<SubscriptionResponse> {
    const { data } = await api.post<SubscriptionResponse>(
        "/api/subscriptions/activate-dummy",
        { planCode },
    );
    return data;
}
