import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const IMG_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCc5wlj9LLE3AfOU9GNogCvF1WErHxRtt86EuJsrQuUSIiR9XdS_INMUU6Q3ahwzaf643ernOZN337Va0cikDCEt6_Bp7CyLWa1oM55sIhbulZE82dkW6EMbmxV0TqkP3GhLW2vIJabaH6UFFHZ3xaW9NdRPxfGXVuaUTAPNhTd25uDpt7KsHv5VCtNNIWat-pwc_SInjLXpXfWaPzzO2cxE8204VqdvQcm9nxpguR1xmE6CVh0SddzIRPp2C3vo17vD6GVIgDE_Ns";

export default function ErrorScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* TopAppBar */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ height: 64, backgroundColor: "#131313" }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#2A2A2A" : "transparent",
          })}
        >
          <Ionicons name="arrow-back" size={24} color="#E1C39B" />
        </Pressable>

        <Text
          className="font-headline"
          style={{
            fontSize: 20,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#E1C39B",
          }}
        >
          THE ARCHITECTURAL LENS
        </Text>

        <View
          className="rounded-full overflow-hidden"
          style={{
            width: 32,
            height: 32,
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.3)",
          }}
        >
          <Image
            source={{ uri: IMG_AVATAR }}
            style={{ width: 32, height: 32 }}
            contentFit="cover"
          />
        </View>
      </View>

      {/* Error Screen Canvas */}
      <View className="flex-1 items-center justify-center px-8">
        {/* Background Faded Glow */}
        <View
          className="absolute rounded-full"
          style={{
            width: 500,
            height: 500,
            backgroundColor: "rgba(245,240,235,0.06)",
            opacity: 0.5,
          }}
        />

        {/* Icon Cluster */}
        <View className="relative mb-12 items-center justify-center">
          {/* Secondary glow behind card */}
          <View
            className="absolute rounded-full"
            style={{
              width: 160,
              height: 160,
              backgroundColor: "rgba(245,240,235,0.06)",
            }}
          />
          {/* Card */}
          <View
            className="bg-surface-container-low rounded-xl items-center justify-center"
            style={{
              width: 128,
              height: 128,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.6,
              shadowRadius: 32,
              elevation: 24,
            }}
          >
            <Ionicons name="warning-outline" size={60} color="#C4A882" />
          </View>
        </View>

        {/* Content */}
        <View className="items-center" style={{ maxWidth: 420 }}>
          <Text
            className="font-headline text-center mb-4"
            style={{
              fontSize: 28,
              lineHeight: 34,
              letterSpacing: -0.3,
              color: "#F5F0EB",
            }}
          >
            Something Went Wrong.
          </Text>

          <Text
            className="font-body text-on-surface-variant text-center leading-relaxed mb-12 px-4"
            style={{ fontSize: 14 }}
          >
            We encountered an unexpected structural error during the render.
            Credits have been refunded to your studio account.
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="w-full gap-4" style={{ maxWidth: 320 }}>
          {/* Primary Action */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <LinearGradient
              colors={["#C4A882", "#A68A62"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                height: 56,
                borderRadius: 16,
                paddingHorizontal: 24,
                borderWidth: 1,
                borderColor: "rgba(196,168,130,0.3)",
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#3F2D11",
                }}
              >
                Try Again
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
            </LinearGradient>
          </Pressable>

          {/* Secondary Action */}
          <Pressable
            onPress={() => router.push("/settings/help")}
            className="items-center justify-center rounded-xl bg-surface-container-highest"
            style={({ pressed }) => ({
              height: 56,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text
              className="font-label font-bold"
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#F5F0EB",
              }}
            >
              Contact Support
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Footer Ref */}
      <View className="items-center pb-8">
        <Text
          className="font-label text-on-surface"
          style={{
            fontSize: 11,
            letterSpacing: 3,
            textTransform: "uppercase",
            opacity: 0.2,
          }}
        >
          ERROR LOG REF: 0X8A4_CURATOR
        </Text>
      </View>
    </SafeAreaView>
  );
}
