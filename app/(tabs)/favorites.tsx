import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { MasonryGrid } from "@/components/MasonryGrid";
import { PhotoCard } from "@/components/PhotoCard";
import { SoundCard } from "@/components/SoundCard";
import { VideoCard } from "@/components/VideoCard";
import { useFavoritesStore } from "@/store/favoritesStore";
import { FavoriteItem, PhotoItem, SoundItem, VideoItem } from "@/types/media";
import { useColors } from "@/hooks/useColors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const COL_GAP = 6;
const COL_WIDTH = (SCREEN_WIDTH - COL_GAP * 3) / 2;

type FilterType = "all" | "photo" | "video" | "sound";

export default function FavoritesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favorites, load, clearAll } = useFavoritesStore();
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => { load(); }, [load]);

  const filtered = favorites.filter((f) => filter === "all" || f.type === filter);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const FILTERS: { key: FilterType; icon: keyof typeof Feather.glyphMap; label: string }[] = [
    { key: "all", icon: "layers", label: "All" },
    { key: "photo", icon: "image", label: "Photos" },
    { key: "video", icon: "video", label: "Videos" },
    { key: "sound", icon: "music", label: "Sounds" },
  ];

  const renderItem = (item: FavoriteItem) => {
    if (item.type === "photo") return <PhotoCard item={item.data as PhotoItem} width={COL_WIDTH} />;
    if (item.type === "video") return <VideoCard item={item.data as VideoItem} width={COL_WIDTH} />;
    if (item.type === "sound") return <SoundCard item={item.data as SoundItem} />;
    return null;
  };

  const photoFavs = filtered.filter((f) => f.type === "photo");
  const otherFavs = filtered.filter((f) => f.type !== "photo");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Favorites</Text>
          {favorites.length > 0 && (
            <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
              <Text style={[styles.clearText, { color: colors.destructive }]}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f.key ? colors.primary : colors.secondary,
                  borderColor: filter === f.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Feather name={f.icon} size={13} color={filter === f.key ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.filterLabel, { color: filter === f.key ? "#fff" : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="heart"
          title="No favorites yet"
          subtitle="Save photos, videos, and sounds to see them here"
        />
      ) : filter === "all" || filter === "photo" ? (
        <>
          {photoFavs.length > 0 && (
            <MasonryGrid
              data={photoFavs}
              keyExtractor={(f) => f.id}
              numColumns={2}
              columnGap={COL_GAP}
              renderItem={(f: FavoriteItem) => renderItem(f)}
              ListHeaderComponent={
                otherFavs.length > 0 ? (
                  <Text style={[styles.sectionTitle, { color: colors.mutedForeground, paddingHorizontal: 16, marginBottom: 8 }]}>Photos</Text>
                ) : undefined
              }
              ListFooterComponent={
                otherFavs.length > 0 ? (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.mutedForeground, paddingHorizontal: 16, marginBottom: 8, marginTop: 16 }]}>
                      Videos & Sounds
                    </Text>
                    <FlatList
                      data={otherFavs}
                      keyExtractor={(f) => f.id}
                      renderItem={({ item: f }) => (
                        <View style={{ paddingHorizontal: 16 }}>{renderItem(f)}</View>
                      )}
                      scrollEnabled={false}
                    />
                  </>
                ) : undefined
              }
            />
          )}
          {photoFavs.length === 0 && (
            <FlatList
              data={otherFavs}
              keyExtractor={(f) => f.id}
              renderItem={({ item: f }) => (
                <View style={{ paddingHorizontal: 16 }}>{renderItem(f)}</View>
              )}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
            />
          )}
        </>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(f) => f.id}
          renderItem={({ item: f }) => (
            <View style={{ paddingHorizontal: 16 }}>{renderItem(f)}</View>
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 12, zIndex: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 14, fontWeight: "500" },
  filters: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterLabel: { fontSize: 13, fontWeight: "500" },
  sectionTitle: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
});
