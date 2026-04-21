# Premium UI Review — Drawer + Profile + Gallery

**Tarih:** 2026-04-20
**Ekranlar:**
- `components/layout/SideDrawer.tsx` (drawer)
- `app/(tabs)/profile/index.tsx` (profile)
- `app/(tabs)/gallery/index.tsx` (gallery)

**Yöntem:** 4 ekran görüntüsü + kaynak kodu incelemesi.

---

## HIGH Priority

### 1. Drawer — Uzun Email Satır Ortasında Kırılıyor

Ekran görüntüsünde `dilandemirboz@gmail.com` "dilandemirboz@g / mail.com" olarak iki satıra bölünmüş. `displayName` null olduğu için email düz text gibi rendering yapılıyor, `numberOfLines` yok.

**Konum:** `components/layout/SideDrawer.tsx:229-238`

```tsx
<Text
  className="font-headline text-on-surface"
  style={{ fontSize: 20, fontWeight: "700", lineHeight: 24 }}
  numberOfLines={1}
  ellipsizeMode="middle"   // email için ortadan kısaltma okunabilir
>
  {user?.displayName || user?.email || t("drawer.architect")}
</Text>
```

Ayrıca uzun email'ler için font boyutu conditionally küçültülebilir (email tespit edilip 16px).

---

### 2. Profile — Credit Ring Her Zaman Dolu Görünüyor (State Yanılgısı)

`max = monthlyLimit || 200`. `monthlyLimit` subscription gelmeden önce `null`; fallback 200. Kullanıcı 966 credit'te ise `progress = Math.min(966/200, 1) = 1` — tüm 4 border renkli çizilir, kullanıcı "full" sanır. Border-trick implementasyonu zaten 25% basamaklı (akıcı arc değil) — premium hissi vermez.

**Konum:** `app/(tabs)/profile/index.tsx:17-72`

```tsx
import Svg, { Circle } from "react-native-svg";

function CreditRing({ value, max = 200, size = 64 }: {...}) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size/2} cy={size/2} r={radius} stroke="rgba(77,70,60,0.2)" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size/2} cy={size/2} r={radius}
          stroke="#E0C29A" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      <Text className="font-headline text-on-surface" style={{ fontSize: 22 }}>{value}</Text>
    </View>
  );
}
```

Ek olarak: eğer `monthlyLimit` gerçekten yoksa (credit pack sistemi), ring yerine düz sayı göster; yanıltıcı progress'i kaldır.

---

### 3. Gallery — "All Designs" + Plural Hardcoded İngilizce (i18n)

Empty state'te `t("gallery.title")` kullanılırken populated state header ve "All Designs" düz İngilizce.

**Konum:** `app/(tabs)/gallery/index.tsx:432-433, 464`

```tsx
// Satır 432-433 — mevcut:
{outputs.length} design{outputs.length !== 1 ? "s" : ""} · {count} jobs

// Fix (i18next plural interpolation):
{t("gallery.summary", {
  designCount: outputs.length,
  jobCount: jobs.filter(j => j.status === "COMPLETED").length,
})}
// i18n dosyalarına ekle:
// "gallery.summary": "{{designCount}} designs · {{jobCount}} jobs"

// Satır 464 — mevcut:
All Designs
// →
{t("gallery.all_designs")}
```

---

### 4. Sign Out Rengi Ekranlar Arası Tutarsız

- Drawer: `#FFB4AB` (error red) — destructive convention
- Profile: `#E0C29A` (gold) — aynı aksiyon farklı renkte

Kullanıcı "bu ikisi aynı şey mi?" diye sorar.

**Konum:** `app/(tabs)/profile/index.tsx:454-471`

```tsx
<Pressable onPress={logout} ...>
  <Ionicons name="log-out-outline" size={22} color="#FFB4AB" />
  <Text style={{ fontSize: 15, marginLeft: 16, color: "#FFB4AB", fontWeight: "500" }}>
    {t("drawer.sign_out")}
  </Text>
</Pressable>
```

Drawer'da olduğu gibi Alert.alert confirmation da eklenebilir — tek tıkla logout premium için risky.

---

### 5. Drawer — Active Item Chevron Opacity 0.4 Zayıf

Active Studio row'unda `opacity: 0.4` gold chevron zar zor görünür. Inactive'lerde `opacity: 0` — görünmez. Active state için daha güçlü indicator gerek.

**Konum:** `components/layout/SideDrawer.tsx:328-333`

```tsx
// Chevron yerine sol tarafta 3px gold bar (active indicator):
<Pressable ... style={{ ..., position: "relative" }}>
  {isActive && (
    <View style={{
      position: "absolute",
      left: 0,
      top: 12,
      bottom: 12,
      width: 3,
      borderRadius: 2,
      backgroundColor: "#E1C39B",
    }} />
  )}
  {/* icon + label */}
</Pressable>
```

Chevron'u kaldır — active state daha premium, daha belirgin.

---

## MEDIUM Priority

### 6. Profile — Avatar Dikdörtgen (100×120), Portre Çerçeve

Kullanıcı fotoğrafı için 100×120 dikdörtgen + `rounded-xl` (12px) alışılmadık. Premium uygulamalar (Linear, Apple, Notion) profil için çember veya square kullanır; dikey dikdörtgen "slot/poster" hissi verir.

**Konum:** `app/(tabs)/profile/index.tsx:253-278`

```tsx
// Çembere çevir:
<View
  className="items-center justify-center"
  style={{
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "#2A2A2A",
    borderWidth: 2,
    borderColor: "rgba(225,195,155,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  }}
>
```

---

### 7. Profile — Chevron Rengi `#4D463C` Neredeyse Görünmez

`#131313` arka plan üzerinde kontrast ~1.3:1. Satır tıklanabilir hissi zayıf.

**Konum:** `app/(tabs)/profile/index.tsx:449`

```tsx
// Mevcut:
<Ionicons name="chevron-forward" size={16} color="#4D463C" />

// Fix:
<Ionicons name="chevron-forward" size={16} color="#998F84" />
// outline color token - daha görünür, hala subtle
```

---

### 8. Gallery — Grid GAP=2px Çok Sıkışık

3 kolon Instagram-yoğunluğu için 2px makul ama Architectural Lens premium pozisyonluyor — Behance/Dribbble convention'ı 8-12px gap. Mevcut hali "image dump" hissi veriyor.

**Konum:** `app/(tabs)/gallery/index.tsx:101`

```tsx
const GAP = 2;
// →
const GAP = 8;
```

---

### 9. Gallery — Featured Card `borderRadius: 6` Çok Küçük

200px yüksek premium görsel için 6px radius "stock widget" gibi duruyor.

**Konum:** `app/(tabs)/gallery/index.tsx:196`

```tsx
// Mevcut:
borderRadius: 6,

// Fix (primary button radius'u ile tutarlı):
borderRadius: 16,
```

Ek olarak subtle shadow + border ekle:
```tsx
marginHorizontal: 16,  // GAP yerine ekran padding'i
shadowColor: "#000",
shadowOffset: { width: 0, height: 12 },
shadowOpacity: 0.35,
shadowRadius: 20,
```

---

### 10. Drawer — "SETTINGS" Section Padding Tutarsız

- `NAVIGATE` label: `paddingHorizontal: 34`
- `SETTINGS` label: `paddingHorizontal: 10`

Göz hizası kayıyor.

**Konum:** `components/layout/SideDrawer.tsx:265,339`

```tsx
// Satır 339:
<View style={{ marginTop: 32, marginBottom: 12, paddingHorizontal: 10 }}>
// →
<View style={{ marginTop: 32, marginBottom: 12, paddingHorizontal: 34 }}>
```

---

### 11. Drawer — MAX Badge `letterSpacing: -0.3`

Uppercase metinde negatif tracking premium tipografi kuralını bozuyor. Karakterler sıkışıyor.

**Konum:** `components/layout/SideDrawer.tsx:218`

```tsx
letterSpacing: -0.3,
// →
letterSpacing: 1,
```

---

### 12. Profile — "SETTINGS" Header Drawer ile Tutarsız

- Drawer: gold `rgba(224,194,154,0.6)`, size 11, letterSpacing 3
- Profile: `text-secondary` (#C8C6C5 açık gri), size 10, letterSpacing 2

Aynı kelime, iki farklı görsel identity.

**Konum:** `app/(tabs)/profile/index.tsx:398-409`

```tsx
<Text
  className="font-label"
  style={{
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "rgba(224,194,154,0.6)",
    marginBottom: 16,
  }}
>
  {t("drawer.settings")}
</Text>
```

---

### 13. Profile — Email Text `fontWeight: 300`, 12px

12px'te Thin/300 weight okunabilirlik düşük, özellikle `text-on-surface-variant` (#D0C5B8).

**Konum:** `app/(tabs)/profile/index.tsx:331-336`

```tsx
style={{ fontSize: 13, fontWeight: "400", letterSpacing: 0.3 }}
```

---

## LOW Priority

### 14. Drawer — Haptic Feedback Yok

NavBar her tab'da haptic veriyor; drawer nav item tıklamalarında sessiz.

**Konum:** `components/layout/SideDrawer.tsx:111-117`

```tsx
import * as Haptics from "expo-haptics";

const navigate = useCallback((route: string) => {
  Haptics.selectionAsync();
  onClose();
  setTimeout(() => router.push(route as any), 150);
}, [onClose]);
```

---

### 15. Drawer — Solid Panel, Blur Yok

NavBar glass efektiyle tutarsız. `#1C1B1B` solid. `BlurView` + hafif gold border glow daha premium.

**Konum:** `components/layout/SideDrawer.tsx:157-178`

```tsx
import { BlurView } from "expo-blur";

// Animated.View içinde backgroundColor'ı kaldır, içine BlurView ekle:
<BlurView intensity={80} tint="dark" style={{ ...StyleSheet.absoluteFillObject, borderTopRightRadius: 16, borderBottomRightRadius: 16 }} />
<View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(28,27,27,0.85)" }} />
```

---

### 16. Gallery — Featured Card Tap Haptic Yok

**Konum:** `app/(tabs)/gallery/index.tsx:180-185`

```tsx
const handleTap = useCallback((item: GalleryOutput) => {
  Haptics.selectionAsync();
  router.push(`/result/${item.jobId}`);
}, []);

const handleLongPress = useCallback((item: GalleryOutput) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setPreviewItem(item);
}, []);
```

---

### 17. Gallery — HD Badge `letterSpacing: 0.8` Uppercase için Dar

**Konum:** `app/(tabs)/gallery/index.tsx:256, 306`

```tsx
letterSpacing: 0.8,  // →  letterSpacing: 1.5,
```

---

### 18. Gallery — Empty vs Populated Title Boyutu Farklı

- Empty: `fontSize: 36, lineHeight: 42`
- Populated: `fontSize: 28, lineHeight: 32`

Aynı ekran, aynı başlık — tutarlı boyut olmalı.

**Konum:** `app/(tabs)/gallery/index.tsx:385-389, 423-426`

İkisini de `fontSize: 32, lineHeight: 38` yap — görsel sürekliliği artar.

---

### 19. Profile — Credits/Plan Card Alignment Asimetrik

- Credits: `items-center justify-center` (tamamen merkezli)
- Plan: `justify-center` (dikey merkez, yatay sol)

Premium grid'lerde eş cell hizalaması beklenir.

**Konum:** `app/(tabs)/profile/index.tsx:343-393`

İki seçenek:
- **A:** Plan card'ı da merkezle (küçük içerik için iyi çalışmaz — "Renews in 363 days" sola yaslı daha okunur).
- **B:** Credits card'ı sola yasla, header+ring+label left-aligned şekilde:

```tsx
<View className="flex-1 bg-surface-container-low rounded-xl" style={{ padding: 20 }}>
  <Text className="font-label text-secondary" style={{...}}>{t("profile.credits_label")}</Text>
  <View style={{ marginTop: 8 }}>
    <CreditRing value={balance} max={monthlyLimit || 200} />
  </View>
</View>
```

Seçim B tercih edilir — Plan card ile paralel yapı.

---

### 20. Profile — Icon Color Typo

Menu ikonlarında `#D1C5B8` kullanılmış; diğer ekranlarda `#D0C5B8` (on-surface-variant). Tek digit fark ama design token'dan sapma.

**Konum:** `app/(tabs)/profile/index.tsx:426`

```tsx
color="#D1C5B8"
// →
color="#D0C5B8"
// veya daha iyisi:
className="text-on-surface-variant"  // token
```

---

## Özet Tablosu

| # | Sorun | Öncelik | Dosya | Satır |
|---|-------|---------|-------|-------|
| 1 | Uzun email satırortası kırılıyor | HIGH | SideDrawer.tsx | 229 |
| 2 | Credit ring her zaman dolu görünüyor | HIGH | profile/index.tsx | 17-72 |
| 3 | "All Designs" + plural hardcoded EN (i18n) | HIGH | gallery/index.tsx | 432, 464 |
| 4 | Sign out rengi ekranlar arası tutarsız | HIGH | profile/index.tsx | 459-466 |
| 5 | Active drawer item zayıf indicator | HIGH | SideDrawer.tsx | 328 |
| 6 | Profile avatar dikdörtgen (100×120) | MEDIUM | profile/index.tsx | 256 |
| 7 | Chevron `#4D463C` görünmüyor | MEDIUM | profile/index.tsx | 449 |
| 8 | Grid GAP=2px çok sıkışık | MEDIUM | gallery/index.tsx | 101 |
| 9 | Featured card radius 6px küçük | MEDIUM | gallery/index.tsx | 196 |
| 10 | Drawer SETTINGS padding 10 vs 34 | MEDIUM | SideDrawer.tsx | 339 |
| 11 | MAX badge negatif letterSpacing | MEDIUM | SideDrawer.tsx | 218 |
| 12 | Profile SETTINGS stil drawer ile farklı | MEDIUM | profile/index.tsx | 398 |
| 13 | Email 12px + fontWeight 300 zor okunur | MEDIUM | profile/index.tsx | 333 |
| 14 | Drawer nav haptic yok | LOW | SideDrawer.tsx | 111 |
| 15 | Drawer solid panel, blur yok | LOW | SideDrawer.tsx | 157 |
| 16 | Gallery tap/long-press haptic yok | LOW | gallery/index.tsx | 180 |
| 17 | HD badge letterSpacing 0.8 | LOW | gallery/index.tsx | 256, 306 |
| 18 | Empty/populated title boyut farkı | LOW | gallery/index.tsx | 385, 423 |
| 19 | Credits vs Plan card asimetri | LOW | profile/index.tsx | 343 |
| 20 | Icon color typo `#D1C5B8` | LOW | profile/index.tsx | 426 |
