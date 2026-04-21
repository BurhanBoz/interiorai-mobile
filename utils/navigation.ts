import { router, useLocalSearchParams } from "expo-router";

/**
 * Pop one screen from the stack, or replace to a fallback if the stack is
 * empty (deep-linked into this screen, or the tab state got reset).
 */
export function goBackOrReplace(fallback: string) {
    if (router.canGoBack()) {
        router.back();
    } else {
        router.replace(fallback as never);
    }
}

type TabName = "studio" | "gallery" | "history" | "profile";

/**
 * Tab-aware back handler. Expo-router's Stack ancak bir tab'ın dışına çıkınca
 * davranışı tutarsız — kullanıcı Profile tab'ından bir modal ekran açıp back
 * yapınca bazen Gallery'e düşebiliyor. Çözüm: caller push yaparken hangi
 * tab'a dönmesi gerektiğini `returnTo` query param'ı olarak belirtir.
 * Back handler önce onu okur, yoksa normal stack pop uygular.
 *
 * Usage:
 *   // caller (e.g. profile/index.tsx)
 *   pushWithReturn("/credits", "profile");
 *
 *   // target (e.g. credits/index.tsx)
 *   const onBack = useBackHandler("/(tabs)/gallery");
 *   <Pressable onPress={onBack}>...
 */
export function useBackHandler(defaultFallback: string = "/(tabs)/gallery") {
    const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
    return () => {
        if (returnTo) {
            router.replace(`/(tabs)/${returnTo}` as never);
            return;
        }
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace(defaultFallback as never);
        }
    };
}

export function pushWithReturn(
    pathname: string,
    returnTo: TabName,
    extraParams?: Record<string, string>,
) {
    router.push({
        pathname,
        params: { returnTo, ...(extraParams ?? {}) },
    } as never);
}
