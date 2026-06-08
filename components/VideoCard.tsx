import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useReportingStore } from "@/store/reportingStore";
import { VideoItem } from "@/types/media";
import { useColors } from "@/hooks/useColors";

interface VideoCardProps {
  item: VideoItem;
  width: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoCard({ item, width }: VideoCardProps) {
  const router = useRouter();
  const colors = useColors();
  const isFavorite = useFavoritesStore((s) => s.isFavorite(item.id));
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const reportItem = useReportingStore((s) => s.reportItem);

  const aspectRatio = item.width && item.height ? item.width / item.height : 16 / 9;
  const cardHeight = Math.round(width / Math.max(aspectRatio, 0.1));
  const clampedHeight = Math.min(Math.max(cardHeight, 100), Math.round(width * (16 / 9)));

  const handleReport = () => {
    Alert.alert(
      "إبلاغ عن محتوى",
      "هل تريد الإبلاغ عن هذا الفيديو وإخفائه؟ سيتم مراجعة بلاغك من قبل فريقنا.",
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
      console.error("[AdMob] Error showing interstitial on video transition:", err);
    }
    router.push({
      pathname: "/video/[id]",
      params: { id: item.id, data: JSON.stringify(item) },
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, { borderRadius: colors.radius, overflow: "hidden" }]}
      onPress={handlePress}
    >
      <Image
        source={{ uri: item.thumbnailUrl }}
        style={{ width, height: clampedHeight }}
        contentFit="cover"
        transition={300}
      />
      <View style={styles.overlay}>
        <View style={styles.playBtn}>
          <Feather name="play" size={14} color="#fff" />
        </View>
        <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
      </View>
      <TouchableOpacity
        style={styles.favoriteBtn}
        onPress={(e) => {
          e.stopPropagation();
          isFavorite ? removeFavorite(item.id) : addFavorite(item);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="heart" size={15} color={isFavorite ? "#EF4444" : "#fff"} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.reportBtn}
        onPress={(e) => {
          e.stopPropagation();
          handleReport();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="flag" size={13} color="#fff" />
      </TouchableOpacity>
      <View style={[styles.footer, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.creator, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.creator.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 0, backgroundColor: "#000" },
  overlay: {
    position: "absolute",
    top: 6,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  playBtn: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    padding: 4,
  },
  duration: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  favoriteBtn: {
    position: "absolute",
    top: 6,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    padding: 5,
  },
  reportBtn: {
    position: "absolute",
    top: 6,
    right: 42,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    padding: 5,
  },
  footer: { padding: 8 },
  title: { fontSize: 13, fontWeight: "500" },
  creator: { fontSize: 11, marginTop: 2 },
});
