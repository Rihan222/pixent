import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useReportingStore } from "@/store/reportingStore";
import { SoundItem } from "@/types/media";
import { useColors } from "@/hooks/useColors";

interface SoundCardProps {
  item: SoundItem;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SoundCard({ item }: SoundCardProps) {
  const router = useRouter();
  const colors = useColors();
  const isFavorite = useFavoritesStore((s) => s.isFavorite(item.id));
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const reportItem = useReportingStore((s) => s.reportItem);

  const handleReport = () => {
    Alert.alert(
      "إبلاغ عن محتوى",
      "هل تريد الإبلاغ عن هذا الملف الصوتي وإخفائه؟ سيتم مراجعة بلاغك من قبل فريقنا.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إبلاغ وإخفاء",
          style: "destructive",
          onPress: () => reportItem(item.id)
        },
      ]
    );
  };

  const handlePress = async () => {
    try {
      const { showInterstitial } = require("@/services/adsManager");
      await showInterstitial();
    } catch (err) {
      console.error("[AdMob] Error showing interstitial on sound transition:", err);
    }
    router.push({ pathname: "/sound/[id]", params: { id: item.id, data: JSON.stringify(item) } });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handlePress}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
        <Feather name="music" size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.creator, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.creator.name} · {formatDuration(item.duration)}
        </Text>
        {item.tags && item.tags.length > 0 && (
          <Text style={[styles.tags, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.tags.slice(0, 4).join(" · ")}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleReport();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.actionBtn}
        >
          <Feather name="flag" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            isFavorite ? removeFavorite(item.id) : addFavorite(item);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.actionBtn}
        >
          <Feather name="heart" size={18} color={isFavorite ? "#EF4444" : colors.mutedForeground} />
        </TouchableOpacity>
        <View style={[styles.playBtn, { backgroundColor: colors.primary }]}>
          <Feather name="play" size={14} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, gap: 12, marginBottom: 8 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontWeight: "600" },
  creator: { fontSize: 12 },
  tags: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionBtn: { padding: 4 },
  playBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
