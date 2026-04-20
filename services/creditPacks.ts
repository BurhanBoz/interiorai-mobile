import api from "./api";
import type {
    CreditPackResponse,
    CreditPackPurchaseResponse,
    PurchaseCreditPackRequest,
} from "@/types/api";

export async function listCreditPacks(): Promise<CreditPackResponse[]> {
    const { data } = await api.get<CreditPackResponse[]>("/api/credit-packs");
    return data;
}

export async function purchaseCreditPack(
    request: PurchaseCreditPackRequest,
): Promise<CreditPackPurchaseResponse> {
    const { data } = await api.post<CreditPackPurchaseResponse>(
        "/api/credit-packs/purchase",
        request,
    );
    return data;
}
