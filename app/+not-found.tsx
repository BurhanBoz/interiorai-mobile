import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const BG_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCurDPq42uAD3GG3ExXQL-CFs2cYA7Jpa47kTFBLVrNH9vAvyt-4Ser6B2RC0qCfUD2LJUpwaWh_Rn-Bsxh8oOsZcAWxgSozfnBvAlMKrJ2ND6FTbYbZJsErZwd4_RExgReqq0_8Ab-KZpCtEYZZU_-K7rRozifzNgulZcosn1m4dqoheHLbS25saXKuV9l42fD8w23hRqKn8hLYjSyX0CFHzICn8fKHB_DKVxT-nPnVuuJOerL1baw7w4FAy3ODIfzZTggiQqmaro";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 bg-surface">
      {/* Cinematic architecture background – grayscale via reduced opacity */}
      <Image
        source={{ uri: BG_IMAGE }}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          opacity: 0.4,
        }}
        contentFit="cover"
      />

      {/* Top gradient: dark → transparent */}
      <LinearGradient
        colors={["rgba(19,19,19,0.8)", "rgba(19,19,19,0)"]}
        locations={[0, 0.4]}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />

      {/* Bottom gradient: transparent → dark */}
      <LinearGradient
        colors={["rgba(19,19,19,0)", "rgba(19,19,19,1)"]}
        locations={[0.6, 1]}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />

      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-center px-6">
          {/* Error Label */}
          <Text
            className="font-label font-medium mb-6"
            style={{
              fontSize: 11,
              letterSpacing: 3.5,
              textTransform: "uppercase",
              color: "#E0C29A",
            }}
          >
            ERROR 404
          </Text>

          {/* Headline */}
          <Text
            className="font-headline text-on-surface mb-8"
            style={{ fontSize: 52, lineHeight: 58 }}
          >
            Page Not{"\n"}Found
          </Text>

          {/* Description */}
          <Text
            className="font-body text-on-surface-variant leading-relaxed mb-12"
            style={{ fontSize: 18, maxWidth: 320, fontWeight: "300" }}
          >
            The space you are looking for has been moved or archived. Our
            digital curators are currently renovating this section.
          </Text>

          {/* CTA Button */}
          <Pressable
            onPress={() => router.replace("/(tabs)/studio")}
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
                Return to Studio
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Decorative "VOID" watermark */}
        <View
          className="absolute"
          style={{ bottom: -24, left: -12, opacity: 0.05 }}
          pointerEvents="none"
        >
          <Text
            className="font-label"
            style={{
              fontSize: 140,
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: 16,
              color: "#E5E2E1",
            }}
          >
            VOID
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
