import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useStudioStore } from "@/stores/studioStore";
import { useCreditStore } from "@/stores/creditStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCreditCost } from "@/hooks/useCreditCost";
import { createJob } from "@/services/jobs";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { SpeedMode } from "@/types/api";

const qualityLabelKeys: Record<string, string> = {
  STANDARD: "studio.quality_standard",
  HD: "studio.quality_hd",
  ULTRA_HD: "studio.quality_ultra_hd",
};

const modeLabelKeys: Record<string, string> = {
  REDESIGN: "studio.mode_redesign",
  EMPTY_ROOM: "studio.mode_empty_room",
  INPAINT: "studio.mode_inpaint",
  STYLE_TRANSFER: "studio.mode_style_transfer",
};

export default function ReviewScreen() {
  const { t } = useTranslation();
  const { error } = useLocalSearchParams<{ error?: string }>();
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (error) setErrorBanner(error);
  }, [error]);
  const {
    photo,
    roomType,
    designStyle,
    qualityTier,
    speedMode,
    numOutputs,
    mode,
    preserveLayout,
    prompt,
    negativePrompt,
    colorPalette,
    seed,
    strength,
    guidanceScale,
    referencePhoto,
    setSpeedMode,
  } = useStudioStore();
  const balance = useCreditStore(s => s.balance);
  const fetchBalance = useCreditStore(s => s.fetchBalance);
  const hasPermission = useSubscriptionStore(s => s.hasPermission);
  const canUseQualityMode = hasPermission("allow_quality_mode");
  const { cost, featureCode } = useCreditCost();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (balance < cost) {
      router.push("/credits-exhausted");
      return;
    }

    setIsSubmitting(true);
    try {
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
        referenceFileId: referencePhoto?.fileId || undefined,
      });

      // Refresh balance after credits are deducted
      fetchBalance();

      router.push(`/generation/progress?jobId=${job.id}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? "Something went wrong";
      Alert.alert("Generation Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* App Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(42,42,42,0.8)",
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#E1C39B" />
        </Pressable>
        <Text
          className="font-headline text-center"
          style={{
            fontSize: 14,
            lineHeight: 16,
            fontWeight: "700",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "#E1C39B",
          }}
        >
          {"ARCHITECTURAL\nLENS"}
        </Text>
        <UserAvatar size="sm" onPress />
      </View>

      {/* Error Banner */}
      {errorBanner && (
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 4,
            padding: 16,
            borderRadius: 12,
            backgroundColor: "rgba(147,0,10,0.15)",
            borderWidth: 1,
            borderColor: "rgba(147,0,10,0.3)",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Ionicons name="alert-circle" size={20} color="#E57373" />
          <Text
            className="font-body"
            style={{ color: "#E57373", fontSize: 13, flex: 1 }}
          >
            {errorBanner}
          </Text>
          <Pressable onPress={() => setErrorBanner(null)} hitSlop={8}>
            <Ionicons name="close" size={18} color="#E57373" />
          </Pressable>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step Indicator & Headline */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
          <Text
            className="font-label text-secondary mb-2"
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: "500",
            }}
          >
            {t("studio.step_4_of_4")}
          </Text>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 36, lineHeight: 40, fontWeight: "700" }}
          >
            {t("studio.step4_title")}
          </Text>
        </View>

        {/* Photo Preview with Lens Badges */}
        <View
          style={{
            marginTop: 32,
            marginHorizontal: 24,
            aspectRatio: 4 / 5,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {photo?.uri ? (
            <Image
              source={{ uri: photo.uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View
              className="flex-1 items-center justify-center"
              style={{ backgroundColor: "#2A2A2A" }}
            >
              <Ionicons name="image-outline" size={48} color="#998F84" />
            </View>
          )}

          {/* AI Lens Overlay Badges */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
            }}
          >
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              <View
                style={{
                  backgroundColor: "rgba(19,19,19,0.7)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  borderWidth: 1,
                  borderColor: "rgba(77,70,60,0.1)",
                }}
              >
                <Ionicons name="sunny-outline" size={14} color="#FDDEB4" />
                <Text
                  className="font-label text-on-surface"
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                  }}
                >
                  {modeLabelKeys[mode] ? t(modeLabelKeys[mode]) : mode}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(19,19,19,0.7)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  borderWidth: 1,
                  borderColor: "rgba(77,70,60,0.1)",
                }}
              >
                <Ionicons name="layers-outline" size={14} color="#FDDEB4" />
                <Text
                  className="font-label text-on-surface"
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                  }}
                >
                  {designStyle?.name ?? t("studio.design_style")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Summary Grid - 2 columns */}
        <View
          style={{
            marginTop: 32,
            paddingHorizontal: 24,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <SummaryCard
            label={t("result.style")}
            value={designStyle?.name ?? "—"}
          />
          <SummaryCard
            label={t("result.room")}
            value={roomType?.name ?? "—"}
          />
          <SummaryCard
            label={t("result.quality")}
            value={qualityLabelKeys[qualityTier] ? t(qualityLabelKeys[qualityTier]) : qualityTier}
          />
          <SummaryCard
            label={t("studio.number_of_outputs")}
            value={String(numOutputs)}
          />
        </View>

        {/* Speed Mode Selector */}
        <View style={{ marginTop: 32, paddingHorizontal: 24 }}>
          <Text
            className="font-label text-on-surface-variant mb-3"
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {t("studio.speed_mode")}
          </Text>
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#2A2A2A",
              borderRadius: 12,
              padding: 4,
              gap: 4,
            }}
          >
            {(["FAST", "BALANCED", "QUALITY"] as SpeedMode[]).map(m => {
              const isSelected = speedMode === m;
              const isLocked = m === "QUALITY" && !canUseQualityMode;
              const labelKey =
                m === "FAST"
                  ? "studio.speed_fast"
                  : m === "BALANCED"
                  ? "studio.speed_balanced"
                  : "studio.speed_quality";
              // Expected wall-clock range per mode — real number varies by
              // model tier + queue but these ranges are tight enough that
              // users get a usable "how long will this take" signal.
              const durationKey =
                m === "FAST"
                  ? "studio.speed_fast_duration"
                  : m === "BALANCED"
                  ? "studio.speed_balanced_duration"
                  : "studio.speed_quality_duration";
              const emoji = m === "FAST" ? "⚡" : m === "BALANCED" ? "🎯" : "✨";
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    if (isLocked) {
                      Alert.alert(
                        t("studio.speed_quality"),
                        t("studio.speed_quality_locked"),
                      );
                      return;
                    }
                    setSpeedMode(m);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: isSelected ? "#FEDFB5" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isLocked ? 0.5 : 1,
                    gap: 2,
                  }}
                >
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text style={{ fontSize: 14 }}>{emoji}</Text>
                    <Text
                      className="font-label"
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? "700" : "500",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        color: isSelected ? "#281801" : "#E5E2E1",
                      }}
                    >
                      {t(labelKey)}
                    </Text>
                    {isLocked && (
                      <Ionicons
                        name="lock-closed"
                        size={10}
                        color="#E5E2E1"
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 9,
                      letterSpacing: 0.8,
                      color: isSelected
                        ? "rgba(40,24,1,0.6)"
                        : "rgba(229,226,225,0.55)",
                      marginTop: 2,
                    }}
                  >
                    {t(durationKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Credits Info */}
        <View
          className="flex-row justify-between items-end"
          style={{ marginTop: 32, paddingHorizontal: 25 }}
        >
          <View style={{ gap: 4 }}>
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {t("studio.credits")}
            </Text>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Text
                className="font-headline text-secondary"
                style={{ fontSize: 30, fontWeight: "700" }}
              >
                {cost}
              </Text>
              <Text
                className="font-label text-secondary"
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  paddingTop: 8,
                }}
              >
                {t("studio.credits")}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {t("credits.balance")}
            </Text>
            <Text
              className="font-body text-on-surface"
              style={{ fontSize: 15, fontWeight: "600" }}
            >
              {t("studio.cost_credits", { count: balance })}
            </Text>
          </View>
        </View>

        {/* CTA Section */}
        <View
          style={{
            marginTop: 32,
            paddingHorizontal: 24,
            alignItems: "center",
            gap: 16,
          }}
        >
          <View style={{ width: "100%" }}>
            <PrimaryButton
              label={t("studio.generate")}
              onPress={handleGenerate}
              loading={isSubmitting}
              icon="sparkles"
            />
          </View>

          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              opacity: 0.6,
            }}
          >
            Estimated time: 45 seconds
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        width: "47%",
        flexGrow: 1,
        backgroundColor: "#2A2A2A",
        padding: 20,
        borderRadius: 12,
        gap: 4,
      }}
    >
      <Text
        className="font-label text-on-surface-variant"
        style={{
          fontSize: 10,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        className="font-body text-secondary"
        style={{ fontSize: 14, fontWeight: "500" }}
      >
        {value}
      </Text>
    </View>
  );
}
