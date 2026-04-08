import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const IMAGE_YOUR_SPACE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDlGRuxXPnYvnidkHrrHd4LbVo9L8WVjUmMnIT5gFfICw79lpcSXLg6QxAuvUe1Rup9zHmVawVk_Z29Q97GVJ3dSVngK9W9rMO4HZhGLnOKZLsvVKQxFhtA_bmMvwnegTdJNBKjzWkD88Oqy0mpVOFLmWyQZMQuEuhR8FICCqzPUCJ-SXjxtZ1kqv6BBeh24xyf3O4-aDL1uQDifJuq3OPxAMtSvzBKi74U5yhcwIU-mOk5w0VvBDFrBVFxCh6latYpt_59xVRz1Kv5";

const IMAGE_REFERENCE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCTXyVhAcoQYJMFYjKDohAMSsvXdeBTSa1004bOF7OWMV0Bo6hOWuJDywLIOIi2g3Mwfi4KxSX0d37Q1dYmn3xUuAvygPNYTJUi8_yS9WKFFCzSTKf41ZrkNg4_McC_Cw_7xOQpf9UStIm8ZHS-5RMKTFk4MGCRWTyzZJ8Z28nB-dCWtEi1ulEtlcz5PhfiFU8pCqoNci4YwDiE8rMKpeLL99CWnNTMe18TEWXREBIHjQCZj_XuRcElHWaG7v4Nhw5B80dZwB_6i5wc";

const IMAGE_RESULT =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBDvTCgzCJBG8_G_H8hiiFTP_WSlHppSMpdTRaAVNA7eVytCv4mBk80oFEkNcK_-S9EPwS0P5K1LCICboTan08chPTrQfzF0Qvfc0gJ5cobBxgMMz8L-tpZr6W0vShW4i3vppVvgUR_iXI_fIxUysDyl4TJUkCuLzo9o_m7267D0twytvIEzQMzVX8lrq3JUC_BHl-iC0kGl6VzglM3t5-732hJfzlByVfDLS1xYnKOTZYXn0yLcUjEuBoNQEppctq0Uag6jcKqaw7p";

export default function StyleTransferScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-8 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text className="mt-6 text-center text-[11px] font-label tracking-[0.1em] text-primary uppercase">
          Exclusive Feature
        </Text>

        <Text className="mt-3 text-center font-headline text-[2.5rem] leading-[1.1] text-on-surface">
          Style Transfer
        </Text>

        <Text className="mt-3 self-center text-center text-base font-body leading-relaxed text-on-surface-variant max-w-[80%]">
          Style Transfer requires Max. Apply any reference aesthetic to your
          space with architectural precision.
        </Text>

        {/* Visual Demo Section */}
        <View className="mt-8 flex-row gap-3">
          {/* Your Space */}
          <View className="flex-[7]">
            <View className="aspect-[4/3] overflow-hidden rounded-xl bg-surface-container-low">
              <Image
                source={IMAGE_YOUR_SPACE}
                contentFit="cover"
                className="w-full h-full"
              />
            </View>
            <Text className="mt-2 text-center text-xs font-label text-on-surface-variant">
              Your Space
            </Text>
          </View>

          {/* Reference */}
          <View className="flex-[5]">
            <View className="aspect-square overflow-hidden rounded-xl bg-surface-container-high">
              <Image
                source={IMAGE_REFERENCE}
                contentFit="cover"
                className="w-full h-full"
              />
              {/* Sparkles Badge */}
              <View className="absolute top-2 right-2 rounded-full bg-primary/90 p-1.5">
                <Ionicons name="sparkles" size={14} color="#3F2D11" />
              </View>
            </View>
            <Text className="mt-2 text-center text-xs font-label text-on-surface-variant">
              Reference
            </Text>
          </View>
        </View>

        {/* Arrow Down */}
        <View className="my-4 items-center">
          <Ionicons name="arrow-down" size={28} color="#E1C39B" />
        </View>

        {/* Result — Locked Preview */}
        <View className="overflow-hidden rounded-xl bg-surface-container-low">
          <View className="aspect-[16/9] w-full">
            <Image
              source={IMAGE_RESULT}
              contentFit="cover"
              className="w-full h-full"
              blurRadius={20}
            />
            {/* Blur Overlay */}
            <View className="absolute inset-0 items-center justify-center bg-surface/50">
              <View className="items-center gap-2">
                <View className="rounded-full bg-surface-container-high/80 p-3">
                  <Ionicons name="lock-closed" size={24} color="#E1C39B" />
                </View>
                <Text className="text-sm font-label text-on-surface-variant">
                  Unlock Visual Preview
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Result Description */}
        <Text className="mt-4 text-center font-headline text-lg text-on-surface">
          Architectural Synthesis
        </Text>
        <Text className="mt-1 text-center text-sm font-body leading-relaxed text-on-surface-variant">
          Your space reimagined with the reference aesthetic, blending structure
          and style into a cohesive new design.
        </Text>

        {/* Upgrade CTA */}
        <Pressable
          onPress={() => router.push("/plans")}
          className="mt-8 overflow-hidden rounded-xl active:opacity-80"
        >
          <LinearGradient
            colors={["#C4A882", "#A68E6B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="flex-row items-center justify-center gap-2 py-4 px-6"
          >
            <Ionicons name="star" size={18} color="#281901" />
            <Text className="text-base font-label font-semibold text-on-primary-fixed">
              Upgrade to Max
            </Text>
          </LinearGradient>
        </Pressable>

        <Text className="mt-3 mb-4 text-center text-xs font-label text-on-surface-variant">
          Starting at $9.99/mo
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
