import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const HISTORY_ITEMS = [
  {
    id: "job_001",
    title: "Minimalist Living Room",
    renderId: "RND-7842",
    credits: 12,
    status: "COMPLETED",
    date: "Mar 15, 2026",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDmhrChn0V46xJrwuXBS5-aI_ekS8ydYY7OWTeESQduqEFtOj_YzzvJHePUIRdoV37vZX_98VLe_JjA0AcOWLP2HnQNEnmR9gVuJss9b4xYN8Y8Jhnp7YXh3JjsO1m_st2oJdAobjYwVSy5HEj-zeTI7criZFThsDGZs8dUgthBbGs0EjeOk_9nuKxSb2HsIayLXRilb-EbhHVuC48BQIX6ItRT9JTwddHOLtnGhWP3k09KJUYiFZ8IdvScHWHSfl1_HOOl_qVNb6xi",
  },
  {
    id: "job_002",
    title: "Japandi Bedroom Suite",
    renderId: "RND-6219",
    credits: 8,
    status: "COMPLETED",
    date: "Mar 12, 2026",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCrpY0agxFgU99gCnV6QlzzHkz1_BBJAXNoTyRh3z__PYZ_jOcwedvwiUPkar1WudTyLyRIuuIiTxTPo6uRS8ptvAqIbBF9Humm7780leC6fb8pVQiTC6hiHlFvH4_VwAK9-Em2vEYOM_DiPuVsnPZ3lr6iL1j4I1DkHUzCIviHVIrupHBGK5C0FriQJMHSydLUdBwI_t7ZvM4qkN9CscL5H6X7ZpSGUTs2qPcmlprLb-juJaU37059WPzoB6XrqDLF4zsaablDMYpw",
  },
  {
    id: "job_003",
    title: "Industrial Kitchen Concept",
    renderId: "RND-5037",
    credits: 15,
    status: "COMPLETED",
    date: "Mar 8, 2026",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDDTjvEr_YzJg3gkETUYhlg3zq7Y-xvcmfiRQ3B7kd20kNZcx6jHMxANbpQdJC3ZwvGnEH8yeUTIpiUsnLpQswvrMWCWepxNI4JrsIhFPftODOD4sUXSo3Ry9yGzai2T652Jc6t8qsFQAnhdCbsSwlkVHaEgfDIwO6G29Ru5PbCpg8TlVmTtDXKTRUl1MlQ5Yachbq1faR2iGe7rHDn71ud7Do2hSpT1NX4npX-16urd9e8svYWSB20NQoPrtQi0_cOc4f43V1cWF01",
  },
];

function HistoryCard({
  item,
  variant,
}: {
  item: (typeof HISTORY_ITEMS)[0];
  variant: "high" | "low";
}) {
  const bg =
    variant === "high"
      ? "bg-surface-container-high"
      : "bg-surface-container-low";

  return (
    <Pressable
      onPress={() => router.push(`/result/${item.id}`)}
      className={`${bg} rounded-xl p-6`}
    >
      <View className="flex-row gap-4">
        <Image
          source={{ uri: item.image }}
          className="w-24 h-24 rounded-xl"
          contentFit="cover"
        />
        <View className="flex-1 justify-center gap-2">
          <View className="flex-row">
            <View className="bg-primary/20 rounded-full px-3 py-1">
              <Text className="text-primary font-label text-[10px] tracking-widest uppercase">
                {item.status}
              </Text>
            </View>
          </View>
          <Text className="text-on-surface font-headline text-base">
            {item.title}
          </Text>
          <Text className="text-on-surface-variant font-label text-xs">
            {item.renderId} · {item.credits} credits
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-outline-variant/30">
        <Text className="text-on-surface-variant font-label text-xs">
          {item.date}
        </Text>
        <Pressable
          onPress={() => router.push(`/result/${item.id}`)}
          hitSlop={12}
        >
          <Ionicons name="open-outline" size={18} color="#E1C39B" />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView className="flex-1 px-8" showsVerticalScrollIndicator={false}>
        <View className="pt-6 pb-2">
          <Text className="text-on-surface font-headline text-[3.5rem] tracking-tighter leading-none">
            History
          </Text>
          <Text className="text-on-surface-variant font-label text-label-sm uppercase tracking-widest mt-2">
            Archived Visual Narratives
          </Text>
        </View>

        <View className="gap-8 mt-6 pb-32">
          {HISTORY_ITEMS.map((item, index) => (
            <HistoryCard
              key={item.id}
              item={item}
              variant={index === 0 ? "high" : "low"}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
