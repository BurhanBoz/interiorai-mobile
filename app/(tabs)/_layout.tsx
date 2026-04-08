import { Tabs } from "expo-router";
import { GlassNavBar } from "@/components/layout/GlassNavBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <GlassNavBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="studio" options={{ title: "Studio" }} />
      <Tabs.Screen name="gallery" options={{ title: "Gallery" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
