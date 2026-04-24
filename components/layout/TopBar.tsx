import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand/Brand";
import { theme } from "@/config/theme";

/**
 * The unified top bar for every screen.
 *
 * Design rules:
 *   - 56px content height — constant across the app
 *   - Brand uses the <Brand/> SVG component — never hardcoded text with "\n"
 *   - Back button is 40×40 with an 8px hitSlop (iOS HIG)
 *   - Title is sentence-cased serif — the noisy UPPERCASE-tracked header
 *     was collapsing with every other eyebrow on the page
 */

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showBranding?: boolean;
  rightElement?: ReactNode;
  /** Override the back handler — default pops the stack. */
  onBack?: () => void;
}

export function TopBar({
  title,
  subtitle,
  showBack = false,
  showBranding = false,
  rightElement,
  onBack,
}: TopBarProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.color.surface }}>
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
        }}
      >
        {/* Left slot — back button OR spacer */}
        <View style={{ width: 44, alignItems: "flex-start" }}>
          {showBack ? (
            <Pressable
              onPress={handleBack}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? "rgba(225,195,155,0.08)" : "transparent",
              })}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={theme.color.goldMidday}
              />
            </Pressable>
          ) : null}
        </View>

        {/* Center slot — brand mark OR title */}
        <View style={{ flex: 1, alignItems: "center" }}>
          {showBranding ? (
            <Brand variant="inline" size="sm" tone="gold" />
          ) : title ? (
            <View style={{ alignItems: "center" }}>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: "NotoSerif",
                  fontSize: 17,
                  letterSpacing: -0.1,
                  color: theme.color.onSurface,
                }}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: "Inter",
                    fontSize: 11,
                    color: theme.color.onSurfaceMuted,
                    letterSpacing: 0.3,
                    marginTop: 1,
                  }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Right slot */}
        <View style={{ width: 44, alignItems: "flex-end" }}>
          {rightElement}
        </View>
      </View>
    </SafeAreaView>
  );
}
