import { View, Text, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface PlanFeature {
  label: string;
  values: [string, string, string, string]; // Free, Basic, Pro, Max
}

const FEATURES: PlanFeature[] = [
  {
    label: "Cloud Gallery Storage",
    values: ["1 GB", "50 GB", "1 TB", "Unlimited"],
  },
  {
    label: "Blueprint Export",
    values: ["—", "✓", "✓", "✓"],
  },
  {
    label: "High-Res Render",
    values: ["—", "—", "✓", "✓"],
  },
  {
    label: "Collaborative Workspace",
    values: ["—", "—", "✓", "✓"],
  },
  {
    label: "Custom Domain",
    values: ["—", "—", "—", "✓"],
  },
];

const PLAN_NAMES = ["Free", "Basic", "Pro", "Max"] as const;

/* ------------------------------------------------------------------ */
/*  Plan Card                                                          */
/* ------------------------------------------------------------------ */

interface PlanCardProps {
  tier: string;
  subtitle: string;
  price: string;
  cadence: string;
  cta: string;
  onPress: () => void;
  isCurrent?: boolean;
  isPopular?: boolean;
  isDark?: boolean;
}

function PlanCard({
  tier,
  subtitle,
  price,
  cadence,
  cta,
  onPress,
  isCurrent,
  isPopular,
  isDark,
}: PlanCardProps) {
  const wrapperClass = isPopular
    ? "bg-surface-container-low rounded-xl p-5 mt-3"
    : "bg-surface-container-low rounded-xl p-5";

  return (
    <View>
      {isPopular && (
        <View className="self-center -mb-3 z-10">
          <View className="bg-primary-container rounded-full px-4 py-1">
            <Text className="text-on-primary text-[10px] font-label font-bold uppercase tracking-widest">
              Most Popular
            </Text>
          </View>
        </View>
      )}
      <View
        className={wrapperClass}
        style={
          isPopular
            ? {
                borderWidth: 1,
                borderColor: "rgba(196,168,130,0.3)",
                shadowColor: "#C4A882",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
                elevation: 8,
              }
            : undefined
        }
      >
        {/* Header row */}
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-on-surface font-headline text-lg">
              {tier}
            </Text>
            <Text className="text-on-surface-variant font-body text-xs mt-0.5">
              {subtitle}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-on-surface font-headline text-2xl">
              {price}
            </Text>
            <Text className="text-on-surface-variant font-body text-[11px]">
              {cadence}
            </Text>
          </View>
        </View>

        {/* CTA */}
        {isPopular ? (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <LinearGradient
              colors={["#C4A882", "rgba(196,168,130,0.8)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-12 rounded-xl items-center justify-center"
            >
              <Text className="text-on-primary font-body font-semibold text-sm tracking-wide">
                {cta}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : isDark ? (
          <Pressable
            onPress={onPress}
            className="h-12 rounded-xl items-center justify-center bg-on-surface"
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text className="text-surface font-body font-semibold text-sm tracking-wide">
              {cta}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onPress}
            className={`h-12 rounded-xl items-center justify-center ${
              isCurrent
                ? "bg-surface-container-highest"
                : "bg-surface-container-high"
            }`}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text className="text-on-surface font-body font-semibold text-sm tracking-wide">
              {cta}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export default function PlansScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-16"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          className="mt-2 mb-4 self-start"
        >
          <Ionicons name="arrow-back" size={24} color="#E5E2E1" />
        </Pressable>

        {/* Hero */}
        <Text
          className="text-on-surface font-headline mb-2"
          style={{ fontSize: 36, lineHeight: 42 }}
        >
          Choose Your{"\n"}Plan
        </Text>
        <Text className="text-on-surface-variant font-body text-base mb-8">
          Select a tier that matches the scale of your vision.
        </Text>

        {/* Plan cards */}
        <View className="gap-4">
          <PlanCard
            tier="Foundations"
            subtitle="Free"
            price="$0"
            cadence="Lifetime"
            cta="Current Plan"
            isCurrent
            onPress={() => {}}
          />
          <PlanCard
            tier="The Draftsman"
            subtitle="Basic"
            price="$9.99"
            cadence="Monthly"
            cta="Select Basic"
            onPress={() => router.push("/plans/confirm")}
          />
          <PlanCard
            tier="The Architect"
            subtitle="Pro"
            price="$24.99"
            cadence="Monthly"
            cta="Upgrade to Pro"
            isPopular
            onPress={() => router.push("/plans/confirm")}
          />
          <PlanCard
            tier="Global Studio"
            subtitle="Max"
            price="$49.99"
            cadence="Monthly"
            cta="Go Unlimited"
            isDark
            onPress={() => router.push("/plans/confirm")}
          />
        </View>

        {/* Feature Comparison */}
        <Text className="text-on-surface font-headline text-xl mt-12 mb-6">
          Feature Comparison
        </Text>

        {/* Column headers */}
        <View className="flex-row items-center mb-3 px-1">
          <View className="flex-1" />
          {PLAN_NAMES.map(name => (
            <Text
              key={name}
              className="text-on-surface-variant font-label text-[10px] font-semibold uppercase tracking-wider w-16 text-center"
            >
              {name}
            </Text>
          ))}
        </View>

        {/* Feature rows */}
        {FEATURES.map((feature, idx) => (
          <View
            key={feature.label}
            className={`flex-row items-center py-3.5 px-1 ${
              idx < FEATURES.length - 1
                ? "border-b border-surface-container-high"
                : ""
            }`}
          >
            <Text className="flex-1 text-on-surface font-body text-sm">
              {feature.label}
            </Text>
            {feature.values.map((val, i) => (
              <Text
                key={PLAN_NAMES[i]}
                className={`w-16 text-center font-body text-xs ${
                  val === "—" ? "text-on-surface-variant/40" : "text-on-surface"
                }`}
              >
                {val}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
