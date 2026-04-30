import { useState, useCallback } from "react";
import { Alert, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

interface DownloadOptions {
    /** Authenticated headers when fetching from the backend's /api/files proxy. */
    headers?: Record<string, string>;
    /** Filename without extension — used as a hint for the saved file. */
    nameHint?: string;
}

/**
 * Download → Save to Photos → Share helpers, all in one hook.
 *
 * The result screen's "Share" used to call RN `Share.share({ url })`, which
 * just shares the URL string — recipients have to paste it into a browser.
 * Sharing the actual image file (via `expo-sharing`) feels native and works
 * in iMessage, WhatsApp, Mail, etc. Same code path serves Save-to-Photos
 * (via `expo-media-library`), so both buttons share download logic.
 */
export function useImageActions() {
    const { t } = useTranslation();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const downloadToCache = useCallback(
        async (url: string, opts: DownloadOptions = {}): Promise<string> => {
            const ext = url.includes(".png") ? "png" : "jpg";
            const filename = `${opts.nameHint ?? "design"}_${Date.now()}.${ext}`;
            const dest = `${FileSystem.cacheDirectory}${filename}`;
            const result = await FileSystem.downloadAsync(url, dest, {
                headers: opts.headers,
            });
            if (result.status !== 200) {
                throw new Error(`Download failed (HTTP ${result.status})`);
            }
            return result.uri;
        },
        [],
    );

    /** Save to Photos. Prompts for permission on first use. */
    const saveToPhotos = useCallback(
        async (url: string, opts: DownloadOptions = {}) => {
            if (isDownloading) return;
            setIsDownloading(true);
            try {
                const perm = await MediaLibrary.requestPermissionsAsync();
                if (!perm.granted) {
                    Alert.alert(
                        t("result.permission_needed_title"),
                        t("result.permission_needed_body"),
                    );
                    return;
                }
                const localUri = await downloadToCache(url, opts);
                await MediaLibrary.saveToLibraryAsync(localUri);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                    t("result.saved_title"),
                    t("result.saved_body"),
                );
            } catch (err: any) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                    t("result.save_failed_title"),
                    err?.message ?? t("result.save_failed_body"),
                );
            } finally {
                setIsDownloading(false);
            }
        },
        [downloadToCache, isDownloading, t],
    );

    /** Share the image file natively. Falls back to URL share if file system blocked. */
    const shareImage = useCallback(
        async (url: string, opts: DownloadOptions = {}) => {
            if (isSharing) return;
            setIsSharing(true);
            try {
                const canShare = await Sharing.isAvailableAsync();
                if (!canShare) {
                    Alert.alert(
                        t("result.share_unavailable_title"),
                        t("result.share_unavailable_body"),
                    );
                    return;
                }
                const localUri = await downloadToCache(url, opts);
                await Sharing.shareAsync(localUri, {
                    mimeType: localUri.endsWith(".png") ? "image/png" : "image/jpeg",
                    dialogTitle: t("result.share_dialog_title"),
                    // iOS-only — when the user picks "Save Image" inside the share
                    // sheet, this UTI tells the system it's a regular photo.
                    UTI: Platform.OS === "ios" ? "public.jpeg" : undefined,
                });
                Haptics.selectionAsync();
            } catch (err: any) {
                if (!String(err?.message ?? "").toLowerCase().includes("user did not")) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    Alert.alert(
                        t("result.share_failed_title"),
                        err?.message ?? t("result.share_failed_body"),
                    );
                }
            } finally {
                setIsSharing(false);
            }
        },
        [downloadToCache, isSharing, t],
    );

    return { saveToPhotos, shareImage, isDownloading, isSharing };
}
