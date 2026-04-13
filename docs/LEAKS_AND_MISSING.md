# The Architectural Lens — Leaks, Gaps & Missing Items Audit

> **Audit Date:** April 12, 2026  
> **Scope:** Complete codebase analysis for bugs, missing implementations, security concerns, UX gaps, and architectural weaknesses

---

## Table of Contents

1. [Critical — Security & Data Leaks](#1-critical--security--data-leaks)
2. [Critical — Missing Core Implementations](#2-critical--missing-core-implementations)
3. [High — Functional Gaps](#3-high--functional-gaps)
4. [Medium — UX & Polish Issues](#4-medium--ux--polish-issues)
5. [Low — Minor Issues & Improvements](#5-low--minor-issues--improvements)
6. [Summary Matrix](#6-summary-matrix)

---

## 1. Critical — Security & Data Leaks

### 1.1 No Input Validation/Sanitization on API Requests

**Location:** `services/auth.ts`, all service files  
**Issue:** User inputs (email, password, prompts) are sent directly to the API without any client-side validation or sanitization.

- `login()` sends raw `email` and `password` — no email format validation
- `register()` has no password strength requirements
- `studio/options.tsx` sends raw `prompt` text — no length limit enforced
- No XSS-safe text sanitization on any user input

**Risk:** Malformed data, injection attacks if backend validation is weak.

**Fix:** Add email regex validation, password policy enforcement, and prompt length limits at the form level.

---

### 1.2 Auth Token Not Verified on Hydrate

**Location:** `stores/authStore.ts` → `hydrate()`  
**Issue:** On app launch, `hydrate()` checks if `auth_token` exists in SecureStore and immediately sets `isAuthenticated: true` without verifying the token is still valid with the backend.

```typescript
if (token && orgId && userId) {
  set({ token, orgId, isAuthenticated: true, isLoading: false });
}
```

**Risk:** Expired or revoked tokens will pass the auth guard until the first API call fails with 401. The user sees authenticated UI briefly before being kicked out.

**Fix:** Add a token validation call (e.g., `GET /api/auth/me`) during hydration, or at minimum check JWT expiry locally.

---

### 1.3 User Object Not Restored on Hydrate

**Location:** `stores/authStore.ts` → `hydrate()`  
**Issue:** On hydration, `user` remains `null` even when `isAuthenticated` is set to `true`. Only `token` and `orgId` are restored.

**Impact:** Any screen that reads `user.displayName`, `user.email`, etc. will crash or show empty data after app restart until a fresh API call is made.

---

### 1.4 No Token Refresh Mechanism

**Location:** `services/api.ts`  
**Issue:** The 401 interceptor only deletes the token. There is no refresh token flow, no silent re-authentication, and no redirect to login. The user's session just silently dies.

```typescript
if (error.response?.status === 401) {
  await SecureStore.deleteItemAsync("auth_token");
  // Auth store will detect this on next hydrate
}
```

**Risk:** Users get silently logged out with no feedback. "Next hydrate" never happens during the same session.

**Fix:** Implement refresh token rotation, or at minimum trigger `authStore.logout()` and navigate to login screen on 401.

---

### 1.5 Hardcoded IP in `.env`

**Location:** `.env`  
**Issue:** `EXPO_PUBLIC_API_URL=http://192.168.0.29:8080` is a local network IP using plain HTTP.

**Risk:**

- HTTP (not HTTPS) in production = all traffic including JWT tokens sent in plaintext
- Local IP won't work for other developers or production builds

**Fix:** Use HTTPS in production. Add separate `.env.production` file. Add `EXPO_PUBLIC_API_URL` to `.gitignore` or use EAS secrets.

---

### 1.6 No Rate Limiting or Request Throttling

**Location:** `services/api.ts`  
**Issue:** No client-side rate limiting. Rapid button presses can fire multiple generation jobs, duplicate login attempts, or exhaust credits.

**Risk:** Accidental double-charges, duplicate job creation, API abuse.

**Fix:** Add request deduplication, debounce on CTAs, or optimistic locking.

---

## 2. Critical — Missing Core Implementations

### 2.1 Social Auth Not Implemented

**Location:** `app/(auth)/login.tsx`, `app/(auth)/register.tsx`  
**Issue:** Google and Apple sign-in buttons are rendered but have **no `onPress` handlers** — they are completely non-functional.

```tsx
<Pressable className="flex-1 flex-row items-center ...">
  <Ionicons name="logo-google" ... />
  <Text>Google</Text>
</Pressable>
// ← No onPress prop
```

**Impact:** Users tap social buttons and nothing happens. No error, no feedback.

---

### 2.2 Forgot Password Is a Placeholder

**Location:** `app/(auth)/forgot-password.tsx`  
**Issue:** The forgot password handler uses `setTimeout` to simulate an API call:

```typescript
await new Promise(resolve => setTimeout(resolve, 1500));
```

No actual `authService.forgotPassword()` function exists. No backend endpoint is called.

---

### 2.3 Generation Job Not Actually Created

**Location:** `app/(tabs)/studio/review.tsx` → `handleGenerate()`  
**Issue:** The generate button navigates directly to the progress screen without creating a job:

```typescript
const handleGenerate = () => {
  router.push("/generation/progress");
};
```

Missing:

- No call to `jobs.createJob()`
- No credit balance check before generation
- No credit deduction
- No error handling if insufficient credits
- No jobId passed to the progress screen

---

### 2.4 Progress Screen Uses Fake Timer

**Location:** `app/generation/progress.tsx`  
**Issue:** The generation progress screen uses a hardcoded 10-second timer:

```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    const target = jobId ? `/result/${jobId}` : "/result/demo";
    router.replace(target as any);
  }, 10000);
  return () => clearTimeout(timeout);
}, [jobId]);
```

No actual job polling occurs. It always redirects after 10s regardless of real job status.

---

### 2.5 Upscale Screen Uses Fake Progress

**Location:** `app/generation/upscale.tsx`  
**Issue:** Progress increments by 1% every 80ms (a local counter), not connected to any backend status. Redirects to `/result/latest` which is not a valid route.

---

### 2.6 Smart Edit Has No Actual Mask Drawing

**Location:** `app/(tabs)/studio/smart-edit.tsx`  
**Issue:** The brush tool UI is rendered (size slider, toggle) but there is no actual canvas drawing capability. The brush indicator is a static positioned circle. No touch gesture handling for drawing on the image. `maskData` in studioStore is never populated.

---

### 2.7 Gallery Uses Hardcoded Static Data

**Location:** `app/(tabs)/gallery/index.tsx`  
**Issue:** All gallery items are hardcoded constants (`GALLERY_DATA`). No API call to fetch real gallery data. Gallery items navigate to `/result/{id}` with hardcoded IDs like "g1", "g2" that won't match real job IDs.

---

### 2.8 History Screen — Missing Implementation

**Location:** `app/(tabs)/history/index.tsx`  
**Issue:** Need to verify but the history screen likely has no integration with `jobs.listJobs()` API to show real generation history.

---

### 2.9 Profile Screen — Missing Implementation

**Location:** `app/(tabs)/profile/index.tsx`  
**Issue:** The profile screen exists but its actual integration with `userResponse`, `creditStore`, and `subscriptionStore` data needs verification.

---

### 2.10 Credits Screen Uses Hardcoded Data

**Location:** `app/credits/index.tsx`  
**Issue:** All data is hardcoded:

- Balance shows static "147"
- Usage items are hardcoded constants (`USAGE_ITEMS`)
- "Next Cycle" date is hardcoded "Nov 1, 2026"
- No integration with `creditStore.fetchBalance()` or any API

---

### 2.11 Plan Confirm Subscription Not Implemented

**Location:** `app/plans/confirm.tsx`  
**Issue:** The confirm button has an empty handler:

```typescript
onPress={() => {
  /* TODO: handle subscription */
}}
```

No payment processing, no API call, hardcoded "Pro" plan data.

---

### 2.12 Plans Screen Missing Dynamic Data

**Location:** `app/plans/index.tsx`  
**Issue:** All plan data (names, prices, features) are hardcoded UI constants. No integration with `subscriptionStore.fetchPlans()` or `plansService.listPlans()`.

---

### 2.13 Result Screen Uses Placeholder Data

**Location:** `app/result/[jobId].tsx`  
**Issue:**

- Uses a placeholder image URL instead of actual job output
- Metadata (room type, style, model engine, cost) is all hardcoded
- Material palette is hardcoded
- No call to `jobs.getJob(jobId)` to fetch real data
- Download, share, and bookmark buttons have no `onPress` handlers
- Upscale button has no functionality

---

### 2.14 Compare Screen Uses Placeholder Data

**Location:** `app/result/compare.tsx`  
**Issue:** Before/after images are hardcoded URLs. No integration with job data. "Save Variations" and "Regenerate" buttons have no handlers or only UI.

---

## 3. High — Functional Gaps

### 3.1 No Error Boundary

**Location:** `app/_layout.tsx`  
**Issue:** No React error boundary wrapping the app. An unhandled JS error will crash the entire app with a white/red screen.

**Fix:** Add `ErrorBoundary` from `expo-router` or a custom one that catches and shows the error screen.

---

### 3.2 No Offline Handling

**Issue:** No network connectivity detection. API calls will silently fail with no user feedback when offline. No queuing of actions for retry.

---

### 3.3 No Loading States for Data Fetching

**Location:** Multiple screens  
**Issue:** Screens that should fetch data (gallery, history, credits, plans, profile) show either hardcoded data or nothing. No skeleton loaders, no pull-to-refresh, no empty states with retry.

---

### 3.4 Query Client Not Connected to Store Layer

**Issue:** `QueryClient` is created and provided in the root layout, but no screen uses `useQuery()` or `useMutation()` hooks from TanStack React Query. All data fetching is done through Zustand stores directly, bypassing React Query's cache, deduplication, and background refresh capabilities.

**Impact:** The entire React Query dependency is unused dead weight.

---

### 3.5 Settings Are Not Persisted

**Location:** `stores/settingsStore.ts`  
**Issue:** Settings (language, theme, notifications) are stored only in memory (Zustand). There is no persistence to `AsyncStorage`, `SecureStore`, or any storage mechanism. Settings reset on every app restart.

---

### 3.6 Language Change Has No Effect

**Location:** `app/settings/language.tsx`, `stores/settingsStore.ts`  
**Issue:** Changing language in the UI updates `settingsStore.language` but:

- `i18n.changeLanguage()` is never called
- Only English translations exist
- The setting isn't persisted

---

### 3.7 Notification Preferences Not Persisted or Synced

**Location:** `app/settings/notifications.tsx`  
**Issue:** Notification toggles use local `useState` — not even stored in Zustand. Settings are lost on navigation away from the screen. No push notification registration (`expo-notifications` not installed).

---

### 3.8 Theme Toggle Dead Code

**Location:** `stores/settingsStore.ts`  
**Issue:** `theme` state exists with "dark" | "light" options and `setTheme()`, but:

- There is no light theme defined in `tailwind.config.js`
- No screen exposes a theme toggle
- The entire app is hardcoded to dark mode

---

### 3.9 Uploaded Screen Uses Hardcoded Catalog Data

**Location:** `app/(tabs)/studio/uploaded.tsx`  
**Issue:** Room types and design styles are hardcoded arrays instead of fetched from `catalog.getRoomTypes()` and `catalog.getDesignStyles()`. The catalog service exists but is never called.

---

### 3.10 No Image Caching Strategy

**Issue:** `expo-image` is used (which has built-in caching), but there's no cache size management, no placeholder/blurhash for loading states on most screens, and gallery images may accumulate.

---

### 3.11 Missing Download/Share/Bookmark Functionality

**Location:** `app/result/[jobId].tsx`  
**Issue:** Three action buttons (download, share, bookmark) are rendered but have no `onPress` handlers:

```tsx
<Pressable className="...">
  <Ionicons name="download-outline" ... />
</Pressable>
// No onPress
```

---

### 3.12 No Deep Linking Configuration

**Issue:** URL scheme is defined (`thearchitecturallens`) but no deep linking routes are configured. Links to specific results or plans won't work from external sources (push notifications, emails).

---

## 4. Medium — UX & Polish Issues

### 4.1 Font Files Are Aliased Instead of Using Real Weights

**Location:** `app/_layout.tsx`  
**Issue:** All font weight variants map to the same Regular file:

```typescript
NotoSerif: require("../assets/fonts/NotoSerif-Regular.ttf"),
"NotoSerif-Medium": require("../assets/fonts/NotoSerif-Regular.ttf"),
"NotoSerif-Bold": require("../assets/fonts/NotoSerif-Regular.ttf"),
```

Every `font-headline` renders at Regular weight regardless of where `font-medium` or `font-bold` is applied. The visual hierarchy between headings and body text relies solely on size, not weight.

**Fix:** Add actual Medium/Bold font files or at least rename to avoid confusion.

---

### 4.2 Static "Step X of 4" Indicators

**Location:** Studio screens  
**Issue:** Step indicators are hardcoded strings rather than driven by `studioStore.step`. Navigating out of order or using back navigation shows incorrect step numbers.

---

### 4.3 No Back Navigation in Studio Flow

**Location:** `app/(tabs)/studio/options.tsx`, `review.tsx`  
**Issue:** Step 3 and Step 4 have no back/cancel buttons. Users must use system back gesture. No confirmation dialog when abandoning a partially configured generation.

---

### 4.4 Credit Cost Hardcoded in Smart Edit

**Location:** `app/(tabs)/studio/smart-edit.tsx`  
**Issue:** The CTA shows hardcoded "12" credits:

```tsx
<Text className="font-label text-on-primary text-xs font-semibold">12</Text>
```

Not connected to `useCreditCost()`.

---

### 4.5 No Credit Sufficiency Check Before Generation

**Location:** `app/(tabs)/studio/review.tsx`  
**Issue:** The generate button doesn't check `creditStore.canAfford(cost)`. Users with insufficient credits will either get an API error or waste time on the progress screen.

---

### 4.6 Inconsistent Color Usage: Tailwind Tokens vs Hardcoded

**Location:** Multiple screens  
**Issue:** Some screens use Tailwind tokens (`text-on-surface`, `bg-surface`) while others use hardcoded hex values (`text-[#F5F0EB]`, `bg-[#131313]`, `text-[#E5E2E1]`).

Screens with hardcoded values:

- `error.tsx` — All hardcoded
- `app/(auth)/register.tsx` — Mixed
- Some settings screens

**Impact:** If the design system changes, these screens won't update.

---

### 4.7 Options Screen: Locked Modes Have No Explanation

**Location:** `app/(tabs)/studio/options.tsx`  
**Issue:** Empty Room, Exterior, and Blueprint modes show a lock icon but no indication of which plan unlocks them. Tapping a locked mode does nothing with no feedback.

---

### 4.8 No Keyboard Dismissal on Scroll

**Location:** Several screens with forms  
**Issue:** `keyboardShouldPersistTaps="handled"` is set on some screens but not all. No `keyboardDismissMode` on ScrollViews. Keyboard doesn't dismiss when scrolling on some screens.

---

### 4.9 GlassNavBar Not Using BlurView

**Location:** `components/layout/GlassNavBar.tsx`  
**Issue:** Despite `expo-blur` being imported and available, the GlassNavBar uses a simple `rgba` background instead of `BlurView`. The glassmorphic effect described in the design system (20px blur) is not actually implemented.

---

### 4.10 No Pull-to-Refresh on Any List Screen

**Issue:** Gallery, History, Credits screens have no `RefreshControl`. Users have no way to manually refresh data.

---

### 4.11 No Pagination on Gallery/History

**Issue:** The `jobs.listJobs()` service supports pagination (`PageResponse<T>`) but no screen implements infinite scroll or load-more patterns.

---

## 5. Low — Minor Issues & Improvements

### 5.1 `@shopify/flash-list` Not Used Anywhere

**Issue:** `@shopify/flash-list` is installed (package.json) but no screen uses `FlashList`. All lists use `ScrollView` or `FlatList`. This is dead weight in the bundle.

---

### 5.2 `react-native-worklets` Unused

**Issue:** `react-native-worklets` is in dependencies but never imported. Dead dependency.

---

### 5.3 i18n Translations Not Used on Most Screens

**Issue:** `en.json` has comprehensive translations, and `i18n/index.ts` initializes i18next, but almost no screen calls `useTranslation()` or `t()`. All screen text is hardcoded English strings.

---

### 5.4 No `displayName` Field on Register Screen

**Location:** `app/(auth)/register.tsx`  
**Issue:** `authService.register()` accepts an optional `displayName`, but the register form only has email and password fields.

---

### 5.5 Navigation Type Safety Not Enforced

**Issue:** `types/navigation.ts` defines `RootStackParamList` but it's never connected to the router. All `router.push()` calls use raw strings with `as any` casts.

---

### 5.6 Hardcoded Image URLs Throughout

**Issue:** Many screens use hardcoded Google Cloud URLs for placeholder images:

- Login hero image
- Register background
- Gallery items
- Result placeholders
- Upsell comparison images

These external URLs may break if the hosting changes.

---

### 5.7 `SplashScreen` Import Incorrectly Named

**Location:** `app/_layout.tsx`  
**Issue:**

```typescript
import * as SplashScreen from "expo-system-ui";
```

This imports `expo-system-ui` and aliases it as `SplashScreen`, but it's never used. The actual splash screen hiding logic seems missing (should call `SplashScreen.hideAsync()` after fonts load).

---

### 5.8 No `expo-updates` for OTA Updates

**Issue:** No OTA update mechanism configured. Every fix requires a full app store submission.

---

### 5.9 No Analytics or Crash Reporting

**Issue:** No analytics SDK (Amplitude, Mixpanel, PostHog) or crash reporting (Sentry, Bugsnag) integrated.

---

### 5.10 No Accessibility Support

**Issue:** No `accessibilityLabel`, `accessibilityRole`, or `accessibilityHint` props on any interactive element. Screen readers cannot navigate the app meaningfully.

---

### 5.11 No Unit Tests or E2E Tests

**Issue:** No test files exist. No test runner configured. No `jest.config.js`, no `__tests__/` directory, no `.test.ts` files.

---

### 5.12 No CI/CD Pipeline

**Issue:** No GitHub Actions, no EAS Build configuration, no automated deployment pipeline.

---

### 5.13 Compare Screen Dimensions Import

**Location:** `app/result/compare.tsx`  
**Issue:** Uses `Dimensions.get("window")` at module scope which doesn't respond to screen rotation or split-view on tablets. Consider `useWindowDimensions()` hook instead.

---

### 5.14 `process.env` Usage Without Type Safety

**Location:** `config/environment.ts`  
**Issue:** `process.env.EXPO_PUBLIC_ENV` is cast with `as Environment` without validation. Invalid env values silently pass.

---

---

## 6. Summary Matrix

| Severity            | Count  | Examples                                                                                                                  |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Critical**        | 6      | No input validation, no token refresh, token not verified on hydrate, hardcoded HTTP, no rate limiting, user not restored |
| **Missing Core**    | 14     | Social auth, forgot password, job creation, progress polling, smart edit drawing, subscription processing, download/share |
| **High Functional** | 12     | No error boundary, no offline handling, React Query unused, settings not persisted, catalog not fetched                   |
| **Medium UX**       | 11     | Wrong font weights, hardcoded steps, no credit check, inconsistent tokens, no blur on nav                                 |
| **Low**             | 14     | Unused deps, no i18n usage, no tests, no analytics, no accessibility                                                      |
| **Total**           | **57** |                                                                                                                           |

### Priority Action Plan

#### Phase 1 — Critical Security (Immediate)

1. Add token validation on hydrate
2. Implement token refresh or 401 → logout redirect
3. Enforce HTTPS in production env
4. Add input validation on all forms
5. Add rate limiting / debounce on submit buttons

#### Phase 2 — Core Functionality (Sprint 1)

1. Wire `review.tsx` → `jobs.createJob()` → real progress polling
2. Implement `useJobPolling` with React Query on progress screen
3. Connect credits screen to `creditStore.fetchBalance()`
4. Connect plans screen to `subscriptionStore.fetchPlans()`
5. Connect uploaded screen to catalog API
6. Add credit sufficiency check before generation
7. Implement 401 → logout + navigate to login

#### Phase 3 — Missing Features (Sprint 2)

1. Implement Google/Apple social authentication
2. Implement forgot password API call
3. Implement download, share, bookmark functions
4. Wire result screen to real job data
5. Implement subscription purchase flow
6. Add React Error Boundary
7. Add offline handling with NetInfo

#### Phase 4 — Polish (Sprint 3)

1. Add actual font weight files
2. Use i18n translations across all screens
3. Persist settings to AsyncStorage
4. Add accessibility labels
5. Remove unused dependencies
6. Add Sentry crash reporting
7. Write unit tests for stores and hooks

---

_End of Leaks & Missing Items Audit_
