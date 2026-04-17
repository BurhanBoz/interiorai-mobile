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
import { useCreditCost } from "@/hooks/useCreditCost";
import { createJob } from "@/services/jobs";

const qualityLabels: Record<string, string> = {
  STANDARD: "Standard",
  HD: "HD (4K Ready)",
  ULTRA_HD: "8K Ultra Render",
};

const modeLabels: Record<string, string> = {
  REDESIGN: "Architectural",
  EMPTY_ROOM: "Interior Focus",
  INPAINT: "Atmospheric",
  STYLE_TRANSFER: "Style Transfer",
};

export default function ReviewScreen() {
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
  } = useStudioStore();
  const balance = useCreditStore(s => s.balance);
  const fetchBalance = useCreditStore(s => s.fetchBalance);
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
        <View
          className="overflow-hidden"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#2A2A2A",
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.15)",
          }}
        >
          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuC94vMqQIy5RM9nI5m9i29eS9XQK6xZ0VadHXawACllcVwnXqDH1SxI47VnSmk3UEQvbWxnADYubY3mCtr-vEUA1bkaWd8BsmWOj5FihE3TB8POTYTkyhhrRynJDexox8hFjfplL8AXc1qOT4q2_7Q4PIkG-06_2CbzJwcwzN92hzQt0RfenfGhH0ZWNjw3ev5YcuwkeoRPWEMdf1pttdUbL9QMbv5amRcLkNSqbY8SPXnUrssF5Rw3F5gsKv014XN-66jSa8NkgcE",
            }}
            style={{ width: 40, height: 40 }}
            contentFit="cover"
          />
        </View>
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
            STEP 4 OF 4
          </Text>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 36, lineHeight: 40, fontWeight: "700" }}
          >
            Final Review
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
                  {modeLabels[mode] ?? mode}
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
                  {designStyle?.name ?? "Style"}
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
            label="Style"
            value={designStyle?.name ?? "Japandi Minimalist"}
          />
          <SummaryCard
            label="Room Type"
            value={roomType?.name ?? "Living Room"}
          />
          <SummaryCard
            label="Resolution"
            value={qualityLabels[qualityTier] ?? qualityTier}
          />
          <SummaryCard
            label="Output"
            value={`${numOutputs} Variant${numOutputs !== 1 ? "s" : ""}`}
          />
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
              COST TO RENDER
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
                Credits
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
              WALLET BALANCE
            </Text>
            <Text
              className="font-body text-on-surface"
              style={{ fontSize: 15, fontWeight: "600" }}
            >
              {balance} Credits
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
          <Pressable
            onPress={handleGenerate}
            disabled={isSubmitting}
            style={({ pressed }) => ({
              width: "100%",
              opacity: isSubmitting ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <LinearGradient
              colors={["#C4A882", "#A68A62"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                height: 56,
                borderRadius: 16,
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: "rgba(196,168,130,0.3)",
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#3F2D11" />
              ) : (
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#3F2D11",
                  }}
                >
                  Generate
                </Text>
              )}
              <Ionicons name="sparkles" size={20} color="#3F2D11" />
            </LinearGradient>
          </Pressable>

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
