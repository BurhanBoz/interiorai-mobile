import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";

interface ScreenContainerProps {
  children: ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
}

export function ScreenContainer({
  children,
  edges = ["top"],
}: ScreenContainerProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-surface">
      <View className="flex-1 px-8">{children}</View>
    </SafeAreaView>
  );
}
