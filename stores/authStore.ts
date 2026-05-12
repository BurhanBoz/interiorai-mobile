import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
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
        const data = await authService.register(email, password, displayName);
        await persistAuth(data);
        set({
            token: data.token,
            user: data.user,
            orgId: data.organizationId,
            isAuthenticated: true,
        });
    },

    loginWithApple: async (params) => {
        const data = await authService.loginWithApple(params);
        await persistAuth(data);
        set({
            token: data.token,
            user: data.user,
            orgId: data.organizationId,
            isAuthenticated: true,
        });
    },

    loginWithGoogle: async (params) => {
        const data = await authService.loginWithGoogle(params);
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
