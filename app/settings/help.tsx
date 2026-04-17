import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const FAQ_ITEMS = [
  {
    question: "How do credits work?",
    answer:
      "Each generation consumes credits based on the complexity of the style and resolution selected. Standard designs cost 1 credit, while HD upscales and premium styles may cost 2–5 credits. Credits refresh monthly with your plan or can be purchased à la carte.",
  },
  {
    question: "Licensing & Usage",
    answer:
      "All generated architectural perspectives are granted under a studio-exclusive license. This permits professional use in digital portfolios, client presentations, and conceptual proposals. Full commercial redistribution rights are available via our Premium Tier access.",
    defaultOpen: true,
  },
  {
    question: "Collaborative Access",
    answer:
      "Team plans allow up to 5 members to share a single credit pool. Invite collaborators from your profile settings. Each member maintains their own generation history while drawing from the shared balance.",
  },
];

function AccordionItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Pressable
      onPress={() => setOpen(!open)}
      className="bg-surface-container-high rounded-xl p-6"
      style={
        open
          ? { borderWidth: 1, borderColor: "rgba(225,195,155,0.2)" }
          : undefined
      }
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="font-body font-medium flex-1 mr-3"
          style={{ fontSize: 16, color: open ? "#E1C39B" : "#E5E2E1" }}
        >
          {question}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={open ? "#E1C39B" : "#998F84"}
        />
      </View>
      {open && (
        <Text
          className="font-body text-on-surface-variant mt-4"
          style={{ fontSize: 14, lineHeight: 22, fontWeight: "300" }}
        >
          {answer}
        </Text>
      )}
    </Pressable>
  );
}

export default function HelpScreen() {
  const [search, setSearch] = useState("");

  const filtered = FAQ_ITEMS.filter(
    item =>
      !search ||
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* TopAppBar */}
      <View
        className="bg-surface px-6 flex-row items-center justify-between"
        style={{ height: 64 }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center rounded-full"
        >
          <Ionicons name="arrow-back" size={24} color="#C4A882" />
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
          The Architectural Lens
        </Text>
        <View
          className="rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/20"
          style={{ width: 40, height: 40 }}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-32"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View className="mb-12 mt-8">
          <Text
            className="font-headline text-on-background mb-4"
            style={{ fontSize: 56, lineHeight: 62 }}
          >
            Help &{"\n"}Support
          </Text>
          <View
            className="mb-6"
            style={{ width: 96, height: 4, backgroundColor: "#C4A882" }}
          />
          <Text
            className="font-body text-on-surface-variant"
            style={{ fontSize: 14, lineHeight: 22, maxWidth: 320 }}
          >
            Seeking clarity on our architectural process or studio credits?
            Explore our curated guides below.
          </Text>
        </View>

        {/* Search Bar */}
        <View className="mb-12">
          <Text
            className="font-label text-outline mb-3"
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Search Knowledge Base
          </Text>
          <View className="relative">
            <View className="bg-surface-container-low rounded-xl flex-row items-center">
              <Ionicons
                name="search"
                size={20}
                color="#998F84"
                style={{ position: "absolute", left: 16, zIndex: 1 }}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Find answers..."
                placeholderTextColor="rgba(153,143,132,0.5)"
                className="flex-1 font-body text-on-surface"
                style={{
                  fontSize: 14,
                  paddingVertical: 16,
                  paddingLeft: 48,
                  paddingRight: 16,
                }}
              />
              {search.length > 0 && (
                <Pressable
                  onPress={() => setSearch("")}
                  hitSlop={8}
                  style={{ position: "absolute", right: 16 }}
                >
                  <Ionicons name="close-circle" size={18} color="#998F84" />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View className="mb-16">
          <View className="flex-row items-baseline justify-between mb-8">
            <Text
              className="font-headline text-on-background"
              style={{ fontSize: 20 }}
            >
              Frequent Inquiries
            </Text>
            <Text
              className="font-label font-bold"
              style={{
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "#C4A882",
              }}
            >
              View All
            </Text>
          </View>
          <View style={{ gap: 24 }}>
            {filtered.map((item, idx) => (
              <AccordionItem
                key={idx}
                question={item.question}
                answer={item.answer}
                defaultOpen={item.defaultOpen}
              />
            ))}
            {filtered.length === 0 && (
              <Text
                className="font-body text-on-surface-variant text-center py-8"
                style={{ fontSize: 14 }}
              >
                No results found for "{search}"
              </Text>
            )}
          </View>
        </View>

        {/* Contact Section */}
        <View className="bg-surface-container-low rounded-xl p-8 mb-16 items-center">
          <Text
            className="font-headline text-on-background mb-6"
            style={{ fontSize: 20 }}
          >
            Still curious?
          </Text>
          <Pressable
            onPress={() => Linking.openURL("mailto:concierge@archlens.studio")}
            className="w-full mb-6"
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <LinearGradient
              colors={["#C4A882", "#A68A62"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 54,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <Ionicons name="mail-outline" size={18} color="#3F2D11" />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#3F2D11",
                }}
              >
                Contact Us
              </Text>
            </LinearGradient>
          </Pressable>
          <View className="items-center" style={{ gap: 4 }}>
            <Text
              className="font-label text-outline"
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Direct Channel
            </Text>
            <Pressable
              onPress={() =>
                Linking.openURL("mailto:concierge@archlens.studio")
              }
            >
              <Text
                className="font-label font-bold"
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#C4A882",
                }}
              >
                concierge@archlens.studio
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Version Footer */}
        <View className="items-center pb-12">
          <Text
            className="font-label text-center"
            style={{
              fontSize: 10,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#998F84",
              opacity: 0.5,
            }}
          >
            Version 2.4.0 — The Silent Curator
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
