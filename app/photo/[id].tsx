import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useReportingStore } from "@/store/reportingStore";
import { PhotoItem } from "@/types/media";
import { useColors } from "@/hooks/useColors";

import { downloadMediaFile } from "@/utils/download";
import { useToast } from "@/components/Toast";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PhotoDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [zoomed, setZoomed] = useState(false);

  const item: PhotoItem = JSON.parse(data ?? "{}");
  const isFavorite = useFavoritesStore((s) => s.isFavorite(item.id));
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  const aspectRatio = (item.width ?? 1) / Math.max(item.height ?? 1, 1);
  const imgHeight = Math.min(SCREEN_WIDTH / aspectRatio, SCREEN_HEIGHT * 0.65);

  async function handleShare() {
    if (Platform.OS === "web") {
      // For web, open the image in a new tab
      try {
        window.open(item.fullUrl, "_blank");
      } catch (error) {
        console.error("[Share] Web share error:", error);
      }
      return;
    }
    try {
      await Share.share({
        message: `Check out this photo on Pixent: ${item.pageUrl || item.fullUrl}`,
        url: item.pageUrl || item.fullUrl,
      });
    } catch (error) {
      console.error("[Share] Error:", error);
      Alert.alert("فشل المشاركة", "حدث خطأ أثناء المشاركة.");
    }
  }

  const reportContent = useReportingStore((s) => s.reportContent);

  const handleReport = () => {
    Alert.alert(
      "إبلاغ عن محتوى",
      "هل تريد الإبلاغ عن هذا المحتوى وإخفائه؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إبلاغ وإخفاء",
          style: "destructive",
          onPress: () => {
            reportContent(item.id);
            router.back();
          }
        },
      ]
    );
  };

  function handleFavorite() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    if (isFavorite) removeFavorite(item.id);
    else addFavorite(item);
  }

  const { showToast } = useToast();

  async function handleDownload() {
    try {
      showToast("Downloading... 0%", "info", { progress: 0 });
      await downloadMediaFile(item.fullUrl, "pixent_photo", "jpg", (progress) => {
        showToast(`Downloading... ${Math.round(progress)}%`, "info", { progress });
      });
      showToast("Media saved to gallery successfully.", "success");
    } catch (error) {
      console.error("[Download] Error:", error);
      showToast("An error occurred while downloading the file.", "error");
    }
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.secondary }]} onPress={() => router.back()}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: isFavorite ? "#FEE2E2" : colors.secondary }]}
            onPress={handleFavorite}
          >
            <Feather name="heart" size={18} color={isFavorite ? "#EF4444" : colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity activeOpacity={0.95} onPress={() => setZoomed((v) => !v)}>
          <Image
            source={{ uri: item.fullUrl }}
            style={{
              width: SCREEN_WIDTH,
              height: zoomed ? SCREEN_HEIGHT * 0.85 : imgHeight,
            }}
            contentFit={zoomed ? "contain" : "cover"}
            transition={200}
          />
        </TouchableOpacity>

        {/* Actions Row */}
        <View style={[styles.actionRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.actionItem} onPress={handleDownload}>
            <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
              <Feather name="download" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.actionText, { color: colors.foreground }]}>Download</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
            <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
              <Feather name="share-2" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.actionText, { color: colors.foreground }]}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleReport}>
            <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
              <Feather name="flag" size={20} color={colors.destructive} />
            </View>
            <Text style={[styles.actionText, { color: colors.foreground }]}>Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.creatorRow}>
            <View style={[styles.creatorAvatar, { backgroundColor: colors.accent }]}>
              <Feather name="user" size={14} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.creatorName, { color: colors.foreground }]}>{item.creator.name}</Text>
              <Text style={[styles.providerBadge, { color: colors.mutedForeground }]}>
                via {item.provider.charAt(0).toUpperCase() + item.provider.slice(1)}
              </Text>
            </View>
          </View>

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tags}>
              {item.tags.slice(0, 6).map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={[styles.metaItem, { backgroundColor: colors.secondary }]}>
              <Feather name="maximize-2" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {item.width} × {item.height}
              </Text>
            </View>
            {item.avgColor && (
              <View style={[styles.metaItem, { backgroundColor: colors.secondary }]}>
                <View style={[styles.colorDot, { backgroundColor: item.avgColor }]} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.avgColor}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ height: 60 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  actionItem: {
    alignItems: "center",
    gap: 6,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  info: { padding: 20, gap: 16 },
  title: { fontSize: 18, fontWeight: "700", lineHeight: 24 },
  creatorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  creatorAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  creatorName: { fontSize: 14, fontWeight: "600" },
  providerBadge: { fontSize: 12, marginTop: 1 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  tagText: { fontSize: 12 },
  metaRow: { flexDirection: "row", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  metaText: { fontSize: 12 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
});
