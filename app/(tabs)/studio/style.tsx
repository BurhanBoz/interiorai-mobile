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
import { theme } from "@/config/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { catalogName } from "@/utils/catalogI18n";
import { useStudioStore } from "@/stores/studioStore";
import { useCatalogStore } from "@/stores/catalogStore";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Brand } from "@/components/brand/Brand";
import {
  BottomBar,
  BOTTOM_BAR_SCROLL_PADDING,
} from "@/components/layout/BottomBar";
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
  COURTYARD: "apps-outline",
  OUTDOOR_MAJLIS: "people-outline",
  ROOFTOP: "business-outline",
  POOL_AREA: "water-outline",
  FACADE: "home-outline",
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
  LUXURY: require("@/assets/styles/luxury_glam.png"),
};

function getStyleImage(code: string): ImageSource | null {
  return STYLE_IMAGES[code] ?? null;
}

export default function StyleScreen() {
  const { t } = useTranslation();
  const { roomType, designStyle, setRoomType, setDesignStyle, mode } =
    useStudioStore();

  // Catalogue comes from a persisted store (P2-9): the lists only change on
  // deploy, so the screen paints from cache instantly and refreshes in the
  // background instead of holding a spinner in front of every generation.
  const roomTypes = useCatalogStore((s) => s.roomTypes);
  const designStyles = useCatalogStore((s) => s.designStyles);
  const isLoading = useCatalogStore((s) => s.isLoading);
  const ensureCatalogLoaded = useCatalogStore((s) => s.ensureLoaded);
  const [roomPickerVisible, setRoomPickerVisible] = useState(false);

  useEffect(() => {
    void ensureCatalogLoaded();
  }, [ensureCatalogLoaded]);

  // Group room types by category
  const groupedRoomTypes = useMemo(() => {
    const map = new Map<string, CatalogItemResponse[]>();
    for (const r of roomTypes) {
      const cat = r.category || "Other";
      // V52 — OUTDOOR mode lists ONLY outdoor spaces; every other mode hides
      // them (BALCONY moved under the Outdoor card with 1.1).
      if (mode === "OUTDOOR" ? cat !== "OUTDOOR" : cat === "OUTDOOR") continue;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }, [roomTypes, mode]);

  // Required-field feedback (2026-07 tester finding): a silently-disabled
  // CTA reads as "the app is broken". The button always responds — a
  // blocked press marks what's missing (inline error + warning haptic)
  // and scrolls the offending section into view.
  const scrollRef = useRef<ScrollView>(null);
  const styleSectionY = useRef(0);
  const [attempted, setAttempted] = useState(false);

  const handleNext = () => {
    if (!roomType || !designStyle) {
      setAttempted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      scrollRef.current?.scrollTo({
        y: !roomType ? 0 : Math.max(styleSectionY.current - 72, 0),
        animated: true,
      });
      return;
    }
    router.push("/studio/options");
  };

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
            paddingHorizontal: theme.space.gutter,
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
              borderRadius: theme.radius.md,
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
              ...theme.text.headline,
              position: "absolute",
              left: 0,
              right: 0,
              textAlign: "center",
              color: "#E5E2E1",
            }}
          >
            {t("studio.select_space")}
          </Text>
        </View>

        <FlatList
          data={groupedRoomTypes}
          keyExtractor={g => g.category}
          // 60 reserved less than a third of what the floating CTA occupies,
          // so the last style tile sat behind it (founder: "itemler üst üste
          // binmesin"). One shared helper keeps every wizard step honest.
          contentContainerStyle={{ paddingBottom: BOTTOM_BAR_SCROLL_PADDING(true) }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: group }) => (
            <View style={{ marginTop: 28 }}>
              {/* Category header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: theme.space.gutter,
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
                    ...theme.text.caption,
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
                          paddingHorizontal: theme.space.gutter,
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
                              ...theme.text.title,
                              color: isSelected ? "#E1C39B" : "#E5E2E1",
                            }}
                          >
                            {catalogName(t, "room", room)}
                          </Text>
                          {room.description ? (
                            <Text
                              style={{
                                ...theme.text.body,
                                color: "#7A7268",
                                marginTop: 4,
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
          paddingHorizontal: theme.space.gutter,
          paddingVertical: 16,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.lg,
            backgroundColor: "rgba(42,42,42,0.8)",
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#E1C39B" />
        </Pressable>
        <Text style={{ display: "none" }}>{""}</Text>
        <Brand variant="inline" size="sm" tone="gold" />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: BOTTOM_BAR_SCROLL_PADDING(true),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator & Headline */}
        <View style={{ paddingHorizontal: theme.space.gutter, paddingTop: 32 }}>
          <Text
            style={{
              ...theme.text.label,
              color: "#998F84",
              marginBottom: 8,
            }}
          >
            {t("studio.step_2_of_4")}
          </Text>
          <Text
            style={{
              ...theme.text.display,
              color: "#E5E2E1",
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
                ...theme.text.caption,
                marginTop: 16,
                color: "#998F84",
              }}
            >
              {t("studio.loading_catalog")}
            </Text>
          </View>
        ) : (
          <>
            {/* ── Room Type Select Box ── */}
            <View style={{ marginTop: 32, paddingHorizontal: theme.space.gutter }}>
              <Text
                style={{
                  ...theme.text.caption,
                  marginBottom: 12,
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
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    borderColor: roomType
                      ? "rgba(224,194,154,0.4)"
                      : attempted
                        ? "rgba(217,138,123,0.75)"
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
                        borderRadius: theme.radius.sm,
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
                      ...theme.text.caption,
                      flex: 1,
                      color: roomType ? "#E1C39B" : "#998F84",
                    }}
                    numberOfLines={1}
                  >
                    {roomType
                      ? catalogName(t, "room", roomType)
                      : t("studio.select_room_placeholder")}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={roomType ? "#E1C39B" : "#E0C29A"}
                  />
                </View>
              </Pressable>
              {attempted && !roomType && (
                <Text
                  style={{
                    ...theme.text.caption,
                    marginTop: 8,
                    color: "#D98A7B",
                  }}
                >
                  {t("studio.room_type_required")}
                </Text>
              )}
            </View>

            {/* ── Design Style Section ── */}
            <View
              style={{ marginTop: 36, paddingHorizontal: theme.space.gutter }}
              onLayout={(e) => {
                styleSectionY.current = e.nativeEvent.layout.y;
              }}
            >
              <Text
                style={{
                  ...theme.text.caption,
                  marginBottom: 20,
                  color: "#998F84",
                }}
              >
                {t("studio.design_style")}
              </Text>
              {attempted && !designStyle && (
                <Text
                  style={{
                    ...theme.text.caption,
                    marginTop: -12,
                    marginBottom: 16,
                    color: "#D98A7B",
                  }}
                >
                  {t("studio.style_required")}
                </Text>
              )}
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
                            borderRadius: theme.radius.md,
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
                                  ...theme.text.caption,
                                  color: "#E1C39B",
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
                              ...theme.text.body,
                              color: isSelected ? "#E5E2E1" : "#E5E2E1",
                              flex: 1,
                            }}
                            numberOfLines={1}
                          >
                            {catalogName(t, "style", style)}
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
        />
      </BottomBar>
    </SafeAreaView>
  );
}
