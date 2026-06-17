import React, { useMemo, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface MasonryGridProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  numColumns?: number;
  columnGap?: number;
  onEndReached?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  loading?: boolean;
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  ListEmptyComponent?: React.ReactNode;
}

export function MasonryGrid<T>({
  data,
  renderItem,
  keyExtractor,
  numColumns = 2,
  columnGap = 8,
  onEndReached,
  onRefresh,
  refreshing = false,
  loading = false,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
}: MasonryGridProps<T>) {
  const colors = useColors();
  const isNearBottom = useRef(false);

  // Split data into segments: [normal items, ad, normal items, ad, ...]
  const segments = useMemo(() => {
    const result: Array<{ type: "ad" | "normal"; items: T[] }> = [];
    let currentNormal: T[] = [];
    data.forEach((item) => {
      if ((item as any)?.isAd) {
        if (currentNormal.length > 0) {
          result.push({ type: "normal", items: currentNormal });
          currentNormal = [];
        }
        result.push({ type: "ad", items: [item] });
      } else {
        currentNormal.push(item);
      }
    });
    if (currentNormal.length > 0) {
      result.push({ type: "normal", items: currentNormal });
    }
    return result;
  }, [data]);

  // Build columns for a given list of normal items
  const buildColumns = useCallback((items: T[]) => {
    const cols: T[][] = Array.from({ length: numColumns }, () => []);
    items.forEach((item, i) => {
      cols[i % numColumns]!.push(item);
    });
    return cols;
  }, [numColumns]);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      if (!onEndReached) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;

      if (distanceFromBottom < 200) {
        if (!isNearBottom.current) {
          isNearBottom.current = true;
          onEndReached();
        }
      } else {
        isNearBottom.current = false;
      }
    },
    [onEndReached]
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {ListHeaderComponent}
      {data.length === 0 && !loading ? (
        ListEmptyComponent
      ) : (
        <>
          {segments.map((segment, segmentIndex) => {
            if (segment.type === "ad") {
              return (
                <View
                  key={`segment-ad-${segmentIndex}`}
                  style={{ paddingHorizontal: columnGap, marginBottom: columnGap }}
                >
                  {segment.items.map((item, i) => (
                    <View key={keyExtractor(item)}>{renderItem(item, i)}</View>
                  ))}
                </View>
              );
            } else {
              const columns = buildColumns(segment.items);
              return (
                <View
                  key={`segment-normal-${segmentIndex}`}
                  style={[styles.grid, { gap: columnGap, paddingHorizontal: columnGap }]}
                >
                  {columns.map((col, colIndex) => (
                    <View key={colIndex} style={[styles.column, { gap: columnGap }]}>
                      {col.map((item, i) => (
                        <View key={keyExtractor(item)}>{renderItem(item, colIndex * col.length + i)}</View>
                      ))}
                    </View>
                  ))}
                </View>
              );
            }
          })}
        </>
      )}
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
      {ListFooterComponent}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row" },
  column: { flex: 1 },
  loader: { paddingVertical: 24, alignItems: "center" },
});
