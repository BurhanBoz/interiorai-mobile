import api from "./api";
import type { CreditBalanceResponse } from "@/types/api";

export async function getBalance(): Promise<CreditBalanceResponse> {
    const { data } = await api.get<CreditBalanceResponse>("/api/credits/balance");
    return data;
}
