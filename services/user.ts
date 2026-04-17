import api from "./api";
import type {
    UserResponse,
    UpdateProfileRequest,
    NotificationPreferences,
    UpdateNotificationPreferencesRequest,
} from "@/types/api";

export async function getMe(): Promise<UserResponse> {
    const { data } = await api.get<UserResponse>("/api/users/me");
    return data;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UserResponse> {
    const { data: user } = await api.put<UserResponse>("/api/users/me", data);
    return user;
}

export async function deleteAccount(): Promise<void> {
    await api.delete("/api/users/me");
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
    const { data } = await api.get<NotificationPreferences>("/api/users/me/notifications");
    return data;
}

export async function updateNotificationPreferences(
    prefs: UpdateNotificationPreferencesRequest,
): Promise<NotificationPreferences> {
    const { data } = await api.put<NotificationPreferences>("/api/users/me/notifications", prefs);
    return data;
}
