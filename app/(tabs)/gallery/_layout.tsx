import { Stack } from "expo-router";

export default function GalleryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#191510" },
      }}
    />
  );
}
