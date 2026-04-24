import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStudioStore } from "@/stores/studioStore";
import { getRoomTypes, getDesignStyles } from "@/services/catalog";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Brand } from "@/components/brand/Brand";
import { BottomBar, BOTTOM_BAR_SCROLL_PADDING } from "@/components/layout/BottomBar";
import type { CatalogItemResponse } from "@/types/api";
import type { ImageSource } from "expo-image";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 16;
const CARD_H_PAD = 24;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_H_PAD * 2 - CARD_GAP) / 2;

/* ── Room type icon map ── */
const ROOM_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  LIVING_ROOM: "tv-outline",
  BEDROOM: "bed-outline",
  KITCHEN: "restaurant-outline",
  BATHROOM: "water-outline",
  DINING_ROOM: "wine-outline",
  HOME_OFFICE: "desktop-outline",
  KIDS_ROOM: "happy-outline",
  NURSERY: "heart-outline",
  LAUNDRY: "shirt-outline",
  GARAGE: "car-outline",
  BASEMENT: "layers-outline",
  ATTIC: "triangle-outline",
  HALLWAY: "swap-horizontal-outline",
  ENTRYWAY: "enter-outline",
  CLOSET: "archive-outline",
  PATIO: "umbrella-outline",
  BALCONY: "sunny-outline",
  GARDEN: "leaf-outline",
  POOL: "water-outline",
  STUDIO: "color-palette-outline",
  LIBRARY: "library-outline",
  GYM: "barbell-outline",
  MEDIA_ROOM: "film-outline",
  GUEST_ROOM: "person-outline",
  SUNROOM: "sunny-outline",
  MUDROOM: "footsteps-outline",
  PANTRY: "nutrition-outline",
  BAR: "beer-outline",
  OFFICE: "briefcase-outline",
  RECEPTION: "people-outline",
  CONFERENCE_ROOM: "easel-outline",
  LOUNGE: "cafe-outline",
  LOBBY: "business-outline",
  SHOWROOM: "storefront-outline",
  RESTAURANT: "restaurant-outline",
  CAFE: "cafe-outline",
  RETAIL: "cart-outline",
  HOTEL_ROOM: "key-outline",
  SPA: "sparkles-outline",
  CLINIC: "medkit-outline",
  CLASSROOM: "school-outline",
};

function getRoomIcon(code: string): keyof typeof Ionicons.glyphMap {
  return ROOM_ICONS[code] ?? "home-outline";
}

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

/* ── Local design style images ── */
const STYLE_IMAGES: Record<string, ImageSource> = {
  MODERN: require("@/assets/styles/modern.png"),
  MINIMALIST: require("@/assets/styles/minimalist.png"),
  SCANDINAVIAN: require("@/assets/styles/scandinavian.png"),
  INDUSTRIAL: require("@/assets/styles/industrial.png"),
  BOHEMIAN: require("@/assets/styles/bohemian.png"),
  TRADITIONAL: require("@/assets/styles/traditional.png"),
  CONTEMPORARY: require("@/assets/styles/contemporary.png"),
  MID_CENTURY: require("@/assets/styles/mid_century.png"),
  RUSTIC: require("@/assets/styles/rustic.png"),
  ART_DECO: require("@/assets/styles/art_deco.png"),
  COASTAL: require("@/assets/styles/coastal.png"),
  MEDITERRANEAN: require("@/assets/styles/mediterranean.png"),
  JAPANESE: require("@/assets/styles/japanese.png"),
  TROPICAL: require("@/assets/styles/tropical.png"),
  FARMHOUSE: require("@/assets/styles/farmhouse.png"),
  VINTAGE: require("@/assets/styles/vintage.png"),
  ECLECTIC: require("@/assets/styles/eclectic.png"),
  CLASSIC: require("@/assets/styles/classic.png"),
  FRENCH_COUNTRY: require("@/assets/styles/french_country.png"),
  HOLLYWOOD_GLAM: require("@/assets/styles/hollywood_glam.png"),
  SHABBY_CHIC: require("@/assets/styles/shabby_chic.png"),
  TRANSITIONAL: require("@/assets/styles/transitional.png"),
  URBAN: require("@/assets/styles/urban.png"),
  ZEN: require("@/assets/styles/zen.png"),
  BAROQUE: require("@/assets/styles/baroque.png"),
  GOTHIC: require("@/assets/styles/gothic.png"),
  NEOCLASSICAL: require("@/assets/styles/neoclassical.png"),
  BIOPHILIC: require("@/assets/styles/biophilic.png"),
  WABI_SABI: require("@/assets/styles/wabi_sabi.png"),
  CYBERPUNK: require("@/assets/styles/cyberpunk.png"),
  FUTURISTIC: require("@/assets/styles/futuristic.png"),
  RETRO: require("@/assets/styles/retro.png"),
  MAXIMALIST: require("@/assets/styles/maximalist.png"),
  SOUTHWESTERN: require("@/assets/styles/southwestern.png"),
};

function getStyleImage(code: string): ImageSource | null {
  return STYLE_IMAGES[code] ?? null;
}

export default function StyleScreen() {
  const { t } = useTranslation();
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
      <View style={{ flex: 1, backgroundColor: "#131313" }}>
        {/* Modal Header — X left, title centered */}
        <View
          style={{
            height: 64,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(77,70,60,0.15)",
          }}
        >
          <Pressable
            onPress={() => setRoomPickerVisible(false)}
            hitSlop={12}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.08)",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <Ionicons name="close" size={18} color="#E5E2E1" />
          </Pressable>
          <Text
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 22,
              fontWeight: "700",
              color: "#E5E2E1",
              fontFamily: "NotoSerif",
            }}
          >
            {t("studio.select_space")}
          </Text>
        </View>

        <FlatList
          data={groupedRoomTypes}
          keyExtractor={g => g.category}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: group }) => (
            <View style={{ marginTop: 28 }}>
              {/* Category header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 24,
                  marginBottom: 16,
                  gap: 8,
                }}
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
              {group.items.map((room, idx) => {
                const isSelected = roomType?.code === room.code;
                return (
                  <View key={room.id}>
                    <Pressable
                      onPress={() => {
                        setRoomType(room);
                        setRoomPickerVisible(false);
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 24,
                          paddingVertical: 20,
                          backgroundColor: isSelected
                            ? "rgba(224,194,154,0.06)"
                            : "transparent",
                        }}
                      >
                        {/* Circular icon */}
                        <View
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 32,
                            backgroundColor: isSelected
                              ? "rgba(224,194,154,0.15)"
                              : "rgba(255,255,255,0.06)",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Ionicons
                            name={getRoomIcon(room.code)}
                            size={26}
                            color={isSelected ? "#E1C39B" : "#998F84"}
                          />
                        </View>
                        {/* Name & description */}
                        <View
                          style={{
                            flex: 1,
                            marginLeft: 20,
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 18,
                              fontWeight: "700",
                              color: isSelected ? "#E1C39B" : "#E5E2E1",
                              fontFamily: "NotoSerif",
                            }}
                          >
                            {room.name}
                          </Text>
                          {room.description ? (
                            <Text
                              style={{
                                fontSize: 14,
                                color: "#7A7268",
                                marginTop: 4,
                                lineHeight: 20,
                              }}
                              numberOfLines={2}
                            >
                              {room.description}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#E1C39B"
                            style={{ flexShrink: 0, marginLeft: 12 }}
                          />
                        )}
                      </View>
                    </Pressable>
                    {/* Separator */}
                    {idx < group.items.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          marginLeft: 24,
                          marginRight: 24,
                          backgroundColor: "rgba(255,255,255,0.06)",
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          )}
        />
      </View>
    </Modal>
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#131313" }}
    >
      {/* App Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingVertical: 16,
        }}
      >
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
          style={{ display: "none" }}
        >
          {""}
        </Text>
        <Brand variant="inline" size="sm" tone="gold" />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: BOTTOM_BAR_SCROLL_PADDING(true) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator & Headline */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
          <Text
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: "500",
              color: "#998F84",
              marginBottom: 8,
            }}
          >
            {t("studio.step_2_of_4")}
          </Text>
          <Text
            style={{
              fontSize: 30,
              lineHeight: 34,
              fontWeight: "700",
              color: "#E5E2E1",
              fontFamily: "NotoSerif",
            }}
          >
            {t("studio.step2_title")}
          </Text>
        </View>

        {isLoading ? (
          <View style={{ marginTop: 64, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#C4A882" />
            <Text
              style={{
                marginTop: 16,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#998F84",
              }}
            >
              {t("studio.loading_catalog")}
            </Text>
          </View>
        ) : (
          <>
            {/* ── Room Type Select Box ── */}
            <View style={{ marginTop: 32, paddingHorizontal: 24 }}>
              <Text
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 12,
                  fontWeight: "500",
                  color: "#998F84",
                }}
              >
                {t("studio.room_type")}
              </Text>
              <Pressable onPress={() => setRoomPickerVisible(true)}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: roomType
                      ? "rgba(42,42,42,0.6)"
                      : "rgba(28,27,27,0.8)",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: roomType
                      ? "rgba(224,194,154,0.4)"
                      : "rgba(224,194,154,0.15)",
                    paddingHorizontal: 16,
                    height: 56,
                  }}
                >
                  {roomType && (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "rgba(224,194,154,0.12)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name={getRoomIcon(roomType.code)}
                        size={16}
                        color="#E1C39B"
                      />
                    </View>
                  )}
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: "600",
                      letterSpacing: roomType ? 1 : 0,
                      textTransform: roomType ? "uppercase" : "none",
                      color: roomType ? "#E1C39B" : "#998F84",
                    }}
                    numberOfLines={1}
                  >
                    {roomType
                      ? roomType.name
                      : t("studio.select_room_placeholder")}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={roomType ? "#E1C39B" : "#E0C29A"}
                  />
                </View>
              </Pressable>
            </View>

            {/* ── Design Style Section ── */}
            <View style={{ marginTop: 36, paddingHorizontal: 24 }}>
              <Text
                style={{
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 20,
                  fontWeight: "500",
                  color: "#998F84",
                }}
              >
                {t("studio.design_style")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: CARD_GAP,
                }}
              >
                {designStyles.map(style => {
                  const isSelected = designStyle?.code === style.code;
                  const iconName = getStyleIcon(style.code);
                  const localImage = getStyleImage(style.code);
                  const imageSource = localImage
                    ? localImage
                    : style.previewUrl
                      ? { uri: style.previewUrl }
                      : null;
                  return (
                    <Pressable
                      key={style.id}
                      onPress={() => setDesignStyle(style)}
                    >
                      <View style={{ width: CARD_WIDTH, marginBottom: 4 }}>
                        {/* Image Card */}
                        <View
                          style={{
                            width: CARD_WIDTH,
                            height: CARD_WIDTH * 1.15,
                            borderRadius: 16,
                            overflow: "hidden",
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected
                              ? "#E1C39B"
                              : "rgba(77,70,60,0.2)",
                            backgroundColor: "#1E1E1E",
                          }}
                        >
                          {imageSource ? (
                            <Image
                              source={imageSource}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="cover"
                              transition={200}
                            />
                          ) : (
                            <View
                              style={{
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#2A2A2A",
                              }}
                            >
                              <Ionicons
                                name={iconName}
                                size={40}
                                color={isSelected ? "#E1C39B" : "#998F84"}
                              />
                            </View>
                          )}
                          {/* SELECTED badge */}
                          {isSelected && (
                            <View
                              style={{
                                position: "absolute",
                                top: 10,
                                left: 10,
                                backgroundColor: "rgba(30,28,26,0.85)",
                                borderRadius: 6,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderWidth: 1,
                                borderColor: "rgba(224,194,154,0.3)",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: "800",
                                  letterSpacing: 1.2,
                                  color: "#E1C39B",
                                  textTransform: "uppercase",
                                }}
                              >
                                {t("common.selected")}
                              </Text>
                            </View>
                          )}
                        </View>
                        {/* Name below card */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: 10,
                            paddingHorizontal: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: isSelected ? "#E5E2E1" : "#E5E2E1",
                              flex: 1,
                            }}
                            numberOfLines={1}
                          >
                            {style.name}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color="#E1C39B"
                              style={{ marginLeft: 6 }}
                            />
                          )}
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

      {/* Floating CTA — tab-bar-aware via BottomBar */}
      <BottomBar overTabBar>
        <PrimaryButton
          label={t("common.next_step")}
          onPress={handleNext}
          disabled={!canProceed}
        />
      </BottomBar>
    </SafeAreaView>
  );
}
