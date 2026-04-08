import { TextInput, View, Text } from "react-native";
import { useState } from "react";

interface InputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="gap-2">
      <Text className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant/70 font-label pl-1">
        {label}
      </Text>
      <TextInput
        className={`w-full px-4 py-4 rounded-xl font-body text-base text-on-surface ${
          isFocused ? "bg-surface-container-high" : "bg-surface-container-low"
        }`}
        style={
          isFocused
            ? {
                shadowColor: "#E1C39B",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }
            : undefined
        }
        placeholder={placeholder}
        placeholderTextColor="rgba(208, 197, 184, 0.3)"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}
