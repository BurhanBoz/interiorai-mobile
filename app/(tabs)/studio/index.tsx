import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { useStudioStore } from "@/stores/studioStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useDrawer } from "@/components/layout/DrawerProvider";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const tips = [
  {
    icon: "sunny-outline" as const,
    titleKey: "studio.tip_lighting_title",
    textKey: "studio.tip_lighting_description",
  },
  {
    icon: "scan-outline" as const,
    titleKey: "studio.tip_perspective_title",
    textKey: "studio.tip_perspective_description",
  },
  {
    icon: "navigate-outline" as const,
    titleKey: "studio.tip_pathways_title",
    textKey: "studio.tip_pathways_description",
  },
];

export default function StudioScreen() {
  const { t } = useTranslation();
  const { pickImage, isUploading } = useImagePicker();
  const { openDrawer } = useDrawer();
  const photo = useStudioStore(s => s.photo);
  const setPhoto = useStudioStore(s => s.setPhoto);

  const handleUpload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await pickImage("gallery");
    if (result) {
      setPhoto(result);
    }
  };

  const handleCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await pickImage("camera");
    if (result) {
      setPhoto(result);
    }
  };

  // Subtle breathing animation on the idle upload icon — premium cue that
  // the zone is tappable without adding visual noise.
  const uploadPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(uploadPulse, {
          toValue: 0.55,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(uploadPulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [uploadPulse]);

  const handleContinue = () => {
    router.push("/studio/uploaded");
  };

  /* ── Photo uploaded state ── */
  if (photo) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
        {/* App Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <View className="flex-row items-center" style={{ gap: 16 }}>
            <Pressable onPress={openDrawer} hitSlop={8}>
              <Ionicons name="menu" size={24} color="#E1C39B" />
            </Pressable>
            <Text
              className="font-headline text-[#E1C39B]"
              style={{
                fontSize: 14,
                lineHeight: 16,
                fontWeight: "700",
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {"ARCHITECTURAL\nLENS"}
            </Text>
          </View>
          <UserAvatar size="sm" onPress />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Step indicator */}
          <View className="mb-2">
            <Text
              className="font-label text-primary"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: "500",
              }}
            >
              {t("studio.step_1_of_4")}
            </Text>
          </View>

          {/* Headline */}
          <Text
            className="font-headline text-on-surface mb-10"
            style={{ fontSize: 36, lineHeight: 40, fontWeight: "700" }}
          >
            {t("studio.step1_title")}
          </Text>

          {/* Uploaded photo */}
          <View className="rounded-xl overflow-hidden mb-4">
            <Image
              source={{ uri: photo.uri }}
              className="w-full rounded-xl"
              style={{ aspectRatio: 4 / 3 }}
              contentFit="cover"
            />
            <Pressable
              onPress={() => setPhoto(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Change photo link */}
          <Pressable onPress={handleUpload} className="items-center mb-6">
            <Text
              className="font-label text-primary"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {t("studio.change_photo")}
            </Text>
          </Pressable>
        </ScrollView>

        {/* CTA */}
        <View className="absolute bottom-0 left-0 right-0 px-6 pb-24 pt-4">
          <PrimaryButton
            label={t("studio.continue_to_architecture")}
            onPress={handleContinue}
          />
        </View>
      </SafeAreaView>
    );
  }

  /* ── Empty upload state ── */
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* App Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Pressable onPress={openDrawer} hitSlop={8}>
            <Ionicons name="menu" size={24} color="#E1C39B" />
          </Pressable>
          <Text
            className="font-headline text-[#E1C39B]"
            style={{
              fontSize: 14,
              lineHeight: 16,
              fontWeight: "700",
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {"ARCHITECTURAL\nLENS"}
          </Text>
        </View>
        <UserAvatar size="sm" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 128 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <View className="mb-2">
          <Text
            className="font-label text-primary"
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: "500",
            }}
          >
            {t("studio.step_1_of_4")}
          </Text>
        </View>

        {/* Headline */}
        <Text
          className="font-headline text-on-surface mb-10"
          style={{ fontSize: 36, lineHeight: 40, fontWeight: "700" }}
        >
          {t("studio.step1_title")}
        </Text>

        {/* Upload Zone */}
        <Pressable
          onPress={handleUpload}
          disabled={isUploading}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.98 : 1 }],
            height: 200,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: "#4D463C",
            borderRadius: 12,
          })}
          className="w-full items-center justify-center bg-surface-container-low mb-6"
        >
          <Animated.View style={{ opacity: uploadPulse, marginBottom: 16 }}>
            <Ionicons
              name="cloud-upload-outline"
              size={36}
              color="#E0C29A"
            />
          </Animated.View>
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {isUploading ? t("studio.uploading") : t("studio.tap_to_upload")}
          </Text>
        </Pressable>

        {/* OR Divider */}
        <View className="flex-row items-center mb-6" style={{ gap: 16 }}>
          <View
            className="flex-1"
            style={{ height: 1, backgroundColor: "#4D463C" }}
          />
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {t("common.or")}
          </Text>
          <View
            className="flex-1"
            style={{ height: 1, backgroundColor: "#4D463C" }}
          />
        </View>

        {/* Take a Photo Button */}
        <Pressable
          onPress={handleCamera}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.98 : 1 }],
            borderWidth: 1,
            borderColor: "#4D463C",
            borderRadius: 12,
          })}
          className="w-full flex-row items-center justify-center py-4 mb-8"
          disabled={isUploading}
        >
          <Ionicons
            name="camera-outline"
            size={20}
            color="#E0C29A"
            style={{ marginRight: 12 }}
          />
          <Text
            className="font-label text-primary"
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {t("studio.take_a_photo")}
          </Text>
        </Pressable>

        {/* Professional Tips Section */}
        <View style={{ gap: 24 }}>
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {t("studio.professional_tips")}
          </Text>

          <View style={{ gap: 16 }}>
            {tips.map(tip => (
              <View
                key={tip.icon}
                className="bg-surface-container-low rounded-xl flex-row items-start"
                style={{ padding: 24, gap: 24 }}
              >
                {/* Tip Icon Container */}
                <View
                  className="bg-surface-container-highest items-center justify-center"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    flexShrink: 0,
                  }}
                >
                  <Ionicons name={tip.icon} size={28} color="#E1C39B" />
                </View>

                {/* Tip Text */}
                <View className="flex-1">
                  <Text
                    className="text-primary font-medium mb-1"
                    style={{
                      fontSize: 14,
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {t(tip.titleKey)}
                  </Text>
                  <Text
                    className="text-on-surface-variant font-body"
                    style={{ fontSize: 12, lineHeight: 18 }}
                  >
                    {t(tip.textKey)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
