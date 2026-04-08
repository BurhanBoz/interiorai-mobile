import axios from "axios";
import * as SecureStore from "expo-secure-store";
import env, { isDev } from "@/config/environment";

const api = axios.create({
    baseURL: env.apiUrl,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

if (isDev) {
    api.interceptors.request.use((config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
    });
}

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync("auth_token");
    const orgId = await SecureStore.getItemAsync("org_id");
    const userId = await SecureStore.getItemAsync("user_id");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (orgId) {
        config.headers["X-Org-Id"] = orgId;
    }
    if (userId) {
        config.headers["X-User-Id"] = userId;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await SecureStore.deleteItemAsync("auth_token");
            // Auth store will detect this on next hydrate
        }
        return Promise.reject(error);
    }
);

export default api;
