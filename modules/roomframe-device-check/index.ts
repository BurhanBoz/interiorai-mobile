import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

/**
 * Apple DeviceCheck bridge (K2 welcome-bonus guard, 1.2).
 *
 * See `ios/RoomframeDeviceCheckModule.swift` for what the token is and why
 * it is the only guard a crafted request cannot walk around.
 *
 * `requireNativeModule` throws when the native side is not linked — which is
 * the normal state on Android, in Expo Go, and in any JS-only bundle that
 * predates the next native rebuild. Resolving that to `null` here keeps the
 * failure at this boundary instead of at every call site.
 */
let native: { isSupported(): boolean; generateToken(): Promise<string | null> } | null = null;
try {
    native = requireNativeModule("RoomframeDeviceCheck");
} catch {
    native = null;
}

/** True only on real iOS hardware with the native module linked. */
export function isDeviceCheckSupported(): boolean {
    if (Platform.OS !== "ios" || !native) return false;
    try {
        return native.isSupported();
    } catch {
        return false;
    }
}

/**
 * Base64 DCDevice token for the backend, or null when unavailable —
 * Simulator, unsupported hardware, offline, or Apple throttling.
 *
 * NEVER throws: the backend treats a missing token as "no K2 signal" and
 * falls back to the Keychain device_key, so a signup must not be held up by
 * anything that happens in here.
 */
export async function getDeviceCheckToken(): Promise<string | null> {
    if (!isDeviceCheckSupported()) return null;
    try {
        return (await native!.generateToken()) ?? null;
    } catch {
        return null;
    }
}
