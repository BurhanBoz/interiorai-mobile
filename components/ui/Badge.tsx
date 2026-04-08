import { View, Text } from "react-native";

type PlanCode = "FREE" | "BASIC" | "PRO" | "MAX";

interface BadgeProps {
  plan: PlanCode;
}

const BADGE_COLORS: Record<PlanCode, { bg: string; text: string }> = {
  FREE: { bg: "bg-surface-container-highest", text: "text-on-surface-variant" },
  BASIC: { bg: "bg-secondary-container", text: "text-secondary" },
  PRO: { bg: "bg-primary-container", text: "text-on-primary" },
  MAX: { bg: "bg-primary", text: "text-on-primary" },
};

export function Badge({ plan }: BadgeProps) {
  const colors = BADGE_COLORS[plan];
  return (
    <View className={`px-2 py-0.5 rounded-full ${colors.bg}`}>
      <Text
        className={`text-[9px] font-label uppercase tracking-widest font-semibold ${colors.text}`}
      >
        {plan}
      </Text>
    </View>
  );
}
