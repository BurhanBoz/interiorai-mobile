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
