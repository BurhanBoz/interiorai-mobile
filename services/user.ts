import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import api from "./api";
import env from "@/config/environment";
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

export async function deleteAccount(password: string, reason?: string): Promise<void> {
    await api.delete("/api/users/me", { data: { password, reason } });
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

/**
 * GDPR Art. 15 + Apple 5.1.1(ix) data export.
 *
 * Streams the ZIP to {@code FileSystem.cacheDirectory} via expo-file-system's
 * native downloadAsync — keeps the archive off the JS heap. Returns the file
 * URI, ready to hand to {@code Sharing.shareAsync}. Caller handles the
 * 429 (rate-limited) and 413 (export too large) status codes.
 */
export async function downloadDataExport(): Promise<string> {
    const token = await SecureStore.getItemAsync("auth_token");
    if (!token) throw new Error("Not authenticated");

    const filename = `roomframeai-export-${Date.now()}.zip`;
    const fileUri = (FileSystem.cacheDirectory ?? "") + filename;

    const result = await FileSystem.downloadAsync(
        `${env.apiUrl}/api/users/me/export`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } },
    );

    if (result.status === 429) {
        throw Object.assign(new Error("rate_limited"), { status: 429 });
    }
    if (result.status === 413) {
        throw Object.assign(new Error("too_large"), { status: 413 });
    }
    if (result.status < 200 || result.status >= 300) {
        throw Object.assign(new Error("export_failed"), { status: result.status });
    }
    return result.uri;
}
