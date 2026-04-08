import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { useStudioStore } from "@/stores/studioStore";
import { useImagePicker } from "@/hooks/useImagePicker";

const tips = [
  {
    icon: "sunny-outline" as const,
    text: "Ensure natural daylight illuminates the space for the most authentic capture.",
  },
  {
    icon: "resize-outline" as const,
    text: "Capture from a corner angle to maximize spatial depth and dimension.",
  },
  {
    icon: "layers-outline" as const,
    text: "Remove loose objects and personal items for a cleaner transformation.",
  },
];

export default function StudioScreen() {
  const { pickImage, isUploading } = useImagePicker();
  const setPhoto = useStudioStore(s => s.setPhoto);

  const handleUpload = async () => {
    const result = await pickImage("gallery");
    if (result) {
      setPhoto(result);
      router.push("/studio/uploaded");
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-12"
      >
        {/* Step indicator */}
        <Text className="text-[11px] uppercase tracking-[0.1em] text-primary font-label mb-2">
          Step 1 of 4
        </Text>

        {/* Headline */}
        <Text className="font-headline text-4xl text-on-surface mb-3">
          Upload Your Space
        </Text>

        {/* Subtitle */}
        <Text className="text-on-surface-variant text-sm font-body max-w-[80%] mb-8">
          Begin the transformation by capturing the raw essence of your
          environment.
        </Text>

        {/* Upload zone */}
        <Pressable
          onPress={handleUpload}
          disabled={isUploading}
          className="h-80 bg-surface-container-low rounded-xl items-center justify-center mb-8"
          style={{
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "rgba(196,168,130,0.25)",
          }}
        >
          <View className="w-16 h-16 rounded-full bg-surface-container-high items-center justify-center mb-4">
            <Ionicons name="camera" size={28} color="#E1C39B" />
          </View>
          <Text className="text-on-surface font-body text-sm mb-2">
            {isUploading ? "Uploading…" : "Tap to upload or take a photo"}
          </Text>
          <Text className="text-on-surface-variant font-label text-[11px] uppercase tracking-[0.1em]">
            Supports HEIC, JPG, PNG
          </Text>
        </Pressable>

        {/* Tips divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-outline-variant" />
          <Text className="text-on-surface-variant font-label text-[11px] uppercase tracking-[0.1em] mx-4">
            Tips for Best Results
          </Text>
          <View className="flex-1 h-px bg-outline-variant" />
        </View>

        {/* Tips */}
        <View className="gap-5">
          {tips.map(tip => (
            <View key={tip.icon} className="flex-row items-start gap-4">
              <Ionicons name={tip.icon} size={20} color="#E1C39B" />
              <Text className="text-on-surface-variant text-sm font-body flex-1">
                {tip.text}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
