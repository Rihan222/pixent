import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryChips } from "@/components/CategoryChips";
import { EmptyState } from "@/components/EmptyState";
import { MasonryGrid } from "@/components/MasonryGrid";
import { PhotoCard } from "@/components/PhotoCard";
import { SearchBar } from "@/components/SearchBar";
import { PhotoSkeleton } from "@/components/SkeletonLoader";
import { BannerAdView } from "@/components/BannerAd";

import { getCuratedPhotos, searchPexelsPhotos } from "@/services/pexels";
import { searchPixabayImages, getTrendingPixabayImages } from "@/services/pixabay";
// import { getCuratedUnsplashPhotos, searchUnsplashPhotos } from "@/services/unsplash";
import { useFavoritesStore } from "@/store/favoritesStore";
import { PhotoItem } from "@/types/media";
import { useColors } from "@/hooks/useColors";
import { containsAdultContent, isUnsafeContent, sanitizeSearchQuery, getRandomSafeQuery } from "@/utils/contentFilter";
import { useReportingStore } from "@/store/reportingStore";

const SCREEN_WIDTH = Dimensions.get("window").width;
const COL_GAP = 6;
const COL_WIDTH = (SCREEN_WIDTH - COL_GAP * 3) / 2;

const CATEGORIES = ["All", "Nature", "Architecture", "People", "Travel", "Food", "Abstract", "Animals"];

export default function PhotosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sessionSafeQuery, setSessionSafeQuery] = useState(() => getRandomSafeQuery());
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 10) + 1);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useFavoritesStore((s) => s.load)();

  const query = activeSearch || (category !== "All" ? category : "");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ["photos", query, sessionSafeQuery, randomSeed],
      queryFn: async ({ pageParam = 1 }) => {
        const fetchPexels = async () => {
          try {
            // Use safe query instead of curated to bias content when no search/category
            const res = await searchPexelsPhotos(sessionSafeQuery, (pageParam as number) + randomSeed);
            return res.items || [];
          } catch (e) {
            console.warn("Pexels fetch failed:", e);
            return [];
          }
        };
        const fetchPixabay = async () => {
          try {
            const res = await searchPixabayImages(sessionSafeQuery, (pageParam as number) + randomSeed);
            return res.items || [];
          } catch (e) {
            console.warn("Pixabay fetch failed:", e);
            return [];
          }
        };
        const fetchUnsplash = async () => {
          // Temporarily disabled due to API issues
          return [];
        };

        const fetchSearchPexels = async () => {
          try {
            const res = await searchPexelsPhotos(query, pageParam as number);
            return res.items || [];
          } catch (e) {
            console.warn("Pexels search failed:", e);
            return [];
          }
        };
        const fetchSearchPixabay = async () => {
          try {
            const res = await searchPixabayImages(query, pageParam as number);
            return res.items || [];
          } catch (e) {
            console.warn("Pixabay search failed:", e);
            return [];
          }
        };
        const fetchSearchUnsplash = async () => {
          // Temporarily disabled due to API issues
          return [];
        };

        if (!query) {
          const [pexelsItems, pixabayItems, unsplashItems] = await Promise.all([
            fetchPexels(),
            fetchPixabay(),
            fetchUnsplash(),
          ]);
          return [...pexelsItems, ...pixabayItems, ...unsplashItems];
        }
        const [pexelsItems, pixabayItems, unsplashItems] = await Promise.all([
          fetchSearchPexels(),
          fetchSearchPixabay(),
          fetchSearchUnsplash(),
        ]);
        return [...pexelsItems, ...pixabayItems, ...unsplashItems];
      },
      getNextPageParam: (_, pages) => pages.length + 1,
      initialPageParam: 1,
    });

  const handleRefresh = useCallback(() => {
    refreshContent();
    refetch();
  }, [refreshContent, refetch]);

  const reportedIds = useReportingStore((s) => s.reportedIds);

  const photos: PhotoItem[] = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages ?? [])
      .flat()
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

  const processedPhotos = useMemo(() => {
    const result: (PhotoItem | { isAd: boolean; id: string })[] = [];
    photos.forEach((item, index) => {
      result.push(item);
      // Reduce ad frequency from every 6 to every 12 items to avoid excessive requests
      if ((index + 1) % 12 === 0) {
        result.push({ isAd: true, id: `ad-photo-${index}-${item.id}` });
      }
    });
    return result;
  }, [photos]);

  const handleSearchSubmit = useCallback(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
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
  }, [search]);

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    setSearch("");
    setActiveSearch("");
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pixent</Text>
        <View style={styles.searchRow}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            onSubmit={handleSearchSubmit}
            onClear={() => { setActiveSearch(""); }}
            placeholder="Search photos..."
          />
        </View>
        <CategoryChips
          categories={CATEGORIES}
          selected={category}
          onSelect={handleCategorySelect}
        />
      </View>

      <BannerAdView />

      {isLoading ? (
        <View style={[styles.skeletonGrid, { paddingHorizontal: COL_GAP }]}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={{ width: COL_WIDTH }}>
              <PhotoSkeleton />
            </View>
          ))}
        </View>
      ) : (
        <MasonryGrid
          ref={scrollRef}
          onScroll={(e: any) => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
          data={processedPhotos}
          keyExtractor={(item: any) => item.id}
          numColumns={2}
          columnGap={COL_GAP}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onRefresh={handleRefresh}
          refreshing={isRefetching}
          loading={isFetchingNextPage}
          renderItem={(item: any) => {
            if ("isAd" in item) {
              const { NativeAdView } = require("@/components/NativeAdView");
              return <NativeAdView width={SCREEN_WIDTH - 32} size="medium" />;
            }
            return <PhotoCard item={item} width={COL_WIDTH} />;
          }}
          ListEmptyComponent={
            <EmptyState
              icon="image"
              title="No photos found"
              subtitle="Try a different search term or category"
              action={{ label: "Browse all", onPress: () => handleCategorySelect("All") }}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 10, zIndex: 10 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, paddingHorizontal: 16, marginBottom: 10 },
  searchRow: { paddingHorizontal: 16, marginBottom: 10 },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 8 },
});
