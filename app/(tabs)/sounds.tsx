import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigation } from "expo-router";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryChips } from "@/components/CategoryChips";
import { EmptyState } from "@/components/EmptyState";
import { SearchBar } from "@/components/SearchBar";
import { SoundCard } from "@/components/SoundCard";
import { SoundSkeleton } from "@/components/SkeletonLoader";
import { BannerAdView } from "@/components/BannerAd";

import { getTrendingSounds, searchFreesound, getSoundsByCategory } from "@/services/freesound";
import { SoundItem } from "@/types/media";
import { useColors } from "@/hooks/useColors";
import { logger } from "@/utils/logger";
import { containsAdultContent, isUnsafeContent, sanitizeSearchQuery } from "@/utils/contentFilter";
import { useReportingStore } from "@/store/reportingStore";

const SOUND_CATEGORIES = [
  "All",
  "Music",
  "Ambient",
  "Nature",
  "Urban",
  "Effects",
  "Instruments",
  "Voice",
];

export default function SoundsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [category, setCategory] = useState("All");
  const scrollRef = useRef<any>(null);
  const scrollOffset = useRef(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", (e) => {
      if (navigation.isFocused()) {
        if (scrollOffset.current > 10) {
          scrollRef.current?.scrollToOffset?.({ offset: 0, animated: true });
        } else {
          refetch();
        }
      }
    });
    return unsubscribe;
  }, [navigation, refetch]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["sounds", activeSearch, category],
    queryFn: async ({ pageParam = 1 }) => {
      const page = pageParam as number;
      if (activeSearch) {
        logger.info("SoundsTab", `Search: "${activeSearch}" page=${page}`);
        const data = await searchFreesound(activeSearch, page);
        return { items: data.items, hasMore: data.hasMore };
      }
      if (category !== "All") {
        logger.info("SoundsTab", `Category: "${category}" page=${page}`);
        const data = await getSoundsByCategory(category, page);
        return { items: data.items, hasMore: data.hasMore };
      }
      logger.info("SoundsTab", `Trending page=${page}`);
      const data = await getTrendingSounds(page);
      return { items: data.items, hasMore: data.hasMore };
    },
    getNextPageParam: (lastPage, pages) => lastPage?.hasMore ? pages.length + 1 : undefined,
    initialPageParam: 1,
    retry: 2,
    retryDelay: (attempt) => attempt * 1000,
  });

  const reportedIds = useReportingStore((s) => s.reportedIds);

  const sounds: SoundItem[] = useMemo(() => {
    return (data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((item) => {
        // 1. Filter out reported content
        if (reportedIds.includes(item.id)) return false;

        // 2. Advanced metadata filter (Catch misleading titles via tags/description)
        const unsafe = isUnsafeContent({
          title: item.title,
          description: item.description,
          tags: item.tags,
          creatorName: item.creator.name
        });

        if (unsafe) return false;

        return true;
      });
  }, [data, reportedIds]);

  const processedSounds = useMemo(() => {
    const result: (SoundItem | { isAd: boolean; id: string })[] = [];
    sounds.forEach((item, index) => {
      result.push(item);
      // Reduce ad frequency from every 6 to every 12 items to avoid excessive requests
      if ((index + 1) % 12 === 0) {
        result.push({ isAd: true, id: `ad-sound-${index}-${item.id}` });
      }
    });
    return result;
  }, [sounds]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        { paddingTop: topPadding + 8, backgroundColor: colors.background },
      ]}
    >
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>Sounds</Text>
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
            setCategory("All");
          }}
          onClear={() => setActiveSearch("")}
          placeholder="Search sounds..."
        />
      </View>
      <CategoryChips
        categories={SOUND_CATEGORIES}
        selected={category}
        onSelect={(cat) => {
          setCategory(cat);
          setSearch("");
          setActiveSearch("");
        }}
      />
      <BannerAdView />
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.skeletons}>
          {[...Array(6)].map((_, i) => (
            <SoundSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error("SoundsTab", "Query error", msg);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <EmptyState
          icon="alert-circle"
          title="Failed to load sounds"
          subtitle={msg.slice(0, 100)}
          action={{ label: "Retry", onPress: () => refetch() }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={scrollRef}
        onScroll={(e) => {
          scrollOffset.current = e.nativeEvent.contentOffset.y;
        }}
        data={processedSounds}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => {
          if ("isAd" in item) {
            const { NativeAdView } = require("@/components/NativeAdView");
            return <NativeAdView width={Dimensions.get("window").width - 32} size="medium" />;
          }
          return <SoundCard item={item} />;
        }}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        stickyHeaderIndices={[0]}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="music"
            title="No sounds found"
            subtitle="Try a different search or category"
            action={{ label: "Browse trending", onPress: () => { setCategory("All"); setSearch(""); setActiveSearch(""); } }}
          />
        }
        ListFooterComponent={<View style={{ height: 120 }} />}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 8 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchRow: { paddingHorizontal: 16, marginBottom: 10 },
  list: { paddingHorizontal: 16 },
  skeletons: { padding: 16, gap: 10 },
});
