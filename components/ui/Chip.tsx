import { Pressable, Text } from "react-native";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-xl mr-2 ${
        selected ? "bg-primary" : "bg-surface-container-high"
      }`}
    >
      <Text
        className={`text-sm font-body ${
          selected ? "text-on-primary font-medium" : "text-on-surface"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
