import { Feather } from "@expo/vector-icons";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  GestureResponderEvent,
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
import { SoundItem } from "@/types/media";
import { useColors } from "@/hooks/useColors";
import { logger } from "@/utils/logger";

import { downloadMediaFile } from "@/utils/download";
import { useToast } from "@/components/Toast";

const { width: W } = Dimensions.get("window");

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.5, 1.0, 1.5, 2.0];

export default function SoundDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressBarWidth = useRef(W - 48);

  const [isLoading, setIsLoading] = useState(false);

  const { showToast } = useToast();

  async function handleDownload() {
    try {
      showToast("Downloading... 0%", "info", { progress: 0 });
      await downloadMediaFile(item.previewUrl, "pixent_sound", "mp3", (progress) => {
        showToast(`Downloading... ${Math.round(progress)}%`, "info", { progress });
      });
      showToast("Media saved to gallery successfully.", "success");
    } catch (error) {
      console.error("[Download] Error:", error);
      showToast("An error occurred while downloading the file.", "error");
    }
  }
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1); // 1.0x default

  const item: SoundItem = JSON.parse(data ?? "{}");
  const isFavorite = useFavoritesStore((s) => s.isFavorite(item.id));
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const reportItem = useReportingStore((s) => s.reportItem);

  const handleReport = () => {
    Alert.alert(
      "إبلاغ عن محتوى",
      "هل تريد الإبلاغ عن هذا الملف الصوتي وإخفائه؟",
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
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
    }).catch(() => { });
    return () => {
      soundRef.current?.unloadAsync().catch(() => { });
    };
  }, []);

  async function loadAndPlay(url: string) {
    setIsLoading(true);
    setHasError(false);
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      logger.info("SoundPlayer", `Loading: ${url}`);
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, rate: SPEEDS[speedIndex]! },
        onPlaybackStatusUpdate,
      );
      soundRef.current = sound;
    } catch (e) {
      logger.error("SoundPlayer", "createAsync failed", e);
      // Try low-quality fallback
      if (url === item.previewUrl && item.previewUrlLq && item.previewUrlLq !== url) {
        logger.warn("SoundPlayer", "Trying LQ fallback");
        loadAndPlay(item.previewUrlLq).catch(() => {
          setIsLoading(false);
          setHasError(true);
        });
      } else {
        setIsLoading(false);
        setHasError(true);
      }
    }
  }

  function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) {
      if (status.error) {
        logger.error("SoundPlayer", `Status error: ${status.error}`);
        setHasError(true);
      }
      return;
    }
    setIsLoading(false);
    setIsPlaying(status.isPlaying);
    setPosition((status.positionMillis ?? 0) / 1000);
    if (status.durationMillis) {
      setDuration(status.durationMillis / 1000);
    }
    if (status.didJustFinish) {
      setPosition(0);
      setIsPlaying(false);
    }
  }

  async function togglePlay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    if (!soundRef.current) {
      await loadAndPlay(item.previewUrl);
      return;
    }
    if (isPlaying) {
      await soundRef.current.pauseAsync().catch(() => { });
    } else {
      await soundRef.current.playAsync().catch(() => { });
    }
  }

  async function cycleSpeed() {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    if (soundRef.current) {
      await soundRef.current.setRateAsync(SPEEDS[next]!, true).catch(() => { });
    }
  }

  function handleSeek(event: GestureResponderEvent) {
    if (!soundRef.current || duration === 0) return;
    const x = event.nativeEvent.locationX;
    const ratio = Math.min(Math.max(x / progressBarWidth.current, 0), 1);
    const seekMs = ratio * duration * 1000;
    soundRef.current.setPositionAsync(seekMs).catch(() => { });
    setPosition(ratio * duration);
  }

  async function handleShare() {
    if (Platform.OS === "web") {
      // For web, open the audio in a new tab
      try {
        window.open(item.previewUrl, "_blank");
      } catch (error) {
        console.error("[Share] Web share error:", error);
      }
      return;
    }
    try {
      await Share.share({
        message: `Check out this sound on Pixent: ${item.previewUrl}`,
        url: item.previewUrl,
      });
    } catch (error) {
      console.error("[Share] Error:", error);
      Alert.alert("فشل المشاركة", "حدث خطأ أثناء المشاركة.");
    }
  }

  const progress = duration > 0 ? position / duration : 0;
  const artworkUrl = item.thumbnailUrl;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
          onPress={() => router.back()}
        >
          <Feather name="chevron-down" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>
          Now Playing
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            onPress={handleReport}
          >
            <Feather name="flag" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: isFavorite ? "#FEE2E2" : colors.secondary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
              isFavorite ? removeFavorite(item.id) : addFavorite(item);
            }}
          >
            <Feather name="heart" size={18} color={isFavorite ? "#EF4444" : colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Artwork */}
        <View style={styles.artworkContainer}>
          {artworkUrl ? (
            <Image
              source={{ uri: artworkUrl }}
              style={styles.artwork}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[styles.artwork, { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }]}>
              <Feather name="music" size={64} color={colors.primary} />
            </View>
          )}
        </View>

        {/* Title & creator */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.creator, { color: colors.mutedForeground }]}>
            {item.creator.name}
          </Text>
        </View>

        {/* Error state */}
        {hasError && (
          <View style={[styles.errorBox, { backgroundColor: colors.secondary }]}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              Failed to load audio. Tap play to retry.
            </Text>
          </View>
        )}

        {/* Seek bar */}
        <View style={styles.seekSection}>
          <TouchableOpacity
            style={[styles.progressTrack, { backgroundColor: colors.border }]}
            onPress={handleSeek}
            activeOpacity={1}
          >
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${progress * 100}%` },
              ]}
            />
            <View
              style={[
                styles.progressThumb,
                { backgroundColor: colors.primary, left: `${progress * 100}%` },
              ]}
            />
          </TouchableOpacity>
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
              {formatTime(position)}
            </Text>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
              {formatTime(duration || item.duration)}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Speed */}
          <TouchableOpacity
            style={[styles.speedBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            onPress={cycleSpeed}
          >
            <Text style={[styles.speedText, { color: colors.foreground }]}>
              {SPEEDS[speedIndex]}×
            </Text>
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity
            style={[styles.playMainBtn, { backgroundColor: colors.primary }]}
            onPress={togglePlay}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Feather name={isPlaying ? "pause" : "play"} size={30} color="#fff" />
            )}
          </TouchableOpacity>

          {/* Download */}
          <TouchableOpacity
            style={[styles.speedBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            onPress={handleDownload}
          >
            <Feather name="download" size={18} color={colors.foreground} />
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            style={[styles.speedBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            onPress={handleShare}
          >
            <Feather name="share" size={18} color={colors.foreground} />
          </TouchableOpacity>

          {/* Report */}
          <TouchableOpacity
            style={[styles.speedBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            onPress={handleReport}
          >
            <Feather name="flag" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.slice(0, 8).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {!!item.description && (
          <Text
            style={[styles.description, { color: colors.mutedForeground }]}
            numberOfLines={4}
          >
            {item.description}
          </Text>
        )}

        {/* Meta */}
        <View style={styles.metaGrid}>
          <View style={[styles.metaCell, { backgroundColor: colors.secondary }]}>
            <Feather name="clock" size={14} color={colors.mutedForeground} />
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Duration</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>
              {formatTime(item.duration)}
            </Text>
          </View>
          <View style={[styles.metaCell, { backgroundColor: colors.secondary }]}>
            <Feather name="zap" size={14} color={colors.mutedForeground} />
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Source</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>Freesound</Text>
          </View>
          {item.license && (
            <View style={[styles.metaCell, { backgroundColor: colors.secondary }]}>
              <Feather name="award" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>License</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]} numberOfLines={1}>
                CC
              </Text>
            </View>
          )}
        </View>
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
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerLabel: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 24, paddingTop: 8, alignItems: "center", gap: 20 },
  artworkContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
  },
  artwork: { width: W - 80, height: W - 80, borderRadius: 20 },
  titleSection: { alignItems: "center", gap: 6, width: "100%" },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center", letterSpacing: -0.3, lineHeight: 28 },
  creator: { fontSize: 15, textAlign: "center" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    width: "100%",
  },
  errorText: { fontSize: 13, flex: 1 },
  seekSection: { width: "100%", gap: 8 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    width: "100%",
    overflow: "visible",
    position: "relative",
  },
  progressFill: { height: 6, borderRadius: 3, minWidth: 0 },
  progressThumb: {
    position: "absolute",
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
  },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeText: { fontSize: 12 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28 },
  speedBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  speedText: { fontSize: 14, fontWeight: "700" },
  playMainBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  tagText: { fontSize: 12 },
  description: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  metaGrid: { flexDirection: "row", gap: 10, width: "100%" },
  metaCell: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  metaLabel: { fontSize: 11 },
  metaValue: { fontSize: 14, fontWeight: "600" },
});
