import { useRef, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Crypto from "expo-crypto";
import { useStudioStore } from "@/stores/studioStore";
import { useCreditStore } from "@/stores/creditStore";
import { useCreditCost } from "@/hooks/useCreditCost";
import { createJob } from "@/services/jobs";
import { aspectRatioFor } from "@/hooks/useImagePicker";

/**
 * The generate action: validate, check the wallet, submit, navigate.
 *
 * <p>This is the money path. It was lifted out of the Review screen when that
 * screen was folded into Options (P2-8) and **moved verbatim** — every branch,
 * every alert, the idempotency-key lifecycle and the status-code mapping are
 * the code that had been running in production, not a re-implementation of it.
 * Rewriting a flow that reserves credits in order to relocate it is how
 * double-charges get shipped.
 *
 * <p>The two fail-fast gates matter for the same reason: the backend enforces
 * both, but only after reserving credits, so checking here is what keeps a
 * missing reference image from costing the user anything.
 *
 * <p>Idempotency: the key is minted on the first attempt and reused on retry,
 * then released ONLY on success. A retap after a transient error therefore
 * replays the same key and the backend returns the existing job instead of
 * starting — and charging for — a second one.
 */
export function useGenerate() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const photo = useStudioStore((s) => s.photo);
  const roomType = useStudioStore((s) => s.roomType);
  const designStyle = useStudioStore((s) => s.designStyle);
  const mode = useStudioStore((s) => s.mode);
  const qualityTier = useStudioStore((s) => s.qualityTier);
  const speedMode = useStudioStore((s) => s.speedMode);
  const numOutputs = useStudioStore((s) => s.numOutputs);
  const preserveLayout = useStudioStore((s) => s.preserveLayout);
  const prompt = useStudioStore((s) => s.prompt);
  const negativePrompt = useStudioStore((s) => s.negativePrompt);
  const colorPalette = useStudioStore((s) => s.colorPalette);
  const seed = useStudioStore((s) => s.seed);
  const strength = useStudioStore((s) => s.strength);
  const guidanceScale = useStudioStore((s) => s.guidanceScale);
  const referencePhoto = useStudioStore((s) => s.referencePhoto);
  const maskFileId = useStudioStore((s) => s.maskFileId);
  const extraStyleRefs = useStudioStore((s) => s.extraStyleRefs);
  const objectRefs = useStudioStore((s) => s.objectRefs);

  const balance = useCreditStore((s) => s.balance);
  const fetchBalance = useCreditStore((s) => s.fetchBalance);
  const { cost } = useCreditCost();

    const handleGenerate = async () => {
      if (!photo?.fileId || !roomType?.id || !designStyle?.id) {
        Alert.alert(
          "Missing Info",
          "Please complete all steps before generating.",
        );
        return;
      }

      // STYLE_TRANSFER gate — backend enforces the same rule but fails after
      // reserving credits. Block here so the user lands back on the reference
      // capture screen instead of seeing a generic 400.
      if (mode === "STYLE_TRANSFER" && !referencePhoto?.fileId) {
        Alert.alert(
          t("studio.mode_style_transfer"),
          t("studio.style_transfer_requires_reference"),
        );
        router.push("/studio/style-transfer");
        return;
      }

      // INPAINT gate — same fail-fast rationale (backend V37 rejects mask-less
      // INPAINT). Send the user to the drawing screen instead of a generic 400.
      if (mode === "INPAINT" && !maskFileId) {
        Alert.alert(
          t("studio.mode_inpaint"),
          t("studio.smart_edit_mask_required"),
        );
        router.push("/studio/smart-edit");
        return;
      }

      if (balance < cost) {
        router.push("/credits-exhausted");
        return;
      }

      // Mint the idempotency key on first attempt; reuse on retry. Cleared
      // in the success path below so a *new* generate intent gets its own key.
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = Crypto.randomUUID();
      }

      setIsSubmitting(true);
      try {
        // Snap the source photo's dimensions to a canonical Replicate
        // aspect ratio. When provided this takes priority over the backend's
        // room-type default (`TemplateInputResolverImpl.resolveAspectRatio`),
        // which is what we want — the photo the user just shot is the
        // ground truth for proportions, not the average bathroom.
        const computedAspectRatio = aspectRatioFor(photo.width, photo.height);
        const job = await createJob({
          inputFileId: photo.fileId,
          roomTypeId: roomType.id,
          designStyleId: designStyle.id,
          designMode: mode,
          qualityTier,
          speedMode,
          numOutputs,
          preserveLayout,
          prompt: prompt || undefined,
          negativePrompt: negativePrompt || undefined,
          colorPalette: colorPalette || undefined,
          seed,
          strength,
          guidanceScale,
          aspectRatio: computedAspectRatio,
          referenceFileId: referencePhoto?.fileId || undefined,
          maskFileId: mode === "INPAINT" ? maskFileId || undefined : undefined,
          // IO-2 "+" tiles — role-scoped by screen: extra STYLE refs exist
          // only on the ST screen, OBJECT refs only on free-form options.
          // The store clears them on mode/preserve changes, so what's here
          // is always valid for the current request shape.
          extraReferences: (() => {
            const extras = [
              ...extraStyleRefs.map((r) => ({ fileId: r.fileId, role: "STYLE" as const })),
              ...objectRefs.map((r) => ({ fileId: r.fileId, role: "OBJECT" as const })),
            ];
            return extras.length > 0 ? extras : undefined;
          })(),
        }, idempotencyKeyRef.current);

        // Success — release the key so the next generate intent gets a fresh
        // one. Note: we deliberately do NOT clear in catch/finally — if the
        // user retaps after a transient error, the same key replays and the
        // backend returns the existing (or already-failed) job idempotently.
        idempotencyKeyRef.current = null;

        // Refresh balance after credits are deducted
        fetchBalance();

        router.push(`/generation/progress?jobId=${job.id}`);
      } catch (err: any) {
        const status = err?.response?.status;
        const msg =
          status === 402
            ? t("studio.insufficient_credits")
            : status === 429
              ? t("errors.rate_limit")
              : status >= 500
                ? t("errors.generic")
                : !err?.response
                  ? t("errors.network")
                  : t("errors.generic");
        Alert.alert(t("generation.failed"), msg);
      } finally {
        setIsSubmitting(false);
      }
    };

  return { generate: handleGenerate, isSubmitting, cost, balance };
}
