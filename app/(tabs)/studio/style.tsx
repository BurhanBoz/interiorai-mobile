import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useStudioStore } from "@/stores/studioStore";
import { getRoomTypes, getDesignStyles } from "@/services/catalog";
import type { CatalogItemResponse } from "@/types/api";

/* ── Design style icon map ── */
const STYLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  MODERN: "cube-outline",
  MINIMALIST: "remove-outline",
  SCANDINAVIAN: "snow-outline",
  INDUSTRIAL: "construct-outline",
  BOHEMIAN: "leaf-outline",
  TRADITIONAL: "home-outline",
  CONTEMPORARY: "shapes-outline",
  MID_CENTURY: "diamond-outline",
  RUSTIC: "bonfire-outline",
  ART_DECO: "star-outline",
  COASTAL: "water-outline",
  MEDITERRANEAN: "sunny-outline",
  JAPANESE: "flower-outline",
  TROPICAL: "umbrella-outline",
  FARMHOUSE: "business-outline",
  VINTAGE: "time-outline",
  ECLECTIC: "color-palette-outline",
  CLASSIC: "ribbon-outline",
  FRENCH_COUNTRY: "cafe-outline",
  HOLLYWOOD_GLAM: "sparkles-outline",
  SHABBY_CHIC: "rose-outline",
  TRANSITIONAL: "swap-horizontal-outline",
  URBAN: "grid-outline",
  ZEN: "moon-outline",
  BAROQUE: "trophy-outline",
  GOTHIC: "skull-outline",
  NEOCLASSICAL: "library-outline",
  BIOPHILIC: "earth-outline",
  WABI_SABI: "cloudy-outline",
  CYBERPUNK: "flash-outline",
  FUTURISTIC: "rocket-outline",
  RETRO: "radio-outline",
  MAXIMALIST: "layers-outline",
  SOUTHWESTERN: "flame-outline",
};

function getStyleIcon(code: string): keyof typeof Ionicons.glyphMap {
  return STYLE_ICONS[code] ?? "color-palette-outline";
}

export default function StyleScreen() {
  const { roomType, designStyle, setRoomType, setDesignStyle } =
    useStudioStore();

  const [roomTypes, setRoomTypes] = useState<CatalogItemResponse[]>([]);
  const [designStyles, setDesignStyles] = useState<CatalogItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roomPickerVisible, setRoomPickerVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rooms, styles] = await Promise.all([
          getRoomTypes(),
          getDesignStyles(),
        ]);
        if (!cancelled) {
          setRoomTypes(rooms);
          setDesignStyles(styles);
        }
      } catch {
        // silently fail — lists will be empty
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Group room types by category
  const groupedRoomTypes = useMemo(() => {
    const map = new Map<string, CatalogItemResponse[]>();
    for (const r of roomTypes) {
      const cat = r.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }, [roomTypes]);

  const handleNext = () => {
    router.push("/studio/options");
  };

  const canProceed = roomType !== null && designStyle !== null;

  /* ─── Room Type Picker Modal ─── */
  const RoomPickerModal = () => (
    <Modal
      visible={roomPickerVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setRoomPickerVisible(false)}
    >
      <View className="flex-1 bg-surface">
        {/* Modal Header */}
        <View
          className="flex-row items-center justify-between px-6"
          style={{
            height: 60,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(77,70,60,0.2)",
          }}
        >
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 18, fontWeight: "700" }}
          >
            Select Room Type
          </Text>
          <Pressable
            onPress={() => setRoomPickerVisible(false)}
            hitSlop={8}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(42,42,42,0.8)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={20} color="#E1C39B" />
          </Pressable>
        </View>

        <FlatList
          data={groupedRoomTypes}
          keyExtractor={g => g.category}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: group }) => (
            <View style={{ marginTop: 24 }}>
              {/* Category header */}
              <View
                className="px-6 mb-3 flex-row items-center"
                style={{ gap: 8 }}
              >
                <View
                  style={{
                    width: 3,
                    height: 14,
                    borderRadius: 2,
                    backgroundColor: "#E0C29A",
                  }}
                />
                <Text
                  className="font-label"
                  style={{
                    fontSize: 11,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                    fontWeight: "700",
                    color: "#E0C29A",
                  }}
                >
                  {group.category}
                </Text>
              </View>

              {/* Room items */}
              {group.items.map(room => {
                const isSelected = roomType?.code === room.code;
                return (
                  <Pressable
                    key={room.id}
                    onPress={() => {
                      setRoomType(room);
                      setRoomPickerVisible(false);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 24,
                      paddingVertical: 14,
                      backgroundColor: isSelected
                        ? "rgba(224,194,154,0.08)"
                        : pressed
                          ? "rgba(255,255,255,0.03)"
                          : "transparent",
                    })}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: isSelected
                          ? "rgba(224,194,154,0.15)"
                          : "rgba(42,42,42,0.6)",
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: "rgba(224,194,154,0.3)",
                      }}
                    >
                      <Ionicons
                        name="home-outline"
                        size={18}
                        color={isSelected ? "#E1C39B" : "#998F84"}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text
                        className="font-body"
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: isSelected ? "#E1C39B" : "#E5E2E1",
                        }}
                      >
                        {room.name}
                      </Text>
                      {room.description ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#998F84",
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {room.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#E1C39B"
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      </View>
    </Modal>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* App Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(42,42,42,0.8)",
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#E1C39B" />
        </Pressable>
        <Text
          className="font-headline text-center"
          style={{
            fontSize: 14,
            lineHeight: 16,
            fontWeight: "700",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "#E1C39B",
          }}
        >
          {"ARCHITECTURAL\nLENS"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator & Headline */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
          <Text
            className="font-label text-secondary mb-2"
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: "500",
            }}
          >
            STEP 2 OF 4
          </Text>
          <Text
            className="font-headline text-on-surface"
            style={{ fontSize: 36, lineHeight: 40, fontWeight: "700" }}
          >
            Describe Your Space
          </Text>
        </View>

        {isLoading ? (
          <View style={{ marginTop: 64, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#C4A882" />
            <Text
              className="font-label text-on-surface-variant"
              style={{
                marginTop: 16,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Loading catalog…
            </Text>
          </View>
        ) : (
          <>
            {/* ── Room Type Select Box ── */}
            <View style={{ marginTop: 32, paddingHorizontal: 24 }}>
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                ROOM TYPE
              </Text>
              <Pressable
                onPress={() => setRoomPickerVisible(true)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: pressed
                    ? "rgba(42,42,42,0.9)"
                    : "rgba(42,42,42,0.6)",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: roomType
                    ? "rgba(224,194,154,0.4)"
                    : "rgba(77,70,60,0.25)",
                  paddingHorizontal: 16,
                  height: 60,
                  gap: 12,
                })}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: roomType
                      ? "rgba(224,194,154,0.12)"
                      : "rgba(77,70,60,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Ionicons
                    name={roomType ? "home" : "home-outline"}
                    size={16}
                    color={roomType ? "#E1C39B" : "#998F84"}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {roomType ? (
                    <>
                      <Text
                        style={{
                          fontSize: 9,
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                          color: "#998F84",
                          fontWeight: "600",
                        }}
                        numberOfLines={1}
                      >
                        {roomType.category || "Room"}
                      </Text>
                      <Text
                        className="font-body"
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#E5E2E1",
                          marginTop: 1,
                        }}
                        numberOfLines={1}
                      >
                        {roomType.name}
                      </Text>
                    </>
                  ) : (
                    <Text
                      className="font-body"
                      style={{
                        fontSize: 14,
                        color: "#998F84",
                      }}
                      numberOfLines={1}
                    >
                      Select a room type…
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color="#998F84"
                  style={{ flexShrink: 0 }}
                />
              </Pressable>
            </View>

            {/* ── Design Style Section ── */}
            <View style={{ marginTop: 36, paddingHorizontal: 24 }}>
              <Text
                className="font-label text-on-surface-variant"
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 20,
                }}
              >
                DESIGN STYLE
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                {designStyles.map(style => {
                  const isSelected = designStyle?.code === style.code;
                  const iconName = getStyleIcon(style.code);
                  return (
                    <Pressable
                      key={style.id}
                      onPress={() => setDesignStyle(style)}
                      style={({ pressed }) => ({
                        width: "47%",
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      })}
                    >
                      <View
                        style={{
                          borderRadius: 16,
                          overflow: "hidden",
                          backgroundColor: isSelected
                            ? "rgba(224,194,154,0.06)"
                            : "#1C1B1B",
                          borderWidth: isSelected ? 1.5 : 1,
                          borderColor: isSelected
                            ? "#E1C39B"
                            : "rgba(77,70,60,0.15)",
                        }}
                      >
                        {/* Preview image or icon fallback */}
                        <View
                          style={{
                            aspectRatio: 4 / 3,
                            backgroundColor: "#2A2A2A",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          {style.previewUrl ? (
                            <Image
                              source={{ uri: style.previewUrl }}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={{ alignItems: "center", gap: 6 }}>
                              <View
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 24,
                                  backgroundColor: isSelected
                                    ? "rgba(224,194,154,0.15)"
                                    : "rgba(77,70,60,0.25)",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Ionicons
                                  name={iconName}
                                  size={24}
                                  color={isSelected ? "#E1C39B" : "#998F84"}
                                />
                              </View>
                            </View>
                          )}
                          {/* Name overlay on the image */}
                          <LinearGradient
                            colors={["transparent", "rgba(0,0,0,0.7)"]}
                            style={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              bottom: 0,
                              paddingTop: 24,
                              paddingBottom: 8,
                              paddingHorizontal: 10,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Ionicons
                              name={iconName}
                              size={12}
                              color="rgba(255,255,255,0.8)"
                            />
                            <Text
                              style={{
                                flex: 1,
                                fontSize: 10,
                                fontWeight: "700",
                                letterSpacing: 0.8,
                                textTransform: "uppercase",
                                color: "rgba(255,255,255,0.9)",
                              }}
                              numberOfLines={1}
                            >
                              {style.name}
                            </Text>
                          </LinearGradient>
                          {/* Selected indicator overlay */}
                          {isSelected && (
                            <View
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: "#E1C39B",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color="#3F2D11"
                              />
                            </View>
                          )}
                        </View>

                        {/* Label */}
                        <View
                          className="flex-row items-center"
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            gap: 6,
                          }}
                        >
                          <Ionicons
                            name={iconName}
                            size={13}
                            color={isSelected ? "#E1C39B" : "#998F84"}
                          />
                          <Text
                            className="font-label"
                            style={{
                              flex: 1,
                              fontSize: 10,
                              letterSpacing: 0.8,
                              textTransform: "uppercase",
                              fontWeight: "600",
                              color: isSelected ? "#E1C39B" : "#D1C5B8",
                            }}
                            numberOfLines={1}
                          >
                            {style.name}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Room Picker Modal */}
      <RoomPickerModal />

      {/* Floating CTA */}
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-24 pt-4">
        <Pressable
          onPress={handleNext}
          disabled={!canProceed}
          style={({ pressed }) => ({
            opacity: canProceed ? 1 : 0.5,
            transform: [{ scale: pressed && canProceed ? 0.98 : 1 }],
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
              Next Step
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
