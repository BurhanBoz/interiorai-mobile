import api from "./api";
import type { AuthResponse } from "@/types/api";

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
