import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

const FILTERS = [
  "All Interiors",
  "Minimalist",
  "Modernist",
  "Brutalist",
] as const;

interface GalleryItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  type: "hero" | "card" | "wide";
}

const GALLERY_DATA: GalleryItem[] = [
  {
    id: "g1",
    title: "The Obsidian Atrium",
    subtitle: "Tokyo, Japan",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAUZ4bOo8YBJtdXOAFGEntiFlA728GfLMBX1OvCH-sWaNsJATSLXL_gbOWvNBmCEdWAjlbVwRoemNil9iRbuTf0Ct4bxJAuxzEZT1QyWW3da67VzlYrdgy5bnL8D1HXxd14a0clqs33VzbW2DL33LCdqy7t4nPvoW92Cz6CYO9s6LMxyjAb9f5qQAt0S8s6dc-Xy46cTMjheThU6ICz2gtM9jXDX1qkLumvnV_7c8mNtHolAnl22Psb3pprTyy2JYMTe4jwEqOg5dAk",
    type: "hero",
  },
  {
    id: "g2",
    title: "Wabi-Sabi Living",
    subtitle: "Kyoto Residence",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuByLaEbrctwBOj5WcOTj2Nhs59Mdbvr7UpAgzu8j6e3-L18PvG8-JjVNCTbiPlSe627eDlaHQQ7MU9yDlRX8H3fX8p7XbOu82wHCg6sVwyjKKzBM9Cd9MlSWRwGaNBNBJth6wsvMRCAFccsC9dqn78aJS67PhvbJpUDwWirbXaCWWg7ZSD4RDsjSWsZZ8QHUlSfASQj71SmgV7znD0GcvdlrS2yrV_F8b6NCuK3aI1HLnnuCeoHhWKWaCr_fsDdohe6gvBmEmQAgzwc",
    type: "card",
  },
  {
    id: "g3",
    title: "Concrete Sanctuary",
    subtitle: "Berlin Loft",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuACiA_aPtfWiSKblX7MOA01iC0ANZHnJb15HmHqZZucRhH40oDa-EX7T1DBc5Uk-__bNrzTSU2UOFbZeX9Eur-tmKSKluPdMkTIytLCbIvv18tAFpBeX7ZP592qls3sdDmPQyyLKrINrtz-ZjOg8T_f97appmjv0unhIwkTmwuz-_M4IfcY_zs1Alw-NahkA39LpMwYcmfhByy-Pq-MGPhK0-G1lvPDg2QNPZyq1uOgy32B77W5Adb6_G2WxO6l5H1QyRKw0BRS_nJ_",
    type: "card",
  },
  {
    id: "g4",
    title: "The Silent Architecture Series",
    subtitle: "12 Designs · Curated Collection",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAUZ4bOo8YBJtdXOAFGEntiFlA728GfLMBX1OvCH-sWaNsJATSLXL_gbOWvNBmCEdWAjlbVwRoemNil9iRbuTf0Ct4bxJAuxzEZT1QyWW3da67VzlYrdgy5bnL8D1HXxd14a0clqs33VzbW2DL33LCdqy7t4nPvoW92Cz6CYO9s6LMxyjAb9f5qQAt0S8s6dc-Xy46cTMjheThU6ICz2gtM9jXDX1qkLumvnV_7c8mNtHolAnl22Psb3pprTyy2JYMTe4jwEqOg5dAk",
    type: "wide",
  },
  {
    id: "g5",
    title: "Floating Pavilion",
    subtitle: "Lake Como, Italy",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuByLaEbrctwBOj5WcOTj2Nhs59Mdbvr7UpAgzu8j6e3-L18PvG8-JjVNCTbiPlSe627eDlaHQQ7MU9yDlRX8H3fX8p7XbOu82wHCg6sVwyjKKzBM9Cd9MlSWRwGaNBNBJth6wsvMRCAFccsC9dqn78aJS67PhvbJpUDwWirbXaCWWg7ZSD4RDsjSWsZZ8QHUlSfASQj71SmgV7znD0GcvdlrS2yrV_F8b6NCuK3aI1HLnnuCeoHhWKWaCr_fsDdohe6gvBmEmQAgzwc",
    type: "card",
  },
  {
    id: "g6",
    title: "Void Chamber",
    subtitle: "São Paulo Studio",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuACiA_aPtfWiSKblX7MOA01iC0ANZHnJb15HmHqZZucRhH40oDa-EX7T1DBc5Uk-__bNrzTSU2UOFbZeX9Eur-tmKSKluPdMkTIytLCbIvv18tAFpBeX7ZP592qls3sdDmPQyyLKrINrtz-ZjOg8T_f97appmjv0unhIwkTmwuz-_M4IfcY_zs1Alw-NahkA39LpMwYcmfhByy-Pq-MGPhK0-G1lvPDg2QNPZyq1uOgy32B77W5Adb6_G2WxO6l5H1QyRKw0BRS_nJ_",
    type: "card",
  },
];

function HeroCard({
  item,
  onPress,
}: {
  item: GalleryItem;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mb-4">
      <Image
        source={{ uri: item.imageUrl }}
        className="w-full rounded-xl"
        style={{ aspectRatio: 16 / 9 }}
        contentFit="cover"
        transition={300}
      />
      <Text className="text-on-surface font-headline text-lg mt-3">
        {item.title}
      </Text>
      {item.subtitle && (
        <Text className="text-on-surface-variant font-label text-xs mt-1">
          {item.subtitle}
        </Text>
      )}
    </Pressable>
  );
}

function GalleryCard({
  item,
  onPress,
}: {
  item: GalleryItem;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-1 mb-4">
      <Image
        source={{ uri: item.imageUrl }}
        className="w-full rounded-xl"
        style={{ aspectRatio: 4 / 5 }}
        contentFit="cover"
        transition={300}
      />
      <Text className="text-on-surface font-body text-sm font-medium mt-2">
        {item.title}
      </Text>
      {item.subtitle && (
        <Text className="text-on-surface-variant font-label text-xs mt-0.5">
          {item.subtitle}
        </Text>
      )}
    </Pressable>
  );
}

function WideCard({
  item,
  onPress,
}: {
  item: GalleryItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-container-low rounded-xl p-4 flex-row items-center mb-4"
    >
      <Image
        source={{ uri: item.imageUrl }}
        className="w-20 h-20 rounded-xl"
        contentFit="cover"
        transition={300}
      />
      <View className="flex-1 ml-4">
        <Text className="text-on-surface font-body text-sm font-medium">
          {item.title}
        </Text>
        {item.subtitle && (
          <Text className="text-on-surface-variant font-label text-xs mt-1">
            {item.subtitle}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#998F84" />
    </Pressable>
  );
}

export default function GalleryScreen() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All Interiors");

  const filtered = GALLERY_DATA.filter(item => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      activeFilter === "All Interiors" ||
      item.title.toLowerCase().includes(activeFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const handleItemPress = (id: string) => {
    router.push(`/result/${id}`);
  };

  // Separate items by type for bento layout
  const heroItems = filtered.filter(i => i.type === "hero");
  const cardItems = filtered.filter(i => i.type === "card");
  const wideItems = filtered.filter(i => i.type === "wide");

  // Build card pairs for 2-col grid
  const cardPairs: GalleryItem[][] = [];
  for (let i = 0; i < cardItems.length; i += 2) {
    cardPairs.push(cardItems.slice(i, i + 2));
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-8 pt-4 pb-8">
          {/* Title Section */}
          <Text className="text-on-surface-variant font-label text-label-sm tracking-widest uppercase mb-2">
            CURATION 01
          </Text>
          <Text className="text-on-surface font-headline text-[3.5rem] leading-none tracking-tight">
            Gallery
          </Text>
          <View className="w-12 h-0.5 bg-primary mt-3 mb-6" />

          {/* Search Bar */}
          <View className="bg-surface-container-low rounded-xl flex-row items-center px-4 py-3 mb-5">
            <Ionicons name="search-outline" size={20} color="#998F84" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search designs..."
              placeholderTextColor="#998F84"
              className="flex-1 ml-3 text-on-surface font-body text-sm"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#998F84" />
              </Pressable>
            )}
          </View>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-6"
          >
            {FILTERS.map(filter => (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-xl mr-2 ${
                  activeFilter === filter
                    ? "bg-primary"
                    : "bg-surface-container-high"
                }`}
              >
                <Text
                  className={`text-sm font-body ${
                    activeFilter === filter
                      ? "text-on-primary font-medium"
                      : "text-on-surface"
                  }`}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Bento Grid */}
          {heroItems.map(item => (
            <HeroCard
              key={item.id}
              item={item}
              onPress={() => handleItemPress(item.id)}
            />
          ))}

          {cardPairs.length > 0 && (
            <View className="flex-row gap-3 mb-0">
              {cardPairs[0].map(item => (
                <GalleryCard
                  key={item.id}
                  item={item}
                  onPress={() => handleItemPress(item.id)}
                />
              ))}
            </View>
          )}

          {wideItems.map(item => (
            <WideCard
              key={item.id}
              item={item}
              onPress={() => handleItemPress(item.id)}
            />
          ))}

          {cardPairs.slice(1).map((pair, idx) => (
            <View key={idx} className="flex-row gap-3 mb-0">
              {pair.map(item => (
                <GalleryCard
                  key={item.id}
                  item={item}
                  onPress={() => handleItemPress(item.id)}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
