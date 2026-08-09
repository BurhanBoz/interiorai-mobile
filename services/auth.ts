import axios from "axios";
import env from "@/config/environment";
import api from "./api";
import type { AuthResponse, MessageResponse } from "@/types/api";

/**
 * Device identifiers attached to every call that can CREATE an account and
 * therefore mint a welcome bonus (guest, register, Apple, Google).
 *
 * - `deviceKey` — Keychain UUID. Survives app deletion, so the ordinary
 *   "reinstall for another free trial" loop is closed. Client-owned, so a
 *   crafted request can always present a fresh one.
 * - `deviceCheckToken` — Apple-minted proof. Cannot be forged, and the bits
 *   Apple stores against it outlive a factory reset. Absent on the Simulator.
 *
 * Both are optional on the wire: the backend degrades to whichever it gets.
 */
export type DeviceIdentity = {
    deviceKey?: string | null;
    deviceCheckToken?: string | null;
};

/** Only the fields that actually have a value — never send explicit nulls. */
function deviceBody(device?: DeviceIdentity): Record<string, string> {
    if (!device) return {};
    return {
        ...(device.deviceKey ? { deviceKey: device.deviceKey } : {}),
        ...(device.deviceCheckToken ? { deviceCheckToken: device.deviceCheckToken } : {}),
    };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
    return data;
}

export async function register(
    email: string,
    password: string,
    displayName?: string,
    device?: DeviceIdentity,
): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/register", {
        email,
        password,
        displayName,
        ...deviceBody(device),
    });
    return data;
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>("/api/auth/forgot-password", { email });
    return data;
}

export async function resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>("/api/auth/reset-password", { token, newPassword });
    return data;
}

export async function refreshToken(): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/refresh");
    return data;
}

/**
 * Sliding-session refresh with an EXPLICIT (possibly expired) token — used by
 * `authStore.hydrate` on cold start.
 *
 * <p>Raw axios on purpose, not the shared `api` instance: the shared
 * instance's request interceptor reads the stored token and runs its own
 * refresh dance, which at hydrate time would either recurse or double-refresh.
 * The backend accepts an expired bearer here for up to
 * `jwt-refresh-window-days` (30) after expiry — the 2026-07-18 sliding-session
 * contract built precisely for the "reopened the app days later" case.
 */
export async function refreshWithToken(expiredToken: string): Promise<AuthResponse> {
    const { data } = await axios.post<AuthResponse>(
        `${env.apiUrl}/api/auth/refresh`,
        null,
        { headers: { Authorization: `Bearer ${expiredToken}` }, timeout: 12000 },
    );
    return data;
}

/**
 * Restore a soft-deleted account within the 14-day grace window (V12 / F1).
 * Backend looks up {@code pending_deletion} by sha256(email), verifies the
 * snapshotted password hash (with V11 lockout protection), then re-activates
 * the user record and auto-issues a fresh login token.
 *
 * <p>The wallet stays zeroed — restored users start over on the credit
 * front. Pack credits purchased before deletion are NOT refunded
 * automatically; users with pack-credit refund claims should email support.
 */
export async function restoreAccount(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/restore-account", { email, password });
    return data;
}

/**
 * Sign in with Apple — the mobile app passes the signed `identityToken` it
 * received from expo-apple-authentication. The backend verifies it against
 * Apple's JWKS and either logs the user in or registers a new account.
 */
export async function loginWithApple(params: {
    identityToken: string;
    fullName?: string;
    nonce?: string;
}, device?: DeviceIdentity): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/apple", {
        ...params,
        ...deviceBody(device),
    });
    return data;
}

/**
 * Sign in with Google — mobile app obtains an `idToken` via expo-auth-session
 * (Google provider). Backend verifies audience against the configured client IDs.
 */
export async function loginWithGoogle(params: {
    identityToken: string;
    fullName?: string;
}, device?: DeviceIdentity): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/google", {
        ...params,
        ...deviceBody(device),
    });
    return data;
}

/**
 * V53 guest-first — silent anonymous account for this device.
 *
 * `deviceCheckToken` (1.2) is Apple's unforgeable device proof; the backend
 * uses it to refuse a second welcome bonus to hardware that already had one.
 * Null on the Simulator and whenever Apple declines to mint one — the
 * backend then falls back to `deviceKey` alone.
 */
export async function guestLogin(device: DeviceIdentity): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/guest", deviceBody(device));
    return data;
}

/** V53 — attach email+password to the CURRENT guest (same user id; wallet/jobs kept). */
export async function upgradeAccount(
    email: string, password: string, displayName?: string,
): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/users/me/upgrade", { email, password, displayName });
    return data;
}
