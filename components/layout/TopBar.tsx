import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  showBranding?: boolean;
  rightElement?: React.ReactNode;
}

export function TopBar({
  title,
  showBack = false,
  showBranding = false,
  rightElement,
}: TopBarProps) {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} className="bg-[#131313] z-50">
      <View className="flex-row justify-between items-center w-full px-8 py-6">
        <View className="flex-row items-center gap-4">
          {showBack && (
            <Pressable onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#C4A882" />
            </Pressable>
          )}
          {showBranding ? (
            <Text className="font-headline text-xl tracking-widest text-[#F5F0EB] uppercase">
              The Architectural Lens
            </Text>
          ) : title ? (
            <Text className="font-headline text-lg font-medium text-primary">
              {title}
            </Text>
          ) : null}
        </View>
        {rightElement ?? (
          <View className="w-8 h-8 rounded-full bg-surface-container-high items-center justify-center">
            <Ionicons name="person" size={14} color="#E5E2E1" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
