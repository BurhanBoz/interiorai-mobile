import { useEffect, useRef } from "react";
import { Animated, View, Text, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { theme } from "@/config/theme";

/**
 * The unified empty-state primitive.
 *
 * Every "nothing here yet" screen in the app (Favorites, History when
 * filtered, Gallery before first generation) uses this same layout:
 *   - breathing icon tile at the top
 *   - eyebrow + sentence-cased title
 *   - one-line description
 *   - exactly ONE primary CTA
 *
 * The breathing animation is the editorial flourish — just a 3.6s
 * opacity loop on the icon tile, quiet enough that you don't notice
 * it consciously but the screen feels alive instead of dead.
 */

type IconName = ComponentProps<typeof Ionicons>["name"];

interface EmptyStateProps {
  icon?: IconName;
  /** Custom leading element — overrides icon. */
  leading?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  /** Primary CTA node — pass a <PrimaryButton> or similar. */
  action?: ReactNode;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  leading,
  eyebrow,
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: theme.motion.easing.standard,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 1800,
          easing: theme.motion.easing.standard,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
          paddingVertical: 48,
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: 88,
          height: 88,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          backgroundColor: "rgba(225,195,155,0.06)",
          borderWidth: 1,
          borderColor: "rgba(225,195,155,0.16)",
          opacity: pulse,
        }}
      >
        {leading ??
          (icon ? (
            <Ionicons
              name={icon}
              size={36}
              color="rgba(225,195,155,0.55)"
            />
          ) : null)}
      </Animated.View>

      {eyebrow ? (
        <Text
          style={{
            fontFamily: "Inter-SemiBold",
            fontSize: 10,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: "rgba(225,195,155,0.58)",
            marginBottom: 10,
          }}
        >
          {eyebrow}
        </Text>
      ) : null}

      <Text
        style={{
          fontFamily: "NotoSerif",
          fontSize: 24,
          lineHeight: 30,
          color: theme.color.onSurface,
          textAlign: "center",
          letterSpacing: -0.2,
          marginBottom: description ? 10 : 24,
        }}
      >
        {title}
      </Text>

      {description ? (
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            lineHeight: 20,
            color: theme.color.onSurfaceVariant,
            textAlign: "center",
            maxWidth: 280,
            marginBottom: 28,
          }}
        >
          {description}
        </Text>
      ) : null}

      {action}
    </View>
  );
}

export default EmptyState;
