import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/stores/authStore";

export default function RootIndex() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#131313",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#C4A882" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/gallery" />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}
