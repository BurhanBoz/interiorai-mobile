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

/**
 * Verify an Apple IAP subscription receipt with the backend and activate
 * the subscription. Called by the mobile app after a successful
 * RevenueCat/StoreKit purchase.
 *
 * <p>Backend endpoint: {@code POST /api/iap/verify-receipt}. Backend:
 * <ol>
 *   <li>Looks up the plan by {@code productId} (V19/V20 migration mappings).</li>
 *   <li>Calls Apple's verifyReceipt API to validate the receipt.</li>
 *   <li>Deactivates the current sub (if any), creates a new one.</li>
 *   <li>Applies the new plan's monthly credit allocation (preserves unused
 *       credits from previous plan per founder spec 2026-05-06).</li>
 * </ol>
 *
 * <p>Apple S2S Notifications (Version 2) also reach the backend independently
 * via the webhook endpoint. The {@code idempotencyKey} on SubscriptionEntity
 * ensures the same transaction doesn't activate twice if both paths fire.
 */
export interface VerifyReceiptRequest {
    /** Apple product ID (e.g. com.roomframeai.subscription.basic). */
    productId: string;
    /** Apple original transaction ID (from StoreKit 2). */
    transactionId: string;
    /** Base64 receipt data — may be empty when RC handles verification. */
    receiptData: string;
}

export async function verifySubscriptionReceipt(
    request: VerifyReceiptRequest,
): Promise<SubscriptionResponse> {
    const { data } = await api.post<SubscriptionResponse>(
        "/api/iap/verify-receipt",
        request,
    );
    return data;
}
