# Premium UI Review — Studio Wizard Flow (Step 1–3)

**Tarih:** 2026-04-20
**Ekranlar:**
- `app/(tabs)/studio/index.tsx` (Step 1 — photo uploaded branch)
- `app/(tabs)/studio/uploaded.tsx` (Step 1 — dedicated uploaded screen)
- `app/(tabs)/studio/style.tsx` (Step 2 — Describe Your Space)
- `app/(tabs)/studio/options.tsx` (Step 3 — Design Specifications)

**Yöntem:** 4 ekran görüntüsü + kaynak kodu incelemesi.

---

## HIGH Priority

### 1. Duplicate Step 1 Ekranı — `index.tsx` photo branch == `uploaded.tsx`

Flow: `index.tsx` (upload) → photo seçilince aynı ekranda `if (photo)` branch render eder → "Continue to Architecture" tıklanınca `/studio/uploaded` push edilir → **aynı içerik yeniden gösterilir** (başlık "Analyze Your Space", aynı fotoğraf, "Continue to Architecture" CTA). Kullanıcı Step 1'i iki kez görür.

Ekran görüntüleri karşılaştırması:
- Screenshot 1: `index.tsx` (küçük × close, text-only "CHANGE PHOTO")
- Screenshot 2: `uploaded.tsx` (büyük × close, refresh icon + "CHANGE PHOTO", tip box)

**Konum:** `app/(tabs)/studio/index.tsx:57-152`

**Fix:** `index.tsx`'teki `if (photo) { return ... }` branch'ini sil. Photo seçilir seçilmez doğrudan `/studio/uploaded`'e push et:

```tsx
const handleUpload = async () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const result = await pickImage("gallery");
  if (result) {
    setPhoto(result);
    router.push("/studio/uploaded");
  }
};
```

Photo branch'i tamamen kaldır; empty state tek render edilecek şey olsun. `uploaded.tsx` tek otoriter Step 1 confirmation ekranı olur.

---

### 2. `style.tsx` — Tüm Strings Hardcoded İngilizce (i18n)

Dosya React Native metnini `t()` kullanmadan yazıyor. Diğer Studio dosyaları (uploaded.tsx, options.tsx) translation key kullanırken bu dosya komple İngilizce — dil seçimi bu ekrana etki etmiyor.

**Konum:** `app/(tabs)/studio/style.tsx`

| Satır | Mevcut | Olmalı |
|-------|--------|--------|
| 259 | `"Select Space"` | `{t("studio.select_space")}` |
| 471 | `"STEP 2 OF 4"` | `{t("studio.step_2_of_4")}` |
| 482 | `"Describe Your Space"` | `{t("studio.step2_title")}` |
| 498 | `"Loading catalog…"` | `{t("studio.loading_catalog")}` |
| 515 | `"ROOM TYPE"` | `{t("studio.room_type")}` |
| 562 | `"Select a room type…"` | `{t("studio.select_room_placeholder")}` |
| 581 | `"DESIGN STYLE"` | `{t("studio.design_style")}` |
| 666 | `"Selected"` | `{t("common.selected")}` |
| 759 | `"Next Step"` | `{t("common.next")}` |

`group.category` (line 297) da veritabanından İngilizce geliyor — backend tarafında locale-aware yapılmalı veya client-side mapping gerekebilir.

---

### 3. Hardcoded External Avatar URL — `googleusercontent.com`

`options.tsx:176` ve `review.tsx:163`'te sağ üst avatar `https://lh3.googleusercontent.com/aida-public/AB6AXu...` URL'sine bağlı. Bu AI template'inden kalan placeholder — gerçek kullanıcının fotoğrafını göstermiyor. Hesap silinse / URL rotate olsa kırılır; ayrıca her request'te external CDN hit ediyor.

**Konum:** `options.tsx:163-181`, `review.tsx:150-168`

```tsx
// Mevcut:
<View className="overflow-hidden" style={{...}}>
  <Image source={{ uri: "https://lh3.googleusercontent.com/..." }} ... />
</View>

// Fix:
import { UserAvatar } from "@/components/ui/UserAvatar";
<UserAvatar size="sm" onPress />
```

Aynı component diğer ekranlarda kullanılıyor; sadece bu iki Studio ekranı unutulmuş.

---

### 4. `style.tsx` — PrimaryButton Yerine Duplicate Gradient

Proje geneli CTA kontratı `PrimaryButton` component (docstring'inde "Use this for every primary call-to-action so the app reads as one product" yazıyor). `style.tsx:726-763` bu kurala rağmen kendi LinearGradient'ini kuruyor. Component değişirse bu ekran güncel kalmıyor.

**Konum:** `app/(tabs)/studio/style.tsx:726-763`

```tsx
import { PrimaryButton } from "@/components/ui/PrimaryButton";

<View style={{
  position: "absolute", bottom: 0, left: 0, right: 0,
  paddingHorizontal: 24, paddingBottom: 96, paddingTop: 16,
}}>
  <PrimaryButton
    label={t("common.next_step")}
    onPress={handleNext}
    disabled={!canProceed}
  />
</View>
```

---

### 5. `style.tsx` — Design Style Kart Adı CTA Arkasında Kalıyor

Screenshot 3'te "Scandinavian" ve "Industrial" isimleri NEXT STEP butonunun arkasında — yarı kesik görünüyor. Grid scroll edilebilir ama son satırın altında yeterli `paddingBottom` yok; fixed CTA içeriği örtüyor.

**Konum:** `app/(tabs)/studio/style.tsx:456`

```tsx
// Mevcut:
contentContainerStyle={{ paddingBottom: 200 }}

// Fix (CTA'nın yüksekliği = 56 + pb-96 + pt-16 = ~112 + nav = ~180; safe margin):
contentContainerStyle={{ paddingBottom: 240 }}
```

---

## MEDIUM Priority

### 6. `options.tsx` — Quality Tier Seçili State Kontrastı Düşük

Outer container `#1C1B1B`, inner track `#131313`, seçili pill `#2A2A2A`. Karanlık üstüne karanlık üstüne karanlık — seçili öğe zar zor ayırt ediliyor.

**Konum:** `app/(tabs)/studio/options.tsx:317-320`

```tsx
// Mevcut:
backgroundColor: isSelected ? "#2A2A2A" : "transparent",

// Fix — warm gold subtle fill + border:
backgroundColor: isSelected ? "rgba(225,195,155,0.12)" : "transparent",
borderWidth: isSelected ? 1 : 0,
borderColor: "rgba(225,195,155,0.3)",
```

Text rengi de daha kontrastlı olsun: `isSelected ? "#E1C39B" : "#998F84"`.

---

### 7. `options.tsx` — Strength Slider Discrete 5 Basamak

Beş ayrı tap-edilebilir bar + `[0.25, 0.5, 0.7, 0.85, 1.0]` sabit değerler. Premium algı için continuous slider (`@react-native-community/slider` veya `react-native-reanimated` + gesture) daha uygun. Mevcut haliyle "slider" değil "chip group" gibi davranıyor ama görsel olarak bar şeklinde.

**Konum:** `app/(tabs)/studio/options.tsx:393-412`

```tsx
import Slider from "@react-native-community/slider";

<Slider
  value={strength}
  onValueChange={setStrength}
  minimumValue={0.1}
  maximumValue={1.0}
  step={0.05}
  minimumTrackTintColor="#E1C39B"
  maximumTrackTintColor="#353534"
  thumbTintColor="#FDDEB4"
  disabled={!strengthAllowed}
/>
```

Eğer discrete snap istiyorsanız en az 3'e indirin ("SUBTLE / BALANCED / DRAMATIC") — 5 seviye görsel olarak sıkışık.

---

### 8. `options.tsx` — "SUBTLE" / "DRAMATIC" Labels `fontSize: 9`

9px sistem limitinde — okunabilirlik düşük. Uppercase + letterSpacing 1 ile biraz toparlanmış ama hala çok küçük.

**Konum:** `app/(tabs)/studio/options.tsx:416, 422`

```tsx
style={{ fontSize: 10, color: "#998F84", letterSpacing: 1.5 }}
```

Ayrıca hardcoded İngilizce → `{t("studio.strength_subtle")}` / `{t("studio.strength_dramatic")}`.

---

### 9. `options.tsx` — "Design Specifications" Başlığı 2 Satır

Screenshot 4'te "Design / Specifications" ekran yarısını kaplıyor. 36px × 40 lineHeight çok agresif. Ekranın %30'u sadece başlık.

**Konum:** `app/(tabs)/studio/options.tsx:204-208`

```tsx
// Mevcut:
style={{ fontSize: 36, lineHeight: 40, fontWeight: "700" }}

// Fix — 1 satıra sığsın, içerik için alan açılsın:
style={{ fontSize: 30, lineHeight: 34, fontWeight: "700" }}
```

Aynı sorun diğer step'lerde uzun başlıklarda çıkabilir ("Describe Your Space" zaten sığıyor — 30'a çeksek bile fine).

---

### 10. `uploaded.tsx` — Brand Split Fragile + Tip Hardcoded İngilizce

İki issue tek yerde:

**Konum:** `app/(tabs)/studio/uploaded.tsx:50, 162-165`

```tsx
// Satır 50 — split fragile:
{t("app.brand").split(" ").join("\n")}
// →
{"ARCHITECTURAL\nLENS"}

// Satır 162-165 — hardcoded:
For best results, use a well-lit photo taken straight on with no people or pets in the frame.
// →
{t("studio.tip_best_results")}
```

---

### 11. `style.tsx` — Room Type Empty State Affordance Zayıf

Boş state'te border `rgba(77,70,60,0.25)` — ~10% opacity gray. "Select a room type..." text `#998F84` (outline color). Tap-edilebilir olduğu belli değil.

**Konum:** `app/(tabs)/studio/style.tsx:525-527`

```tsx
// Mevcut:
borderColor: roomType ? "rgba(224,194,154,0.35)" : "rgba(77,70,60,0.25)",

// Fix — empty state daha belirgin:
borderColor: roomType ? "rgba(224,194,154,0.4)" : "rgba(224,194,154,0.15)",
backgroundColor: roomType ? "rgba(42,42,42,0.6)" : "rgba(28,27,27,0.8)",
```

Ayrıca chevron `color="#998F84"` yerine `color="#E0C29A"` ile tap-edilebilirliği vurgula.

---

### 12. `options.tsx` — Design Mode Chip Active State Zayıf

`isActive` durumunda `backgroundColor: "#E1C39B"` + text `#3F2D11`. Ancak locked modları ayırt etmek için ekstra treatment yok. Locked chip `opacity: 0.5` ile gösteriliyor — gold metnin %50'si hala gold, kilit ikonu olmadan ayırt edilemez.

**Konum:** `app/(tabs)/studio/options.tsx:238-268`

Locked için border dashed ve gri tonlu background:
```tsx
backgroundColor: isActive ? "#E1C39B" : locked ? "rgba(28,27,27,0.6)" : "#2A2A2A",
borderWidth: locked ? 1 : 0,
borderColor: locked ? "rgba(153,143,132,0.3)" : "transparent",
borderStyle: locked ? "dashed" : "solid",
```

---

## LOW Priority

### 13. Studio Wizard Geneli — Micro-interactions Haptic Yok

Mode chip, quality tier, strength bar, palette tap — hiçbirinde haptic yok. Seçim confirmation'ı için `Haptics.selectionAsync()` uygun.

**Konum:** `options.tsx:230, 308, 398, 454`

```tsx
import * as Haptics from "expo-haptics";

onPress={() => {
  Haptics.selectionAsync();
  setMode(m.key);
}}
```

---

### 14. `options.tsx` — "Real-time Preview" Hardcoded

Preview card glass label.

**Konum:** `app/(tabs)/studio/options.tsx:632`

```tsx
Real-time Preview
// →
{t("studio.realtime_preview")}
```

---

### 15. `options.tsx` — Seed Yardım Metni Hardcoded

**Konum:** `app/(tabs)/studio/options.tsx:725`

```tsx
Use a specific seed to reproduce identical outputs.
// →
{t("studio.seed_help")}
```

---

### 16. `style.tsx` — Design Style Kart Perspektif Distorsiyonu

Screenshot 3'te Modern ve Minimalist kartlarının görselleri 3D perspektif eğrilmiş — sanki kartın kendisi isometric açıda. Bu `@/assets/styles/*.png` varlıklarının bakedi. Premium tool için flat front-view renderlar daha temiz okuma sağlar. Asset rework işi (design-side), kod değişikliği değil — issue olarak not ediyorum.

---

### 17. `uploaded.tsx` — Tip Box `backgroundColor: "#1C1B1B"` Hardcoded Hex

Tema token'ı var (`surface-container-low`) ama raw hex kullanılmış.

**Konum:** `app/(tabs)/studio/uploaded.tsx:152`

```tsx
backgroundColor: "#1C1B1B"
// →
className="bg-surface-container-low"
// veya style içinde kalacaksa: tailwind.config.js'teki token'dan import
```

---

### 18. `options.tsx` — Locked Indicator Sadece Opacity 0.4

Lock icon var ama kartın kilidine çarpıcı bir görsel ipucu yok. Hover/press'te "upgrade plan" micro-tooltip veya subtle gold border glow ekle.

**Konum:** `app/(tabs)/studio/options.tsx:316-345`

Quality tier kilidi için üst-sağa küçük "PRO" rozeti eklenebilir (`AI Strength`'teki gibi — 389. satır).

---

## Özet Tablosu

| # | Sorun | Öncelik | Dosya | Satır |
|---|-------|---------|-------|-------|
| 1 | Duplicate Step 1 (index photo branch = uploaded.tsx) | HIGH | studio/index.tsx | 57-152 |
| 2 | style.tsx tüm stringler hardcoded EN | HIGH | studio/style.tsx | 259, 471, 482, 498, 515, 562, 581, 666, 759 |
| 3 | Hardcoded googleusercontent avatar URL | HIGH | options.tsx, review.tsx | 176, 163 |
| 4 | style.tsx PrimaryButton kullanmıyor | HIGH | studio/style.tsx | 726-763 |
| 5 | Design Style adı CTA arkasında | HIGH | studio/style.tsx | 456 |
| 6 | Quality Tier seçili state düşük kontrast | MEDIUM | options.tsx | 317 |
| 7 | Strength discrete 5 bar, slider değil | MEDIUM | options.tsx | 393-412 |
| 8 | SUBTLE/DRAMATIC `fontSize: 9` | MEDIUM | options.tsx | 416, 422 |
| 9 | "Design Specifications" başlığı 2 satır | MEDIUM | options.tsx | 205 |
| 10 | Brand split + tip hardcoded | MEDIUM | uploaded.tsx | 50, 162 |
| 11 | Room Type empty state affordance zayıf | MEDIUM | style.tsx | 525 |
| 12 | Design Mode locked chip ayırt edilmiyor | MEDIUM | options.tsx | 238 |
| 13 | Wizard geneli haptic yok | LOW | options.tsx | 230, 308, 398, 454 |
| 14 | "Real-time Preview" hardcoded | LOW | options.tsx | 632 |
| 15 | Seed yardım metni hardcoded | LOW | options.tsx | 725 |
| 16 | Design Style kart perspektif distorsiyonu | LOW | assets | — |
| 17 | Tip box raw hex backgroundColor | LOW | uploaded.tsx | 152 |
| 18 | Locked quality tier zayıf görsel ipucu | LOW | options.tsx | 316-345 |
