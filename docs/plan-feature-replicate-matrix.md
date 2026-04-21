# Plan × Feature × Replicate Model Matrisi

**Tarih:** 2026-04-20
**Amaç:** Her subscription plan için kullanıcının redesign akışında neyi seçebildiğini, hangi modele gittiğini, hangi parametrelerle çalıştığını dökümante etmek. Prompt engineering iterasyonunun kaynak belgesi.

---

## 1. Plan × Feature Erişim Matrisi

| Feature | Free | Basic | Pro | Max |
|---------|------|-------|-----|-----|
| **INTERIOR_REDESIGN** | ✅ 1 output | ✅ 1 output | ✅ 2 outputs | ✅ 2 outputs |
| **HD_REDESIGN** | ❌ | ✅ 1 output | ✅ 2 outputs | ✅ 2 outputs |
| **EMPTY_ROOM** | ❌ | ✅ 1 output | ✅ 2 outputs | ✅ 2 outputs |
| **INPAINT** | ❌ | ❌ | ✅ 2 outputs | ✅ 2 outputs |
| **STYLE_TRANSFER** | ❌ | ❌ | ❌ | ✅ 2 outputs |
| **ULTRA_HD_UPSCALE** | ❌ | ✅ | ✅ | ✅ |

**Resolution limits** (V5 `plan_features.limits_json`):
- Free: 512px (STANDARD)
- Basic: 512px (STANDARD), 2048px (HD)
- Pro: 1024px (STANDARD), 4096px (HD)
- Max: 1024px (STANDARD), 4096px (HD)

---

## 2. Plan × Parametre Konfigürasyon Kapasitesi

| Parametre | Free | Basic | Pro | Max |
|-----------|:----:|:-----:|:---:|:---:|
| Custom prompt | ❌ | ✅ | ✅ | ✅ |
| Negative prompt | ❌ | ❌ | ✅ | ✅ |
| Seed control | ❌ | ❌ | ✅ | ✅ |
| Strength slider | ❌ | ❌ | ✅ | ✅ |
| Quality speed mode | ❌ | ❌ | ❌ | ✅ |
| Commercial spaces | ❌ | ❌ | ✅ | ✅ |
| Reference image (Style Transfer) | ❌ | ❌ | ❌ | ✅ |
| Mask editing (Inpaint) | ❌ | ❌ | ✅ | ✅ |
| Preserve layout | ✅ | ✅ | ✅ | ✅ |
| Color palette picker | ❌ | ✅ | ✅ | ✅ |

Kaynak: V17 `plans.permissions_json`, V18 `allow_quality_mode`.

**Özet:**
- Free: **2** configurable param
- Basic: **4** configurable param
- Pro: **9** configurable param
- Max: **13** configurable param

---

## 3. Plan × Replicate Model Routing

**Model Tier Stratejisi:**
- Free + Basic → **ENTRY tier** (`adirik/interior-design`)
- Pro → **SDXL tier** (`stability-ai/sdxl`)
- Max → **FLUX tier** (`black-forest-labs/flux-dev`)

**Preserve Layout Toggle:** ControlNet tabanlı modele yönlendirme (tier-aware).

| Feature / Mode | Free | Basic | Pro | Max |
|---|---|---|---|---|
| **REDESIGN** (STANDARD, no preserve) | `adirik/interior-design` | `adirik/interior-design` | `stability-ai/sdxl` | `black-forest-labs/flux-dev` |
| **REDESIGN** (STANDARD, preserve=1) | `jagilley/controlnet-hough` | `jagilley/controlnet-hough` | `lucataco/sdxl-controlnet` | `black-forest-labs/flux-depth-dev` |
| **HD_REDESIGN** (no preserve) | — | `adirik/interior-design` | `stability-ai/sdxl` | `black-forest-labs/flux-dev` |
| **HD_REDESIGN** (preserve=1) | — | — | `lucataco/sdxl-controlnet` | `black-forest-labs/flux-depth-dev` |
| **EMPTY_ROOM** | — | `adirik/interior-design` | `stability-ai/sdxl` | `black-forest-labs/flux-dev` |
| **INPAINT** | — | — | `stability-ai/sdxl` | `black-forest-labs/flux-dev` |
| **STYLE_TRANSFER** | — | — | — | `black-forest-labs/flux-dev` |
| **ULTRA_HD_UPSCALE** | — | `nightmareai/real-esrgan` | `nightmareai/real-esrgan` | `nightmareai/real-esrgan` |

**Model Routing Scoring** (`ModelRoutingServiceImpl:124-173`):
- model_tier exact match: **+8** (en ağır)
- quality_tier: +4
- design_mode: +2
- preserve_layout: +1
- NULL = wildcard (0)
- Mismatch = −1 (disqualified)
- Tie-breaker: `mapping.priority`

---

## 4. Adım Adım Walkthrough — Oturma Odası Modern Senaryosu

### Free Plan

| Step | Seçim |
|------|-------|
| 1 Upload | Fotoğraf yükle |
| 2 Style | Living Room + Modern |
| 3 Options | REDESIGN • STANDARD • preserve_layout toggle • **tüm diğer parametreler kilitli** |
| Credits | 1 |
| Model | `adirik/interior-design` (or `jagilley/controlnet-hough` with preserve) |
| Output | 1 variant, 512×512 |

### Basic Plan

| Step | Seçim |
|------|-------|
| 3 Options | REDESIGN/EMPTY_ROOM • STANDARD/HD • custom prompt + color palette • **strength/seed/negative kilitli** |
| Credits | 1 (STANDARD) / 2 (HD) |
| Model | Same as Free (ENTRY tier), HD resolution farkı var |
| Output | 1 variant, 512px–2048px |

### Pro Plan

| Step | Seçim |
|------|-------|
| 3 Options | REDESIGN/EMPTY_ROOM/INPAINT • STANDARD/HD • **strength slider 0.1–1.0** + seed + negative prompt • commercial spaces açık |
| Credits | 2 / 4 (STANDARD 1v/2v), 3 / 5 (HD 1v/2v) |
| Model (HD + preserve) | `lucataco/sdxl-controlnet` (score: model_tier SDXL +8, preserve +1, HD +4, mode +2 = **15**) |
| Output | 2 variants, 1024–4096px |
| Guidance scale (auto, MODERN/SDXL) | **8.5** |

### Max Plan

| Step | Seçim |
|------|-------|
| 3 Options | Tüm modlar + **STYLE_TRANSFER** + **ULTRA_HD** + **Speed mode (FAST/BALANCED/QUALITY)** + reference image + mask editing |
| Credits | 3 / 6 (STANDARD), 5 / 9 (HD) |
| Model (HD + preserve + QUALITY) | `black-forest-labs/flux-depth-dev` (depth-aware, tam layout koruma) |
| Inference steps (QUALITY) | 28 × 1.5 = **42** |
| Guidance (MODERN/FLUX) | **3.8** |
| Output | 2 variants, 4096px |

---

## 5. Prompt Composition Pipeline (`TemplateInputResolverImpl`)

Prompt semantik olarak aşağıdaki sırada birleştirilir — **her sonraki parça öncekini override etmez, ekler**:

```
1. Base:      "A {style} style {room}"
2. User:      ", {custom prompt}"           (allow_custom_prompt=true ise)
3. Palette:   ", color palette: {hex|name}" (color palette picker seçiliyse)
4. Quality modifier (model-specific tail):
   - ENTRY:     ". well-designed interior, coherent composition, natural daylight"
   - SDXL:      ". professional interior photography, magazine-quality composition, balanced lighting"
   - FLUX-dev:  ". ultra high-quality architectural photography, interior design magazine cover quality, studio lighting, detailed textures"
   - FLUX-depth: ". ultra high-quality architectural photography, interior design magazine cover quality, studio lighting, detailed textures, photorealistic materials"
```

**Örnek (Pro, SDXL, MODERN, LIVING_ROOM, custom="cozy reading nook", palette="#E1C39B"):**

```
A modern style living room, cozy reading nook, color palette: #E1C39B. professional interior photography, magazine-quality composition, balanced lighting
```

---

## 6. Input Template Placeholder Setleri (Model Başına)

| Placeholder | ControlNet Hough | SDXL | SDXL-ControlNet | FLUX-dev | FLUX-depth |
|-------------|:---:|:---:|:---:|:---:|:---:|
| `${prompt}` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `${negativePrompt}` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `${inputFile.publicUrl}` | ✅ (`image`) | ✅ (`image`) | ✅ (`image`) | ✅ (`image`) | ✅ (`control_image`) |
| `${seed}` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `${numOutputs}` | ✅ (`num_samples`) | ✅ (`num_outputs`) | ✅ (`num_samples`) | ✅ (`num_outputs`) | ✅ (`num_outputs`) |
| `${targetWidth}` | ✅ | ✅ | ✅ (`image_resolution`) | ❌ | ❌ |
| `${strength}` | ❌ | ✅ (`prompt_strength`) | ✅ (`prompt_strength`) | ✅ (`prompt_strength`) | ❌ (depth handles structure) |
| `${guidanceScale}` | ✅ (`scale`) | ✅ | ✅ | ✅ (`guidance`) | ✅ (`guidance`) |

**Dikkat:**
- **FLUX-depth `strength` kabul etmez** — depth map zaten structure kontrolü sağlıyor. Pro'dan Max'e yükselen kullanıcı için strength parametresi kaybolur gibi görünmesin: depth-aware mode'da "preserve_layout ayarı = deterministic" mesajı verilebilir.
- **Guidance scale her model ailesinde farklı range:** SDXL 5–10 (7.5 default), FLUX-dev 2–5 (3.5 default), FLUX-depth 8–12 (10.0 default). Bu yüzden `design_style_guidance` tablosu style × tier per record tutuyor.

---

## 7. Design Style Guidance (V18 `design_style_guidance`)

| Style | SDXL guidance | FLUX guidance | Karakter |
|-------|:---:|:---:|---|
| Modern | 8.5 | 3.8 | Strict, prompt'a sıkı uyum |
| Minimalist | 9.0 | 4.0 | En strict — temiz çizgiler |
| Industrial | 8.5 | 3.8 | Strict — bozulmaması kritik |
| Bohemian | 5.5 | 2.8 | Loose — model'in "flair" eklemesine izin |
| Tropical | 6.0 | 2.8 | Loose — organik flourish |
| Scandinavian | 7.5 | 3.5 | Dengeli |

**Uygulama:** strict styles + sıkı prompt → commercial-ready. Loose styles + serbest prompt → yaratıcı variation.

---

## 8. Speed Mode (Max Plan Only)

```java
if (speedMode == FAST)    num_inference_steps *= 0.75
if (speedMode == QUALITY) num_inference_steps *= 1.50
```

| Mode | FLUX-dev (40 base) | FLUX-depth (28 base) |
|------|:---:|:---:|
| FAST | 30 steps | 21 steps |
| BALANCED | 40 steps | 28 steps |
| QUALITY | 60 steps | 42 steps |

QUALITY mode client presentation/portfolio için; BALANCED default sweet spot.

---

## 9. Plan Başına Öneri Stratejiler

### Free (10 cr/ay)
- **Hedef:** Uygulamayı tanıt, 1 test render ver.
- **Best combo:** Modern/Minimalist/Scandinavian + preserve_layout ON (ControlNet Hough fallback)
- **Budget:** 10 render = 1 ay.

### Basic (60 cr/ay)
- **Hedef:** Hobbyist, ev tasarım kararları.
- **Best combo:** HD (2 cr) + color palette + spesifik custom prompt ("cozy reading nook" > "modern style")
- **Budget:** 30 STANDARD veya 15 HD.
- **Pas geç:** Strength/seed denemeleri (stripped anyway).

### Pro (150 cr/ay)
- **Hedef:** Profesyonel iç mimar, aylık 2-3 oda.
- **Best combo:** HD + preserve_layout ON + strength 0.6–0.7 + negative prompt (style-specific exclusions)
- **Model:** SDXL-ControlNet — yapı bozulmaz, detay artar.
- **Budget:** 30 HD/2var render = 150 cr tam kullanım.
- **En yüksek ROI:** Commercial spaces unlock (Pro'nun özel satış noktası).

### Max (450 cr/ay)
- **Hedef:** Studio/designer, client teslim kalitesi.
- **Best combo residential:** HD + FLUX-depth (preserve ON) + Speed=QUALITY (42 steps) → magazine kalite.
- **Best combo style transfer:** FLUX-dev (preserve OFF) + reference image + custom prompt ("Art Deco meets modern")
- **Budget:**
  - 50 HD preserve renders @ 9 cr = 450 cr (pure depth-aware)
  - Hybrid: 30 HD preserve (270cr) + 20 STANDARD style transfer (120cr) = 390cr, 60cr geri
- **Özel:** `allow_quality_mode` sadece Max — client work için 42-step gerektiğinde.

---

## 10. Prompt Engineering Iterasyonu İçin Kritik Notlar

Bu dosya aynı zamanda **bir sonraki iterasyonun kaynak belgesi**. Prompt iyileştirmesinde dikkat edilecek noktalar:

### A. Quality Modifier'lar (`ai_model_versions.default_params_json` tail)

Her model ailesi için hardcoded "quality tail" var. Bunlar:
- ENTRY modelde **generic** ("well-designed interior, coherent composition, natural daylight") — belki çok genel.
- SDXL'de **photography-specific** ("professional interior photography, magazine-quality composition, balanced lighting") — iyi.
- FLUX-depth en detaylı ("photorealistic materials" ekli) — bu en iyi performing olabilir.

**İyileştirme fırsatı:** ENTRY quality modifier'ını güçlendir — Free/Basic kullanıcının çıktı kalitesini belirgin şekilde artırabilir.

### B. Negative Prompt Defaults

Pro+ için kullanıcı custom negative yazabilir, ama **baseline** negative yok şu an. Baseline eklenirse:

```
"blurry, distorted, low resolution, watermark, duplicate furniture, unrealistic proportions, amateur photography, poor composition, oversaturated, text, logo, cropped, cluttered"
```

Bu her prompt'un başına model-agnostic olarak eklenebilir — TemplateInputResolverImpl'de.

### C. Style Exclusions (V18 `design_style_exclusions`)

Bu tablo var ama şu an **fully utilize edilmiyor olabilir**. Her stil kendi negative'lerini tutuyor (örn. MODERN → "ornate Victorian, clutter, heavy ornamentation"). `TemplateInputResolverImpl`'de bu zaten negative'e merge ediliyor mu? Bir sonraki adımda kontrol edeceğiz.

### D. Quality Tier × Model Eşleşmesi

- STANDARD: ENTRY/SDXL/FLUX-dev (tier'a göre)
- HD: Aynı modeller ama `targetWidth` 2048-4096
- ULTRA_HD: Yalnızca upscaler path — ön HD render + post-process upscale.

**Soru:** ULTRA_HD path'i doğrudan 4K model'e mi gidiyor yoksa "HD üret, sonra upscale" mi yapıyor? Backend kodunda `JobServiceImpl` veya pipeline'da bu flow'u kontrol etmek gerek.

### E. Seed Kullanımı

Pro+ için seed field var ama **kullanıcıya "reproduce" konsepti anlatılmamış**. UX iyileştirmesi:
- Seed otomatik doldurulmamalı ama **çıktı metadata'sına seed yazılmalı** (job outputs tablosunda var mı bilmiyorum).
- "Generate with same seed" butonu output detay ekranında olabilir — variation istiyor ama structure aynı kalsın dersek.

### F. FLUX-depth ≠ FLUX-dev Farkı (Max kullanıcılar için UX)

Max plan'da preserve_layout ON → FLUX-depth, OFF → FLUX-dev. Ama kullanıcı bunu bilmiyor — UI'da `preserve_layout` sadece toggle. **Daha açık label gerekli:**
- ON: "Keep room structure (depth-aware rendering)"
- OFF: "Full creative freedom (style transfer works best)"

### G. Commercial Spaces Unlock UX

Pro+ için `allow_commercial_spaces=true`. Room types arasında "CAFE", "RESTAURANT", "SHOWROOM" vs görünür. Ama ekstra prompt modifier eklenmiyor — model hedefi residential-trained olduğunda commercial render'ı şöyle böyle olabilir.

**İyileştirme:** Commercial room type seçildiğinde quality modifier'e otomatik "commercial interior design, hospitality space" ekle.

---

## Sonraki Adım

Bu matris prompt engineering iterasyonunun başlangıç referansı. İyileştirme için incelenecek dosyalar:
- `service/impl/TemplateInputResolverImpl.java` (prompt assembly mantığı)
- `db/migration/V18__tier_aware_prompts_and_flux_depth.sql` (style guidance + exclusions seed)
- `domain/DesignStyleGuidanceEntity.java` + `DesignStyleExclusionEntity.java`
- `ai_model_versions.input_template_json` + `default_params_json` (her modelin prompt expectations)
