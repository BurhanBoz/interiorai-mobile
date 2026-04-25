import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTranslation } from "react-i18next";

const IMG_TERMS =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDDN7PpniI42L8UlmvAwfr9zaGBPDgIVKjI5b-Os6PNBs9Au2vz35dLHpNClvH6TMqaPX6tmukLnZYKdhn_SkFUE47immo1WX81_OhC9QWo9pLIgFYkH9AL-SUwDmZvPM_oyWn95oN2RL0QRauabmu1sjAMyogax6aejDzPNzDLKFw3q_38QI85eBdW54me-UH7FUp6Bfhz--Bpfw3zZewJfx3B2BHNz6cR6dlnPI7bkSUs9ms9tBTX3Yex_x18lSqdObKBTLAryrc";

const IMG_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCRu9nTIyQskuwKRucxyBeHx6wnFGkxOO-HYyrrgX8ZmNOqpCtiqm_K9wmhZbMtLx-jyl78az-CGQQp6PvuF8ITBR7YcY0hdT2jl9YLGEHp5ihCSBBMMXZgCYFmW3digx6KzCN24d-lZSZireR4WcwIpQLTgEbuFE2eqcFTKPwYxnOOBBmk1P1iuX2RViISTp9HujZvc0jF6WtN-7lCpI0QtWFCOE52htMdM8GOzv-kWRpLWjnswWpdYeLy1KQwaEYStmewfCIVamQ";

export default function TermsScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* TopAppBar */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ height: 64, backgroundColor: "#131313" }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#2A2A2A" : "transparent",
          })}
        >
          <Ionicons name="arrow-back" size={24} color="#E1C39B" />
        </Pressable>

        <Text
          className="font-headline"
          style={{
            fontSize: 20,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#E1C39B",
          }}
        >
          {t("app.brand")}
        </Text>

        <View
          className="rounded-full overflow-hidden"
          style={{
            width: 32,
            height: 32,
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.3)",
          }}
        >
          <Image
            source={{ uri: IMG_AVATAR }}
            style={{ width: 32, height: 32 }}
            contentFit="cover"
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-32"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View className="mb-16 mt-8">
          <Text
            className="font-headline text-on-background"
            style={{ fontSize: 56, lineHeight: 62 }}
          >
            {t("settings.terms_title")}
          </Text>
          <View
            className="mt-6"
            style={{ width: 48, height: 2, backgroundColor: "#E1C39B" }}
          />
        </View>

        {/* Intro Block */}
        <View className="bg-surface-container-low rounded-xl p-8 mb-12">
          <Text
            className="font-label font-bold mb-4"
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#E1C39B",
            }}
          >
            UPDATED OCTOBER 2023
          </Text>
          <Text
            className="font-headline text-on-surface-variant italic"
            style={{ fontSize: 18, lineHeight: 28 }}
          >
            Our commitment to architectural integrity and digital stewardship
            begins with transparency. This document outlines the refined
            relationship between our curator tools and your creative practice.
          </Text>
        </View>

        {/* Clause 1 — Curated Access */}
        <View className="mb-16">
          <Text
            className="font-headline text-secondary mb-6"
            style={{ fontSize: 24 }}
          >
            1. Curated Access
          </Text>
          <View style={{ gap: 16 }}>
            <Text
              className="font-body text-on-surface-variant"
              style={{ fontSize: 14, lineHeight: 26 }}
            >
              Access to Roomframe AI is provided as a premium service
              for design professionals. We reserve the right to curate the
              membership based on professional alignment and creative intent.
            </Text>
            <Text
              className="font-body text-on-surface-variant"
              style={{ fontSize: 14, lineHeight: 26 }}
            >
              Users are granted a limited, non-exclusive license to utilize our
              proprietary AI modeling tools for conceptual architectural
              visualization within the boundaries of ethical design practices.
            </Text>
          </View>
        </View>

        {/* Decorative Image */}
        <View
          className="w-full rounded-xl overflow-hidden mb-16"
          style={{
            aspectRatio: 16 / 9,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.6,
            shadowRadius: 32,
            elevation: 24,
          }}
        >
          <Image
            source={{ uri: IMG_TERMS }}
            style={{ width: "100%", height: "100%", opacity: 0.8 }}
            contentFit="cover"
          />
        </View>

        {/* Clause 2 — User Conduct */}
        <View className="mb-12">
          <Text
            className="font-headline text-secondary mb-6"
            style={{ fontSize: 24 }}
          >
            2. User Conduct
          </Text>
          <View style={{ gap: 16 }}>
            <Text
              className="font-body text-on-surface-variant"
              style={{ fontSize: 14, lineHeight: 26 }}
            >
              The integrity of the Lens depends on the respectful use of our
              shared aesthetic environment. Automated scraping or unauthorized
              harvesting of generative outputs is strictly prohibited.
            </Text>
          </View>

          {/* Highlighted Clause */}
          <View
            className="bg-surface-container-high rounded-xl p-8 mt-8"
            style={{ borderLeftWidth: 2, borderLeftColor: "#E1C39B" }}
          >
            <Text
              className="font-label font-bold mb-3"
              style={{
                fontSize: 11,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#E1C39B",
              }}
            >
              LIABILITY & INDEMNITY
            </Text>
            <Text
              className="font-body text-on-surface font-medium"
              style={{ fontSize: 14, lineHeight: 22 }}
            >
              Roomframe AI acts as a conceptual catalyst. We are not
              liable for structural engineering failures or technical
              inaccuracies arising from the application of AI-generated
              conceptual visualizations in real-world construction.
            </Text>
          </View>
        </View>

        {/* Clause 3 — Data Stewardship */}
        <View className="mb-24">
          <Text
            className="font-headline text-secondary mb-6"
            style={{ fontSize: 24 }}
          >
            3. Data Stewardship
          </Text>
          <View style={{ gap: 16 }}>
            <Text
              className="font-body text-on-surface-variant"
              style={{ fontSize: 14, lineHeight: 26 }}
            >
              Your creative inputs are treated as private intellectual property.
              We do not sell your visual prompts or resulting concepts to
              third-party datasets for external model training without explicit
              consent.
            </Text>
            <Text
              className="font-body text-on-surface-variant"
              style={{ fontSize: 14, lineHeight: 26 }}
            >
              Encryption protocols ensure that your design vault remains
              accessible only to verified credentials, maintaining the sanctuary
              of your conceptual workflow.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View
          className="pt-12 mb-16 items-center"
          style={{
            borderTopWidth: 1,
            borderTopColor: "rgba(53,53,52,0.3)",
          }}
        >
          <Text
            className="font-label"
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#A68A62",
            }}
          >
            {t("app.brand")} © 2024
          </Text>
        </View>
      </ScrollView>

      {/* Sticky CTA at bottom */}
      <LinearGradient
        colors={["transparent", "#131313", "#131313"]}
        locations={[0, 0.4, 1]}
        className="absolute bottom-0 left-0 right-0 px-6 pb-6"
        style={{ paddingTop: 48 }}
      >
        <PrimaryButton
          label={t("settings.terms_acknowledge")}
          icon="checkmark-circle"
          onPress={() => router.back()}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}
