import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { UserResponse } from "@/types/api";
import * as authService from "@/services/auth";

interface AuthState {
    token: string | null;
    user: UserResponse | null;
    orgId: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName?: string) => Promise<void>;
    logout: () => Promise<void>;
    hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    orgId: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (email, password) => {
        const data = await authService.login(email, password);
        await SecureStore.setItemAsync("auth_token", data.token);
        await SecureStore.setItemAsync("org_id", data.organizationId);
        await SecureStore.setItemAsync("user_id", data.user.id);
        set({
            token: data.token,
            user: data.user,
            orgId: data.organizationId,
            isAuthenticated: true,
        });
    },

    register: async (email, password, displayName) => {
        const data = await authService.register(email, password, displayName);
        await SecureStore.setItemAsync("auth_token", data.token);
        await SecureStore.setItemAsync("org_id", data.organizationId);
        await SecureStore.setItemAsync("user_id", data.user.id);
        set({
            token: data.token,
            user: data.user,
            orgId: data.organizationId,
            isAuthenticated: true,
        });
    },

    logout: async () => {
        await SecureStore.deleteItemAsync("auth_token");
        await SecureStore.deleteItemAsync("org_id");
        await SecureStore.deleteItemAsync("user_id");
        set({
            token: null,
            user: null,
            orgId: null,
            isAuthenticated: false,
        });
    },

    hydrate: async () => {
        try {
            const token = await SecureStore.getItemAsync("auth_token");
            const orgId = await SecureStore.getItemAsync("org_id");
            const userId = await SecureStore.getItemAsync("user_id");
            if (token && orgId && userId) {
                set({
                    token,
                    orgId,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch {
            set({ isLoading: false });
        }
    },
}));
