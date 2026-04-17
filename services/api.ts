import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import env, { isDev } from "@/config/environment";

const api = axios.create({
    baseURL: env.apiUrl,
    timeout: 180000,
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

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(newToken: string) {
    refreshSubscribers.forEach((cb) => cb(newToken));
    refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
    refreshSubscribers.push(cb);
}

async function tryRefreshToken(currentToken: string): Promise<string> {
    const decoded = jwtDecode<{ exp?: number }>(currentToken);
    const expiresAt = (decoded.exp ?? 0) * 1000;
    const fiveMinutes = 5 * 60 * 1000;

    if (Date.now() > expiresAt - fiveMinutes) {
        const response = await axios.post(
            `${env.apiUrl}/api/auth/refresh`,
            null,
            { headers: { Authorization: `Bearer ${currentToken}` } },
        );
        const data = response.data;
        await SecureStore.setItemAsync("auth_token", data.token);
        return data.token;
    }
    return currentToken;
}

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync("auth_token");

    if (token) {
        try {
            const freshToken = await tryRefreshToken(token);
            config.headers.Authorization = `Bearer ${freshToken}`;
        } catch {
            // Token refresh failed — attach existing token, let response interceptor handle 401
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            const token = await SecureStore.getItemAsync("auth_token");
            if (!token) {
                await forceLogout();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve) => {
                    addRefreshSubscriber((newToken: string) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await axios.post(
                    `${env.apiUrl}/api/auth/refresh`,
                    null,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                const newToken = response.data.token;
                await SecureStore.setItemAsync("auth_token", newToken);
                isRefreshing = false;
                onTokenRefreshed(newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch {
                isRefreshing = false;
                refreshSubscribers = [];
                await forceLogout();
                return Promise.reject(error);
            }
        }

        if (error.response?.status === 429) {
            const retryAfter = error.response.headers["retry-after"] ?? 5;
            error.retryAfterSeconds = Number(retryAfter);
        }

        return Promise.reject(error);
    }
);

async function forceLogout() {
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("org_id");
    await SecureStore.deleteItemAsync("user_id");
}

export default api;
