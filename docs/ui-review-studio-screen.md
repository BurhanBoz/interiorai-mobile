# Premium UI Review — Studio Screen (Step 1)

**Tarih:** 2026-04-20  
**Ekran:** `app/(tabs)/studio/index.tsx` + `components/layout/GlassNavBar.tsx`  
**Yöntem:** Ekran görüntüsü analizi + kaynak kodu incelemesi

---

## HIGH Priority

### 1. i18n Bug — Boş state hardcoded İngilizce

Photo-uploaded branch `t()` kullanırken empty state düz string. Tüm dil desteği kırık.

**Konum:** `app/(tabs)/studio/index.tsx:195,204`

```tsx
// Satır 195 — mevcut:
STEP 1 OF 4

// Olmalı:
{t("studio.step_1_of_4")}

// Satır 204 — mevcut:
Analyze Your Space

// Olmalı:
{t("studio.step1_title")}
```

---

### 2. "TAKE A PHOTO" Butonu Neredeyse Görünmez

`rgba(77,70,60,0.2)` border, `#131313` arka plan üzerinde kontrast oranı ~1.02:1. Kullanıcı tap-target'ı göremez. Aynı zamanda icon `#E0C29A`, text `#D0C5B8` — renk tutarsızlığı.

**Konum:** `app/(tabs)/studio/index.tsx:267,285`

```tsx
// Border — mevcut:
borderColor: "rgba(77,70,60,0.2)",

// Fix (upload zone ile tutarlı, görünür):
borderColor: "#4D463C",

// Text rengi — satır 285'teki inline override kaldır:
// color: "#D0C5B8"  ← sil
// className'e text-primary ekle
```

---

### 3. Haptic Feedback Yok — Primary Interaction'larda

NavBar her tab'da `Haptics.impactAsync` çağırıyor. Upload ve Camera tap'leri sessiz — tutarsız, premium hissini öldürüyor.

**Konum:** `app/(tabs)/studio/index.tsx:39-51`

```tsx
import * as Haptics from "expo-haptics";

const handleUpload = async () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const result = await pickImage("gallery");
  if (result) setPhoto(result);
};

const handleCamera = async () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const result = await pickImage("camera");
  if (result) setPhoto(result);
};
```

---

### 4. NavBar — Gerçek Blur Efekti Yok

`rgba(19,19,19,0.7)` blur olmadan kullanılmış. Arkadaki içerik NavBar'a "geçmiyor" — glass değil, mat plastik görünüyor.

**Konum:** `components/layout/GlassNavBar.tsx:19-30`

```tsx
import { BlurView } from "expo-blur";

// Mevcut inner View → BlurView ile değiştir:
<BlurView
  intensity={55}
  tint="dark"
  className="flex-row items-center justify-around rounded-xl overflow-hidden"
  style={{
    backgroundColor: "rgba(19, 19, 19, 0.45)",
    ...(Platform.OS === "ios" && {
      shadowColor: "#F5F0EB",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.06,
      shadowRadius: 40,
    }),
  }}
>
```

---

### 5. NavBar — Active Tab Indicator Yok

Sadece renk değişimi zayıf affordance. Premium uygulamalarda pill veya dot indicator beklenir.

**Konum:** `components/layout/GlassNavBar.tsx:41-54`

```tsx
<Pressable ...>
  <Ionicons ... />
  <Text ...>{t(tab.labelKey)}</Text>
  <View
    style={{
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: isActive ? "#E1C39B" : "transparent",
      marginTop: 3,
    }}
  />
</Pressable>
```

---

## MEDIUM Priority

### 6. "PROFESSIONAL TIPS" Header Çift Kısılmış

`text-on-surface-variant` (#D0C5B8) zaten muted. Üstüne `opacity: 0.6` = efektif #7E7871 — WCAG AA altında.

**Konum:** `app/(tabs)/studio/index.tsx:296-304`

```tsx
style={{
  fontSize: 11,
  letterSpacing: 3,
  textTransform: "uppercase",
  // opacity: 0.6  ← kaldır
}}
```

---

### 7. Tip Başlıkları — `letterSpacing: 0.5` Uppercase için Çok Dar

App geneli uppercase convention 1.5–3 arası. 0.5'te karakterler iç içe geçiyor.

**Konum:** `app/(tabs)/studio/index.tsx:332`

```tsx
letterSpacing: 0.5,
// →
letterSpacing: 1.5,
```

---

### 8. OR Divider Çizgileri Görünmez

`rgba(77,70,60,0.2)` = `#4D463C`'nin %20'si. `#131313` üzerinde neredeyse sıfır kontrast.

**Konum:** `app/(tabs)/studio/index.tsx:243,255`

```tsx
// Her iki View'da:
backgroundColor: "rgba(77,70,60,0.2)"
// →
backgroundColor: "#4D463C"
```

---

### 9. Tip Icon Container Orantısız

64px kutu, 28px icon = icon alanın yalnızca %43'ünü dolduruyor. Boş alan pahalı görünmüyor, sadece seyrek.

**Konum:** `app/(tabs)/studio/index.tsx:317-324`

```tsx
// Option A — konteyneri küçült:
width: 52, height: 52,  // icon size={28} ile %54 fill

// Option B — icon büyüt:
<Ionicons name={tip.icon} size={32} color="#E1C39B" />
```

---

### 10. `mb-12` Kamera Butonunun Altında Aşırı Boşluk

48px boşluk, tips section'dan önce ekran "kopuyor".

**Konum:** `app/(tabs)/studio/index.tsx:270`

```tsx
className="w-full flex-row items-center justify-center py-4 mb-12"
// →
className="w-full flex-row items-center justify-center py-4 mb-8"
```

---

## LOW Priority

### 11. Brand Name Split Fragile

Çeviri string'i değişirse kırılır.

**Konum:** `app/(tabs)/studio/index.tsx:173`

```tsx
// Mevcut:
{t("app.brand").split(" ").join("\n")}

// Fix:
{"ARCHITECTURAL\nLENS"}
```

---

### 12. Upload Icon — Idle State Animation Yok

Boş ekranda statik icon premium hissi vermiyor. Subtle breathing ekle.

**Konum:** `app/(tabs)/studio/index.tsx:221-226`

```tsx
import { useRef, useEffect } from "react";
import { Animated } from "react-native";

// Component içinde:
const pulse = useRef(new Animated.Value(1)).current;
useEffect(() => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
    ])
  ).start();
}, []);

// Icon'u wrap et:
<Animated.View style={{ opacity: pulse }}>
  <Ionicons name="cloud-upload-outline" size={36} color="#E0C29A" style={{ marginBottom: 16 }} />
</Animated.View>
```

---

## Özet Tablosu

| # | Sorun | Öncelik | Dosya | Satır |
|---|-------|---------|-------|-------|
| 1 | Hardcoded İngilizce string (i18n bug) | HIGH | studio/index.tsx | 195, 204 |
| 2 | Camera button border invisible | HIGH | studio/index.tsx | 267, 285 |
| 3 | Haptic feedback yok | HIGH | studio/index.tsx | 39–51 |
| 4 | NavBar'da gerçek blur yok | HIGH | GlassNavBar.tsx | 19 |
| 5 | NavBar active indicator yok | HIGH | GlassNavBar.tsx | 41 |
| 6 | Tips header çift opacity | MEDIUM | studio/index.tsx | 300 |
| 7 | Uppercase letterSpacing 0.5 | MEDIUM | studio/index.tsx | 332 |
| 8 | OR divider görünmez | MEDIUM | studio/index.tsx | 243 |
| 9 | Icon/container orantısı kötü | MEDIUM | studio/index.tsx | 317 |
| 10 | `mb-12` aşırı boşluk | MEDIUM | studio/index.tsx | 270 |
| 11 | Brand split() fragile | LOW | studio/index.tsx | 173 |
| 12 | Upload icon animasyonsuz | LOW | studio/index.tsx | 221 |
