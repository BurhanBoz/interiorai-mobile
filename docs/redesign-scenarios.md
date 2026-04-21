# Redesign Senaryoları — Plan Başına Adım Adım

**Tarih:** 2026-04-20
**Amaç:** Her subscription plan için gerçekçi bir kullanım senaryosu. Request/response seviyesinde ne olduğunu görmek, prompt iyileştirmesi için ham veri.

---

## Senaryo A — Free Kullanıcı: Ev Oturma Odası Keşif

**Kullanıcı profili:** Yeni kayıtlı, test ediyor. Apartman oturma odasını Modern tarzda yeniden görmek istiyor.

### Adımlar

| Step | Kullanıcı Aksiyonu | Sistem Davranışı |
|------|-------------------|------------------|
| 1 | Studio → "TAP TO UPLOAD" → galeri fotoğrafı seçer | `POST /api/files/upload` → fileId döner, `/studio/uploaded`'e push |
| 2 | "Continue to Architecture" | `/studio/style` açılır |
| 3 | Room Type → LIVING_ROOM | Studio store set |
| 4 | Design Style → MODERN card | Studio store set |
| 5 | Next Step → `/studio/options` | Options ekranı açılır |
| 6 | Ekranda gördükleri | REDESIGN chip aktif (mode kilitli değil), QUALITY=STANDARD (HD "PRO" badge'li kilitli), strength slider disabled, seed/negative gizli, custom prompt gizli, variants max=1, preserve_layout toggle var. **Credit banner: 1 credit** |
| 7 | Preserve layout = ON (opsiyonel) | Store set |
| 8 | Review → Generate | `POST /api/jobs` |

### Backend İşlem Akışı

**Job request body (mobile → backend):**
```json
{
  "inputFileId": "uuid",
  "roomTypeCode": "LIVING_ROOM",
  "designStyleCode": "MODERN",
  "designMode": "REDESIGN",
  "qualityTier": "STANDARD",
  "numOutputs": 1,
  "preserveLayout": true,
  "idempotencyKey": "uuid"
}
```

**PlanEntitlementService validation:**
- Plan: FREE
- Feature INTERIOR_REDESIGN: ✅ enabled
- max_outputs: 1 (istek 1 → OK)
- allow_custom_prompt: false → `prompt` stripped (zaten boş)
- allow_strength / seed / negative: false → hepsi stripped

**Model routing:**
- Feature: INTERIOR_REDESIGN, quality: STANDARD, preserve_layout: true, model_tier: ENTRY
- Kazanan: `jagilley/controlnet-hough` (model_tier ENTRY +8, quality STANDARD +4, preserve_layout +1 = **13**)

**Credit reservation:** 1 credit (V5 seed, FREE plan STANDARD/1v)

**Prompt composition:**
```
Base: "A modern style living room"
(no user custom, palette disabled)
Quality tail: ", well-designed interior, coherent composition, natural daylight"

Final prompt: "A modern style living room, well-designed interior, coherent composition, natural daylight"

Negative: "longbody, lowres, bad anatomy, bad hands, missing fingers" (ControlNet baseline, V5:118)
```

**Replicate request (ENTRY ControlNet, job creation):**
```json
{
  "version": "latest",
  "input": {
    "image": "https://presigned-s3/input.jpg",
    "prompt": "A modern style living room, well-designed interior, ...",
    "a_prompt": "best quality, extremely detailed",
    "n_prompt": "longbody, lowres, bad anatomy, bad hands, missing fingers",
    "num_samples": "1",
    "image_resolution": "512",
    "detect_resolution": "512",
    "ddim_steps": 30,
    "scale": 9,
    "seed": null,
    "eta": 0
  },
  "webhook": "https://backend/api/webhooks/replicate",
  "webhook_events_filter": ["completed"]
}
```

**Expected output:** 1 variant, 512×512 PNG. ControlNet Hough hough transform ile köşeleri tespit eder → yapı korunur.

### Potansiyel Sorunlar (mevcut prompt ile)

- **Output çok genel:** "well-designed interior, coherent composition, natural daylight" jenerik — render muhtemelen stock görünümlü.
- **Modern style exclusions eklenmiyor:** `design_style_exclusions` tablosunda Modern için "ornate Victorian, clutter" gibi negatives var ama `TemplateInputResolverImpl` bunları merge ediyor mu kontrol edilmeli.
- **Watermark:** `WatermarkService.applyWatermarkIfNeeded` FREE için watermark ekler — webhookServiceImpl içinde çağrılıyor ✅

---

## Senaryo B — Basic Kullanıcı: Renk Paleti ile Kişiselleştirme

**Kullanıcı profili:** Hobbyist, kendi yatak odasını Scandinavian tarzda sıcak tonlarda görmek istiyor.

### Adımlar

| Step | Kullanıcı Aksiyonu | Sistem Davranışı |
|------|-------------------|------------------|
| 1-5 | Upload → LIVING_ROOM → Scandinavian seç | Same as Free |
| 6 | Options ekranı | REDESIGN/EMPTY_ROOM chip'ler aktif (INPAINT kilitli). QUALITY=STANDARD + HD seçilebilir (pro badge yok). **Custom prompt input görünür**, color palette picker görünür. Strength/seed/negative hala kilitli |
| 7 | Custom prompt: "cozy reading nook with soft lighting" | Store set |
| 8 | Color palette: warm tone seçer (örn. gradient end #E1C39B) | Store set |
| 9 | Quality = HD | Credit banner **2 credit** |
| 10 | Variants = 1 | Max 1 zaten |
| 11 | Preserve layout = ON | Set |
| 12 | Generate | `POST /api/jobs` |

### Backend İşlem

**Feature:** HD_REDESIGN (quality HD → feature HD_REDESIGN'e mapping)
**Model routing:** `jagilley/controlnet-hough` (Basic ENTRY tier, preserve_layout match)

**Prompt composition:**
```
Base: "A scandinavian style bedroom"
+ User: ", cozy reading nook with soft lighting"
+ Palette: ", color palette: #E1C39B"
+ Quality tail: ", well-designed interior, coherent composition, natural daylight"

Final: "A scandinavian style bedroom, cozy reading nook with soft lighting, color palette: #E1C39B, well-designed interior, coherent composition, natural daylight"
```

**Replicate request:** Same as Free ama `prompt` user custom + palette içerir, `image_resolution: 2048` (HD).

### Potansiyel Sorunlar

- **ENTRY tier'da HD 2048px**: adirik/interior-design model 512px trained — 2048 yapsa bile upscale + interpolation, native HD değil.
- **Palette prompt'a embed ediliyor ama model onu görmüyor olabilir**: "color palette: #E1C39B" text'i prompt'ta yer alsa bile prompt encoder hex kodu anlamaz. **İyileştirme:** hex → human-readable color name ("warm beige") convert et.

---

## Senaryo C — Pro Kullanıcı: Ofis Redesign, Layout Kritik

**Kullanıcı profili:** İç mimar, müşterisinin ofisini Industrial tarzda yeniden tasarlıyor. Pencere konumu, ana duvar yapısı sabit kalmalı.

### Adımlar

| Step | Aksiyonu | Davranış |
|------|----------|----------|
| 1-5 | Upload ofis foto → OFFICE → INDUSTRIAL | Standard |
| 6 | Options ekranı | Tüm modlar aktif (STYLE_TRANSFER kilitli). Quality STANDARD+HD açık (ULTRA_HD kilitli). **Strength slider aktif**, **seed expandable**, **negative prompt görünür**. Commercial spaces açık (OFFICE zaten commercial) |
| 7 | Design mode: REDESIGN | Set |
| 8 | Quality: HD | Set |
| 9 | Preserve layout: ON | **Kritik** — ControlNet'i trigger eder |
| 10 | Strength: 0.65 (BALANCED civarı) | "Model yapıyı büyük oranda korusun" |
| 11 | Custom prompt: "exposed brick walls, metal beams, Edison bulbs" | Set |
| 12 | Negative prompt: "modern plastic, pastel colors, minimalist" | Set |
| 13 | Variants: 2 | Store set |
| 14 | Generate | **Credit: 5 (HD/2var)** |

### Backend İşlem

**Feature:** HD_REDESIGN
**Model routing:**
- Candidates: all active with feature_code='HD_REDESIGN'
- `stability-ai/sdxl` score: model_tier SDXL +8, quality HD +4, mode REDESIGN +2 = **14**
- `lucataco/sdxl-controlnet` score: model_tier SDXL +8, quality HD +4, mode REDESIGN +2, preserve_layout +1 = **15** ✅
- **Winner: `lucataco/sdxl-controlnet`**

**Prompt composition:**
```
Base: "A industrial style office"
+ User: ", exposed brick walls, metal beams, Edison bulbs"
+ (no palette)
+ Quality tail: ", professional interior photography, magazine-quality composition, balanced lighting"

Final: "A industrial style office, exposed brick walls, metal beams, Edison bulbs, professional interior photography, magazine-quality composition, balanced lighting"

Negative composition:
Base SDXL: "blurry, distorted, low resolution" (default_params_json)
+ Style exclusions (INDUSTRIAL, V18): "ornate traditional, pastel colors, frilly decorations"
+ User: "modern plastic, pastel colors, minimalist"

Final negative: "blurry, distorted, low resolution, ornate traditional, pastel colors, frilly decorations, modern plastic, pastel colors, minimalist"

(NOT: "pastel colors" 2 kez var — dedup gerekebilir)
```

**Guidance scale:** Industrial/SDXL = 8.5 (design_style_guidance tablosu)
**Strength:** 0.65 (user)
**Seed:** null (user girmedi)

**Replicate request (SDXL-ControlNet):**
```json
{
  "version": "latest",
  "input": {
    "image": "https://presigned-s3/office.jpg",
    "prompt": "A industrial style office, exposed brick walls, ...",
    "negative_prompt": "blurry, distorted, ...",
    "num_samples": "2",
    "image_resolution": "4096",
    "condition_scale": 0.5,
    "prompt_strength": "0.65",
    "guidance_scale": "8.5",
    "seed": null,
    "num_inference_steps": 35
  }
}
```

**Expected:** 2 variants, 4096×4096. ControlNet ile Hough-transformed structure korunur, strength 0.65 prompt'u modern ama çok da agresif değil render eder.

### Potansiyel Sorunlar

- **Negative prompt duplicate**: "pastel colors" hem V18 exclusion'dan hem user'dan — dedup yok.
- **Prompt stacking fazla uzun**: 3 kaynak birleşince prompt 20+ kelime, SDXL token limit'e yakın. İyileştirme: weighted prompt concat (user prompt öne, quality tail arkaya).
- **"preserve original structure" directive prompt'ta yok**: `preserve_layout=true` sadece model routing'i değiştiriyor, prompt'a "maintain original room layout, keep window and door positions" gibi explicit directive eklenmiyor. Kullanıcının "gereksiz düzenlemeler" şikayetinin ana sebebi muhtemelen bu.

---

## Senaryo D — Max Kullanıcı: Restoran, Style Transfer

**Kullanıcı profili:** Profesyonel studio owner, restaurant client'ı için "Art Deco meets Scandinavian" fusion tasarım istiyor. Reference image olarak bir Art Deco lobby fotoğrafı.

### Adımlar

| Step | Aksiyonu | Davranış |
|------|----------|----------|
| 1-5 | Upload restoran foto → RESTAURANT → SCANDINAVIAN | Commercial spaces açık, room type RESTAURANT seçilebilir |
| 6 | Options ekranı | **Tüm modlar + STYLE_TRANSFER aktif.** Quality STANDARD/HD/ULTRA_HD. Strength/seed/negative. **Speed mode: FAST/BALANCED/QUALITY visible** |
| 7 | Design mode: STYLE_TRANSFER | Reference image upload butonu açılır |
| 8 | Reference image: Art Deco lobby foto upload | Store'a eklenir |
| 9 | Custom prompt: "geometric Art Deco motifs on Scandinavian wood furniture" | Set |
| 10 | Negative: "overly ornate, gaudy, cluttered" | Set |
| 11 | Quality: HD | |
| 12 | Speed mode: QUALITY | 42 inference steps (28 × 1.5) |
| 13 | Strength: 0.75 | "Reference stil baskın olsun" |
| 14 | Variants: 2 | |
| 15 | Generate | **Credit: 9 (HD/2var FLUX)** |

### Backend İşlem

**Feature:** STYLE_TRANSFER
**Model routing:**
- Plan model_tier: FLUX
- design_mode=STYLE_TRANSFER filtresi
- `black-forest-labs/flux-dev` score: model_tier FLUX +8, design_mode STYLE_TRANSFER +2 = **10** ✅

**Prompt composition:**
```
Base: "A scandinavian style restaurant"
+ User: ", geometric Art Deco motifs on Scandinavian wood furniture"
+ Quality tail: ", ultra high-quality architectural photography, interior design magazine cover quality, studio lighting, detailed textures"

Final: "A scandinavian style restaurant, geometric Art Deco motifs on Scandinavian wood furniture, ultra high-quality architectural photography, interior design magazine cover quality, studio lighting, detailed textures"

Negative: "overly ornate, gaudy, cluttered" (user) + base FLUX defaults
```

**Guidance:** Scandinavian/FLUX = 3.5 (design_style_guidance fallback)
**Strength:** 0.75 (FLUX-dev kabul eder)
**num_inference_steps:** 40 × 1.5 = **60** (QUALITY mode)
**Reference image:** `${referenceFile.publicUrl}` — ama input template bunu destekliyor mu? (V5:135-136 flux input template'te `control_image` yok, sadece `image`). **Kontrol edilmeli.**

**Replicate request (FLUX-dev):**
```json
{
  "version": "latest",
  "input": {
    "image": "https://presigned-s3/restaurant.jpg",
    "prompt": "A scandinavian style restaurant, geometric Art Deco motifs on Scandinavian wood furniture, ...",
    "negative_prompt": "overly ornate, gaudy, cluttered",
    "num_outputs": "2",
    "guidance_scale": "3.5",
    "prompt_strength": "0.75",
    "seed": null,
    "num_inference_steps": 60,
    "output_format": "png"
  }
}
```

### Potansiyel Sorunlar

- **Reference image ≠ primary image:** Style Transfer için FLUX-dev `image` param'ı genelde primary (kullanıcının odası) olur, reference stil prompt'tan gelir. Eğer reference image upload edildiyse backend bunu nereye koyuyor? **Input template'te `${referenceFile}` placeholder'ı var mı kontrol edilmeli.**
- **Speed mode QUALITY = 60 steps FLUX-dev'de uzun:** 20-40 saniye render süresi. UX için "estimated time" göstergesi yararlı olur.
- **Fusion styles hard:** "Scandinavian + Art Deco" tek prompt'ta confused output verebilir. İyileştirme: "Scandinavian minimalism WITH Art Deco geometric accents" tarzı structural phrasing.

---

## Ortak Gözlemler — Prompt Engineering Backlog

Senaryolardan çıkarılan ortak sorunlar:

### 1. Preserve Layout Prompt Directive Yok

`preserve_layout=true` sadece model routing'i `lucataco/sdxl-controlnet` veya `flux-depth-dev`'e yönlendiriyor. Ama **prompt'a "maintain original room layout" benzeri explicit direktif eklenmiyor.**

Bu muhtemelen "odayı düzenle dediğimde fazlacana gereksiz düzenlemeler yapıyor" şikayetinin ana sebebi.

**Öneri:** `TemplateInputResolverImpl`'de şu eklensin:
```java
if (preserveLayout) {
    promptParts.add("maintain original room layout, keep wall positions, preserve window and door locations, keep ceiling height");
}
```

Hatta negative'e de eklensin:
```java
if (preserveLayout) {
    negativeParts.add("rearranged walls, changed windows, new doors, modified ceiling, altered room dimensions, removed walls");
}
```

### 2. Hex Palette → Human Color Name

`color palette: #E1C39B` prompt'ta yer alsa bile CLIP encoder bunu gramersel olarak anlamaz — "warm beige" gibi adlandırılmalı. `PALETTE_COLORS` const'ında zaten isimler yok ama `color-naming` library veya simple distance mapping eklenebilir:

```
#E1C39B → warm beige
#1C1B1B → charcoal black
#FDDEB4 → soft cream
```

### 3. Style Exclusions Kullanımı

V18 `design_style_exclusions` tablosu var ama `TemplateInputResolverImpl`'de merge path kontrol edilmeli. Modern → "ornate Victorian, clutter" exclusion negative'e ekleniyor mu?

### 4. Prompt Dedup

Negative prompt'ta duplicate phrase'ler olmamalı. Basit `Arrays.stream(parts).distinct()` yeterli.

### 5. Commercial Context Modifier

RESTAURANT, CAFE, SHOWROOM gibi commercial room types seçilince quality tail'e "hospitality space, commercial interior design" eklenmeli — adirik/interior-design model residential-dominant bir dataset'te trained.

### 6. Reference Image Support

STYLE_TRANSFER için reference image path'i. Input template'te `${referenceFile.publicUrl}` placeholder ve resolver'da mapping eksik olabilir.

### 7. Variant İstikrarı

2 variant request'te iki çıktı birbirine çok benzer oluyor (seed sabit + aynı prompt). Variant'lar için seed'i auto-offset yapmak (`seed+1, seed+2`) daha çeşitli sonuç verir.

### 8. Model-Specific Prompt Style

- **SDXL**: uzun descriptive prompt sever (50-75 token), natural language
- **FLUX**: kısa, punchy prompt sever (30-50 token), komma-separated keywords
- **ControlNet Hough**: model name suggests structure preserving, ama prompt format da önemli

Quality tail'ler şu an model ailesine göre farklı — bu iyi. Ama **base prompt formatting** (natural language vs keywords) aynı — her model ailesi için ayrı `prompt_template` eklenebilir.
