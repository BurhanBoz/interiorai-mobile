import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

/**
 * Read-only StoreKit 2 bridge (3.0.0). See ios/RoomframeStoreKitModule.swift.
 * Resolves to [] wherever the native side is missing (Android, an old binary) — never throws.
 */
export interface StoreTransaction {
    transactionId: string;
    originalTransactionId: string;
    productId: string;
    purchaseDateMs: number;
    verified: boolean;
    appAccountToken?: string;
    revokedAtMs?: number;
}

type Native = {
    unfinishedTransactions(): Promise<StoreTransaction[]>;
    currentEntitlements(): Promise<StoreTransaction[]>;
};

let native: Native | null = null;
try {
    native = Platform.OS === "ios" ? requireNativeModule("RoomframeStoreKit") : null;
} catch {
    native = null;
}

export async function unfinishedTransactions(): Promise<StoreTransaction[]> {
    if (!native) return [];
    try {
        return (await native.unfinishedTransactions()) ?? [];
    } catch {
        return [];
    }
}

export async function currentEntitlements(): Promise<StoreTransaction[]> {
    if (!native) return [];
    try {
        return (await native.currentEntitlements()) ?? [];
    } catch {
        return [];
    }
}
