import { Feather } from "@expo/vector-icons";
import { useEvent } from "expo";
import { VideoView, useVideoPlayer } from "expo-video";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useReportingStore } from "@/store/reportingStore";
import { VideoItem } from "@/types/media";
import { logger } from "@/utils/logger";

const { width: W, height: H } = Dimensions.get("window");

interface ShortsItemProps {
  item: VideoItem;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

function ShortsItem({ item, isActive, isMuted, onToggleMute }: ShortsItemProps) {
  const [fileIndex, setFileIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const isFavorite = useFavoritesStore((s) => s.isFavorite(item.id));
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const reportItem = useReportingStore((s) => s.reportItem);
  const router = useRouter();

  const currentUrl = item.videoFiles?.[fileIndex]?.url ?? item.videoUrl;

  // useVideoPlayer only takes source on web; configure via useEffect
  const player = useVideoPlayer({ uri: currentUrl });

  // Initial config + play/pause
  useEffect(() => {
    try {
      player.loop = true;
      player.muted = isMuted;
      if (isActive) player.play();
      else player.pause();
    } catch (e) {
      logger.error("ShortsItem", "init failed", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Auto play/pause based on visibility
  useEffect(() => {
    try {
      if (isActive) player.play();
      else player.pause();
    } catch (e) {
      logger.error("ShortsItem", "play/pause failed", e);
    }
  }, [isActive]);

  // Sync mute state
  useEffect(() => {
    try { player.muted = isMuted; } catch { }
  }, [isMuted]);

  // When fallback file changes, replace source
  useEffect(() => {
    if (fileIndex === 0) return;
    try {
      player.replace({ uri: currentUrl });
      if (isActive) player.play();
    } catch (e) {
      logger.error("ShortsItem", "replace failed", e);
    }
  }, [fileIndex]);

  // Listen for playback status
  const { status, error } = useEvent(player, "statusChange", {
    status: player.status,
  } as { status: typeof player.status });

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  } as { isPlaying: boolean });

  useEffect(() => {
    if (error) {
      logger.error("ShortsItem", "statusChange error", error);
      tryNextFile();
    }
  }, [error]);

  function tryNextFile() {
    const next = fileIndex + 1;
    if (item.videoFiles && next < item.videoFiles.length) {
      logger.warn("ShortsItem", `Fallback to file index=${next}`);
      setFileIndex(next);
    } else {
      setHasError(true);
    }
  }

  function togglePlay() {
    try {
      if (isPlaying) player.pause();
      else player.play();
    } catch { }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  }

  function handleFavorite() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    if (isFavorite) removeFavorite(item.id);
    else addFavorite(item);
  }

  function handleReport() {
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
  }

  const isBuffering = status === "loading";

  return (
    <View style={styles.slide}>
      {/* Background thumbnail */}
      <Image
        source={{ uri: item.thumbnailUrl }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />

      {!hasError && (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />
      )}

      {/* Tap to play/pause */}
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        activeOpacity={1}
        onPress={togglePlay}
      />

      {/* Gradients */}
      <LinearGradient
        colors={["rgba(0,0,0,0.45)", "transparent"]}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.75)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Center indicators */}
      {!isPlaying && !isBuffering && !hasError && (
        <View style={styles.centerIcon} pointerEvents="none">
          <Feather name="play" size={48} color="rgba(255,255,255,0.75)" />
        </View>
      )}
      {isBuffering && (
        <View style={styles.centerIcon} pointerEvents="none">
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}
      {hasError && (
        <View style={styles.centerIcon} pointerEvents="none">
          <Feather name="alert-circle" size={40} color="rgba(255,255,255,0.6)" />
          <Text style={styles.errorText}>Video unavailable</Text>
        </View>
      )}

      {/* Center indicators */}
      {/* ... (keep existing indicators) */}

      {/* Floating Mute Button */}
      <TouchableOpacity style={styles.muteBtn} onPress={onToggleMute}>
        <Feather name={isMuted ? "volume-x" : "volume-2"} size={22} color="#fff" />
      </TouchableOpacity>

      {/* Right-side actions */}
      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleFavorite}>
          <Feather name="heart" size={28} color={isFavorite ? "#EF4444" : "#fff"} />
          <Text style={styles.actionLabel}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleReport}>
          <Feather name="flag" size={24} color="#fff" />
          <Text style={styles.actionLabel}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={async () => {
            try {
              await Share.share({
                message: `Check out this video on Pixent: ${item.videoUrl}`,
                url: item.videoUrl,
              });
            } catch { }
          }}
        >
          <Feather name="share-2" size={24} color="#fff" />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            router.push({
              pathname: "/video/[id]",
              params: { id: item.id, data: JSON.stringify(item) },
            })
          }
        >
          <Feather name="maximize" size={24} color="#fff" />
          <Text style={styles.actionLabel}>Expand</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={styles.bottomInfo}>
        <Text style={styles.creatorName}>@{item.creator.name}</Text>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Feather name="clock" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={styles.metaDuration}>
            {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, "0")}
          </Text>
          <Text style={styles.metaProvider}>· Pexels</Text>
        </View>
      </View>
    </View>
  );
}

interface ShortsViewProps {
  videos: VideoItem[];
  onEndReached?: () => void;
}

const VIEWABILITY_CONFIG = {
  viewAreaCoveragePercentThreshold: 80,
  minimumViewTime: 200,
};

export function ShortsView({ videos, onEndReached }: ShortsViewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const reportedIds = useReportingStore((s) => s.reportedIds);

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => !reportedIds.includes(v.id));
  }, [videos, reportedIds]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0]!.index !== null) {
        setActiveIndex(viewableItems[0]!.index!);
      }
    },
  ).current;

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: H, offset: H * index, index }),
    [],
  );

  const keyExtractor = useCallback((item: VideoItem) => item.id, []);

  const renderItem = useCallback(
    ({ item, index }: { item: VideoItem; index: number }) => (
      <ShortsItem
        item={item}
        isActive={index === activeIndex}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((v) => !v)}
      />
    ),
    [activeIndex, isMuted],
  );

  return (
    <FlatList
      data={filteredVideos}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      pagingEnabled
      snapToInterval={H}
      snapToAlignment="start"
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={VIEWABILITY_CONFIG}
      getItemLayout={getItemLayout}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      removeClippedSubviews
      maxToRenderPerBatch={3}
      windowSize={5}
      initialNumToRender={2}
    />
  );
}

const styles = StyleSheet.create({
  slide: {
    width: W,
    height: H,
    backgroundColor: "#000",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  centerIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  errorText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 8,
  },
  muteBtn: {
    position: "absolute",
    top: 80,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  rightActions: {
    position: "absolute",
    right: 16,
    bottom: 120,
    alignItems: "center",
    gap: 16,
  },
  actionBtn: {
    alignItems: "center",
    gap: 4,
  },
  actionLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  bottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 80,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    gap: 6,
  },
  creatorName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  videoTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  metaDuration: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  metaProvider: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
});
