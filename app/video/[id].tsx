import { Feather } from "@expo/vector-icons";
import { useEvent } from "expo";
import { VideoView, useVideoPlayer } from "expo-video";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Network from 'expo-network';
import React, { useCallback, useEffect, useState } from "react";
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
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useReportingStore } from "@/store/reportingStore";
import { VideoItem } from "@/types/media";
import { useColors } from "@/hooks/useColors";
import { logger } from "@/utils/logger";

import { downloadMediaFile } from "@/utils/download";
import { useToast } from "@/components/Toast";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoDetailScreen() {
  useKeepAwake();
  const { data } = useLocalSearchParams<{ data: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const item: VideoItem = JSON.parse(data ?? "{}");
  const [fileIndex, setFileIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const isFavorite = useFavoritesStore((s) => s.isFavorite(item.id));
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const reportItem = useReportingStore((s) => s.reportItem);

  const [isLowQuality, setIsLowQuality] = useState(false);

  // Determine appropriate video URL based on quality preference
  const selectedUrl = (() => {
    if (isLowQuality) {
      // Prefer a low‑quality version if available
      const low = item.videoFiles?.find((v) => v.quality === "low");
      return low?.url ?? item.videoFiles?.[0]?.url ?? item.videoUrl;
    }
    // Normal mode: use selected index or fallback
    return item.videoFiles?.[fileIndex]?.url ?? item.videoUrl;
  })();

  // Update currentUrl to use selectedUrl
  const currentUrl = selectedUrl;

  // On mount, evaluate network speed and auto‑switch to low quality on slow cellular
  useEffect(() => {
    (async () => {
      try {
        const net = await Network.getNetworkStateAsync();
        if (net.type === "cellular" && (net.cellularGeneration === "2g" || net.cellularGeneration === "3g")) {
          setIsLowQuality(true);
        }
      } catch (e) {
        console.warn("Network check failed", e);
      }
    })();
  }, []);
  const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  const videoHeight = Math.round(SCREEN_WIDTH * (item.height / Math.max(item.width, 1)));
  const clampedHeight = Math.min(Math.max(videoHeight, 200), SCREEN_HEIGHT * 0.5);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { showToast } = useToast();

  const [showQualityDialog, setShowQualityDialog] = useState(false);

  async function handleDownloadWithUrl(url: string) {
    try {
      showToast(`Downloading... 0%`, "info", { progress: 0 });
      await downloadMediaFile(url, "pixent_video", "mp4", (progress) => {
        showToast(`Downloading... ${Math.round(progress)}%`, "info", { progress });
      });
      showToast("Media saved to gallery successfully.", "success");
    } catch (error) {
      console.error("[Download] Error:", error);
      showToast("An error occurred while downloading the file.", "error");
    }
  }

  async function handleDownload() {
    if (item.videoFiles && item.videoFiles.length > 1) {
      // Show quality selection dialog
      setShowQualityDialog(true);
    } else {
      // Fallback to current URL
      await handleDownloadWithUrl(currentUrl);
    }
  }


  async function handleShare() {
    if (Platform.OS === "web") {
      try {
        window.open(item.videoUrl, "_blank");
      } catch (error) {
        console.error("[Share] Web share error:", error);
      }
      return;
    }
    try {
      await Share.share({
        message: `Check out this video on Pixent: ${item.videoUrl}`,
        url: item.videoUrl,
      });
    } catch (error) {
      console.error("[Share] Error:", error);
      Alert.alert("فشل المشاركة", "حدث خطأ أثناء المشاركة.");
    }
  }

  const handleReport = () => {
    Alert.alert(
      "إبلاغ عن محتوى",
      "هل تريد الإبلاغ عن هذا الفيديو وإخفائه؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إبلاغ وإخفاء",
          style: "destructive",
          onPress: () => {
            reportItem(item.id);
            router.back();
          }
        },
      ]
    );
  };

  // useVideoPlayer web runtime only accepts 1 arg; configure via useEffect
  const player = useVideoPlayer({ uri: currentUrl });

  useEffect(() => {
    try {
      player.loop = true;
      player.muted = isMuted;
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  } as { isPlaying: boolean });

  const { status, error } = useEvent(player, "statusChange", {
    status: player.status,
  } as { status: typeof player.status });

  // Poll currentTime for progress bar (avoids complex event payload types)
  const [currentTime, setCurrentTime] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      try { setCurrentTime(player.currentTime ?? 0); } catch { }
    }, 500);
    return () => clearInterval(id);
  }, [player]);

  const isBuffering = status === "loading";
  const duration = player.duration ?? 0;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Sync mute
  useEffect(() => {
    try { player.muted = isMuted; } catch { }
  }, [isMuted]);

  // Handle errors — try next quality
  useEffect(() => {
    if (error) {
      logger.error("VideoDetail", "playback error", error);
      tryNextFile();
    }
  }, [error]);

  // When fallback index changes, replace source
  useEffect(() => {
    if (fileIndex === 0) return;
    try {
      player.replace({ uri: currentUrl });
    } catch (e) {
      logger.error("VideoDetail", "replace failed", e);
    }
  }, [fileIndex]);

  const tryNextFile = useCallback(() => {
    const next = fileIndex + 1;
    if (item.videoFiles && next < item.videoFiles.length) {
      logger.warn("VideoDetail", `Fallback to quality: ${item.videoFiles[next]?.quality}`);
      setFileIndex(next);
      setHasError(false);
    } else {
      setHasError(true);
      logger.error("VideoDetail", "All video files exhausted");
    }
  }, [fileIndex, item.videoFiles]);

  function togglePlay() {
    try {
      if (isPlaying) player.pause();
      else player.play();
    } catch { }
  }

  function handleFavorite() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    if (isFavorite) removeFavorite(item.id);
    else addFavorite(item);
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-down" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconBtn, isFavorite && styles.iconBtnActive]}
            onPress={handleFavorite}
          >
            <Feather name="heart" size={18} color={isFavorite ? "#EF4444" : "#fff"} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Download Quality Modal */}
      {showQualityDialog && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Download Quality</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowQualityDialog(false)}>
                <Feather name="x" size={20} color="#000" />
              </TouchableOpacity>
              {item.videoFiles?.map((f, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.modalOption}
                  onPress={async () => {
                    setShowQualityDialog(false);
                    await handleDownloadWithUrl(f.url);
                  }}
                >
                  <Text style={styles.modalOptionText}>{(f.quality || "unknown").toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowQualityDialog(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}


      {/* Video player */}
      <View
        style={[
          styles.videoContainer,
          isZoomed
            ? StyleSheet.absoluteFillObject
            : { height: clampedHeight, backgroundColor: colors.background },
        ]}
      >

        {!hasError && (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFillObject}
            contentFit={isZoomed ? "cover" : "contain"}
            nativeControls={false}
          />
        )}

        {/* Tap area */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={0.9}
          onPress={togglePlay}
        >
          {!isPlaying && !isBuffering && !hasError && (
            <View style={styles.playOverlay}>
              <View style={styles.playBtnLarge}>
                <Feather name="play" size={30} color="#fff" />
              </View>
            </View>
          )}
        </TouchableOpacity>

        {isBuffering && (
          <View style={styles.playOverlay} pointerEvents="none">
            <ActivityIndicator color="#fff" size="large" />
          </View>
        )}
        {hasError && (
          <View style={styles.playOverlay} pointerEvents="none">
            <Feather name="alert-circle" size={36} color="rgba(255,255,255,0.7)" />
            <Text style={styles.errorText}>Video unavailable</Text>
          </View>
        )}

        {/* Exit fullscreen button */}
        {isZoomed && (
          <TouchableOpacity
            style={styles.exitFullscreen}
            onPress={() => setIsZoomed(false)}
          >
            <Feather name="minimize" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Progress bar */}
        <View style={styles.progressBar} pointerEvents="none">
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

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

        <TouchableOpacity style={styles.actionItem} onPress={() => setIsMuted((v) => !v)}>
          <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
            <Feather name={isMuted ? "volume-x" : "volume-2"} size={20} color={colors.primary} />
          </View>
          <Text style={[styles.actionText, { color: colors.foreground }]}>{isMuted ? "Unmute" : "Mute"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => setIsZoomed((v) => !v)}>
          <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
            <Feather name={isZoomed ? "minimize" : "maximize"} size={20} color={colors.primary} />
          </View>
          <Text style={[styles.actionText, { color: colors.foreground }]}>{isZoomed ? "Fill" : "Fit"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleReport}>
          <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
            <Feather name="flag" size={20} color={colors.destructive} />
          </View>
          <Text style={[styles.actionText, { color: colors.foreground }]}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <ScrollView
        style={[styles.infoScroll, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Feather name="clock" size={13} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {formatDuration(item.duration)}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {item.width} × {item.height}
            </Text>
          </View>
          <View style={styles.creatorRow}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Feather name="user" size={14} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.creatorName, { color: colors.foreground }]}>
                {item.creator.name}
              </Text>
              <Text style={[styles.provider, { color: colors.mutedForeground }]}>
                via {item.provider.charAt(0).toUpperCase() + item.provider.slice(1)}
              </Text>
            </View>
          </View>

          {/* Quality selector */}
          {item.videoFiles && item.videoFiles.length > 1 && (
            <View style={styles.qualitiesRow}>
              <Text style={[styles.qualitiesLabel, { color: colors.mutedForeground }]}>
                Quality:
              </Text>
              {item.videoFiles.map((f, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.qualityChip,
                    {
                      backgroundColor: i === fileIndex ? colors.primary : colors.secondary,
                      borderColor: i === fileIndex ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setFileIndex(i);
                    setHasError(false);
                    try {
                      player.replace({ uri: item.videoFiles[i]!.url });
                    } catch { }
                  }}
                >
                  <Text
                    style={[
                      styles.qualityText,
                      { color: i === fileIndex ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {f.quality.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={{ height: 80 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  headerTitle: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "600", marginRight: 8 },
  headerRight: { flexDirection: "row", gap: 8, flexShrink: 0 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  iconBtnActive: { backgroundColor: "rgba(239,68,68,0.2)" },
  videoContainer: {
    width: SCREEN_WIDTH,
    zIndex: 10,
    backgroundColor: "#000",
    // Shadows for iOS
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    // Elevation for Android
    elevation: 8,
  },
  exitFullscreen: {
    position: "absolute",
    top: 48,
    right: 16,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  playBtnLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 8 },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressFill: { height: 3, backgroundColor: "#8B5CF6" },
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
  infoScroll: { flex: 1 },
  info: { padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: "700", lineHeight: 24 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 13 },
  creatorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  creatorName: { fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "80%", backgroundColor: "#fff", borderRadius: 12, paddingVertical: 20, paddingHorizontal: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#000", textAlign: "center", marginBottom: 12 },
  modalClose: { alignSelf: "flex-end", marginBottom: 8 },
  modalOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalOptionText: { fontSize: 16, color: "#000" },
  modalCancel: { marginTop: 20, alignItems: "center" },
  modalCancelText: { fontSize: 16, color: "#007AFF" },
  provider: { fontSize: 12, marginTop: 1 },
  qualitiesLabel: { fontSize: 13 },
  qualityChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  qualityText: { fontSize: 12, fontWeight: "600" },
});
