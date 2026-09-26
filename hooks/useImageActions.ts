import { useState, useCallback } from "react";
import { Alert, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { markBusy, markFree } from "@/utils/screenBusy";

interface DownloadOptions {
    /** Authenticated headers when fetching from the backend's /api/files proxy. */
    headers?: Record<string, string>;
    /** Filename without extension — used as a hint for the saved file. */
    nameHint?: string;
    /**
     * V183 — a room video goes through the same two doors. Explicit rather
     * than sniffed from the URL: the extension decides whether Photos files
     * it as a video and which UTI the share sheet announces, and a presigned
     * URL is not a filename.
     */
    media?: "image" | "video";
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
            const ext = opts.media === "video" ? "mp4" : url.includes(".png") ? "png" : "jpg";
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

    /**
     * An alert that keeps the screen marked busy until it is dismissed —
     * see utils/screenBusy: the rating waits for it rather than being
     * dropped by iOS underneath it.
     */
    const alertThenFree = useCallback(
        (tag: string, title: string, body: string) => {
            const free = () => markFree(tag);
            Alert.alert(title, body, [{ text: t("common.ok"), onPress: free }], { onDismiss: free });
        },
        [t],
    );

    /** Save to Photos. Prompts for permission on first use. */
    const saveToPhotos = useCallback(
        async (url: string, opts: DownloadOptions = {}) => {
            if (isDownloading) return;
            setIsDownloading(true);
            // Busy from the first tap: the permission prompt, the download and
            // the "Saved" alert all come before the screen is free again.
            markBusy("save");
            let alerted = false;
            try {
                const perm = await MediaLibrary.requestPermissionsAsync();
                if (!perm.granted) {
                    alerted = true;
                    alertThenFree(
                        "save",
                        t("result.permission_needed_title"),
                        t("result.permission_needed_body"),
                    );
                    return;
                }
                const localUri = await downloadToCache(url, opts);
                await MediaLibrary.saveToLibraryAsync(localUri);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                alerted = true;
                alertThenFree(
                    "save",
                    t("result.saved_title"),
                    t(opts.media === "video" ? "result.video_saved_body" : "result.saved_body"),
                );
            } catch (err: any) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                alerted = true;
                alertThenFree(
                    "save",
                    t("result.save_failed_title"),
                    err?.message ?? t("result.save_failed_body"),
                );
            } finally {
                if (!alerted) markFree("save");
                setIsDownloading(false);
            }
        },
        [alertThenFree, downloadToCache, isDownloading, t],
    );

    /** Share the image file natively. Falls back to URL share if file system blocked. */
    const shareImage = useCallback(
        async (url: string, opts: DownloadOptions = {}) => {
            if (isSharing) return;
            setIsSharing(true);
            // The share sheet is a modal: busy until it closes (shareAsync
            // resolves on dismissal), or until an error alert is dismissed.
            markBusy("share");
            let alerted = false;
            try {
                const canShare = await Sharing.isAvailableAsync();
                if (!canShare) {
                    alerted = true;
                    alertThenFree(
                        "share",
                        t("result.share_unavailable_title"),
                        t("result.share_unavailable_body"),
                    );
                    return;
                }
                const localUri = await downloadToCache(url, opts);
                const video = opts.media === "video";
                await Sharing.shareAsync(localUri, {
                    mimeType: video ? "video/mp4"
                        : localUri.endsWith(".png") ? "image/png" : "image/jpeg",
                    dialogTitle: t(video ? "result.video_share_dialog_title" : "result.share_dialog_title"),
                    // iOS-only — when the user picks "Save Image" inside the share
                    // sheet, this UTI tells the system it's a regular photo (or,
                    // for a clip, an MPEG-4 movie).
                    UTI: Platform.OS === "ios" ? (video ? "public.mpeg-4" : "public.jpeg") : undefined,
                });
                Haptics.selectionAsync();
            } catch (err: any) {
                if (!String(err?.message ?? "").toLowerCase().includes("user did not")) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    alerted = true;
                    alertThenFree(
                        "share",
                        t("result.share_failed_title"),
                        err?.message ?? t("result.share_failed_body"),
                    );
                }
            } finally {
                if (!alerted) markFree("share");
                setIsSharing(false);
            }
        },
        [alertThenFree, downloadToCache, isSharing, t],
    );

    return { saveToPhotos, shareImage, isDownloading, isSharing };
}
