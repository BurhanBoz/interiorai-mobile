import { View, Text, Pressable, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { theme } from "@/config/theme";

/**
 * A single typographic device for every "section start" in the app.
 *
 * Before this component existed, every screen hand-rolled its own section
 * label — always fontSize 11, always letterSpacing 2-3, always uppercase —
 * which meant 50+ tracked captions screaming in parallel and killing the
 * very emphasis they were trying to create.
 *
 * Contract:
 *   - eyebrow: UPPERCASE tracked caption (OPTIONAL, max 1× per screen)
 *   - title:   sentence-case serif, the actual header (REQUIRED)
 *   - caption: lighter sub-line, sentence-case (OPTIONAL)
 *   - action:  right-aligned text link OR custom node (OPTIONAL)
 *
 * Use the eyebrow SPARINGLY — it's reserved for the hero section of a
 * screen. Every other section should rely on title alone.
 */

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  caption?: string;
  /** Right-aligned action — either a label (renders a text link) or a node. */
  action?: string | ReactNode;
  onActionPress?: () => void;
  /** Render the title with serif display type — default. `false` uses sans. */
  serif?: boolean;
  /** Add a 20px gold underline below the title. Useful on hero sections. */
  accent?: boolean;
  align?: "left" | "center";
  style?: ViewStyle;
}

export function SectionHeader({
  eyebrow,
  title,
  caption,
  action,
  onActionPress,
  serif = true,
  accent = false,
  align = "left",
  style,
}: SectionHeaderProps) {
  const isCenter = align === "center";
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: isCenter ? "center" : "flex-end",
          justifyContent: isCenter ? "center" : "space-between",
          marginBottom: 20,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, alignItems: isCenter ? "center" : "flex-start" }}>
        {eyebrow ? (
          <Text
            style={{
              ...theme.text.caption,
              color: "rgba(225,195,155,0.62)",
              marginBottom: 8,
            }}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text
          style={{
            ...(serif ? theme.text.headline : theme.text.subtitle),
            color: theme.color.onSurface,
            textAlign: isCenter ? "center" : "left",
          }}
        >
          {title}
        </Text>
        {accent ? (
          <View
            style={{
              width: 28,
              height: 1.5,
              backgroundColor: theme.color.goldMidday,
              marginTop: 10,
              borderRadius: 1,
              opacity: 0.85,
            }}
          />
        ) : null}
        {caption ? (
          <Text
            style={{
              ...theme.text.body,
              color: theme.color.onSurfaceVariant,
              marginTop: 6,
              textAlign: isCenter ? "center" : "left",
            }}
          >
            {caption}
          </Text>
        ) : null}
      </View>
      {action !== undefined && !isCenter ? (
        typeof action === "string" ? (
          <Pressable
            onPress={onActionPress}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              opacity: pressed ? 0.6 : 1,
              paddingVertical: 4,
              paddingLeft: 12,
            })}
          >
            <Text
              style={{
                ...theme.text.subtitle,
                color: theme.color.goldMidday,
              }}
            >
              {action}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={theme.color.goldMidday}
            />
          </Pressable>
        ) : (
          action
        )
      ) : null}
    </View>
  );
}

export default SectionHeader;
