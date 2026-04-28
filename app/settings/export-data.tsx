import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { downloadDataExport } from "@/services/user";

type Phase = "idle" | "downloading" | "done";

export default function ExportDataScreen() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setError("");
    setPhase("downloading");
    try {
      const fileUri = await downloadDataExport();
      setPhase("done");

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/zip",
          dialogTitle: t("settings.export_data_title"),
          UTI: "public.zip-archive",
        });
      } else {
        Alert.alert(t("settings.export_data_success_toast"), fileUri);
      }
    } catch (e: any) {
      setPhase("idle");
      if (e?.status === 429) {
        setError(t("settings.export_data_rate_limited"));
      } else {
        setError(t("settings.export_data_fail"));
      }
    }
  };

  const buttonLabel =
    phase === "downloading"
      ? t("settings.export_data_button_downloading")
      : t("settings.export_data_button_idle");

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="px-8 pt-6 pb-4">
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#E5E2E1" />
          </Pressable>
          <Text className="font-headline text-lg text-on-surface">
            {t("settings.export_data_title")}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-8 pb-32"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-headline text-4xl text-on-surface tracking-tight mt-2">
          {t("settings.export_data_title")}
        </Text>
        <View className="mt-4 w-16 h-1 rounded-full bg-primary" />

        <Text className="font-body text-sm text-on-surface-variant mt-6 leading-5">
          {t("settings.export_data_description")}
        </Text>

        <Text className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-on-surface-variant mt-8">
          {t("settings.export_data_throttle_hint")}
        </Text>

        {error ? (
          <Text className="mt-4 font-body text-sm text-red-400">{error}</Text>
        ) : null}

        <View className="mt-10">
          <PrimaryButton
            label={buttonLabel}
            onPress={handleDownload}
            loading={phase === "downloading"}
            disabled={phase === "downloading"}
            icon="download"
          />
        </View>

        {phase === "done" ? (
          <Text className="mt-6 font-body text-sm text-on-surface-variant">
            {t("settings.export_data_success_toast")}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
