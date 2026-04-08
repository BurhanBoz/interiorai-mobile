import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useStudioStore } from "@/stores/studioStore";
import type { CatalogItemResponse } from "@/types/api";

const ROOM_TYPES: CatalogItemResponse[] = [
  {
    id: "1",
    code: "living-room",
    name: "Living Room",
    description: "",
    category: "room",
    previewUrl: "",
  },
  {
    id: "2",
    code: "bedroom",
    name: "Bedroom",
    description: "",
    category: "room",
    previewUrl: "",
  },
  {
    id: "3",
    code: "kitchen",
    name: "Kitchen",
    description: "",
    category: "room",
    previewUrl: "",
  },
  {
    id: "4",
    code: "home-office",
    name: "Home Office",
    description: "",
    category: "room",
    previewUrl: "",
  },
  {
    id: "5",
    code: "bathroom",
    name: "Bathroom",
    description: "",
    category: "room",
    previewUrl: "",
  },
  {
    id: "6",
    code: "dining-room",
    name: "Dining Room",
    description: "",
    category: "room",
    previewUrl: "",
  },
];

const DESIGN_STYLES: (CatalogItemResponse & { imageUrl: string })[] = [
  {
    id: "1",
    code: "modern",
    name: "Modern",
    description: "",
    category: "style",
    previewUrl: "",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAQgZwszaiZvQ3OvggT1-zJqKe0vhurI-FHTG08Lzwq_v0Er9BvnvyuuJEtkpZutbvz6jHt7HD3iXhgOesf12VrVOgtM_wJYhpbNjS4f41KbvXiISglLa8WAXgO8QRh14yfrbxfG4OFmcXXrufZ1_J8lguIFxqvb17gJ_Z34YrsSC8LrP2zb9eRi0OQ2ulyvGnoZeCCDwUQPTJ953DYdLl3OyJayaTxxczeQN0PLZq9fYLM5PPBZ8C_HbtkSpbbgHuj5Pv3zSkm7E5a",
  },
  {
    id: "2",
    code: "minimalist",
    name: "Minimalist",
    description: "",
    category: "style",
    previewUrl: "",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCdaHjUc-A7KUd4PDz-93AF1olHrjOd1-Yym0SjElBtmP-A4kgEibFE9LxG3mWFgxHpwPlA3Vyvcf52UXI9rM8MlikirSuqodZPAb5UFrg8sJWaAKezxA5RzaWjERKVhNosK2PkGBLUCth_ZLsCSJlBArZ-eq6thwbN5YabZE1vV3DIAFu5kgZzMtaOR4abPXPVISXkeGRDkIMk64J9jryrR3j9W3K0PRhghsr80VVrTsm8KrdcCbvci2MZ8NVmNDKQ5CFAhgMZalsI",
  },
  {
    id: "3",
    code: "scandinavian",
    name: "Scandinavian",
    description: "",
    category: "style",
    previewUrl: "",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDrzZYJars2dat0MFlrjnUyWqPzGDTdHN2D3g_0h0svJKWL1e8TYgL-LnFzzWhgMSZzJmkyDs1dKKhEFnP3LE10rDB2ROIguzQthCNfolq6ihkyfOlRnawi2-abrmnO-3l3s1LdHUMw_XrhN-NsLnZJtyT41wv7bg6RTiKBid_JQHcS687P-lnUORVUh0Um0JW573nW6EERa9pHaDvB8tdOXe9Ds3V6Vv2c8k75XH0BI0pZqvoISvzHqtLX1JzO5d9IjeqROlNEFAVb",
  },
  {
    id: "4",
    code: "industrial",
    name: "Industrial",
    description: "",
    category: "style",
    previewUrl: "",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBnQf45bQUFXhZAKeaxvxNpwich9ZY16cBvl_aQHkongNKLmX45Rc-h7Rlzzi_qgEUXlbfrPHqV9Ls6M52uEb7O-qXq0bRJZg2tbrxVlO5iylkqgp1gPCqba0MiAdoh2NJZvKA9Wm2cuwE17UUKkH2R2gg_XOp7Ht6LRSxuphobqqFG53s6P3zsAUa1KMJpYlnEGDlbLUetuMBioz6_cwGSBV474Pc4VBs4Rfur2ER7Cw3cA-woj1Ev7WrZoVtGlSReFupoJnu6mMwF",
  },
];

export default function UploadedScreen() {
  const { roomType, designStyle, setRoomType, setDesignStyle } =
    useStudioStore();

  const handleNext = () => {
    router.push("/studio/options");
  };

  const canProceed = roomType !== null && designStyle !== null;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView className="flex-1" contentContainerClassName="px-8 pb-32">
        {/* Step Indicator */}
        <View className="mt-4 mb-6">
          <Text className="text-[10px] uppercase tracking-[0.2em] text-primary font-label mb-2">
            Step 2 of 4
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1 h-1 rounded-full bg-primary" />
            <View className="flex-1 h-1 rounded-full bg-primary" />
            <View className="flex-1 h-1 rounded-full bg-surface-container-highest" />
            <View className="flex-1 h-1 rounded-full bg-surface-container-highest" />
          </View>
        </View>

        {/* Section A - Room Type */}
        <Text className="font-headline text-2xl font-medium text-on-surface mb-4">
          Room Type
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-8"
          contentContainerClassName="gap-2"
        >
          {ROOM_TYPES.map(room => {
            const selected = roomType?.id === room.id;
            return (
              <Pressable
                key={room.id}
                onPress={() => setRoomType(room)}
                className={`px-6 py-2.5 rounded-full ${
                  selected ? "bg-primary" : "bg-surface-container-high"
                }`}
              >
                <Text
                  className={`text-sm font-body ${
                    selected
                      ? "text-on-primary font-medium"
                      : "text-on-surface-variant"
                  }`}
                >
                  {room.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Section B - Design Style */}
        <Text className="font-headline text-2xl font-medium text-on-surface mb-4">
          Design Style
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {DESIGN_STYLES.map(style => {
            const selected = designStyle?.id === style.id;
            return (
              <Pressable
                key={style.id}
                onPress={() => setDesignStyle(style)}
                className="w-[48%] mb-4"
              >
                <View
                  className={`rounded-xl overflow-hidden ${
                    selected
                      ? "ring-2 ring-primary bg-surface-container-high"
                      : "bg-surface-container-low"
                  }`}
                  style={
                    selected
                      ? { borderWidth: 2, borderColor: "#E1C39B" }
                      : undefined
                  }
                >
                  <Image
                    source={{ uri: style.imageUrl }}
                    className="w-full aspect-[4/5]"
                    contentFit="cover"
                  />
                  <View className="px-3 py-2.5">
                    <Text
                      className={`text-[10px] uppercase tracking-[0.15em] font-label ${
                        selected ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {selected ? "SELECTED" : "STYLE"}
                    </Text>
                    <Text className="text-sm font-body text-on-surface mt-0.5">
                      {style.name}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* CTA Button */}
      <View className="absolute bottom-0 left-0 right-0 px-8 pb-8 pt-4">
        <Pressable
          onPress={handleNext}
          disabled={!canProceed}
          className={!canProceed ? "opacity-50" : ""}
        >
          <LinearGradient
            colors={["#E1C39B", "#C4A882"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="rounded-full py-4 items-center"
          >
            <Text className="text-on-primary font-body font-semibold text-base">
              Next Step
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
