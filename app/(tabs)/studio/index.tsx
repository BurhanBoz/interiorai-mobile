import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStudioStore } from "@/stores/studioStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useDrawer } from "@/components/layout/DrawerProvider";

const tips = [
  {
    icon: "sunny-outline" as const,
    title: "Natural Lighting",
    text: "Capture your space during daylight for the most accurate AI depth analysis.",
  },
  {
    icon: "scan-outline" as const,
    title: "Wide Perspectives",
    text: "Stand in a corner to give the Lens AI a full view of the architectural volume.",
  },
  {
    icon: "navigate-outline" as const,
    title: "Clear Pathways",
    text: "Ensure the floor area is visible to help the system map spatial dimensions.",
  },
];

export default function StudioScreen() {
  const { pickImage, isUploading } = useImagePicker();
  const { openDrawer } = useDrawer();
  const photo = useStudioStore(s => s.photo);
  const setPhoto = useStudioStore(s => s.setPhoto);

  const handleUpload = async () => {
    const result = await pickImage("gallery");
    if (result) {
      setPhoto(result);
    }
  };

  const handleCamera = async () => {
    const result = await pickImage("camera");
    if (result) {
      setPhoto(result);
    }
  };

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
          <View
            className="overflow-hidden"
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(77,70,60,0.2)",
            }}
          >
            <Image
              source={{ uri: "https://i.pravatar.cc/40?img=12" }}
              style={{ width: 32, height: 32 }}
              contentFit="cover"
            />
          </View>
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
              STEP 1 OF 4
            </Text>
          </View>

          {/* Headline */}
          <Text
            className="font-headline text-on-surface mb-10"
            style={{ fontSize: 36, lineHeight: 40, fontWeight: "700" }}
          >
            Analyze Your Space
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
              Change Photo
            </Text>
          </Pressable>
        </ScrollView>

        {/* CTA */}
        <View className="absolute bottom-0 left-0 right-0 px-6 pb-24 pt-4">
          <Pressable
            onPress={handleContinue}
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
                Continue to Architecture
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
            </LinearGradient>
          </Pressable>
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
        <View
          className="overflow-hidden"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.2)",
          }}
        >
          <Image
            source={{ uri: "https://i.pravatar.cc/40?img=12" }}
            style={{ width: 32, height: 32 }}
            contentFit="cover"
          />
        </View>
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
            STEP 1 OF 4
          </Text>
        </View>

        {/* Headline */}
        <Text
          className="font-headline text-on-surface mb-10"
          style={{ fontSize: 36, lineHeight: 40, fontWeight: "700" }}
        >
          Analyze Your Space
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
          <Ionicons
            name="cloud-upload-outline"
            size={36}
            color="#E0C29A"
            style={{ marginBottom: 16 }}
          />
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {isUploading ? "Uploading…" : "Tap to Upload"}
          </Text>
        </Pressable>

        {/* OR Divider */}
        <View className="flex-row items-center mb-6" style={{ gap: 16 }}>
          <View
            className="flex-1"
            style={{ height: 1, backgroundColor: "rgba(77,70,60,0.2)" }}
          />
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            OR
          </Text>
          <View
            className="flex-1"
            style={{ height: 1, backgroundColor: "rgba(77,70,60,0.2)" }}
          />
        </View>

        {/* Take a Photo Button */}
        <Pressable
          onPress={handleCamera}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.98 : 1 }],
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.2)",
            borderRadius: 12,
          })}
          className="w-full flex-row items-center justify-center py-4 mb-12"
          disabled={isUploading}
        >
          <Ionicons
            name="camera-outline"
            size={20}
            color="#E0C29A"
            style={{ marginRight: 12 }}
          />
          <Text
            className="font-label text-on-surface-variant"
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#D0C5B8",
            }}
          >
            Take a Photo
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
              opacity: 0.6,
            }}
          >
            Professional Tips
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
                    width: 64,
                    height: 64,
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
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {tip.title}
                  </Text>
                  <Text
                    className="text-on-surface-variant font-body"
                    style={{ fontSize: 12, lineHeight: 18 }}
                  >
                    {tip.text}
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
