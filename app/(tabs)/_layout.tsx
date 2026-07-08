import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { GlassNavBar } from "@/components/layout/GlassNavBar";

// Anchor route for the group: without it, a bare "/(tabs)" navigation (deep
// link, guard redirect) resolves to the alphabetically-first child — gallery.
// Studio is the product's front door; every entry lands there first.
export const unstable_settings = {
  initialRouteName: "studio",
};

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={props => <GlassNavBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="studio" options={{ title: t("tabs.studio") }} />
      <Tabs.Screen name="gallery" options={{ title: t("tabs.gallery") }} />
      <Tabs.Screen name="history" options={{ title: t("tabs.history") }} />
      <Tabs.Screen name="profile" options={{ title: t("drawer.settings") }} />
    </Tabs>
  );
}
