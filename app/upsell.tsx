import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/* ── Stitch design assets ── */
const IMG_STANDARD =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAA9m-C1HYfKYKqWhMNOVzGjeqxNnJfb-2trytdsUv1ZXRnZRbPGH06vN5NEi3p6bJKkOT7mdBmYZYZ7ojkUjM_sGWNNLF72-D_IwUCGjhYHDJtrjWN1aZNwG8wxskDPsJHunU39u6RokN3Oyu79cgJ-XmQc72guuoKOlw-UyS-vOan0xwivwo0qHiPc9nAENOTNCmu_Yr5T--_IyNd08b8q0bNpYDjNXMmCJ00AmpAn-wwzNgBrDShvXAgRwxKAH4m3EScVBov9g8";
const IMG_HD =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuABvCJfHojIJ44a6rYGrSXwcpoNuwalPDKl5MWp8bYHVPMVdL6MeNS-L2FY683LwuWqZKaOUaY7f56L00vhwTutoScnSGJzzm8PcwSNBYMX8LPYIkN0lnbo0Dir5N4P3_orHTK4WykjXc9CyTXhTnQMkLB49jN3dy7z9m0slmZteWoC3kOKDmg9jckYMBuGggNUmrxIaEJdlvVmIRC3uJX-g19S_APktsNi2PGu6HWLAgnxzDQ9D1xMDvDyjOkI2Ze-QLL9f4KAJ_g";
const IMG_YOUR_SPACE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDlGRuxXPnYvnidkHrrHd4LbVo9L8WVjUmMnIT5gFfICw79lpcSXLg6QxAuvUe1Rup9zHmVawVk_Z29Q97GVJ3dSVngK9W9rMO4HZhGLnOKZLsvVKQxFhtA_bmMvwnegTdJNBKjzWkD88Oqy0mpVOFLmWyQZMQuEuhR8FICCqzPUCJ-SXjxtZ1kqv6BBeh24xyf3O4-aDL1uQDifJuq3OPxAMtSvzBKi74U5yhcwIU-mOk5w0VvBDFrBVFxCh6latYpt_59xVRz1Kv5";
const IMG_REFERENCE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCTXyVhAcoQYJMFYjKDohAMSsvXdeBTSa1004bOF7OWMV0Bo6hOWuJDywLIOIi2g3Mwfi4KxSX0d37Q1dYmn3xUuAvygPNYTJUi8_yS9WKFFCzSTKf41ZrkNg4_McC_Cw_7xOQpf9UStIm8ZHS-5RMKTFk4MGCRWTyzZJ8Z28nB-dCWtEi1ulEtlcz5PhfiFU8pCqoNci4YwDiE8rMKpeLL99CWnNTMe18TEWXREBIHjQCZj_XuRcElHWaG7v4Nhw5B80dZwB_6i5wc";
const IMG_RESULT =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBDvTCgzCJBG8_G_H8hiiFTP_WSlHppSMpdTRaAVNA7eVytCv4mBk80oFEkNcK_-S9EPwS0P5K1LCICboTan08chPTrQfzF0Qvfc0gJ5cobBxgMMz8L-tpZr6W0vShW4i3vppVvgUR_iXI_fIxUysDyl4TJUkCuLzo9o_m7267D0twytvIEzQMzVX8lrq3JUC_BHl-iC0kGl6VzglM3t5-732hJfzlByVfDLS1xYnKOTZYXn0yLcUjEuBoNQEppctq0Uag6jcKqaw7p";

/* ═══════════════════════════════════════════════════════════════ */
/*  HD QUALITY VARIANT — Stitch design                            */
/* ═══════════════════════════════════════════════════════════════ */
function HDUpsell() {
  return (
    <>
      {/* Header Section */}
      <View style={{ marginBottom: 40 }}>
        <Text
          className="font-label text-secondary"
          style={{
            fontSize: 11,
            fontWeight: "500",
            letterSpacing: 2.2,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Membership Required
        </Text>
        <Text
          className="font-headline text-on-surface"
          style={{ fontSize: 32, lineHeight: 40, marginBottom: 16 }}
        >
          HD Quality{"\n"}requires Basic.
        </Text>
        <Text
          className="font-body text-secondary"
          style={{ fontSize: 14, lineHeight: 22, maxWidth: "85%" }}
        >
          Experience your architectural visions in surgical detail. HD rendering
          unlocks texture fidelity and professional-grade exports.
        </Text>
      </View>

      {/* Comparison Section */}
      <View style={{ marginBottom: 48 }}>
        <View className="flex-row" style={{ gap: 12, height: 280 }}>
          {/* Standard Quality */}
          <View className="flex-1">
            <View
              className="flex-1 rounded-xl overflow-hidden bg-surface-container-low"
              style={{ marginBottom: 12 }}
            >
              <Image
                source={{ uri: IMG_STANDARD }}
                style={{ width: "100%", height: "100%", opacity: 0.75 }}
                contentFit="cover"
                blurRadius={1}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                }}
              >
                <Text
                  className="font-label"
                  style={{
                    fontSize: 10,
                    fontWeight: "500",
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "rgba(229,226,225,0.7)",
                  }}
                >
                  72DPI
                </Text>
              </View>
            </View>
            <Text
              className="font-label text-secondary"
              style={{
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              Standard
            </Text>
          </View>

          {/* HD Quality */}
          <View className="flex-1">
            <View
              className="flex-1 rounded-xl overflow-hidden bg-surface-container-low"
              style={{
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "rgba(224,194,154,0.2)",
              }}
            >
              <Image
                source={{ uri: IMG_HD }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                }}
              >
                <LinearGradient
                  colors={["#C4A882", "#A68A62"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    className="font-label"
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: "#3F2D11",
                    }}
                  >
                    2048PX
                  </Text>
                </LinearGradient>
              </View>
            </View>
            <Text
              className="font-label text-secondary"
              style={{
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 1.5,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              High Definition
            </Text>
          </View>
        </View>
      </View>

      {/* Value Proposition Card */}
      <View
        className="rounded-xl bg-surface-container-low"
        style={{ padding: 32, marginBottom: 48 }}
      >
        <Text
          className="font-headline text-on-surface"
          style={{ fontSize: 24, marginBottom: 12 }}
        >
          Uncompromising.
        </Text>
        <Text
          className="font-body text-secondary"
          style={{ fontSize: 14, lineHeight: 22 }}
        >
          Get crystal-clear 2048px renders that capture every material texture
          and light reflection.
        </Text>
      </View>

      {/* Feature Checklist */}
      <View style={{ gap: 32, marginBottom: 16 }}>
        <View className="flex-row items-start" style={{ gap: 16 }}>
          <Ionicons
            name="checkmark-circle"
            size={24}
            color="#E0C29A"
            style={{ marginTop: 2 }}
          />
          <View className="flex-1">
            <Text
              className="font-body text-on-surface"
              style={{ fontSize: 14, fontWeight: "600", marginBottom: 4 }}
            >
              Advanced Texturing
            </Text>
            <Text
              className="font-body text-secondary"
              style={{ fontSize: 12, lineHeight: 20 }}
            >
              Deep-learning material refinement for photorealistic surfaces.
            </Text>
          </View>
        </View>

        <View className="flex-row items-start" style={{ gap: 16 }}>
          <Ionicons
            name="checkmark-circle"
            size={24}
            color="#E0C29A"
            style={{ marginTop: 2 }}
          />
          <View className="flex-1">
            <Text
              className="font-body text-on-surface"
              style={{ fontSize: 14, fontWeight: "600", marginBottom: 4 }}
            >
              Export Ready
            </Text>
            <Text
              className="font-body text-secondary"
              style={{ fontSize: 12, lineHeight: 20 }}
            >
              Professional formats for presentations and client deliverables.
            </Text>
          </View>
        </View>
      </View>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  STYLE TRANSFER VARIANT                                        */
/* ═══════════════════════════════════════════════════════════════ */
function StyleTransferUpsell() {
  return (
    <>
      {/* Hero Section */}
      <View className="mb-10">
        <Text
          className="font-label font-medium text-primary mb-2"
          style={{
            fontSize: 11,
            letterSpacing: 1.1,
            textTransform: "uppercase",
          }}
        >
          Exclusive Feature
        </Text>
        <Text
          className="font-headline font-medium text-[#F5F0EB] mb-4"
          style={{ fontSize: 40, lineHeight: 44 }}
        >
          Style Transfer
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 22,
            color: "rgba(245,240,235,0.6)",
            maxWidth: "80%",
          }}
        >
          Style Transfer requires Max. Apply any reference aesthetic to your
          space with surgical precision.
        </Text>
      </View>

      {/* Visual Demonstration */}
      <View className="gap-8">
        {/* Source Pair */}
        <View className="flex-row gap-4">
          {/* Your Space — 7/12 */}
          <View
            className="bg-surface-container-low p-3 rounded-xl"
            style={{
              flex: 7,
              shadowColor: "rgba(245,240,235,1)",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.06,
              shadowRadius: 40,
            }}
          >
            <Image
              source={{ uri: IMG_YOUR_SPACE }}
              className="w-full rounded-lg mb-3"
              style={{ aspectRatio: 4 / 3 }}
              contentFit="cover"
            />
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: "rgba(245,240,235,0.4)",
              }}
            >
              Your Space
            </Text>
          </View>

          {/* Reference — 5/12 */}
          <View
            style={{ flex: 5, justifyContent: "flex-end", marginBottom: 24 }}
          >
            <View
              className="bg-surface-container-high p-2 rounded-xl relative"
              style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}
            >
              <Image
                source={{ uri: IMG_REFERENCE }}
                className="w-full rounded-lg"
                style={{ aspectRatio: 1 }}
                contentFit="cover"
              />
              {/* Auto-awesome badge */}
              <View
                className="absolute bg-primary rounded-full items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  top: -8,
                  right: -8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Ionicons name="sparkles" size={14} color="#3F2D11" />
              </View>
            </View>
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: "rgba(245,240,235,0.4)",
                textAlign: "right",
                marginTop: 8,
              }}
            >
              Reference
            </Text>
          </View>
        </View>

        {/* Transition Indicator */}
        <View className="items-center -my-4 z-10">
          <View className="bg-surface px-4 py-1">
            <Ionicons name="arrow-down" size={24} color="#C4A882" />
          </View>
        </View>

        {/* Locked Result */}
        <View
          className="rounded-xl overflow-hidden bg-surface-container-low relative"
          style={{
            shadowColor: "rgba(245,240,235,1)",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.06,
            shadowRadius: 40,
          }}
        >
          {/* Lock overlay */}
          <View
            className="absolute inset-0 items-center justify-center z-20"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <Ionicons
              name="lock-closed"
              size={36}
              color="#C4A882"
              style={{ marginBottom: 8 }}
            />
            <Text
              className="font-label font-medium text-[#F5F0EB]"
              style={{
                fontSize: 11,
                letterSpacing: 1.7,
                textTransform: "uppercase",
              }}
            >
              Unlock Visual Preview
            </Text>
          </View>

          <Image
            source={{ uri: IMG_RESULT }}
            className="w-full"
            style={{ aspectRatio: 16 / 9, opacity: 0.6 }}
            contentFit="cover"
          />
          <View className="p-6">
            <Text className="font-headline text-lg text-[#F5F0EB] mb-2">
              Architectural Synthesis
            </Text>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 20,
                color: "rgba(245,240,235,0.5)",
              }}
            >
              Our neural engine extracts the material DNA of your reference
              image and re-curates your space while preserving its structural
              integrity.
            </Text>
          </View>
        </View>
      </View>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  SMART EDIT VARIANT                                            */
/* ═══════════════════════════════════════════════════════════════ */
const IMG_SE_AFTER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBkvTCtXMPKivN9pJ7Wg3BUw9sLo5SOkGCkFzIxZ7uFRhjbSoPhsYdl4e8A9DBWjA5La7eKLZRmPPnb7BP8KAceuT8LilD5nlIyOKhGi79QW3eRlk71H-7oZvNOoXPEbZ83xMOPQTHpCSxEGATP2-5M4oF23G7lC8fiK4OmUyT-_I3RJAi8gWOXXjEesFJ8hHzX-4r-3sx0CtDdCI6mosa8T5-bZGGDHymi8HPgjaHMfCKxqwpNKIw3rnGGu9gF2QOBqgnhSthXVAmc";
const IMG_SE_BEFORE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDJ4EB58EJT6b8vlu7aWVlWRhLhFnu3zO072yaKi3clonLA59-6kSGKH_D6eszZfl4_hEoYSXLVwLepmJEWG5pgMJNHOHa-lmYYn-wUoN_HbpwFlI_VCc1LWpQPySS-BiZ1h0l0ETCYm3wlN7EEPslr3UlpoKold2TVDsNcMeMBEF71gTuLpuNUxBP8trJJcUxPsffo2RW2Yh39dYA2Mvel4SV4paS864KvXT96LQVNOWaGST03Du39Axd7mM8U_BHyBRrNMOVOehOQ";

const SE_FEATURES = [
  {
    title: "Precise Inpainting",
    desc: "Remove or swap objects by simply brushing over them.",
  },
  {
    title: "Material Swapping",
    desc: "Instantly change flooring, wall textures, or lighting fixtures.",
  },
  {
    title: "High-Res Export",
    desc: "Download architectural-grade renders up to 8K resolution.",
  },
];

function SmartEditUpsell() {
  return (
    <View className="flex-1 bg-surface">
      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        {/* Header — close only, top-right */}
        <View className="flex-row justify-end px-6 py-6">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-surface-container-high"
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color="#d0c5b8" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 32,
            paddingTop: 16,
            paddingBottom: 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Lock Icon */}
          <View className="mb-6">
            <Ionicons name="lock-closed" size={48} color="#E1C39B" />
          </View>

          {/* Headline */}
          <Text
            className="font-headline text-on-surface font-bold mb-4"
            style={{ fontSize: 44, lineHeight: 48, letterSpacing: -0.5 }}
          >
            Smart Edit requires Pro
          </Text>
          <Text
            className="font-body text-on-surface-variant font-light leading-relaxed"
            style={{ fontSize: 18 }}
          >
            Edit specific areas with AI. Perfect your vision with surgical
            precision.
          </Text>

          {/* Before / After Visualization */}
          <View
            className="w-full rounded-xl overflow-hidden bg-surface-container-low mt-8 mb-10"
            style={{ aspectRatio: 4 / 3 }}
          >
            {/* After (full background) */}
            <Image
              source={{ uri: IMG_SE_AFTER }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              contentFit="cover"
            />
            {/* Before (left portion, clipped) */}
            <View
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: "50%",
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: IMG_SE_BEFORE }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: "200%",
                }}
                contentFit="cover"
              />
            </View>
            {/* Diagonal separator */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
              }}
              pointerEvents="none"
            >
              <View
                style={{
                  width: 1,
                  height: "140%",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  transform: [{ rotate: "18deg" }],
                  shadowColor: "#fff",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 15,
                }}
              />
            </View>
            {/* Original label */}
            <View
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                backgroundColor: "rgba(19,19,19,0.8)",
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 9999,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "rgba(229,226,225,0.6)",
                }}
              >
                Original
              </Text>
            </View>
            {/* Pro Edit label */}
            <View
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                backgroundColor: "#E1C39B",
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 9999,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#3F2D11",
                  fontWeight: "bold",
                }}
              >
                Pro Edit
              </Text>
            </View>
          </View>

          {/* Features List */}
          <View style={{ gap: 24, marginBottom: 48 }}>
            {SE_FEATURES.map((f, i) => (
              <View
                key={i}
                className="flex-row items-start"
                style={{ gap: 16 }}
              >
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 20,
                    height: 20,
                    marginTop: 4,
                    backgroundColor: "rgba(225,195,155,0.1)",
                  }}
                >
                  <Ionicons name="checkmark" size={12} color="#E1C39B" />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-label text-primary mb-1"
                    style={{
                      fontSize: 11,
                      letterSpacing: 1.1,
                      textTransform: "uppercase",
                    }}
                  >
                    {f.title}
                  </Text>
                  <Text
                    className="font-body text-on-surface-variant leading-relaxed"
                    style={{ fontSize: 14 }}
                  >
                    {f.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          className="bg-surface-container-low"
          style={{
            paddingHorizontal: 32,
            paddingTop: 32,
            paddingBottom: 12,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
          }}
        >
          <Pressable
            onPress={() => router.push("/plans")}
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
                Upgrade to Pro
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            className="items-center py-6"
          >
            <Text
              className="font-label"
              style={{
                fontSize: 11,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                color: "rgba(208,197,184,0.8)",
              }}
            >
              Dismiss for now
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Atmospheric Ivory Glow */}
      <View
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: "rgba(229,226,225,0.05)",
        }}
        pointerEvents="none"
      />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN UPSELL SCREEN                                            */
/* ═══════════════════════════════════════════════════════════════ */
export default function UpsellScreen() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();

  if (feature === "smart_edit") return <SmartEditUpsell />;

  const isStyleTransfer = feature === "style_transfer";
  const ctaLabel = isStyleTransfer ? "Upgrade to Max" : "Upgrade to Basic";
  const subtitle = isStyleTransfer ? "Starting at $14.99 / month" : undefined;

  return (
    <View className="flex-1 bg-surface">
      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        {/* Header */}
        {isStyleTransfer ? (
          <View className="flex-row items-center justify-between px-8 py-6">
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="close" size={24} color="rgba(229,226,225,0.6)" />
            </Pressable>
            <Text
              className="font-headline text-[#F5F0EB]"
              style={{
                fontSize: 16,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              The Architectural Lens
            </Text>
            <View className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden" />
          </View>
        ) : (
          <View
            className="flex-row justify-end items-center px-6"
            style={{ height: 64 }}
          >
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{ padding: 8 }}
            >
              <Ionicons name="close" size={24} color="#E0C29A" />
            </Pressable>
          </View>
        )}

        {/* Scrollable Content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {isStyleTransfer ? <StyleTransferUpsell /> : <HDUpsell />}
        </ScrollView>

        {/* Fixed Footer */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 8,
          }}
        >
          <Pressable
            onPress={() => router.push("/plans")}
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
                {ctaLabel}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
            </LinearGradient>
          </Pressable>

          {subtitle ? (
            <Text
              className="text-center font-label font-medium"
              style={{
                fontSize: 11,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: "rgba(245,240,235,0.3)",
                paddingVertical: 16,
              }}
            >
              {subtitle}
            </Text>
          ) : (
            <Pressable
              onPress={() => router.push("/plans")}
              className="items-center"
              style={{ paddingVertical: 24 }}
            >
              <Text
                className="font-label text-secondary"
                style={{
                  fontSize: 12,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Review Plan Details
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
