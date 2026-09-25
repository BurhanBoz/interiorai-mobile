/**
 * Every link that opens the app from outside passes through here first
 * (expo-router's native intent hook) — the custom scheme, roomframeai://…,
 * and Universal Links, https://roomframeai.com/….
 *
 * <p>Why a filter at all. Until 1.7.0 (82) the iOS app did not register its
 * own scheme: app.json's `ios.infoPlist.CFBundleURLTypes` listed only the
 * Google Sign-In scheme and overrode the one Expo derives from `scheme`, so
 * the password-reset e-mail's `roomframeai://reset-password?token=…` opened
 * nothing (since 2026-07-05). Registering the scheme fixes that — and also
 * lets ANY web page or app open ANY route by URL. Two routes act on open:
 * `generation/upscale` and `generation/expand` submit a paid job straight
 * from their parameters. So the scheme may reach only what a link is for:
 *
 *   - `reset-password` — the e-mail link;
 *   - `design`, `style/…`, `room/…` — the marketing links, the same three
 *     paths the Universal Links file (apple-app-site-association) admits.
 *
 * Anything else on our scheme or domain lands on the home screen instead.
 * Links on other schemes are passed through untouched: this file only
 * narrows what roomframeai:// and roomframeai.com can do.
 */

const ALLOWED_PATHS: RegExp[] = [
  /^\/reset-password\/?$/,
  /^\/design\/?$/,
  /^\/style\/[^/]+\/?$/,
  /^\/room\/[^/]+\/?$/,
];

const OUR_HOSTS = new Set(["roomframeai.com", "www.roomframeai.com"]);

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = new URL(path);
    let routePath: string;
    if (url.protocol === "roomframeai:") {
      // roomframeai://reset-password?token=… parses "reset-password" as the
      // host; roomframeai:///reset-password?token=… as the path. Both mean
      // the same route.
      routePath = `/${url.host}${url.pathname}`.replace(/\/{2,}/g, "/");
    } else if ((url.protocol === "https:" || url.protocol === "http:") && OUR_HOSTS.has(url.hostname)) {
      routePath = url.pathname;
    } else {
      return path;
    }
    if (ALLOWED_PATHS.some((re) => re.test(routePath))) {
      return `${routePath}${url.search}`;
    }
    return "/";
  } catch {
    // Not a full URL (expo-router can hand over a bare path): keep it only
    // if it is one of the allowed routes.
    const [bare, query = ""] = path.split("?");
    const routePath = bare.startsWith("/") ? bare : `/${bare}`;
    return ALLOWED_PATHS.some((re) => re.test(routePath))
      ? `${routePath}${query ? `?${query}` : ""}`
      : "/";
  }
}
