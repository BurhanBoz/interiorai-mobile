import api from "./api";
import type { PromoRedemptionResponse } from "@/types/api";

export async function redeemPromo(code: string): Promise<PromoRedemptionResponse> {
    const { data } = await api.post<PromoRedemptionResponse>("/api/promo/redeem", { code });
    return data;
}
