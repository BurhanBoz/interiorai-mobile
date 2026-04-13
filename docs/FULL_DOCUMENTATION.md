# The Architectural Lens — Full Project Documentation

> **Version:** 1.0.0  
> **Platform:** iOS / Android (React Native + Expo)  
> **Last Updated:** April 12, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Configuration & Environment](#4-configuration--environment)
5. [Design System](#5-design-system)
6. [Routing & Navigation](#6-routing--navigation)
7. [Authentication Flow](#7-authentication-flow)
8. [State Management](#8-state-management)
9. [API Layer & Services](#9-api-layer--services)
10. [Custom Hooks](#10-custom-hooks)
11. [UI Components Library](#11-ui-components-library)
12. [Screen Reference](#12-screen-reference)
13. [Internationalization (i18n)](#13-internationalization-i18n)
14. [Type System](#14-type-system)
15. [Build & Development](#15-build--development)

---

## 1. Project Overview

**The Architectural Lens** is an AI-powered interior design mobile application. Users upload photos of their rooms and the app generates redesigned versions using AI models. The app follows a 4-step studio workflow: Upload → Room/Style Selection → Design Specifications → Review & Generate.

### Core Features

| Feature                   | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| **AI Room Redesign**      | Upload a room photo and get AI-generated redesigns in chosen styles |
| **Multiple Design Modes** | Redesign, Empty Room, Inpaint (Exterior), Style Transfer            |
| **Quality Tiers**         | Standard, HD, Ultra HD resolution outputs                           |
| **Credit System**         | Credit-based generation with plan-specific allocations              |
| **Subscription Plans**    | Free, Basic ($9.99), Pro ($24.99), Max ($49.99) tiers               |
| **Gallery**               | Browse curated design inspirations                                  |
| **History**               | View past generations with full metadata                            |
| **Smart Edit**            | Brush-based inpainting with AI text prompts                         |
| **Style Transfer**        | Apply reference image aesthetics to your space (Max only)           |
| **HD Upscaling**          | Post-generation upscale to high-definition                          |
| **Before/After Compare**  | Side-by-side comparison of original vs. generated                   |

### App Identity

- **App Name:** The Architectural Lens
- **Bundle ID:** `com.thearchitecturallens.mobile`
- **URL Scheme:** `thearchitecturallens`
- **Orientation:** Portrait only
- **UI Style:** Dark mode only

---

## 2. Tech Stack

### Core Framework

| Technology   | Version | Purpose                         |
| ------------ | ------- | ------------------------------- |
| React Native | 0.81.5  | Cross-platform mobile framework |
| Expo SDK     | 54      | Managed workflow, build tooling |
| TypeScript   | ~5.9.2  | Static typing (strict mode)     |
| expo-router  | ~6.0.23 | File-based routing              |

### Styling

| Technology           | Version | Purpose                       |
| -------------------- | ------- | ----------------------------- |
| NativeWind           | ^4.2.3  | Tailwind CSS for React Native |
| Tailwind CSS         | ^3.3.2  | Utility-first CSS framework   |
| expo-linear-gradient | ~15.0.8 | Gradient overlays and CTAs    |
| expo-blur            | ~15.0.8 | Glassmorphic blur effects     |

### State Management

| Technology           | Version | Purpose                        |
| -------------------- | ------- | ------------------------------ |
| Zustand              | ^5.0.12 | Client-side state stores       |
| TanStack React Query | ^5.96.2 | Server state, caching, polling |

### Networking & Storage

| Technology        | Version | Purpose                         |
| ----------------- | ------- | ------------------------------- |
| Axios             | ^1.14.0 | HTTP client                     |
| expo-secure-store | ~15.0.8 | Secure JWT & credential storage |

### Media & UI

| Technology                     | Version  | Purpose                         |
| ------------------------------ | -------- | ------------------------------- |
| expo-image                     | ~3.0.11  | Optimized image rendering       |
| expo-image-picker              | ~17.0.10 | Camera/gallery image selection  |
| @expo/vector-icons             | ^15.1.1  | Ionicons icon set               |
| @shopify/flash-list            | 2.0.2    | High-performance list rendering |
| @react-native-community/slider | 5.0.1    | Brush size sliders              |
| react-native-reanimated        | ^3.16.7  | Smooth animations               |
| react-native-gesture-handler   | ~2.28.0  | Touch gestures                  |
| expo-haptics                   | ~15.0.8  | Haptic feedback                 |

### Internationalization

| Technology        | Version | Purpose                 |
| ----------------- | ------- | ----------------------- |
| i18next           | ^26.0.3 | i18n framework          |
| react-i18next     | ^17.0.2 | React bindings          |
| expo-localization | ~17.0.8 | Device locale detection |

---

## 3. Project Structure

```
interiorai-mobile/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # Root layout (providers, auth guard)
│   ├── +not-found.tsx            # 404 screen
│   ├── error.tsx                 # Global error screen
│   ├── credits-exhausted.tsx     # Zero credits screen
│   ├── upsell.tsx                # HD quality upsell modal
│   ├── (auth)/                   # Auth route group
│   │   ├── _layout.tsx           # Stack with fade animation
│   │   ├── onboarding.tsx        # Welcome slides
│   │   ├── login.tsx             # Email/password login
│   │   ├── register.tsx          # Account registration
│   │   └── forgot-password.tsx   # Password reset
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # Tab bar with GlassNavBar
│   │   ├── studio/               # AI generation workflow
│   │   │   ├── _layout.tsx       # Stack navigator
│   │   │   ├── index.tsx         # Step 1: Upload photo
│   │   │   ├── uploaded.tsx      # Step 2: Room type & style
│   │   │   ├── options.tsx       # Step 3: Design specifications
│   │   │   ├── review.tsx        # Step 4: Review & generate
│   │   │   ├── smart-edit.tsx    # Inpainting editor
│   │   │   ├── style-transfer.tsx# Style transfer (locked)
│   │   │   └── style.tsx         # Style detail bottom sheet
│   │   ├── gallery/              # Inspiration gallery
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx
│   │   ├── history/              # Generation history
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx
│   │   └── profile/              # User profile & settings
│   │       ├── _layout.tsx
│   │       └── index.tsx
│   ├── credits/
│   │   └── index.tsx             # Credits dashboard
│   ├── generation/
│   │   ├── progress.tsx          # Generation loading screen
│   │   └── upscale.tsx           # HD upscale progress
│   ├── plans/
│   │   ├── index.tsx             # Plan selection
│   │   └── confirm.tsx           # Subscription confirmation
│   ├── result/
│   │   ├── [jobId].tsx           # Result detail screen
│   │   └── compare.tsx           # Before/after comparison
│   └── settings/
│       ├── help.tsx              # Help & FAQ
│       ├── language.tsx          # Language selection
│       ├── notifications.tsx     # Notification preferences
│       ├── privacy.tsx           # Privacy policy
│       └── terms.tsx             # Terms of service
├── components/
│   ├── layout/
│   │   ├── GlassNavBar.tsx       # Glassmorphic bottom tab bar
│   │   ├── ScreenContainer.tsx   # Safe area + padding wrapper
│   │   └── TopBar.tsx            # Configurable top navigation
│   └── ui/
│       ├── Badge.tsx             # Plan tier badge
│       ├── Button.tsx            # Primary/secondary/tertiary button
│       ├── Card.tsx              # Surface container card
│       ├── Chip.tsx              # Selectable chip
│       ├── Input.tsx             # Labeled text input
│       └── Toggle.tsx            # Animated toggle switch
├── config/
│   └── environment.ts            # Environment configuration
├── hooks/
│   ├── useAuth.ts                # Auth convenience wrapper
│   ├── useCreditCost.ts          # Credit cost calculator
│   ├── useEntitlement.ts         # Feature gate checker
│   ├── useImagePicker.ts         # Image picker + upload
│   └── useJobPolling.ts          # Job status polling
├── i18n/
│   ├── index.ts                  # i18n initialization
│   └── en.json                   # English translations
├── services/
│   ├── api.ts                    # Axios instance + interceptors
│   ├── auth.ts                   # Login/register endpoints
│   ├── catalog.ts                # Room types & design styles
│   ├── credits.ts                # Credit balance endpoint
│   ├── files.ts                  # File upload/download
│   ├── jobs.ts                   # Job CRUD + polling
│   └── plans.ts                  # Plans & subscriptions
├── stores/
│   ├── authStore.ts              # Auth state + token management
│   ├── creditStore.ts            # Credit balance & limits
│   ├── settingsStore.ts          # App preferences
│   ├── studioStore.ts            # Studio workflow state
│   └── subscriptionStore.ts      # Plans, features, credit rules
├── types/
│   ├── api.ts                    # API response/request types
│   └── navigation.ts             # Route param types
├── assets/
│   └── fonts/                    # NotoSerif, Inter font files
├── .env                          # Environment variables
├── app.json                      # Expo configuration
├── babel.config.js               # Babel + NativeWind presets
├── global.css                    # Tailwind directives
├── index.ts                      # Entry point
├── metro.config.js               # Metro + NativeWind config
├── nativewind-env.d.ts           # NativeWind type declarations
├── package.json                  # Dependencies & scripts
├── tailwind.config.js            # Tailwind theme & tokens
└── tsconfig.json                 # TypeScript strict configuration
```

---

## 4. Configuration & Environment

### Environment Variables (`.env`)

```env
EXPO_PUBLIC_API_URL=http://192.168.0.29:8080
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_APP_NAME=The Architectural Lens (Dev)
EXPO_PUBLIC_ENABLE_LOGGING=true
```

### Environment Config (`config/environment.ts`)

Reads `EXPO_PUBLIC_*` variables and exports a typed configuration object:

```typescript
interface EnvironmentConfig {
  env: "development" | "production";
  apiUrl: string;
  appName: string;
  enableLogging: boolean;
}
```

Exports:

- `default` — The full config object
- `isDev` — Boolean helper
- `isProd` — Boolean helper

### Expo Config (`app.json`)

- **New Architecture:** Enabled (`newArchEnabled: true`)
- **Splash Screen:** Dark background (#131313) with centered icon
- **Plugins:** expo-router, expo-font, expo-localization, expo-secure-store, expo-image-picker
- **iOS:** Supports tablet
- **Android:** Edge-to-edge enabled, predictive back disabled

### TypeScript (`tsconfig.json`)

- **Strict mode** enabled
- **Path aliases:** `@/*` maps to `./*`
- Extends `expo/tsconfig.base`

### Babel (`babel.config.js`)

- Preset: `babel-preset-expo` with `jsxImportSource: "nativewind"`
- Additional preset: `nativewind/babel`

### Metro (`metro.config.js`)

- Extends Expo default config with `withNativeWind` (input: `./global.css`)

---

## 5. Design System

### Theme: "The Silent Curator"

The design language is a dark, luxury-gallery aesthetic aimed at architects and interior designers.

### Color Palette (Tailwind Tokens)

| Token                       | Hex       | Usage                     |
| --------------------------- | --------- | ------------------------- |
| `surface` (DEFAULT)         | `#131313` | Primary background        |
| `surface-container-low`     | `#1C1B1B` | Card backgrounds          |
| `surface-container`         | `#201F1F` | Mid-elevation surfaces    |
| `surface-container-high`    | `#2A2A2A` | Elevated cards, inputs    |
| `surface-container-highest` | `#353534` | Highest elevation         |
| `on-surface`                | `#E5E2E1` | Primary text              |
| `on-surface-variant`        | `#D0C5B8` | Secondary text            |
| `primary`                   | `#E1C39B` | Gold accent (interactive) |
| `primary-container`         | `#C4A882` | Gold secondary            |
| `on-primary`                | `#3F2D11` | Text on gold backgrounds  |
| `outline`                   | `#998F84` | Muted borders             |
| `outline-variant`           | `#4D463C` | Subtle dividers           |
| `error`                     | `#FFB4AB` | Error state               |

### Typography

| Font Family | Tailwind Class  | Usage                           |
| ----------- | --------------- | ------------------------------- |
| Noto Serif  | `font-headline` | Headlines, titles, display text |
| Inter       | `font-body`     | Body text, descriptions         |
| Inter       | `font-label`    | Labels, buttons, captions       |

### Custom Font Sizes

| Token         | Size | Line Height          |
| ------------- | ---- | -------------------- |
| `display-lg`  | 56px | 1.1                  |
| `headline-md` | 28px | 1.3                  |
| `title-md`    | 18px | 1.4                  |
| `body-md`     | 14px | 1.6                  |
| `label-sm`    | 11px | 1.4 + tracking 0.1em |

### Border Radius

| Token   | Value                   |
| ------- | ----------------------- |
| DEFAULT | 4px                     |
| `lg`    | 8px                     |
| `xl`    | 12px (signature radius) |
| `full`  | 9999px                  |

### Design Principles

- **No 1px borders** — Use tonal surface shifts for elevation
- **Glassmorphic nav bar** — 70% opacity surface + blur
- **Signature gradient:** `linear-gradient(135°, #C4A882, #A68E6B)`
- **Haptic feedback** on all interactive elements
- **Scale-on-press** animations (`transform: scale(0.98)`)
- **Uppercase tracking labels** — 0.1em–0.2em letter spacing

---

## 6. Routing & Navigation

### Architecture

The app uses **expo-router** (file-based routing) with three navigation layers:

```
Root Layout (Slot)
├── (auth)/ — Stack Navigator (fade animation)
│   ├── onboarding
│   ├── login
│   ├── register
│   └── forgot-password
├── (tabs)/ — Bottom Tab Navigator (GlassNavBar)
│   ├── studio/ — Stack Navigator
│   │   ├── index (upload)
│   │   ├── uploaded (room/style select)
│   │   ├── options (specifications)
│   │   ├── review (final review)
│   │   ├── smart-edit
│   │   ├── style-transfer
│   │   └── style (detail sheet)
│   ├── gallery/ — Stack Navigator
│   ├── history/ — Stack Navigator
│   └── profile/ — Stack Navigator
├── credits/
├── generation/
│   ├── progress
│   └── upscale
├── plans/
│   ├── index
│   └── confirm
├── result/
│   ├── [jobId] (dynamic)
│   └── compare
├── settings/
│   ├── help
│   ├── language
│   ├── notifications
│   ├── privacy
│   └── terms
├── credits-exhausted
├── upsell
├── error
└── +not-found (404)
```

### Auth Guard

Implemented in `app/_layout.tsx`:

```
if (!isAuthenticated && !inAuthGroup) → redirect to /(auth)/onboarding
if (isAuthenticated && inAuthGroup) → redirect to /(tabs)/studio
```

### Navigation Types (`types/navigation.ts`)

Defines `RootStackParamList` with typed params for all routes:

| Route                 | Params                 |
| --------------------- | ---------------------- |
| `generation/progress` | `{ jobId: string }`    |
| `generation/upscale`  | `{ jobId: string }`    |
| `result/[jobId]`      | `{ jobId: string }`    |
| `result/compare`      | `{ jobId: string }`    |
| `plans/confirm`       | `{ planCode: string }` |
| `error`               | `{ jobId?: string }`   |
| All others            | `undefined`            |

---

## 7. Authentication Flow

### Store: `authStore.ts`

| Method                                    | Description                                                         |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `login(email, password)`                  | POST `/api/auth/login` → stores token, orgId, userId in SecureStore |
| `register(email, password, displayName?)` | POST `/api/auth/register` → stores credentials                      |
| `logout()`                                | Clears SecureStore, resets state                                    |
| `hydrate()`                               | Reads SecureStore on app launch, restores auth state                |

### Token Storage (SecureStore Keys)

| Key          | Value            |
| ------------ | ---------------- |
| `auth_token` | JWT Bearer token |
| `org_id`     | Organization ID  |
| `user_id`    | User ID          |

### API Interceptors (`services/api.ts`)

- **Request interceptor:** Attaches `Authorization: Bearer <token>`, `X-Org-Id`, `X-User-Id` headers
- **Response interceptor:** On 401, deletes stored token (triggers re-auth on next hydrate)
- **Dev logging:** Logs `[API] METHOD URL` in development

### Auth Screens

| Screen              | Features                                                              |
| ------------------- | --------------------------------------------------------------------- |
| **Onboarding**      | 3-slide carousel introducing the app                                  |
| **Login**           | Email/password + forgot password link + Google/Apple social (UI only) |
| **Register**        | Email/password + social auth (UI only) + background hero image        |
| **Forgot Password** | Email input + simulated API call (placeholder)                        |

---

## 8. State Management

### Store Architecture (Zustand)

#### `authStore.ts` — Authentication

| State             | Type                   | Description      |
| ----------------- | ---------------------- | ---------------- |
| `token`           | `string \| null`       | JWT token        |
| `user`            | `UserResponse \| null` | Current user     |
| `orgId`           | `string \| null`       | Organization ID  |
| `isAuthenticated` | `boolean`              | Auth status      |
| `isLoading`       | `boolean`              | Hydration status |

#### `studioStore.ts` — Studio Workflow

| State            | Type                          | Default      | Description            |
| ---------------- | ----------------------------- | ------------ | ---------------------- |
| `step`           | `1 \| 2 \| 3 \| 4`            | `1`          | Current wizard step    |
| `photo`          | `{ uri, fileId } \| null`     | `null`       | Uploaded photo         |
| `roomType`       | `CatalogItemResponse \| null` | `null`       | Selected room type     |
| `designStyle`    | `CatalogItemResponse \| null` | `null`       | Selected design style  |
| `mode`           | `DesignMode`                  | `"REDESIGN"` | Generation mode        |
| `qualityTier`    | `QualityTier`                 | `"STANDARD"` | Output resolution      |
| `numOutputs`     | `number`                      | `1`          | Number of variants     |
| `preserveLayout` | `boolean`                     | `true`       | Keep room geometry     |
| `prompt`         | `string`                      | `""`         | User text prompt       |
| `negativePrompt` | `string`                      | `""`         | Negative prompt        |
| `colorPalette`   | `string`                      | `""`         | Selected palette color |
| `strength`       | `number`                      | `0.7`        | AI strength (0–1)      |
| `guidanceScale`  | `number`                      | `7.5`        | CFG scale              |
| `referencePhoto` | `{ uri, fileId } \| null`     | `null`       | Style transfer ref     |
| `maskData`       | `string \| null`              | `null`       | Inpaint mask data      |

#### `creditStore.ts` — Credits

| State          | Type     | Description             |
| -------------- | -------- | ----------------------- |
| `balance`      | `number` | Current credit balance  |
| `monthlyLimit` | `number` | Plan monthly allocation |
| `planCode`     | `string` | Current plan code       |

Methods: `fetchBalance()`, `canAfford(cost)`

#### `subscriptionStore.ts` — Subscriptions

| State          | Type                           | Description           |
| -------------- | ------------------------------ | --------------------- |
| `subscription` | `SubscriptionResponse \| null` | Active subscription   |
| `plans`        | `PlanResponse[] \| null`       | All available plans   |
| `features`     | `PlanFeatureResponse[]`        | Current plan features |
| `creditRules`  | `PlanCreditRuleResponse[]`     | Credit cost rules     |

Methods: `fetchSubscription()`, `fetchPlans()`, `isFeatureEnabled(code)`, `getCreditCost(feature, quality, outputs)`

#### `settingsStore.ts` — App Settings

| State                  | Type                | Default  |
| ---------------------- | ------------------- | -------- |
| `language`             | `string`            | `"en"`   |
| `theme`                | `"dark" \| "light"` | `"dark"` |
| `notificationsEnabled` | `boolean`           | `true`   |

---

## 9. API Layer & Services

### Base Configuration (`services/api.ts`)

```typescript
const api = axios.create({
  baseURL: env.apiUrl, // From EXPO_PUBLIC_API_URL
  timeout: 30000, // 30s timeout
  headers: { "Content-Type": "application/json" },
});
```

### Service Functions

#### `auth.ts`

| Function                                  | Method | Endpoint             | Returns        |
| ----------------------------------------- | ------ | -------------------- | -------------- |
| `login(email, password)`                  | POST   | `/api/auth/login`    | `AuthResponse` |
| `register(email, password, displayName?)` | POST   | `/api/auth/register` | `AuthResponse` |

#### `catalog.ts`

| Function                  | Method | Endpoint                     | Returns                 |
| ------------------------- | ------ | ---------------------------- | ----------------------- |
| `getRoomTypes(category?)` | GET    | `/api/catalog/room-types`    | `CatalogItemResponse[]` |
| `getDesignStyles()`       | GET    | `/api/catalog/design-styles` | `CatalogItemResponse[]` |

#### `credits.ts`

| Function       | Method | Endpoint               | Returns                 |
| -------------- | ------ | ---------------------- | ----------------------- |
| `getBalance()` | GET    | `/api/credits/balance` | `CreditBalanceResponse` |

#### `files.ts`

| Function           | Method | Endpoint              | Returns        |
| ------------------ | ------ | --------------------- | -------------- |
| `uploadImage(uri)` | POST   | `/api/files/upload`   | `FileResponse` |
| `getFile(fileId)`  | GET    | `/api/files/{fileId}` | `FileResponse` |

Note: `uploadImage` uses `multipart/form-data` with extracted filename and MIME type.

#### `jobs.ts`

| Function               | Method | Endpoint                   | Returns                     |
| ---------------------- | ------ | -------------------------- | --------------------------- |
| `createJob(request)`   | POST   | `/api/jobs`                | `JobResponse`               |
| `getJob(jobId)`        | GET    | `/api/jobs/{jobId}`        | `JobResponse`               |
| `listJobs(page, size)` | GET    | `/api/jobs`                | `PageResponse<JobResponse>` |
| `cancelJob(jobId)`     | POST   | `/api/jobs/{jobId}/cancel` | `void`                      |

#### `plans.ts`

| Function                  | Method | Endpoint                    | Returns                |
| ------------------------- | ------ | --------------------------- | ---------------------- |
| `listPlans()`             | GET    | `/api/plans`                | `PlanResponse[]`       |
| `getActiveSubscription()` | GET    | `/api/subscriptions/active` | `SubscriptionResponse` |

### Request Headers

All authenticated requests include:

- `Authorization: Bearer <token>`
- `X-Org-Id: <organizationId>`
- `X-User-Id: <userId>`

---

## 10. Custom Hooks

### `useAuth()`

Convenience wrapper around `authStore`:

```typescript
const { isAuthenticated, user, login, register, logout } = useAuth();
```

### `useCreditCost()`

Calculates credit cost based on current studio configuration:

- Reads `mode`, `qualityTier`, `numOutputs` from `studioStore`
- Maps `DesignMode` → feature codes (e.g., `REDESIGN` → `INTERIOR_REDESIGN`)
- Looks up cost from `subscriptionStore.getCreditCost()`

Returns: `{ cost: number }`

### `useEntitlement()`

Feature gating hook:

- Reads from `subscriptionStore.isFeatureEnabled()`
- Used to lock/unlock features like Style Transfer (Max-only)

### `useImagePicker()`

Image selection and upload:

- Wraps `expo-image-picker` for camera and gallery
- Handles permission requests
- Uploads via `files.uploadImage()`
- Returns `{ pickImage, isUploading }`

### `useJobPolling()`

Job status polling:

- Uses TanStack React Query with `refetchInterval`
- Polls `jobs.getJob()` until terminal status
- Navigates to result on completion, error screen on failure

---

## 11. UI Components Library

### Layout Components

#### `GlassNavBar`

Custom bottom tab bar with glassmorphic styling:

- Semi-transparent background (`rgba(19,19,19,0.7)`)
- iOS shadow glow effect
- 4 tabs: Studio, Gallery, History, Profile
- Ionicons with active/inactive states
- Haptic feedback on press
- Positioned absolutely at bottom with padding

#### `ScreenContainer`

Standard screen wrapper:

```tsx
<SafeAreaView edges={["top"]} className="flex-1 bg-surface">
  <View className="flex-1 px-8">{children}</View>
</SafeAreaView>
```

#### `TopBar`

Configurable top navigation:

- Optional back button
- Title or branding mode
- Right element slot
- Person icon default right element

### UI Components

#### `Button`

Three variants:

- **Primary:** Gold gradient (`#C4A882` → `#A68E6B`), haptic feedback, scale animation
- **Secondary:** Solid `surface-container-highest` background
- **Tertiary:** Text-only with primary color

Props: `title`, `onPress`, `variant`, `icon`, `disabled`, `fullWidth`

#### `Badge`

Plan tier indicator with color-coded backgrounds:

- FREE: `surface-container-highest` / `on-surface-variant`
- BASIC: `secondary-container` / `secondary`
- PRO: `primary-container` / `on-primary`
- MAX: `primary` / `on-primary`

#### `Card`

Simple surface container:

```tsx
<View className="bg-surface-container-high p-6 rounded-xl">{children}</View>
```

#### `Chip`

Selectable pill-shaped button:

- Selected: `bg-primary`, `text-on-primary`
- Unselected: `bg-surface-container-high`, `text-on-surface`

#### `Input`

Labeled text input with focus state:

- Uppercase tracking label (0.15em)
- Background shift on focus (`container-low` → `container-high`)
- Gold shadow glow when focused

#### `Toggle`

Custom animated toggle switch:

- Animated spring translation (Animated API)
- Gold track when active
- Haptic feedback on toggle

---

## 12. Screen Reference

### Auth Screens

| Screen          | Route                     | Description                                    |
| --------------- | ------------------------- | ---------------------------------------------- |
| Onboarding      | `/(auth)/onboarding`      | 3-step introduction carousel                   |
| Login           | `/(auth)/login`           | Email/password with hero image, social buttons |
| Register        | `/(auth)/register`        | Full-bleed background image, minimal form      |
| Forgot Password | `/(auth)/forgot-password` | Email submission (API placeholder)             |

### Studio Workflow (4-Step Process)

| Step | Screen         | Route                     | State                                          |
| ---- | -------------- | ------------------------- | ---------------------------------------------- |
| 1    | Upload         | `/(tabs)/studio`          | Sets `photo`                                   |
| 2    | Room & Style   | `/(tabs)/studio/uploaded` | Sets `roomType`, `designStyle`                 |
| 3    | Specifications | `/(tabs)/studio/options`  | Sets `mode`, `qualityTier`, `numOutputs`, etc. |
| 4    | Review         | `/(tabs)/studio/review`   | Displays summary, triggers generation          |

Additional studio screens:

- **Smart Edit** (`smart-edit`): Brush-based inpainting with slider, text prompt
- **Style Transfer** (`style-transfer`): Locked feature preview, upgrade CTA
- **Style Detail** (`style`): Bottom sheet style preview with characteristics

### Generation

| Screen   | Route                  | Description                                        |
| -------- | ---------------------- | -------------------------------------------------- |
| Progress | `/generation/progress` | Spinning animation, status messages, auto-redirect |
| Upscale  | `/generation/upscale`  | HD upscaling progress with phase labels            |

### Results

| Screen        | Route             | Description                                   |
| ------------- | ----------------- | --------------------------------------------- |
| Result Detail | `/result/[jobId]` | Full result with metadata, materials, actions |
| Compare       | `/result/compare` | Before/after split comparison                 |

### Plans & Credits

| Screen            | Route                | Description                             |
| ----------------- | -------------------- | --------------------------------------- |
| Plans             | `/plans`             | Plan cards + feature comparison table   |
| Confirm           | `/plans/confirm`     | Subscription confirmation with features |
| Credits           | `/credits`           | Balance, cost reference, usage history  |
| Credits Exhausted | `/credits-exhausted` | Zero balance with upgrade CTA           |

### Settings

| Screen        | Route                     | Description                      |
| ------------- | ------------------------- | -------------------------------- |
| Help          | `/settings/help`          | FAQ accordion + search + contact |
| Language      | `/settings/language`      | 9 language options               |
| Notifications | `/settings/notifications` | 5 toggle preferences             |
| Privacy       | `/settings/privacy`       | Privacy policy document          |
| Terms         | `/settings/terms`         | Terms of service document        |

### Utility Screens

| Screen    | Route         | Description                     |
| --------- | ------------- | ------------------------------- |
| Upsell    | `/upsell`     | HD quality membership upsell    |
| Error     | `/error`      | Global error with retry/support |
| Not Found | `/+not-found` | 404 with return to Studio       |

---

## 13. Internationalization (i18n)

### Setup (`i18n/index.ts`)

- Framework: `i18next` with `react-i18next`
- Default language: Device locale (via `expo-localization`), fallback to `"en"`
- Interpolation escaping disabled (React handles XSS)

### Translation Keys (`en.json`)

Organized by namespace:

| Namespace    | Key Count | Coverage                   |
| ------------ | --------- | -------------------------- |
| `app`        | 1         | App name                   |
| `onboarding` | 7         | Slides, buttons            |
| `auth`       | 12        | Login, register, social    |
| `tabs`       | 4         | Tab labels                 |
| `studio`     | 8         | Step titles, upload, tips  |
| `gallery`    | 4         | Title, empty state, search |
| `history`    | 3         | Title, empty state         |
| `profile`    | 9         | Menu items                 |
| `plans`      | 4         | Title, confirm, pricing    |
| `generation` | 5         | Status messages            |
| `credits`    | 3         | Title, exhausted, CTA      |
| `settings`   | 5         | Screen titles              |
| `common`     | 6         | Shared actions             |

### Supported Languages (UI Only)

English, Türkçe, العربية, Español, Français, Deutsch, 日本語, 中文, Italiano

> Note: Only English translations exist. Other languages are selectable in the UI but no translation files are provided.

---

## 14. Type System

### API Types (`types/api.ts`)

#### Enums

| Type            | Values                                                                               |
| --------------- | ------------------------------------------------------------------------------------ |
| `DesignMode`    | `"REDESIGN"`, `"EMPTY_ROOM"`, `"INPAINT"`, `"STYLE_TRANSFER"`                        |
| `QualityTier`   | `"STANDARD"`, `"HD"`, `"ULTRA_HD"`                                                   |
| `JobStatus`     | `"PENDING"`, `"SUBMITTED"`, `"PROCESSING"`, `"COMPLETED"`, `"FAILED"`, `"CANCELLED"` |
| `StorageStatus` | `"PENDING"`, `"UPLOADED"`, `"FAILED"`                                                |
| `FileKind`      | `"INPUT"`, `"OUTPUT"`, `"REFERENCE"`, `"MASK"`, `"PREVIEW"`, `"AVATAR"`              |

#### Key Interfaces

| Interface               | Description                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `AuthResponse`          | `{ token, user: UserResponse, organizationId }`                                                  |
| `UserResponse`          | `{ id, email, displayName, status, createdAt }`                                                  |
| `CatalogItemResponse`   | `{ id, code, name, description, category, previewUrl }`                                          |
| `FileResponse`          | `{ id, publicUrl, originalFileName, contentType, sizeBytes, width, height, kind, createdAt }`    |
| `CreateJobRequest`      | Full job creation params (inputFileId, roomTypeId, designStyleId, mode, options...)              |
| `JobResponse`           | `{ id, status, prompt, outputs: JobOutputResponse[], inputFile, metadata... }`                   |
| `JobOutputResponse`     | `{ id, ordinal, url, storageStatus, width, height, mimeType, fileSize, seed, generationTimeMs }` |
| `PlanResponse`          | `{ id, code, name, priceCents, monthlyCredits, features, creditRules... }`                       |
| `SubscriptionResponse`  | `{ id, planCode, status, monthlyCredits, modelTier, currentPeriodStart/End... }`                 |
| `CreditBalanceResponse` | `{ walletId, balance, currency, monthlyLimit, planCode, planName }`                              |
| `PageResponse<T>`       | `{ content: T[], totalElements, totalPages, size, number }`                                      |

---

## 15. Build & Development

### Scripts

```bash
npm start          # Start Expo dev server
npm run ios        # Start iOS simulator
npm run android    # Start Android emulator
npm run web        # Start web dev server
```

### Development Commands

```bash
npx expo start     # Start dev server with options
npx tsc --noEmit   # Type check without emitting
```

### React Query Config

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // Retry failed queries twice
      staleTime: 5 * 60 * 1000, // 5 minute stale time
    },
  },
});
```

### Provider Hierarchy (Root Layout)

```
GestureHandlerRootView
  └── SafeAreaProvider
        └── QueryClientProvider
              └── StatusBar (light)
              └── Slot (router outlet)
```

### Font Loading

| Font Name        | File                            |
| ---------------- | ------------------------------- |
| NotoSerif        | NotoSerif-Regular.ttf           |
| NotoSerif-Medium | NotoSerif-Regular.ttf (aliased) |
| NotoSerif-Bold   | NotoSerif-Regular.ttf (aliased) |
| Inter            | Inter-Regular.ttf               |
| Inter-Light      | Inter-Regular.ttf (aliased)     |
| Inter-Medium     | Inter-Regular.ttf (aliased)     |
| Inter-SemiBold   | Inter-Regular.ttf (aliased)     |

---

## Backend API Reference

### Spring Boot REST API

Base URL configured via `EXPO_PUBLIC_API_URL`.

| Endpoint Group | Base Path            | Description               |
| -------------- | -------------------- | ------------------------- |
| Auth           | `/api/auth`          | Login, register           |
| Catalog        | `/api/catalog`       | Room types, design styles |
| Files          | `/api/files`         | Image upload/download     |
| Jobs           | `/api/jobs`          | Generation jobs CRUD      |
| Plans          | `/api/plans`         | Available plans           |
| Subscriptions  | `/api/subscriptions` | Active subscription       |
| Credits        | `/api/credits`       | Credit balance            |

### Authentication Pattern

All requests (except auth endpoints) require:

```
Authorization: Bearer <jwt_token>
X-Org-Id: <organization_id>
X-User-Id: <user_id>
```

---

_End of Full Documentation_
