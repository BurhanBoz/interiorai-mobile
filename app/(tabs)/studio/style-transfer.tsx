import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStudioStore } from "@/stores/studioStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useCreditCost } from "@/hooks/useCreditCost";
import { useDrawer } from "@/components/layout/DrawerProvider";
import { UserAvatar } from "@/components/ui/UserAvatar";
import Slider from "@react-native-community/slider";

const PLACEHOLDER_ROOM =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDY-BQvBeDvm_wjubZLoxxq_fdlB5DKLCs169xupU4TBlveZuXhYoh8b2cOxE9_z84iGFq8qjXZc-c896-Aciya2jHbgH7Psc7YEK26HW7MMJMiUfHeZBwmR7GV-bRLJ8_vkNjbLHLonBtC8eFH0GoGOpKUkNebi4AJqLpCVbwKo1OB-ahMCRo2YHyno3Fm4MlQmMuSvzu_wEyG8nzEZ7jJu-GPQZtnXXZ74fzGjvo45HHVaF3amPj6cKSibyrOMLFCxCMjicmhr_g";

export default function StyleTransferScreen() {
  const { openDrawer } = useDrawer();
  const photo = useStudioStore(s => s.photo);
  const referencePhoto = useStudioStore(s => s.referencePhoto);
  const strength = useStudioStore(s => s.strength);
  const qualityTier = useStudioStore(s => s.qualityTier);
  const numOutputs = useStudioStore(s => s.numOutputs);
  const setStrength = useStudioStore(s => s.setStrength);
  const setReferencePhoto = useStudioStore(s => s.setReferencePhoto);
  const { cost } = useCreditCost();
  const { pickImage } = useImagePicker();

  const roomImage = photo?.uri ?? PLACEHOLDER_ROOM;
  const strengthPercent = Math.round(strength * 100);

  const handlePickReference = async () => {
    const result = await pickImage();
    if (result) {
      setReferencePhoto({ uri: result.uri, fileId: result.fileId ?? "" });
    }
  };

  const handleNext = () => {
    router.push("/generation/progress");
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Pressable onPress={openDrawer} hitSlop={8}>
            <Ionicons name="menu" size={24} color="#E1C39B" />
          </Pressable>
          <Text
            className="font-headline text-on-surface"
            style={{
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Architectural Lens
          </Text>
        </View>
        <UserAvatar size="sm" onPress />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Badge & Header */}
        <View style={{ marginBottom: 48 }}>
          <View
            className="flex-row items-center mb-6"
            style={{ gap: 12, marginTop: 8 }}
          >
            <View
              className="rounded-full px-3"
              style={{
                paddingVertical: 4,
                backgroundColor: "#584325",
              }}
            >
              <Text
                className="font-label"
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "#FEDFB5",
                }}
              >
                Style Transfer
              </Text>
            </View>
            <Text
              className="font-label text-on-surface-variant"
              style={{
                fontSize: 10,
                fontWeight: "500",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Max
            </Text>
          </View>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 36, lineHeight: 42 }}
          >
            Curate Your{"\n"}Aesthetic
          </Text>
        </View>

        {/* Image Pair — Your Room & Ref Style */}
        <View className="flex-row" style={{ gap: 16, marginBottom: 48 }}>
          {/* Your Room */}
          <View style={{ flex: 1, gap: 16 }}>
            <View className="flex-row items-end justify-between">
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Your Room
              </Text>
              <Text
                className="font-label"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#998F84",
                }}
              >
                Source
              </Text>
            </View>
            <View
              className="rounded-xl overflow-hidden bg-surface-container-low"
              style={{ aspectRatio: 4 / 5 }}
            >
              <Image
                source={{ uri: roomImage }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={300}
              />
              <View
                className="absolute inset-0"
                style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
                pointerEvents="none"
              />
            </View>
          </View>

          {/* Ref. Style */}
          <View style={{ flex: 1, gap: 16 }}>
            <View className="flex-row items-end justify-between">
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Ref. Style
              </Text>
              <Text
                className="font-label"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#FEDFB5",
                }}
              >
                Target
              </Text>
            </View>
            {referencePhoto?.uri ? (
              <Pressable onPress={handlePickReference}>
                <View
                  className="rounded-xl overflow-hidden"
                  style={{ aspectRatio: 4 / 5 }}
                >
                  <Image
                    source={{ uri: referencePhoto.uri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={300}
                  />
                </View>
              </Pressable>
            ) : (
              <Pressable onPress={handlePickReference}>
                <View
                  className="rounded-xl items-center justify-center bg-surface-container-low"
                  style={{
                    aspectRatio: 4 / 5,
                    borderWidth: 2,
                    borderColor: "#353534",
                    borderStyle: "dashed",
                  }}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={36}
                    color="#998F84"
                    style={{ marginBottom: 16 }}
                  />
                  <Text
                    className="font-label"
                    style={{
                      fontSize: 11,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: "#998F84",
                    }}
                  >
                    Upload reference
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>

        {/* Influence Strength Slider */}
        <View style={{ marginBottom: 32 }}>
          <View className="flex-row items-center justify-between mb-6">
            <Text
              className="font-label text-on-surface"
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Influence Strength
            </Text>
            <Text
              className="font-headline text-primary"
              style={{
                fontSize: 24,
                letterSpacing: -0.5,
                fontStyle: "italic",
              }}
            >
              {strengthPercent}%
            </Text>
          </View>

          {/* Custom visual track */}
          <View
            className="w-full rounded-full overflow-hidden"
            style={{ height: 4, backgroundColor: "#353534" }}
          >
            <LinearGradient
              colors={["#C4A882", "#A68A62"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                width: `${strengthPercent}%`,
                height: "100%",
                borderRadius: 9999,
              }}
            />
          </View>
          {/* Glowing thumb indicator */}
          <View
            style={{
              position: "absolute",
              top: 44,
              left: `${strengthPercent}%`,
              marginLeft: -8,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: "#FEDFB5",
              shadowColor: "rgba(254,223,181,0.5)",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 12,
            }}
            pointerEvents="none"
          />
          {/* Invisible interactive slider overlay */}
          <Slider
            style={{
              width: "100%",
              height: 36,
              marginTop: -20,
              opacity: 0,
            }}
            minimumValue={0}
            maximumValue={1}
            value={strength}
            onValueChange={setStrength}
            minimumTrackTintColor="transparent"
            maximumTrackTintColor="transparent"
            thumbTintColor="transparent"
          />

          <Text
            className="font-label"
            style={{
              fontSize: 11,
              letterSpacing: 0.8,
              fontStyle: "italic",
              lineHeight: 18,
              color: "#998F84",
              marginTop: 8,
            }}
          >
            Balance the structural integrity of the original space with the
            artistic motifs of the reference.
          </Text>
        </View>

        {/* Quality & Variants */}
        <View className="flex-row" style={{ gap: 16, marginBottom: 48 }}>
          <View
            className="flex-1 rounded-xl p-6 bg-surface-container-low"
            style={{ gap: 8 }}
          >
            <Text
              className="font-label"
              style={{
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#998F84",
              }}
            >
              Quality
            </Text>
            <Text
              className="font-headline text-on-surface"
              style={{ fontSize: 20 }}
            >
              {qualityTier === "HD" ? "4K" : "SD"}
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-6 bg-surface-container-low"
            style={{ gap: 8 }}
          >
            <Text
              className="font-label"
              style={{
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#998F84",
              }}
            >
              Variants
            </Text>
            <Text
              className="font-headline text-on-surface"
              style={{ fontSize: 20 }}
            >
              {String(numOutputs).padStart(2, "0")}
            </Text>
          </View>
        </View>

        {/* Footer Action */}
        <View
          style={{
            paddingTop: 32,
            borderTopWidth: 1,
            borderTopColor: "rgba(77,70,60,0.1)",
            gap: 24,
          }}
        >
          {/* Processing Cost */}
          <View className="items-center" style={{ gap: 4 }}>
            <Text
              className="font-label"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#998F84",
                fontWeight: "500",
              }}
            >
              Processing Cost
            </Text>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Ionicons name="flash" size={14} color="#FEDFB5" />
              <Text
                className="font-headline"
                style={{
                  fontSize: 24,
                  fontStyle: "italic",
                  letterSpacing: -0.5,
                  color: "#E5E2E1",
                }}
              >
                {cost} Credits
              </Text>
            </View>
          </View>

          {/* CTA Button */}
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => ({
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
                Next: Render Sequence
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
