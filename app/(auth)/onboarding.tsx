import {
  View,
  Text,
  FlatList,
  useWindowDimensions,
  ViewToken,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand } from "@/components/brand/Brand";
import { Button } from "@/components/ui/Button";
import { LegalFooter } from "@/components/ui/LegalFooter";
import { theme } from "@/config/theme";

/**
 * The first-run onboarding carousel. Three slides hand the viewer the
 * brand's core promise: transform your space, preserve your layout,
 * iterate endlessly. The hero image is large, the typography is
 * editorial, and the two CTAs (primary: Get Started, tertiary: Sign In)
 * live in a calm footer.
 *
 * Audit fixes applied:
 *   - Brand mark routes through <Brand variant="stacked"/> instead of
 *     the `app.brand` string split on " " and joined with "\n" — which
 *     was silently creating a line break in the middle of whatever the
 *     user's current locale happened to render
 *   - Pagination dots use gold theme token instead of the secondary gray
 *   - CTA is the new <Button variant="primary">; the "sign in" link is
 *     <Button variant="tertiary"> so hierarchy reads at a glance
 */

const SLIDES = [
  {
    id: "1",
    headlineKey: "onboarding.slide1_headline",
    descriptionKey: "onboarding.slide1_description",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBRoRem4VJ4B-V1XcsHiLabwHVNWMO77W_Wtc7nUPzy6QSyGH5M9KoAe2Inp6YUBO3BmLNah-U1L6qC9a8n4EOZvS_sEgtqlJPoYdOhDxq-3mlgBzzqMGQo6sz3ek0nb_GZOzGalQKF1_kZZXaS273-BA0ZkGL1j5bDgUtyxHx72wp5ox8wDJDZfRKiwQOf22swUb8I2jwTtn_cveRW3w-Pfv4-raJmf-susQ3z5jZWobaLRTPd21vj_c4fICGFHp-jc3DxCBOULIQ",
  },
  {
    id: "2",
    headlineKey: "onboarding.slide2_headline",
    descriptionKey: "onboarding.slide2_description",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB1T7Qq5t80xSyhu02790-CfmyDVaWoU-cfLRgFhyncMwCgUmNBm_SfbyhmWI9VYcBzV2MG1wBEK-jUTdr8MUWKGav0xdnQb7QIrmAo_Nd4aNjzUFzEoaz5PM6mOeVJITyC72vhzcSIH-t-IF8R3WVDGjjKDwmx-jSw0JdReY2ibqOXYNqUB0_DNm7wVHZaKOHnbHEI5-HMCCQLsyMohYYabcCCmU5gdSLapAp0iB2MKb6XnoHYmjctzC2jlIh30FD59kqYpEAzA_IH",
  },
  {
    id: "3",
    headlineKey: "onboarding.slide3_headline",
    descriptionKey: "onboarding.slide3_description",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC9tymtJNY2iXmwhyUuPE37D0Jya9D8Ad8X8I6FuEwxT1h5tJlZf5fDNkUFg-v7mIoe13PX8Fyq0YWqwqLjMhwyxQCvroZZjh3eDTJE-N4JVkG63e8jTIaR97cD1DxGBGvb8XNkmET1tmYqyyBNMuvFzW9yQ_5H3kgBr-j_eeoNcFGG_otxBhR7pjv7ll1pNNTS8HEDqhd0JXB90H7fqTwvtW-HH6oZRScvVaTS91CnEe261cFjpbOPYKRLBzQdY128s9-5tuaEsUm7",
  },
] as const;

function PaginationDot({ active }: { active: boolean }) {
  const widthAnim = useRef(new Animated.Value(active ? 28 : 6)).current;
  const opacityAnim = useRef(new Animated.Value(active ? 1 : 0.35)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: active ? 28 : 6,
        duration: theme.motion.duration.base,
        easing: theme.motion.easing.standard,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: active ? 1 : 0.35,
        duration: theme.motion.duration.base,
        easing: theme.motion.easing.standard,
        useNativeDriver: false,
      }),
    ]).start();
  }, [active, widthAnim, opacityAnim]);

  return (
    <Animated.View
      style={{
        width: widthAnim,
        opacity: opacityAnim,
        height: 5,
        borderRadius: 3,
        backgroundColor: theme.color.goldMidday,
      }}
    />
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
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
    <View style={{ flex: 1, backgroundColor: theme.color.surface }}>
      {/* Hero carousel (top ~58%) */}
      <View
        style={{
          height: "58%",
          position: "relative",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={({ item }) => (
            <View style={{ width, flex: 1 }}>
              <Image
                source={{ uri: item.image }}
                contentFit="cover"
                style={{ width, height: "100%" }}
                transition={400}
              />
            </View>
          )}
          keyExtractor={(item) => item.id}
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
          colors={["transparent", "rgba(19,19,19,0.6)", theme.color.surface]}
          locations={[0.3, 0.7, 1]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          pointerEvents="none"
        />

        {/* Brand mark on the hero image — inline so it stays a single
            readable line regardless of locale. */}
        <SafeAreaView
          edges={["top"]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
          pointerEvents="box-none"
        >
          <View style={{ paddingHorizontal: 28, paddingTop: 16 }}>
            <Brand variant="inline" size="sm" tone="gold" />
          </View>
        </SafeAreaView>
      </View>

      {/* Content Section */}
      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: 32,
            paddingTop: 20,
            paddingBottom: 20,
          }}
        >
          {/* Pagination dots */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 26,
            }}
          >
            {SLIDES.map((_, i) => (
              <PaginationDot key={i} active={i === activeIndex} />
            ))}
          </View>

          {/* Headline + Description */}
          <View style={{ maxWidth: 300 }}>
            <Text
              style={{
                fontFamily: "NotoSerif",
                fontSize: 32,
                lineHeight: 38,
                letterSpacing: -0.3,
                color: theme.color.onSurface,
              }}
            >
              {t(slide.headlineKey)}
            </Text>
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 15,
                lineHeight: 22,
                color: theme.color.onSurfaceVariant,
                marginTop: 14,
              }}
            >
              {t(slide.descriptionKey)}
            </Text>
          </View>

          {/* Footer Actions */}
          <View
            style={{
              marginTop: "auto",
              gap: 8,
            }}
          >
            <Button
              title={t("onboarding.get_started")}
              variant="primary"
              size="lg"
              onPress={() => router.push("/register")}
              icon="arrow-forward"
            />
            <View style={{ alignItems: "center" }}>
              <Button
                title={t("auth.trial_entry_cta")}
                variant="tertiary"
                size="sm"
                onPress={() => router.push("/anonymous-trial")}
                fullWidth={false}
              />
            </View>
            <View style={{ alignItems: "center" }}>
              <Button
                title={`${t("auth.already_have_account")} ${t("auth.sign_in_link")}`}
                variant="tertiary"
                size="sm"
                onPress={() => router.push("/login")}
                fullWidth={false}
              />
            </View>
            <LegalFooter />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
