import { Stack } from "expo-router";

export default function StudioLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#131313" },
      }}
    />
  );
}
