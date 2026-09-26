import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { isFlagSet, setFlag, readCounter, writeCounter } from "@/utils/oneShotFlag";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { GUEST_EMAIL_UPGRADE_ENABLED } from "@/config/features";
import { isPostPurchaseQuiet } from "@/stores/postPurchaseStore";

/**
 * V53 guest-first — one-shot "secure your account" ask, shown to GUESTS only
 * after their 3rd successfully viewed result (value demonstrated three times;
 * the ask lands as protection, not as a signup wall). Mirrors useReviewPrompt:
 * AsyncStorage-counted, fail-open, never blocks the result screen.
 *
 * Sequencing note: review prompt fires on the 2nd success, this on the 3rd —
 * deliberately staggered so the two sheets never stack on one screen.
 */

const COUNT_KEY = "account_prompt_success_count";
const ASKED_KEY = "account_prompt_asked";
const ASK_ON_NTH = 5;
const DELAY_MS = 2500;

/** @return true once this visit has committed to showing its alert. */
export function useAccountPrompt(jobSucceeded: boolean): boolean {
  const { t } = useTranslation();
  const [claimed, setClaimed] = useState(false);
  const isGuest = useAuthStore((s) => s.user?.guest === true);

  useEffect(() => {
    // Yükseltme arayüzü kapalıyken bu uyarı da çıkmamalı: kullanıcıyı
    // gizlediğimiz akışa götüren ikinci kapı budur. Sayaç da ilerlemiyor,
    // yani bayrak geri açıldığında ask 5. sonuçtan itibaren sayar.
    if (!GUEST_EMAIL_UPGRADE_ENABLED) return;
    if (!jobSucceeded || !isGuest) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        if (await isFlagSet(ASKED_KEY)) return;
        const count = (await readCounter(COUNT_KEY)) + 1;
        await writeCounter(COUNT_KEY, count);
        if (count < ASK_ON_NTH) return;

        timer = setTimeout(async () => {
          if (cancelled) return;
          // Not in the minutes after a purchase; the flag stays unset, so
          // the next result asks instead.
          if (isPostPurchaseQuiet()) return;
          await setFlag(ASKED_KEY);
          // True only while the alert is up (2.0.0) — the rating waits for
          // it to close rather than giving up on the whole visit.
          setClaimed(true);
          Alert.alert(
            t("auth.secure_account_title"),
            t("auth.secure_account_body"),
            [
              { text: t("auth.secure_account_later"), style: "cancel", onPress: () => setClaimed(false) },
              {
                text: t("auth.secure_account_cta"),
                onPress: () => {
                  setClaimed(false);
                  router.push({ pathname: "/register", params: { upgrade: "1" } });
                },
              },
            ],
            { onDismiss: () => setClaimed(false) },
          );
        }, DELAY_MS);
      } catch {
        // Fail-open — an account ask must never affect the result screen.
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobSucceeded, isGuest, t]);

  return claimed;
}
