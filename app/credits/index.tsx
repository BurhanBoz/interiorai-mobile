import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { useCreditStore } from "@/stores/creditStore";
import * as creditsService from "@/services/credits";
import * as promoService from "@/services/promo";
import type { CreditLedgerEntry } from "@/types/api";

const REFERENCE_GUIDE = [
  { label: "Conceptual Sketch", cost: "1 Credit" },
  { label: "High-Fidelity Render", cost: "5 Credits" },
  { label: "3D Structural Analysis", cost: "12 Credits" },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
}

/* ─────────────────── Ledger Row ─────────────────── */
function LedgerRow({ item }: { item: CreditLedgerEntry }) {
  const isPositive = item.amount > 0;
  return (
    <Pressable
      onPress={() => {
        if (item.jobId) router.push(`/result/${item.jobId}`);
      }}
      className="flex-row items-center"
      style={{ marginBottom: 32 }}
    >
      {/* Thumbnail */}
      <View
        className="rounded-lg overflow-hidden bg-surface-container-high items-center justify-center"
        style={{ width: 40, height: 40, marginRight: 16 }}
      >
        {item.jobId ? (
          <Image
            source={{ uri: `https://picsum.photos/seed/${item.jobId}/80` }}
            style={{ width: 40, height: 40 }}
            contentFit="cover"
          />
        ) : (
          <Ionicons
            name="wallet-outline"
            size={20}
            color="rgba(224,194,154,0.4)"
          />
        )}
      </View>

      {/* Info */}
      <View className="flex-1" style={{ marginRight: 12 }}>
        <Text
          className="font-label text-secondary"
          style={{
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          {item.reason.split(" ")[0]} • {formatDate(item.createdAt)}
        </Text>
        <Text
          className="font-body text-on-surface"
          style={{ fontSize: 14, fontWeight: "500" }}
          numberOfLines={1}
        >
          {item.reason}
        </Text>
      </View>

      {/* Amount */}
      <Text
        className="font-headline"
        style={{
          fontSize: 16,
          color: isPositive ? "#4ade80" : "#E0C29A",
        }}
      >
        {isPositive ? "+" : ""}
        {item.amount}
      </Text>
    </Pressable>
  );
}

/* ─────────────────── Main Screen ─────────────────── */
export default function CreditsScreen() {
  const balance = useCreditStore(s => s.balance);
  const planCode = useCreditStore(s => s.planCode);
  const fetchBalance = useCreditStore(s => s.fetchBalance);

  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");

  useEffect(() => {
    fetchBalance();
    loadLedger(0);
  }, []);

  const loadLedger = async (p: number) => {
    if (loadingLedger) return;
    setLoadingLedger(true);
    try {
      const data = await creditsService.getLedger(p, 20);
      setLedger(prev => (p === 0 ? data.content : [...prev, ...data.content]));
      setIsLast(data.last);
      setPage(p);
    } catch {
      // silently fail
    } finally {
      setLoadingLedger(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!isLast && !loadingLedger) {
      loadLedger(page + 1);
    }
  }, [isLast, loadingLedger, page]);

  const handleRedeemPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError("");
    setPromoLoading(true);
    try {
      const result = await promoService.redeemPromo(promoCode.trim());
      Alert.alert("Promo Applied!", result.message);
      setPromoCode("");
      setPromoExpanded(false);
      fetchBalance();
      loadLedger(0);
    } catch (e: any) {
      setPromoError(
        e?.response?.data?.message ?? "Failed to redeem promo code.",
      );
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {/* ── Top App Bar ── */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ height: 56 }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#C4A882" />
        </Pressable>
        <Text
          className="font-headline text-on-surface"
          style={{
            fontSize: 14,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          The Architectural Lens
        </Text>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(77,70,60,0.20)",
          }}
        >
          <Image
            source={{ uri: "https://i.pravatar.cc/40?img=12" }}
            style={{ width: 32, height: 32 }}
            contentFit="cover"
          />
        </View>
      </View>

      <FlatList
        data={ledger}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <LedgerRow item={item} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* ── Hero Balance Section ── */}
            <View
              className="items-center"
              style={{ paddingTop: 32, paddingBottom: 32 }}
            >
              <Text
                className="font-label text-secondary"
                style={{
                  fontSize: 11,
                  fontWeight: "500",
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Available Balance
              </Text>
              <Text
                className="font-headline text-on-surface"
                style={{ fontSize: 72, lineHeight: 80, marginBottom: 16 }}
              >
                {balance}
              </Text>
              <Text
                className="font-body text-on-surface-variant"
                style={{ fontSize: 14, fontWeight: "300", fontStyle: "italic" }}
              >
                Credits remain in your Studio vault.
              </Text>
            </View>

            {/* ── Upgrade Banner ── */}
            <Pressable
              onPress={() => router.push("/plans")}
              style={{ marginBottom: 48 }}
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
                  Upgrade for More Credits
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#3F2D11" />
              </LinearGradient>
            </Pressable>

            {/* ── Reference Guide ── */}
            <View
              className="bg-surface-container-low rounded-xl"
              style={{ padding: 24, marginBottom: 48 }}
            >
              <Text
                className="font-label text-secondary"
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  marginBottom: 24,
                }}
              >
                Reference Guide
              </Text>
              {REFERENCE_GUIDE.map((item, i) => (
                <View key={item.label}>
                  <View
                    className="flex-row items-center justify-between"
                    style={{ paddingVertical: 8 }}
                  >
                    <Text
                      className="font-body text-on-surface"
                      style={{ fontSize: 14, fontWeight: "500" }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      className="font-headline text-secondary"
                      style={{ fontSize: 14 }}
                    >
                      {item.cost}
                    </Text>
                  </View>
                  {i < REFERENCE_GUIDE.length - 1 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "rgba(77,70,60,0.20)",
                        marginVertical: 8,
                      }}
                    />
                  )}
                </View>
              ))}
            </View>

            {/* ── Next Cycle & Progress ── */}
            <View
              className="bg-surface-container-low rounded-xl"
              style={{ padding: 24, marginBottom: 48 }}
            >
              <View style={{ marginBottom: 24 }}>
                <Text
                  className="font-label text-secondary"
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Next Cycle
                </Text>
                <Text
                  className="font-body text-on-surface-variant"
                  style={{ fontSize: 14 }}
                >
                  Your balance will reset on{" "}
                  <Text
                    className="text-on-surface"
                    style={{ fontWeight: "500" }}
                  >
                    November 1, 2024.
                  </Text>
                </Text>
              </View>

              {/* Progress bar */}
              <View
                className="bg-surface-container-highest rounded-full overflow-hidden"
                style={{ height: 8, marginBottom: 12 }}
              >
                <LinearGradient
                  colors={["#C4A882", "#A68A62"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: "60%", height: "100%", borderRadius: 9999 }}
                />
              </View>
              <View className="items-end">
                <Text
                  className="font-label text-secondary"
                  style={{
                    fontSize: 11,
                    fontWeight: "500",
                    letterSpacing: 3,
                    textTransform: "uppercase",
                  }}
                >
                  18 Days Remaining
                </Text>
              </View>
            </View>

            {/* ── Monthly Usage Header ── */}
            <Text
              className="font-label text-secondary"
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 24,
              }}
            >
              Monthly Usage
            </Text>
          </View>
        }
        ListEmptyComponent={
          !loadingLedger ? (
            <Text
              className="font-body text-on-surface-variant text-center"
              style={{ fontSize: 14, marginTop: 32 }}
            >
              No credit transactions yet.
            </Text>
          ) : null
        }
        ListFooterComponent={
          <View>
            {loadingLedger && (
              <ActivityIndicator
                color="#E0C29A"
                style={{ marginVertical: 16 }}
              />
            )}

            {/* ── Promo Code Section ── */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "rgba(77,70,60,0.20)",
                paddingTop: 32,
                marginTop: 16,
              }}
            >
              <Pressable
                onPress={() => setPromoExpanded(!promoExpanded)}
                className="flex-row items-center justify-between"
                style={{ marginBottom: promoExpanded ? 24 : 0 }}
              >
                <Text
                  className="font-label text-secondary"
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 3,
                    textTransform: "uppercase",
                  }}
                >
                  Promotional Code
                </Text>
                <Ionicons
                  name={promoExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#E0C29A"
                />
              </Pressable>

              {promoExpanded && (
                <View className="flex-row" style={{ gap: 12 }}>
                  <TextInput
                    value={promoCode}
                    onChangeText={setPromoCode}
                    placeholder="ENTER CODE"
                    placeholderTextColor="rgba(209,197,184,0.4)"
                    autoCapitalize="characters"
                    editable={!promoLoading}
                    className="flex-1 bg-surface-container-high rounded-lg text-on-surface"
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 14,
                      letterSpacing: 3,
                    }}
                  />
                  <Pressable
                    onPress={handleRedeemPromo}
                    disabled={promoLoading}
                    style={{
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#C4A882",
                      justifyContent: "center",
                      alignItems: "center",
                      opacity: promoLoading ? 0.5 : 1,
                    }}
                  >
                    {promoLoading ? (
                      <ActivityIndicator color="#C4A882" size="small" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#C4A882",
                          letterSpacing: 3,
                          textTransform: "uppercase",
                        }}
                      >
                        Redeem
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}

              {promoError !== "" && (
                <Text
                  className="font-body"
                  style={{
                    fontSize: 12,
                    color: "#ffb4ab",
                    marginTop: 8,
                  }}
                >
                  {promoError}
                </Text>
              )}
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}
