import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Durable "the user has already seen this" flags.
 *
 * <p><b>Why not AsyncStorage.</b> On iOS AsyncStorage lives in
 * {@code Library/Application Support/<bundleId>/RCTAsyncLocalStorage_V1} —
 * inside the app container, so it is destroyed the moment the app is
 * deleted. The guest identity does NOT share that fate: {@code device_key}
 * sits in the Keychain (SecureStore), which survives app deletion. The
 * result before this module existed was an incoherent returning user —
 * same account, same credits, same generation history, yet every first-run
 * intro replayed as though they had never opened the app (founder report,
 * 2026-08-07).
 *
 * <p>Putting these flags in the Keychain next to {@code device_key} gives
 * them the SAME lifetime as the identity they describe: reinstall keeps
 * both, a device wipe clears both. They are not secrets — the Keychain is
 * used here purely for its lifetime semantics.
 *
 * <p><b>Migration.</b> Users already carrying an AsyncStorage flag from
 * 1.0.x / 1.1.0 must not be shown the intro a second time, so a miss in
 * SecureStore falls back to AsyncStorage once and promotes the value.
 *
 * <p>Every operation fails open (treated as "not yet seen") rather than
 * throwing — a storage fault must never break a screen.
 */

/** Keychain keys may hold alphanumerics, ".", "-" and "_" — the "." namespaces ours. */
const NS = "oneshot.";

/** True when this flag has already been recorded on this device. */
export async function isFlagSet(key: string): Promise<boolean> {
    try {
        if ((await SecureStore.getItemAsync(NS + key)) != null) return true;
    } catch {
        // Keychain unreadable (locked device, simulator quirk) — fall through
        // to the legacy store rather than declaring the flag unset.
    }
    try {
        if ((await AsyncStorage.getItem(key)) != null) {
            // Legacy value found: promote it so this is the last time we look.
            await SecureStore.setItemAsync(NS + key, "1").catch(() => {});
            return true;
        }
    } catch {
        /* fail open */
    }
    return false;
}

/** Record the flag. Writes both stores so a downgrade to 1.1.0 still sees it. */
export async function setFlag(key: string): Promise<void> {
    await Promise.allSettled([
        SecureStore.setItemAsync(NS + key, "1"),
        AsyncStorage.setItem(key, "1"),
    ]);
}

/** Read an integer counter (0 when absent or unparseable). */
export async function readCounter(key: string): Promise<number> {
    try {
        const raw = (await SecureStore.getItemAsync(NS + key))
            ?? (await AsyncStorage.getItem(key));
        const n = parseInt(raw ?? "0", 10);
        return Number.isFinite(n) ? n : 0;
    } catch {
        return 0;
    }
}

/** Persist an integer counter to both stores. */
export async function writeCounter(key: string, value: number): Promise<void> {
    await Promise.allSettled([
        SecureStore.setItemAsync(NS + key, String(value)),
        AsyncStorage.setItem(key, String(value)),
    ]);
}
