import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BannerAdView } from "@/components/BannerAd";
import { EmptyState } from "@/components/EmptyState";
import { MasonryGrid } from "@/components/MasonryGrid";
import { SearchBar } from "@/components/SearchBar";
import { ShortsView } from "@/components/ShortsView";
import { VideoCard } from "@/components/VideoCard";
import { getPopularVideos, searchPexelsVideos } from "@/services/pexels";
// import { getPopularUnsplashVideos, searchUnsplashVideos } from "@/services/unsplash";
import { VideoItem } from "@/types/media";
import { useColors } from "@/hooks/useColors";
import { containsAdultContent, isUnsafeContent, sanitizeSearchQuery, getRandomSafeQuery } from "@/utils/contentFilter";
import { useReportingStore } from "@/store/reportingStore";

const SCREEN_WIDTH = Dimensions.get("window").width;
const COL_GAP = 6;
const COL_WIDTH = (SCREEN_WIDTH - COL_GAP * 3) / 2;

type ViewMode = "grid" | "shorts";

export default function VideosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sessionSafeQuery, setSessionSafeQuery] = useState(() => getRandomSafeQuery());
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 10) + 1);
  const scrollRef = useRef<any>(null);
  const scrollOffset = useRef(0);

  const refreshContent = useCallback(() => {
    setSessionSafeQuery(getRandomSafeQuery());
    setRandomSeed(Math.floor(Math.random() * 10) + 1);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", (e) => {
      if (navigation.isFocused()) {
        if (scrollOffset.current > 10) {
          scrollRef.current?.scrollTo?.({ y: 0, animated: true });
        } else {
          refreshContent();
        }
      }
    });
    return unsubscribe;
  }, [navigation, refreshContent]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["videos", activeSearch, sessionSafeQuery, randomSeed],
    queryFn: async ({ pageParam = 1 }) => {
      const fetchPexels = async () => {
        try {
          const res = await searchPexelsVideos(sessionSafeQuery, (pageParam as number) + randomSeed);
          return { items: res.items || [], hasMore: res.hasMore };
        } catch (e) {
          console.warn("Pexels videos fetch failed:", e);
          return { items: [], hasMore: false };
        }
      };
      const fetchUnsplash = async () => {
        // Temporarily disabled due to API issues
        return { items: [], hasMore: false };
      };

      const fetchSearchPexels = async () => {
        try {
          const res = await searchPexelsVideos(activeSearch, pageParam as number);
          return { items: res.items || [], hasMore: res.hasMore };
        } catch (e) {
          console.warn("Pexels videos search failed:", e);
          return { items: [], hasMore: false };
        }
      };
      const fetchSearchUnsplash = async () => {
        // Temporarily disabled due to API issues
        return { items: [], hasMore: false };
      };

      if (activeSearch) {
        const [pexelsData, unsplashData] = await Promise.all([
          fetchSearchPexels(),
          fetchSearchUnsplash(),
        ]);
        return {
          items: [...pexelsData.items, ...unsplashData.items],
          hasMore: pexelsData.hasMore || unsplashData.hasMore,
        };
      }
      const [pexelsData, unsplashData] = await Promise.all([
        fetchPexels(),
        fetchUnsplash(),
      ]);
      return {
        items: [...pexelsData.items, ...unsplashData.items],
        hasMore: pexelsData.hasMore || unsplashData.hasMore,
      };
    },
    getNextPageParam: (lastPage, pages) => lastPage?.hasMore ? pages.length + 1 : undefined,
    initialPageParam: 1,
  });

  const handleRefresh = useCallback(() => {
    refreshContent();
    refetch();
  }, [refreshContent, refetch]);

  const reportedIds = useReportingStore((s) => s.reportedIds);

  const videos: VideoItem[] = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((item) => {
        if (seen.has(item.id)) return false;

        // 1. Filter out reported content
        if (reportedIds.includes(item.id)) return false;

        // 2. Advanced metadata filter (Catch misleading titles via tags/description)
        const unsafe = isUnsafeContent({
          title: item.title,
          tags: item.tags,
          creatorName: item.creator.name
        });

        if (unsafe) return false;

        seen.add(item.id);
        return true;
      });
  }, [data, reportedIds]);

  const processedVideos = useMemo(() => {
    const result: (VideoItem | { isAd: boolean; id: string })[] = [];
    videos.forEach((item, index) => {
      result.push(item);
      // Reduce ad frequency from every 6 to every 12 items to avoid excessive requests
      if ((index + 1) % 12 === 0) {
        result.push({ isAd: true, id: `ad-video-${index}-${item.id}` });
      }
    });
    return result;
  }, [videos]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  // Shorts mode: full-screen TikTok-style — no header, pure immersive
  if (viewMode === "shorts") {
    return (
      <View style={styles.fullscreen}>
        {/* Floating header over the video */}
        <View style={[styles.shortsHeader, { paddingTop: topPadding + 6 }]}>
          <Text style={styles.shortsTitle}>Shorts</Text>
          <TouchableOpacity
            style={[styles.modeBtn, styles.modeBtnActive, { backgroundColor: "rgba(255,255,255,0.2)" }]}
            onPress={() => setViewMode("grid")}
          >
            <Feather name="grid" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {videos.length === 0 && !isLoading ? (
          <View style={[styles.fullscreen, { backgroundColor: "#000", alignItems: "center", justifyContent: "center" }]}>
            <EmptyState icon="video" title="No videos" subtitle="Pull to refresh" />
          </View>
        ) : (
          <ShortsView
            videos={videos}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
          />
        )}
      </View>
    );
  }

  // Grid mode: standard layout
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 8, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Videos</Text>
          <View
            style={[
              styles.modeToggle,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={[styles.modeBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="grid" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modeBtn}
              onPress={() => setViewMode("shorts")}
            >
              <Feather name="play-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.searchRow}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            onSubmit={() => {
              const sanitized = sanitizeSearchQuery(search.trim());
              if (search.trim() && !sanitized) {
                Alert.alert(
                  "تنبيه",
                  "الرجاء الالتزام بكلمات بحث لائقة. استخدام كلمات غير مناسبة قد يؤدي لحظر حسابك.",
                  [{ text: "حسناً", style: "default" }]
                );
                setSearch("");
                setActiveSearch("");
                return;
              }
              setActiveSearch(sanitized);
            }}
            onClear={() => setActiveSearch("")}
            placeholder="Search videos..."
          />
        </View>
      </View>

      <BannerAdView />

      <MasonryGrid
        ref={scrollRef}
        onScroll={(e: any) => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
        data={processedVideos}
        keyExtractor={(item: any) => item.id}
        numColumns={2}
        columnGap={COL_GAP}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onRefresh={handleRefresh}
        refreshing={isRefetching}
        loading={isLoading || isFetchingNextPage}
        renderItem={(item: any) => {
          if ("isAd" in item) {
            const { NativeAdView } = require("@/components/NativeAdView");
            return <NativeAdView width={SCREEN_WIDTH - 32} size="medium" />;
          }
          return <VideoCard item={item} width={COL_WIDTH} />;
        }}
        ListEmptyComponent={
          <EmptyState
            icon="video"
            title="No videos found"
            subtitle="Try a different search term"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fullscreen: { flex: 1, backgroundColor: "#000" },
  header: { paddingBottom: 10, zIndex: 10 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  modeToggle: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  modeBtn: { padding: 8 },
  modeBtnActive: { borderRadius: 8 },
  searchRow: { paddingHorizontal: 16 },
  // Shorts overlay header
  shortsHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  shortsTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
