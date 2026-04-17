import { View, Text, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
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
    label: "Cloud Gallery",
    values: ["1 GB", "50 GB", "1 TB", "Unlimited"],
  },
  {
    label: "Blueprint Export",
    values: ["PDF", "PDF+CAD", "All", "Source"],
  },
  {
    label: "High-Res Render",
    values: ["—", "—", "✓", "✓"],
  },
  {
    label: "Collab Workspace",
    values: ["—", "—", "✓", "✓"],
  },
  {
    label: "Custom Domain",
    values: ["—", "—", "—", "✓"],
  },
];

const PLAN_NAMES = ["Free", "Basic", "Pro", "Max"] as const;

const EDITORIAL_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAo4RTa5Ebmtm2zt5dDiM-SXexRU8XazPYDO_gSKuLvfoDoAbNqPJdjo7qDQAj2J-0ApdGnxHnTd3BdgccFmSq6yHHlvwSkWh1T1O6YoMfmKE3GyB3EZAtQuVxTDt3zkmOLxoqr1i-ur2w0FPO1KyXL5PLuaJmmOkZIzQZoXEFvg7yKQmnqLSE5W2TpFBf2bwsWwgL_z9lN45RbCLnrOgboDJAj8sWDBQ5SWj0ztb16ss8EFNULJ-GNvXqQpi9QIgiPlbxBDG5Kq20";

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
}: PlanCardProps) {
  return (
    <View
      className="bg-surface-container-low rounded-xl"
      style={[
        { padding: 32 },
        isPopular && {
          borderWidth: 1,
          borderColor: "rgba(224,194,154,0.3)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 24 },
          shadowOpacity: 0.4,
          shadowRadius: 48,
          elevation: 12,
        },
      ]}
    >
      {/* Most Popular badge */}
      {isPopular && (
        <View style={{ position: "absolute", top: 16, right: 16 }}>
          <LinearGradient
            colors={["#C4A882", "#A68A62"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4 }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: "#3F2D11",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Most Popular
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Tier & subtitle */}
      <View style={{ marginBottom: 24 }}>
        <Text
          className="font-label text-secondary"
          style={{
            fontSize: 11,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {tier}
        </Text>
        <Text
          className="font-body"
          style={{ fontSize: 14, color: "#E0C29A" }}
        >
          {subtitle}
        </Text>
      </View>

      {/* Price */}
      <View
        className="flex-row items-baseline"
        style={{ gap: 8, marginBottom: 32 }}
      >
        <Text
          className="font-headline text-on-surface"
          style={{ fontSize: 36 }}
        >
          {price}
        </Text>
        <Text
          className="text-secondary"
          style={{ fontSize: 12 }}
        >
          {cadence}
        </Text>
      </View>

      {/* CTA Button */}
      {isPopular ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <LinearGradient
            colors={["#C4A882", "#A68A62"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 56,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 24,
            }}
          >
            <Text
              className="font-body"
              style={{ fontSize: 15, fontWeight: "600", color: "#3F2D11" }}
            >
              {cta}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
          </LinearGradient>
        </Pressable>
      ) : isCurrent ? (
        <View
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor: "#353534",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            className="font-body"
            style={{ fontSize: 15, fontWeight: "600", color: "#998F84" }}
          >
            {cta}
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            height: 56,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#4D463C",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? "#2A2A2A" : "transparent",
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Text
            className="font-body text-secondary"
            style={{ fontSize: 15, fontWeight: "600" }}
          >
            {cta}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature Comparison Table                                           */
/* ------------------------------------------------------------------ */

function FeatureTable() {
  return (
    <View className="rounded-xl bg-surface-container-low overflow-hidden">
      {/* Header row */}
      <View
        className="flex-row"
        style={{ backgroundColor: "#201F1F", paddingVertical: 14, paddingHorizontal: 16 }}
      >
        <Text
          className="flex-1 font-label"
          style={{
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "rgba(209,197,184,0.7)",
          }}
        >
          Feature
        </Text>
        {PLAN_NAMES.map((name) => (
          <Text
            key={name}
            style={{
              width: 56,
              textAlign: "center",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontFamily: "Inter",
              color: "rgba(209,197,184,0.7)",
            }}
          >
            {name}
          </Text>
        ))}
      </View>

      {/* Feature rows */}
      {FEATURES.map((feature, idx) => (
        <View
          key={feature.label}
          className="flex-row items-center"
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderTopWidth: 1,
            borderTopColor: "rgba(77,70,60,0.1)",
          }}
        >
          <Text
            className="flex-1 font-body text-on-surface"
            style={{ fontSize: 13, fontWeight: "500" }}
          >
            {feature.label}
          </Text>
          {feature.values.map((val, i) => {
            const isPro = i === 2;
            const isCheck = val === "✓";
            const isDash = val === "—";
            return (
              <View key={PLAN_NAMES[i]} style={{ width: 56, alignItems: "center" }}>
                {isCheck ? (
                  <Ionicons
                    name="checkmark"
                    size={isPro ? 20 : 20}
                    color={isPro ? "#E0C29A" : "#E0C29A"}
                  />
                ) : isDash ? (
                  <Ionicons name="remove" size={18} color="#998F84" />
                ) : (
                  <Text
                    className="font-body"
                    style={{
                      fontSize: 13,
                      textAlign: "center",
                      color: isPro ? "#E0C29A" : "#998F84",
                      fontWeight: isPro ? "600" : "400",
                    }}
                  >
                    {val}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export default function PlansScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* ── Top App Bar ── */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ height: 56 }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#E0C29A" />
        </Pressable>
        <Text
          className="font-label text-on-surface-variant"
          style={{
            fontSize: 11,
            letterSpacing: 2.2,
            textTransform: "uppercase",
          }}
        >
          Membership
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Headline Section ── */}
        <View style={{ marginTop: 24, marginBottom: 48 }}>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 36, lineHeight: 42, marginBottom: 12 }}
          >
            Choose Your{"\n"}Plan
          </Text>
          <Text
            className="font-body text-secondary"
            style={{ fontSize: 14 }}
          >
            Select a tier that matches the scale of your vision.
          </Text>
        </View>

        {/* ── Plan Cards Stack ── */}
        <View style={{ gap: 24, marginBottom: 64 }}>
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
            onPress={() => router.push("/plans/confirm")}
          />
        </View>

        {/* ── Feature Comparison ── */}
        <View style={{ marginBottom: 80 }}>
          <Text
            className="font-label text-secondary"
            style={{
              fontSize: 11,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            Feature Comparison
          </Text>
          <FeatureTable />
        </View>

        {/* ── Editorial Image ── */}
        <View style={{ marginBottom: 48 }}>
          <View
            className="rounded-xl overflow-hidden"
            style={{ height: 240 }}
          >
            <Image
              source={{ uri: EDITORIAL_IMG }}
              style={{ width: "100%", height: "100%", opacity: 0.4 }}
              contentFit="cover"
            />
          </View>
          <Text
            className="font-label text-center"
            style={{
              fontSize: 11,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              color: "#998F84",
              marginTop: 24,
            }}
          >
            Designed for the infinite creator.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
