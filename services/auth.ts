import api from "./api";
import type { AuthResponse, MessageResponse } from "@/types/api";

export async function login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
    return data;
}

export async function register(
    email: string,
    password: string,
    displayName?: string
): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/register", {
        email,
        password,
        displayName,
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
}): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/apple", params);
    return data;
}

/**
 * Sign in with Google — mobile app obtains an `idToken` via expo-auth-session
 * (Google provider). Backend verifies audience against the configured client IDs.
 */
export async function loginWithGoogle(params: {
    identityToken: string;
    fullName?: string;
}): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/google", params);
    return data;
}
