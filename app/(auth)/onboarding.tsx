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
    label: "Curation 01",
    headline: "Reimagine\nYour Space",
    description:
      "Discover curated interior designs that transform your living spaces into works of art.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA0joCYtznodvtbTTYEjYFtQvHFO3eoVtaJjKE5j6d04rwJYLCBX18wBcR-DO4qPlnZzr-GbxBhPdjK6511t8u6Cp7dGLRAyW6Qknvd_lSbMfEPrGmZJDiCUsJeBmHpbrpyTcTrdpIr5qMCk3e-9KlxdcO9mO1231HC_ptdu0eJX5YVujpER-m81IupY3Rcopem-kZmhTBvmY22f1XnJ22Pnnrds1wCUxDb-RnLf1yiyySFth6uS-BP_kbnAIr7UxZ3foV0ED38njDj",
    gradientFallback: ["#2A2A2A", "#1C1B1B"] as const,
  },
  {
    id: "2",
    label: "Versatility 02",
    headline: "Any Style,\nInstantly",
    description:
      "From minimalist modern to classic elegance — explore every aesthetic with a single tap.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB1T7Qq5t80xSyhu02790-CfmyDVaWoU-cfLRgFhyncMwCgUmNBm_SfbyhmWI9VYcBzV2MG1wBEK-jUTdr8MUWKGav0xdnQb7QIrmAo_Nd4aNjzUFzEoaz5PM6mOeVJITyC72vhzcSIH-t-IF8R3WVDGjjKDwmx-jSw0JdReY2ibqOXYNqUB0_DNm7wVHZaKOHnbHEI5-HMCCQLsyMohYYabcCCmU5gdSLapAp0iB2MKb6XnoHYmjctzC2jlIh30FD59kqYpEAzA_IH",
    gradientFallback: ["#1C1B1B", "#2A2A2A"] as const,
  },
  {
    id: "3",
    label: "Innovation 03",
    headline: "AI-Powered\nMagic",
    description:
      "Let artificial intelligence reimagine your rooms with stunning, photorealistic results.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC9tymtJNY2iXmwhyUuPE37D0Jya9D8Ad8X8I6FuEwxT1h5tJlZf5fDNkUFg-v7mIoe13PX8Fyq0YWqwqLjMhwyxQCvroZZjh3eDTJE-N4JVkG63e8jTIaR97cD1DxGBGvb8XNkmET1tmYqyyBNMuvFzW9yQ_5H3kgBr-j_eeoNcFGG_otxBhR7pjv7ll1pNNTS8HEDqhd0JXB90H7fqTwvtW-HH6oZRScvVaTS91CnEe261cFjpbOPYKRLBzQdY128s9-5tuaEsUm7",
    gradientFallback: ["#2A2A2A", "#131313"] as const,
  },
] as const;

function PaginationDot({ active }: { active: boolean }) {
  const widthAnim = useRef(new Animated.Value(active ? 32 : 8)).current;
  const opacityAnim = useRef(new Animated.Value(active ? 1 : 0.2)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: active ? 32 : 8,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: active ? 1 : 0.2,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [active]);

  return (
    <Animated.View
      style={{ width: widthAnim, opacity: opacityAnim }}
      className="h-1 rounded-full bg-primary"
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

  const renderSlide = useCallback(
    ({ item, index }: { item: (typeof SLIDES)[number]; index: number }) => {
      const isLast = index === SLIDES.length - 1;

      return (
        <View style={{ width }} className="flex-1">
          {/* Background image with gradient fallback */}
          <LinearGradient
            colors={[...item.gradientFallback]}
            className="absolute inset-0"
          />
          <Image
            source={{ uri: item.image }}
            contentFit="cover"
            className="absolute inset-0"
            style={{ width, height: "100%" }}
            transition={400}
          />

          {/* Bottom gradient overlay */}
          <LinearGradient
            colors={["transparent", "rgba(19,19,19,0.4)", "#131313"]}
            locations={[0, 0.4, 0.85]}
            className="absolute inset-0"
          />

          {/* Slide content */}
          <View className="absolute bottom-32 left-6 right-6">
            <Text
              className="font-label text-primary uppercase mb-4"
              style={{ fontSize: 11, letterSpacing: 3.5 }}
            >
              {item.label}
            </Text>

            <Text
              className="font-headline text-on-surface tracking-tighter mb-4"
              style={{ fontSize: 56, lineHeight: 56 * 1.1, maxWidth: "80%" }}
            >
              {item.headline}
            </Text>

            <Text
              className="font-body text-sm text-on-surface-variant leading-relaxed"
              style={{ maxWidth: 280 }}
            >
              {item.description}
            </Text>

            {isLast && (
              <Pressable
                onPress={() => router.push("/register")}
                className="mt-6 self-start active:opacity-80"
              >
                <LinearGradient
                  colors={["#C4A882", "#A68E6B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="rounded-xl px-8 py-4"
                >
                  <Text className="font-label text-sm font-semibold text-on-primary text-center">
                    Get Started
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>
      );
    },
    [width],
  );

  return (
    <View className="flex-1 bg-surface">
      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
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

      {/* Floating header */}
      <View className="absolute top-14 left-6 right-6 flex-row items-center">
        <Ionicons name="cube-outline" size={20} color="#E1C39B" />
        <Text
          className="font-label text-on-surface ml-2"
          style={{ fontSize: 11, letterSpacing: 3 }}
        >
          THE ARCHITECTURAL LENS
        </Text>
      </View>

      {/* Bottom pagination + skip */}
      <View className="absolute bottom-10 left-6 right-6">
        {/* Pagination dots */}
        <View className="flex-row items-center gap-2 mb-4">
          {SLIDES.map((_, i) => (
            <PaginationDot key={i} active={i === activeIndex} />
          ))}
        </View>

        {/* Skip link */}
        <Pressable onPress={() => router.replace("/login")} hitSlop={12}>
          <Text
            className="font-label text-on-surface-variant"
            style={{ fontSize: 11, letterSpacing: 2 }}
          >
            Skip Introduction
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
