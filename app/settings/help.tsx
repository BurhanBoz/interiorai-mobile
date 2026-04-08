import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
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
      "All generated designs are licensed for personal and commercial use under your active subscription. You retain full rights to download, share, and use your generated interiors in client presentations, portfolios, and marketing materials. Attribution is appreciated but not required.",
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
      className="bg-surface-container-high rounded-xl p-5"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-headline text-base text-on-surface flex-1 mr-3">
          {question}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color="#E1C39B"
        />
      </View>
      {open && (
        <Text className="font-body text-sm text-on-surface-variant leading-6 mt-4">
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
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-8 pb-32"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <View className="pt-6 pb-2">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#E5E2E1" />
          </Pressable>
        </View>

        {/* Massive Headline */}
        <Text className="font-headline text-4xl text-on-surface tracking-tight mt-4">
          Help & Support
        </Text>
        <View className="mt-4 w-16 h-1 rounded-full bg-primary" />
        <Text className="font-body text-sm text-on-surface-variant mt-4">
          Find answers, get in touch, or browse our curated knowledge base.
        </Text>

        {/* Search Bar */}
        <View className="bg-surface-container-high rounded-xl flex-row items-center px-4 mt-8">
          <Ionicons name="search" size={20} color="#5E5C5B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search for answers…"
            placeholderTextColor="#5E5C5B"
            className="flex-1 font-body text-sm text-on-surface py-4 ml-3"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#5E5C5B" />
            </Pressable>
          )}
        </View>

        {/* FAQ Section */}
        <Text className="font-headline text-lg text-on-surface mt-10 mb-4">
          Frequently Asked
        </Text>
        <View className="gap-3">
          {filtered.map((item, idx) => (
            <AccordionItem
              key={idx}
              question={item.question}
              answer={item.answer}
              defaultOpen={item.defaultOpen}
            />
          ))}
          {filtered.length === 0 && (
            <Text className="font-body text-sm text-on-surface-variant text-center py-8">
              No results found for "{search}"
            </Text>
          )}
        </View>

        {/* Contact Section */}
        <View className="bg-surface-container-low rounded-xl p-6 mt-10">
          <Text className="font-headline text-xl text-on-surface mb-2">
            Still curious?
          </Text>
          <Text className="font-body text-sm text-on-surface-variant mb-5 leading-5">
            Our support curators are available to assist with any questions
            about your designs, account, or subscription.
          </Text>
          <Pressable>
            <LinearGradient
              colors={["#C4A882", "#A68E6B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-12 rounded-xl items-center justify-center"
            >
              <Text className="font-body text-on-primary font-semibold text-sm uppercase tracking-widest">
                Contact Us
              </Text>
            </LinearGradient>
          </Pressable>
          <Text className="font-body text-xs text-on-surface-variant text-center mt-4">
            support@architecturallens.com
          </Text>
        </View>

        {/* Version Footer */}
        <View className="mt-10 items-center">
          <Text className="font-body text-xs text-on-surface-variant">
            Version 2.4.0 — The Silent Curator
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
