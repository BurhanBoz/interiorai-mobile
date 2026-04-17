import {
  View,
  Text,
  FlatList,
  Pressable,
  useWindowDimensions,
  ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState, useCallback, useEffect } from "react";
import { Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SLIDES = [
  {
    id: "1",
    headline: "Reimagine\nYour Space",
    description:
      "Upload any room and watch AI transform it into a masterpiece of contemporary architecture.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBRoRem4VJ4B-V1XcsHiLabwHVNWMO77W_Wtc7nUPzy6QSyGH5M9KoAe2Inp6YUBO3BmLNah-U1L6qC9a8n4EOZvS_sEgtqlJPoYdOhDxq-3mlgBzzqMGQo6sz3ek0nb_GZOzGalQKF1_kZZXaS273-BA0ZkGL1j5bDgUtyxHx72wp5ox8wDJDZfRKiwQOf22swUb8I2jwTtn_cveRW3w-Pfv4-raJmf-susQ3z5jZWobaLRTPd21vj_c4fICGFHp-jc3DxCBOULIQ",
  },
  {
    id: "2",
    headline: "Any Style,\nInstantly",
    description:
      "From minimalist modern to classic elegance — explore every aesthetic with a single tap.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB1T7Qq5t80xSyhu02790-CfmyDVaWoU-cfLRgFhyncMwCgUmNBm_SfbyhmWI9VYcBzV2MG1wBEK-jUTdr8MUWKGav0xdnQb7QIrmAo_Nd4aNjzUFzEoaz5PM6mOeVJITyC72vhzcSIH-t-IF8R3WVDGjjKDwmx-jSw0JdReY2ibqOXYNqUB0_DNm7wVHZaKOHnbHEI5-HMCCQLsyMohYYabcCCmU5gdSLapAp0iB2MKb6XnoHYmjctzC2jlIh30FD59kqYpEAzA_IH",
  },
  {
    id: "3",
    headline: "AI-Powered\nMagic",
    description:
      "Let artificial intelligence reimagine your rooms with stunning, photorealistic results.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC9tymtJNY2iXmwhyUuPE37D0Jya9D8Ad8X8I6FuEwxT1h5tJlZf5fDNkUFg-v7mIoe13PX8Fyq0YWqwqLjMhwyxQCvroZZjh3eDTJE-N4JVkG63e8jTIaR97cD1DxGBGvb8XNkmET1tmYqyyBNMuvFzW9yQ_5H3kgBr-j_eeoNcFGG_otxBhR7pjv7ll1pNNTS8HEDqhd0JXB90H7fqTwvtW-HH6oZRScvVaTS91CnEe261cFjpbOPYKRLBzQdY128s9-5tuaEsUm7",
  },
] as const;

function PaginationDot({ active }: { active: boolean }) {
  const widthAnim = useRef(new Animated.Value(active ? 32 : 6)).current;
  const opacityAnim = useRef(new Animated.Value(active ? 1 : 0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: active ? 32 : 6,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: active ? 1 : 0.4,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [active]);

  return (
    <Animated.View
      style={{ width: widthAnim, opacity: opacityAnim }}
      className="h-1.5 rounded-full bg-secondary"
    />
  );
}

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const slide = SLIDES[activeIndex];

  return (
    <View className="flex-1 bg-surface">
      {/* Hero Image Carousel (top ~58%) */}
      <View
        style={{ height: "58%" }}
        className="relative w-full overflow-hidden"
      >
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={({ item }) => (
            <View style={{ width }} className="flex-1">
              <Image
                source={{ uri: item.image }}
                contentFit="cover"
                style={{ width, height: "100%" }}
                transition={400}
              />
            </View>
          )}
          keyExtractor={item => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        {/* Bottom gradient fade into surface */}
        <LinearGradient
          colors={["transparent", "rgba(19,19,19,0.6)", "#131313"]}
          locations={[0.3, 0.7, 1]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />

        {/* Branding on image */}
        <View className="absolute top-12 left-8">
          <Text
            className="font-headline font-bold text-secondary"
            style={{
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            ARCHITECTURAL{"\n"}LENS
          </Text>
        </View>
      </View>

      {/* Content Section */}
      <View className="flex-1 px-8 pt-4 pb-10">
        {/* Pagination dots */}
        <View className="flex-row items-center mb-7" style={{ gap: 6 }}>
          {SLIDES.map((_, i) => (
            <PaginationDot key={i} active={i === activeIndex} />
          ))}
        </View>

        {/* Headline + Description */}
        <View style={{ maxWidth: 280 }}>
          <Text
            className="font-headline font-bold text-on-surface"
            style={{ fontSize: 32, lineHeight: 38 }}
          >
            {slide.headline}
          </Text>
          <Text
            className="font-body text-sm text-on-surface-variant leading-relaxed mt-4"
            style={{ opacity: 0.8 }}
          >
            {slide.description}
          </Text>
        </View>

        {/* Footer Actions */}
        <View className="mt-auto items-center w-full" style={{ gap: 20 }}>
          <Pressable onPress={() => router.push("/login")} hitSlop={12}>
            <Text
              className="font-label font-semibold text-secondary uppercase"
              style={{ fontSize: 11, letterSpacing: 2 }}
            >
              Already have an account? Sign In
            </Text>
          </Pressable>

          {/* CTA Button */}
          <Pressable
            onPress={() => router.push("/register")}
            className="w-full"
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
                Get Started
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
