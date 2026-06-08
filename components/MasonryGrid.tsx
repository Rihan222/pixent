import React, { useMemo } from "react";
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

  const columns = useMemo(() => {
    const cols: T[][] = Array.from({ length: numColumns }, () => []);
    data.forEach((item, i) => {
      cols[i % numColumns]!.push(item);
    });
    return cols;
  }, [data, numColumns]);

  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    if (distanceFromBottom < 200) {
      onEndReached?.();
    }
  };

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
        <View style={[styles.grid, { gap: columnGap, paddingHorizontal: columnGap }]}>
          {columns.map((col, colIndex) => (
            <View key={colIndex} style={[styles.column, { gap: columnGap }]}>
              {col.map((item, i) => (
                <View key={keyExtractor(item)}>{renderItem(item, colIndex * col.length + i)}</View>
              ))}
            </View>
          ))}
        </View>
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
