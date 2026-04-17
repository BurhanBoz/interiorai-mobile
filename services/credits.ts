import api from "./api";
import type { CreditBalanceResponse, PageResponse, CreditLedgerEntry } from "@/types/api";

export async function getBalance(): Promise<CreditBalanceResponse> {
    const { data } = await api.get<CreditBalanceResponse>("/api/credits/balance");
    return data;
}

export async function getLedger(page = 0, size = 20): Promise<PageResponse<CreditLedgerEntry>> {
    const { data } = await api.get<PageResponse<CreditLedgerEntry>>("/api/credits/ledger", {
        params: { page, size },
    });
    return data;
}
