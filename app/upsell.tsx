import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const IMAGE_STANDARD =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDlGRuxXPnYvnidkHrrHd4LbVo9L8WVjUmMnIT5gFfICw79lpcSXLg6QxAuvUe1Rup9zHmVawVk_Z29Q97GVJ3dSVngK9W9rMO4HZhGLnOKZLsvVKQxFhtA_bmMvwnegTdJNBKjzWkD88Oqy0mpVOFLmWyQZMQuEuhR8FICCqzPUCJ-SXjxtZ1kqv6BBeh24xyf3O4-aDL1uQDifJuq3OPxAMtSvzBKi74U5yhcwIU-mOk5w0VvBDFrBVFxCh6latYpt_59xVRz1Kv5";

const IMAGE_HD =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBDvTCgzCJBG8_G_H8hiiFTP_WSlHppSMpdTRaAVNA7eVytCv4mBk80oFEkNcK_-S9EPwS0P5K1LCICboTan08chPTrQfzF0Qvfc0gJ5cobBxgMMz8L-tpZr6W0vShW4i3vppVvgUR_iXI_fIxUysDyl4TJUkCuLzo9o_m7267D0twytvIEzQMzVX8lrq3JUC_BHl-iC0kGl6VzglM3t5-732hJfzlByVfDLS1xYnKOTZYXn0yLcUjEuBoNQEppctq0Uag6jcKqaw7p";

export default function UpsellScreen() {
  return (
    <View className="flex-1 bg-surface">
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
          >
            <Ionicons name="close" size={22} color="#E5E2E1" />
          </Pressable>
          <Text className="font-label text-xs uppercase tracking-[0.1em] text-on-surface-variant">
            Membership Required
          </Text>
          <View className="h-10 w-10" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-40"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Headline */}
          <Text className="mt-4 font-headline text-[2.25rem] leading-[1.1] text-on-surface">
            HD Quality{"\n"}requires Basic.
          </Text>

          <Text className="mt-3 font-body text-base leading-relaxed text-on-surface-variant">
            Experience your architectural visions in surgical detail.
          </Text>

          {/* Comparison Grid */}
          <View className="mt-8 flex-row gap-3">
            {/* Standard */}
            <View className="flex-1">
              <View className="aspect-square overflow-hidden rounded-xl bg-surface-container-low">
                <Image
                  source={IMAGE_STANDARD}
                  contentFit="cover"
                  className="h-full w-full opacity-50"
                  blurRadius={3}
                />
                {/* 72dpi Badge */}
                <View className="absolute left-2 top-2 rounded-md bg-surface-container-high/80 px-2 py-1">
                  <Text className="font-label text-[10px] font-semibold text-on-surface-variant">
                    72dpi
                  </Text>
                </View>
              </View>
              <Text className="mt-2 text-center font-label text-xs text-on-surface-variant">
                Standard
              </Text>
            </View>

            {/* HD */}
            <View className="flex-1">
              <View className="aspect-square overflow-hidden rounded-xl bg-surface-container-low">
                <Image
                  source={IMAGE_HD}
                  contentFit="cover"
                  className="h-full w-full"
                />
                {/* 2048px Badge */}
                <View className="absolute right-2 top-2 rounded-md bg-primary px-2 py-1">
                  <Text className="font-label text-[10px] font-semibold text-on-primary">
                    2048px
                  </Text>
                </View>
              </View>
              <Text className="mt-2 text-center font-label text-xs text-primary">
                High Definition
              </Text>
            </View>
          </View>

          {/* Value Proposition */}
          <View className="mt-10">
            <Text className="font-headline text-2xl text-on-surface">
              Uncompromising.
            </Text>
            <Text className="mt-2 font-body text-sm leading-6 text-on-surface-variant">
              Every render crafted at maximum fidelity — textures you can feel,
              light that behaves as it should, and resolution that holds up at
              any scale.
            </Text>

            {/* Feature Items */}
            <View className="mt-6 gap-5">
              {/* Advanced Texturing */}
              <View className="flex-row gap-3">
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#E1C39B"
                  style={{ marginTop: 1 }}
                />
                <View className="flex-1">
                  <Text className="font-label text-sm font-semibold text-on-surface">
                    Advanced Texturing
                  </Text>
                  <Text className="mt-0.5 font-body text-sm leading-5 text-on-surface-variant">
                    Material surfaces rendered with physically accurate detail
                    and depth.
                  </Text>
                </View>
              </View>

              {/* Export Ready */}
              <View className="flex-row gap-3">
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#E1C39B"
                  style={{ marginTop: 1 }}
                />
                <View className="flex-1">
                  <Text className="font-label text-sm font-semibold text-on-surface">
                    Export Ready
                  </Text>
                  <Text className="mt-0.5 font-body text-sm leading-5 text-on-surface-variant">
                    High-resolution outputs suitable for print, presentation, or
                    client delivery.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Fixed Bottom Footer — Glassmorphic */}
      <View className="absolute bottom-0 left-0 right-0">
        <BlurView intensity={40} tint="dark" className="overflow-hidden">
          <View className="bg-surface/70">
            <SafeAreaView edges={["bottom"]}>
              <View className="px-6 pb-2 pt-4">
                {/* Upgrade CTA */}
                <Pressable
                  onPress={() => router.push("/plans")}
                  className="overflow-hidden rounded-xl active:opacity-80"
                >
                  <LinearGradient
                    colors={["#C4A882", "#b3956e"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="flex-row items-center justify-center gap-2 py-4 px-6"
                  >
                    <Text className="font-label text-sm font-semibold text-on-primary">
                      Upgrade to Basic
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#3F2D11" />
                  </LinearGradient>
                </Pressable>

                {/* Review Plan Details */}
                <Pressable
                  onPress={() => router.push("/plans")}
                  className="mt-3 items-center py-2 active:opacity-70"
                >
                  <Text className="font-label text-sm text-on-surface-variant">
                    Review Plan Details
                  </Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        </BlurView>
      </View>
    </View>
  );
}
