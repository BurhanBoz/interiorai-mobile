import { useCallback, useEffect, useState } from "react";
import * as userService from "@/services/user";
import { requestPushPermission } from "@/hooks/usePushRegistration";
import { useAuthStore } from "@/stores/authStore";

/**
 * Bildirim ana anahtarı — SUNUCUYA yazan tek yer.
 *
 * <p>🔴 <b>Neden var.</b> Ayarlar'daki "Bildirimler · Açık/Kapalı" satırı ve
 * sonuç ekranındaki hatırlatma anahtarı, yalnız cihazdaki bir Zustand
 * boolean'ını çeviriyordu. Sunucunun tercih ucu
 * ({@code GET/PUT /api/users/me/notifications}) vardı ama onu çağıran tek
 * ekran ({@code settings/notifications.tsx}) redesign'da erişilemez kaldı.
 * Sonuç: kullanıcı bildirimi kapatıyor, ekran "Kapalı" yazıyor, sunucu
 * göndermeye devam ediyor. Kapatma düğmesinin kapatmaması, bozuk bir
 * özellikten fazlası — verilmemiş bir izni verilmiş gibi göstermek.
 *
 * <p><b>Ana anahtar neyi kapsıyor.</b> Sunucuda altı kanal var; push GÖNDEREN
 * beşi şuraya bakıyor:
 * <ul>
 *   <li>{@code engagement} — "dün bir şey ürettin, kaydetmedin" ve günlük
 *       kredi hatırlatması (DAILY_CREDIT kendi anahtarı yok, bunu okur)</li>
 *   <li>{@code engagementVariations} — "aynı odayı başka bir stilde dene"</li>
 *   <li>{@code reengagement} — "seni özledik"</li>
 * </ul>
 * Üçü birlikte çevriliyor: kullanıcıya altı anahtarlı bir pano sunmak, tek
 * istediği şey "beni rahat bırak" olduğunda yardım değil iş yükü.
 *
 * <p>🔴 {@code CRITICAL} kanalı (deneme süresi bitiyor) bu anahtara BAKMAZ —
 * faturayla ilgili olduğu için sunucu onu kasten muaf tutuyor. Anahtar
 * "kapalı" iken de gelebilecek tek bildirim odur.
 *
 * <p><b>iOS izni ayrı bir kapı.</b> Sunucu tercihi açık olsa da iOS izni
 * yoksa hiçbir şey gelmez; o yüzden AÇARKEN önce izin isteniyor ve izin
 * verilmezse sunucuya yazılmıyor — "açık" yazıp hiçbir şey göndermemek,
 * kapatmanın kapatmamasıyla aynı yalanın öbür yüzü.
 *
 * <p>Her hata yutuluyor: bir tercih okuması hiçbir ekranı bozmamalı.
 */
export function useNotificationPrefs() {
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        userService
            .getNotificationPreferences()
            .then((p) => {
                if (cancelled) return;
                // Üçünden herhangi biri açıksa anahtar açık. "Hepsi açık"
                // aramak, sunucuda tek kanalı kapalı kalmış bir hesabı
                // tamamen kapalı göstermek olurdu.
                setEnabled(p.engagement || p.engagementVariations || p.reengagement);
            })
            .catch(() => {
                // Okunamadıysa bilmiyoruz demektir; sunucunun varsayılanı
                // açık olduğu için açık göstermek en az yanıltan cevap.
                if (!cancelled) setEnabled(true);
            });
        return () => {
            cancelled = true;
        };
    }, [userId]);

    /** @return gerçekleşen yeni durum — izin reddedilirse eskisi döner. */
    const toggle = useCallback(async (): Promise<boolean> => {
        if (busy || enabled === null) return enabled ?? false;
        const next = !enabled;
        setBusy(true);
        try {
            if (next) {
                const granted = await requestPushPermission().catch(() => false);
                if (!granted) return false;
            }
            await userService.updateNotificationPreferences({
                engagement: next,
                engagementVariations: next,
                reengagement: next,
            });
            setEnabled(next);
            return next;
        } catch {
            return enabled;
        } finally {
            setBusy(false);
        }
    }, [busy, enabled]);

    return { enabled, busy, toggle };
}
