import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { getDeviceCheckToken } from "@/modules/roomframe-device-check";
import * as Crypto from "expo-crypto";
import { jwtDecode } from "jwt-decode";
import type { UserResponse, AuthResponse } from "@/types/api";
import * as authService from "@/services/auth";
import * as userService from "@/services/user";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useStudioStore } from "@/stores/studioStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { logoutIAP } from "@/services/iap";

interface AuthState {
    token: string | null;
    user: UserResponse | null;
    orgId: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    /** V53 guest-first — silent device account; used by onboarding Get Started. */
    guestLogin: () => Promise<void>;
    /** V53 — attach email+password to the current guest (same user id). */
    upgradeGuest: (email: string, password: string, displayName?: string) => Promise<void>;
    register: (email: string, password: string, displayName?: string) => Promise<void>;
    loginWithApple: (params: { identityToken: string; fullName?: string; nonce?: string }) => Promise<void>;
    loginWithGoogle: (params: { identityToken: string; fullName?: string }) => Promise<void>;
    logout: () => Promise<void>;
    hydrate: () => Promise<void>;
    setUser: (user: UserResponse) => void;
}

function isExpired(token: string): boolean {
    try {
        const { exp } = jwtDecode<{ exp?: number }>(token);
        if (!exp) return true;
        return Date.now() >= exp * 1000;
    } catch {
        return true;
    }
}

async function persistAuth(data: AuthResponse) {
    await SecureStore.setItemAsync("auth_token", data.token);
    await SecureStore.setItemAsync("org_id", data.organizationId);
    await SecureStore.setItemAsync("user_id", data.user.id);
}

/**
 * Identifiers for the physical device, resolved fresh on every
 * account-creating call (guest, register, Apple, Google).
 *
 * The Keychain key is created on first use and never rewritten, so it is the
 * same value across reinstalls. The DeviceCheck token is minted per call and
 * is null on the Simulator — see modules/roomframe-device-check.
 *
 * Sending BOTH on the email/social paths (not just on guest) is what closes
 * "delete the app, register a new email, collect another welcome bonus".
 */
async function deviceIdentity(): Promise<authService.DeviceIdentity> {
    let deviceKey = await SecureStore.getItemAsync("device_key");
    if (!deviceKey) {
        deviceKey = Crypto.randomUUID();
        await SecureStore.setItemAsync("device_key", deviceKey);
    }
    return { deviceKey, deviceCheckToken: await getDeviceCheckToken() };
}

async function clearAuth() {
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("org_id");
    await SecureStore.deleteItemAsync("user_id");
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    orgId: null,
    isAuthenticated: false,
    isLoading: true,

    guestLogin: async () => {
        // Stable per-device key: Keychain-persisted, survives reinstall —
        // same device always resolves to the same guest account (and the
        // welcome bonus is granted once per device, backend welcome_grants).
        const data = await authService.guestLogin(await deviceIdentity());
        await persistAuth(data);
        set({ token: data.token, user: data.user, orgId: data.organizationId, isAuthenticated: true, isLoading: false });
    },

    upgradeGuest: async (email, password, displayName) => {
        const data = await authService.upgradeAccount(email, password, displayName);
        await persistAuth(data);
        set({ token: data.token, user: data.user, orgId: data.organizationId, isAuthenticated: true });
    },

    login: async (email, password) => {
        const data = await authService.login(email, password);
        await persistAuth(data);
        set({
            token: data.token,
            user: data.user,
            orgId: data.organizationId,
            isAuthenticated: true,
        });
    },

    register: async (email, password, displayName) => {
        const data = await authService.register(email, password, displayName, await deviceIdentity());
        await persistAuth(data);
        set({
            token: data.token,
            user: data.user,
            orgId: data.organizationId,
            isAuthenticated: true,
        });
    },

    loginWithApple: async (params) => {
        const data = await authService.loginWithApple(params, await deviceIdentity());
        await persistAuth(data);
        set({
            token: data.token,
            user: data.user,
            orgId: data.organizationId,
            isAuthenticated: true,
        });
    },

    loginWithGoogle: async (params) => {
        const data = await authService.loginWithGoogle(params, await deviceIdentity());
        await persistAuth(data);
        set({
            token: data.token,
            user: data.user,
            orgId: data.organizationId,
            isAuthenticated: true,
        });
    },

    logout: async () => {
        await clearAuth();
        // Wipe other in-memory stores so the next user signing in on the
        // same device doesn't briefly see the previous user's credit balance,
        // active plan, draft studio job, or favorites list. Each store's reset
        // is synchronous + side-effect-free; we run them all even if one
        // throws (defensive — favoritesStore is the most likely to evolve).
        try { useCreditStore.getState().reset(); } catch (e) { console.warn("creditStore reset failed", e); }
        try { useSubscriptionStore.getState().reset(); } catch (e) { console.warn("subscriptionStore reset failed", e); }
        try { useStudioStore.getState().reset(); } catch (e) { console.warn("studioStore reset failed", e); }
        try { useFavoritesStore.getState().clear(); } catch (e) { console.warn("favoritesStore clear failed", e); }
        // RevenueCat logout — switches RC back to anonymous customer so
        // the next user signing in on this device doesn't inherit the
        // previous user's entitlements. No-op in dummy mode.
        try { await logoutIAP(); } catch (e) { console.warn("logoutIAP failed", e); }
        set({
            token: null,
            user: null,
            orgId: null,
            isAuthenticated: false,
            isLoading: false,
        });
    },

    hydrate: async () => {
        try {
            const token = await SecureStore.getItemAsync("auth_token");
            const orgId = await SecureStore.getItemAsync("org_id");
            const userId = await SecureStore.getItemAsync("user_id");

            if (!token || !orgId || !userId) {
                set({ isLoading: false });
                return;
            }

            if (isExpired(token)) {
                // Token is stale — clear and land on onboarding
                await clearAuth();
                set({
                    token: null,
                    user: null,
                    orgId: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
                return;
            }

            set({
                token,
                orgId,
                isAuthenticated: true,
                isLoading: false,
            });

            // Fetch full user profile in background — if it 401s the
            // response interceptor will call logout() and redirect.
            try {
                const user = await userService.getMe();
                set({ user });
            } catch {
                // Interceptor handles auth failure. Keep optimistic state here.
            }
        } catch {
            set({ isLoading: false });
        }
    },

    setUser: (user) => set({ user }),
}));
