import { View } from "react-native";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <View className={`bg-surface-container-high p-6 rounded-xl ${className}`}>
      {children}
    </View>
  );
}
