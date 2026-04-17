import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStudioStore } from "@/stores/studioStore";
import { useDrawer } from "@/components/layout/DrawerProvider";
import { useImagePicker } from "@/hooks/useImagePicker";

export default function UploadedScreen() {
  const photo = useStudioStore(s => s.photo);
  const setPhoto = useStudioStore(s => s.setPhoto);
  const { openDrawer } = useDrawer();
  const { pickImage } = useImagePicker();

  const handleNext = () => {
    router.push("/studio/style");
  };

  const handleChangePhoto = async () => {
    const result = await pickImage("gallery");
    if (result) {
      setPhoto(result);
    }
  };

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
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator */}
        <View className="mb-2" style={{ paddingTop: 32 }}>
          <Text
            className="font-label text-secondary"
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
          className="font-headline text-on-surface mb-12"
          style={{ fontSize: 36, lineHeight: 40, fontWeight: "700" }}
        >
          Your Photo
        </Text>

        {/* Uploaded Photo Preview */}
        <View
          className="rounded-xl overflow-hidden mb-6"
          style={{ elevation: 8 }}
        >
          <View
            style={{ aspectRatio: 4 / 3 }}
            className="bg-surface-container-low"
          >
            <Image
              source={{ uri: photo?.uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />

            {/* Dark Overlay */}
            <View
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
            />

            {/* Close Button */}
            <Pressable
              onPress={() => setPhoto(null)}
              className="absolute items-center justify-center"
              style={{
                top: 16,
                right: 16,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(19,19,19,0.8)",
              }}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color="#E5E2E1" />
            </Pressable>
          </View>
        </View>

        {/* Change Photo */}
        <View className="items-center mb-12">
          <Pressable
            onPress={handleChangePhoto}
            className="flex-row items-center py-2"
            style={{ gap: 8 }}
          >
            <Ionicons name="refresh" size={18} color="#D0C5B8" />
            <Text
              className="font-label"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#D0C5B8",
              }}
            >
              Change Photo
            </Text>
          </Pressable>
        </View>

        {/* Info hint */}
        <View
          style={{
            marginTop: 16,
            padding: 20,
            borderRadius: 12,
            backgroundColor: "#1C1B1B",
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Ionicons name="bulb-outline" size={22} color="#C4A882" />
          <Text
            className="font-body text-on-surface-variant"
            style={{ fontSize: 13, lineHeight: 20, flex: 1 }}
          >
            For best results, use a well-lit photo taken straight on with no
            people or pets in the frame.
          </Text>
        </View>
      </ScrollView>

      {/* Fixed CTA */}
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-24 pt-4">
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
              Continue to Architecture
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
