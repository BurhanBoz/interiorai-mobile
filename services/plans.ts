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
