import { View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function PrivacyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Fixed Header */}
      <View className="flex-row items-center px-5 py-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#E1C39B" />
        </Pressable>
        <Text className="ml-4 text-primary font-body text-base font-medium">
          Privacy Policy
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View className="mt-6 mb-8">
          <Text className="text-on-surface-variant font-body text-xs tracking-widest uppercase mb-2">
            The Architectural Lens
          </Text>
          <Text className="text-on-surface font-headline text-5xl leading-tight">
            Data{"\n"}Integrity.
          </Text>
          <View className="h-[2px] w-16 bg-primary mt-4 rounded-full" />
        </View>

        {/* Section 1 — Information We Curate */}
        <View className="bg-surface-container-low rounded-xl p-5 mb-6">
          <Text className="text-on-surface font-headline text-lg mb-3">
            Information We Curate
          </Text>
          <Text className="text-on-surface-variant font-body text-sm leading-relaxed mb-4">
            We collect only what is necessary to deliver a refined, personalized
            design experience. This includes data you provide directly and
            information generated through your interactions.
          </Text>
          <View className="gap-3">
            <View className="flex-row items-start">
              <View className="w-2 h-2 rounded-full bg-primary mt-1.5 mr-3" />
              <View className="flex-1">
                <Text className="text-on-surface font-body text-sm font-medium">
                  Studio Preferences
                </Text>
                <Text className="text-on-surface-variant font-body text-xs mt-0.5">
                  Room types, style selections, and design parameters you
                  configure within the studio.
                </Text>
              </View>
            </View>
            <View className="flex-row items-start">
              <View className="w-2 h-2 rounded-full bg-primary mt-1.5 mr-3" />
              <View className="flex-1">
                <Text className="text-on-surface font-body text-sm font-medium">
                  Gallery Interactions
                </Text>
                <Text className="text-on-surface-variant font-body text-xs mt-0.5">
                  Images you upload, generations you save, and how you interact
                  with your design gallery.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 2 — Purpose of Processing */}
        <View className="mb-6">
          <Text className="text-on-surface font-headline text-lg mb-3">
            Purpose of Processing
          </Text>
          <Text className="text-on-surface-variant font-body text-sm leading-relaxed mb-4">
            Your data enables us to generate AI-powered interior
            transformations, improve our models, and maintain the quality of
            service you expect. We process information solely for delivering and
            enhancing the design experience — never for unrelated advertising.
          </Text>
          <View className="h-40 rounded-xl bg-surface-container overflow-hidden">
            <View className="flex-1 bg-surface-container-high opacity-60" />
          </View>
        </View>

        {/* Section 3 — Third-Party Collaboration */}
        <View className="bg-surface-container-high rounded-xl p-5 mb-6">
          <Text className="text-on-surface font-headline text-lg mb-3">
            Third-Party Collaboration
          </Text>
          <Text className="text-on-surface-variant font-body text-sm leading-relaxed">
            We partner with select infrastructure and AI providers to power our
            services. All third-party collaborators are contractually bound to
            handle your data with the same level of care we uphold. We do not
            sell personal information to any party.
          </Text>
        </View>

        {/* Section 4 — Rights & Retention */}
        <View className="mb-8">
          <Text className="text-on-surface font-headline text-lg mb-3">
            Rights & Retention
          </Text>
          <Text className="text-on-surface-variant font-body text-sm leading-relaxed">
            You may request access to, correction of, or deletion of your
            personal data at any time. Design generations are retained for the
            duration of your active subscription and purged within 30 days of
            account closure. You may export your data through the app settings
            at any time.
          </Text>
        </View>

        {/* Acknowledge Button */}
        <Pressable
          onPress={() => router.back()}
          className="bg-primary rounded-xl py-4 items-center mb-4 active:opacity-80"
        >
          <Text className="text-on-primary font-body text-base font-semibold">
            Acknowledge & Continue
          </Text>
        </Pressable>

        {/* Footer */}
        <Text className="text-center text-on-surface-variant/50 font-body text-xs mb-4">
          Last Updated: October 2023
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
