import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useReportingStore } from "@/store/reportingStore";
import { PhotoItem } from "@/types/media";
import { useColors } from "@/hooks/useColors";

interface PhotoCardProps {
  item: PhotoItem;
  width: number;
}

export function PhotoCard({ item, width }: PhotoCardProps) {
  const router = useRouter();
  const colors = useColors();
  const isFavorite = useFavoritesStore((s) => s.isFavorite(item.id));
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const reportItem = useReportingStore((s) => s.reportItem);

  const aspectRatio = item.width / Math.max(item.height, 1);
  const cardHeight = Math.round(width / aspectRatio);
  const clampedHeight = Math.min(Math.max(cardHeight, 120), 320);

  const handleReport = () => {
    Alert.alert(
      "إبلاغ عن محتوى",
      "هل تريد الإبلاغ عن هذا المحتوى وإخفائه؟ سيتم مراجعة بلاغك من قبل فريقنا.",
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
      console.error("[AdMob] Error showing interstitial on transition:", err);
    }
    router.push({ pathname: "/photo/[id]", params: { id: item.id, data: JSON.stringify(item) } });
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
        placeholder={{ blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj" }}
        transition={300}
      />
      <TouchableOpacity
        style={styles.favoriteBtn}
        onPress={(e) => {
          e.stopPropagation();
          isFavorite ? removeFavorite(item.id) : addFavorite(item);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather
          name="heart"
          size={16}
          color={isFavorite ? "#EF4444" : "#fff"}
          style={isFavorite ? styles.heartFilled : undefined}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.reportBtn}
        onPress={(e) => {
          e.stopPropagation();
          handleReport();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="flag" size={14} color="#fff" />
      </TouchableOpacity>
      <View style={styles.footer}>
        <Text style={styles.creator} numberOfLines={1}>{item.creator.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 0 },
  favoriteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    padding: 6,
  },
  reportBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    padding: 6,
  },
  heartFilled: { color: "#EF4444" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  creator: { color: "#fff", fontSize: 11, fontWeight: "500" },
});
