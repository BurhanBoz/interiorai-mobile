import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const CLAUSES = [
  {
    title: "1. Curated Access",
    body: `By accessing Architectural Lens ("the Platform"), you agree to use its AI-powered interior design generation tools solely for lawful, personal, or authorized commercial purposes. Your account grants you a non-exclusive, revocable license to generate and download designs within your active subscription tier. We reserve the right to modify or discontinue features at any time.`,
  },
  {
    title: "2. User Conduct",
    image: true,
    body: `You agree to upload only images you own or have explicit rights to use. You will not attempt to reverse-engineer, exploit, or overload the Platform's generation systems. Abusive, offensive, or illegal content submitted for processing will result in immediate account suspension without refund.`,
  },
  {
    title: "3. Liability & Indemnity",
    highlight: true,
    body: `The Platform is provided "as is" without warranty of any kind. We are not liable for any damages arising from generated designs, including but not limited to structural, aesthetic, or intellectual property disputes. You agree to indemnify and hold harmless Architectural Lens and its affiliates from any claims arising from your use.`,
  },
  {
    title: "4. Data Stewardship",
    body: `Uploaded images are processed securely and retained only for the duration necessary to deliver results. We do not sell or share your data with third parties except as required by law. Generated designs remain accessible in your account history for the duration of your subscription.`,
  },
];

export default function TermsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Sticky Header */}
      <View className="px-8 pt-6 pb-4 bg-surface">
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#E5E2E1" />
          </Pressable>
          <Text className="font-headline text-base text-on-surface-variant tracking-widest uppercase">
            Architectural Lens
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-8 pb-40"
        showsVerticalScrollIndicator={false}
      >
        {/* Massive Headline */}
        <Text className="font-headline text-4xl text-on-surface tracking-tight mt-4">
          Terms of Service
        </Text>
        <View className="mt-4 w-16 h-1 rounded-full bg-primary" />

        {/* Intro Block */}
        <View className="bg-surface-container-low rounded-xl p-6 mt-8">
          <Text className="font-body text-sm text-on-surface-variant leading-6">
            Welcome to Architectural Lens. These terms govern your use of our
            AI-powered interior design platform. By continuing, you acknowledge
            that you have read, understood, and agree to be bound by the
            following conditions. Last updated: March 2026.
          </Text>
        </View>

        {/* Clause Sections */}
        {CLAUSES.map((clause, idx) => (
          <View key={idx} className="mt-8">
            <Text className="font-headline text-xl text-on-surface mb-3">
              {clause.title}
            </Text>

            {clause.image && (
              <View className="h-40 rounded-xl bg-surface-container mb-4 items-center justify-center">
                <Ionicons name="image-outline" size={40} color="#5E5C5B" />
                <Text className="font-body text-xs text-on-surface-variant mt-2">
                  Interstitial Placeholder
                </Text>
              </View>
            )}

            <View
              className={`rounded-xl p-5 ${
                clause.highlight
                  ? "bg-surface-container-high"
                  : "bg-surface-container-low"
              }`}
            >
              <Text className="font-body text-sm text-on-surface-variant leading-6">
                {clause.body}
              </Text>
            </View>
          </View>
        ))}

        {/* Footer */}
        <View className="mt-12 items-center">
          <Text className="font-body text-xs text-on-surface-variant">
            © 2026 Architectural Lens. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* Acknowledge Button */}
      <View className="absolute bottom-0 left-0 right-0">
        <LinearGradient
          colors={["transparent", "#131313", "#131313"]}
          locations={[0, 0.3, 1]}
          className="px-8 pt-12 pb-10"
        >
          <Pressable onPress={() => router.back()}>
            <LinearGradient
              colors={["#C4A882", "#A68E6B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-14 rounded-xl flex-row items-center justify-center gap-2"
            >
              <Text className="font-body text-on-primary font-semibold text-sm uppercase tracking-widest">
                Acknowledge & Return
              </Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}
