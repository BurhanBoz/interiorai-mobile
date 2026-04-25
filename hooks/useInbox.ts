import { useMemo } from "react";
import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCreditStore } from "@/stores/creditStore";
import { useAuthStore } from "@/stores/authStore";

type IconName = ComponentProps<typeof Ionicons>["name"];

export type InboxType = "job" | "credit" | "plan" | "promo" | "system";

export interface InboxItem {
  id: string;
  type: InboxType;
  icon: IconName;
  titleKey: string;
  bodyKey: string;
  bodyParams?: Record<string, string | number>;
  /** ms since epoch. */
  createdAt: number;
  /** Derived from time + user's read-history; consumers can still overlay
   *  local read-overrides on top of this. */
  read: boolean;
  /** Optional deep-link route to push on tap. */
  route?: string;
}

/**
 * Dummy-fallback inbox derived from subscription + credit + account state.
 * Shared between the Notifications hub and the Profile tab (so the Profile
 * menu badge only lights up when there's something actionable to see).
 *
 * When the backend grows a `/api/notifications` endpoint, replace the body
 * of this hook with a fetch + cache — the shape of `InboxItem` stays
 * identical so no consumer needs to change.
 */
export function useComputedInbox(): InboxItem[] {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const balance = useCreditStore((s) => s.balance);
  const monthlyLimit = useCreditStore((s) => s.monthlyLimit);
  const planCode =
    useSubscriptionStore((s) => s.subscription?.planCode) ??
    useCreditStore((s) => s.planCode);
  const user = useAuthStore((s) => s.user);

  return useMemo(() => {
    const items: InboxItem[] = [];
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    // 1. Recent renewal — if the subscription period started in the last 7d.
    if (
      subscription?.currentPeriodStart &&
      subscription.monthlyCredits &&
      planCode !== "FREE"
    ) {
      const startMs = new Date(subscription.currentPeriodStart).getTime();
      if (!Number.isNaN(startMs) && now - startMs < 7 * DAY) {
        items.push({
          id: `credit-renewal-${startMs}`,
          type: "credit",
          icon: "flash",
          titleKey: "settings.notifications_n_credits_renewed_title",
          bodyKey: "settings.notifications_n_credits_renewed_body",
          bodyParams: { credits: subscription.monthlyCredits },
          createdAt: startMs,
          read: now - startMs > 2 * DAY,
          route: "/credits",
        });
      }
    }

    // 2. Low-credit nudge — non-FREE users with less than 5 credits left.
    if (planCode && planCode !== "FREE" && balance > 0 && balance < 5) {
      items.push({
        id: `low-credit-${balance}`,
        type: "credit",
        icon: "alert-circle",
        titleKey: "settings.notifications_n_low_credits_title",
        bodyKey: "settings.notifications_n_low_credits_body",
        bodyParams: { balance },
        createdAt: now - 3 * HOUR,
        read: false,
        route: "/credits/packs",
      });
    }

    // 3. Plan upgrade nudge — one per tier, never on MAX.
    if (planCode === "FREE") {
      items.push({
        id: "plan-upgrade-basic",
        type: "plan",
        icon: "ribbon",
        titleKey: "settings.notifications_n_upgrade_basic_title",
        bodyKey: "settings.notifications_n_upgrade_basic_body",
        createdAt: now - 1 * DAY,
        read: false,
        route: "/plans",
      });
    } else if (planCode === "BASIC") {
      items.push({
        id: "plan-upgrade-pro",
        type: "plan",
        icon: "ribbon",
        titleKey: "settings.notifications_n_upgrade_pro_title",
        bodyKey: "settings.notifications_n_upgrade_pro_body",
        createdAt: now - 1 * DAY,
        read: false,
        route: "/plans",
      });
    } else if (planCode === "PRO") {
      items.push({
        id: "plan-upgrade-max",
        type: "plan",
        icon: "ribbon",
        titleKey: "settings.notifications_n_upgrade_max_title",
        bodyKey: "settings.notifications_n_upgrade_max_body",
        createdAt: now - 1 * DAY,
        read: true,
        route: "/plans",
      });
    }

    // 4. Welcome — oldest; read after 48h so the badge fades once onboarding
    //    is presumably complete.
    if (user?.createdAt) {
      const created = new Date(user.createdAt).getTime();
      if (!Number.isNaN(created)) {
        items.push({
          id: `welcome-${created}`,
          type: "system",
          icon: "sparkles",
          titleKey: "settings.notifications_n_welcome_title",
          bodyKey: "settings.notifications_n_welcome_body",
          createdAt: created,
          read: now - created > 2 * DAY,
        });
      }
    }

    return items.sort((a, b) => b.createdAt - a.createdAt);
    // monthlyLimit kept in deps so future rules can key on it without
    // re-deriving the hook.
  }, [subscription, balance, monthlyLimit, planCode, user]);
}

/**
 * Count-only variant used by the Profile menu badge — avoids pulling the
 * full InboxItem list into screens that only need the unread indicator.
 */
export function useUnreadInboxCount(): number {
  const items = useComputedInbox();
  return items.filter((n) => !n.read).length;
}
