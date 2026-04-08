import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStudioStore } from "@/stores/studioStore";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAtcbUi2Pw9JLxsj49zOYkSdAyplOr2AMu_7YphlHKTqRRPX8Y77HUxfNkWuYjtBjWewZxxs66apwRBPXcvFj3OGdiuzF1c9bsBQGWyNKtzSGVINxC9BN73TA0lQJ6-IsSnlQdOSuKb58sI_HDXDlWzXHJJupbG5J-CqfKvvjc9Ol-Cgyyj1IBIE6aHfd_s2V2zYM88KfYJCKCrY7ptXTQZWPimmwtDjsxxeALfi_VHJ6KB1gdmHl73ON3G2_GmpeNOa3zfpbQJAm3d";

const CHARACTERISTICS = [
  "ORGANIC RADII",
  "DIFFUSED LIGHT",
  "THERMAL COMFORT",
  "NATURAL TIMBER",
];

export default function StyleScreen() {
  const designStyle = useStudioStore(s => s.designStyle);

  const styleName = designStyle?.name ?? "Biophilic Integration";
  const styleCategory = designStyle?.category ?? "Curation Type 04";
  const styleDescription =
    designStyle?.description ??
    "A design philosophy that weaves living systems and organic materiality into interior spaces, fostering an innate connection between inhabitants and the natural world through light, texture, and biomorphic form.";
  const heroImage = designStyle?.previewUrl ?? HERO_IMAGE;

  return (
    <View className="flex-1 bg-surface/80">
      <SafeAreaView className="flex-1 justify-end">
        <View className="max-h-[92%] bg-surface rounded-t-[24px] overflow-hidden">
          {/* Pull handle */}
          <View className="items-center pt-3 pb-2">
            <View className="w-12 h-1 rounded-full bg-on-surface/10" />
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-8"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero image */}
            <Image
              source={{ uri: heroImage }}
              className="w-full aspect-[4/3] rounded-xl"
              contentFit="cover"
            />

            {/* Content */}
            <View className="mt-5">
              {/* Category */}
              <Text className="text-[10px] tracking-[0.2em] text-primary uppercase font-label">
                {styleCategory}
              </Text>

              {/* Title */}
              <Text className="font-headline text-[1.75rem] leading-tight text-on-surface mt-1">
                {styleName}
              </Text>

              {/* Description */}
              <Text className="text-on-surface-variant text-[0.875rem] leading-relaxed font-body mt-3">
                {styleDescription}
              </Text>

              {/* Key Characteristics */}
              <Text className="text-[10px] tracking-[0.2em] text-on-surface uppercase font-label mt-6 mb-3">
                KEY CHARACTERISTICS
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {CHARACTERISTICS.map(tag => (
                  <View
                    key={tag}
                    className="bg-surface-container-high rounded-full px-3 py-1.5"
                  >
                    <Text className="text-[10px] uppercase tracking-wider text-on-surface font-label">
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Materiality note */}
              <View className="bg-surface-container-low rounded-xl p-4 mt-5 flex-row items-start gap-3">
                <Ionicons name="sparkles" size={18} color="#E1C39B" />
                <Text className="text-on-surface-variant text-[0.8125rem] leading-relaxed italic font-body flex-1">
                  Emphasises raw, tactile surfaces — think honed stone,
                  live-edge timber, hand-trowelled clay, and woven natural
                  fibres.
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View className="mt-8 gap-3">
              <Pressable
                className="bg-primary rounded-xl py-4 items-center active:opacity-80"
                onPress={() => router.back()}
              >
                <Text className="text-on-primary font-headline text-[0.9375rem]">
                  Select This Style
                </Text>
              </Pressable>

              <Pressable
                className="py-3 items-center active:opacity-60"
                onPress={() => router.back()}
              >
                <Text className="text-on-surface-variant font-body text-[0.875rem]">
                  Return to Gallery
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}
