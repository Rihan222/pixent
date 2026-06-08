import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

interface CategoryChipsProps {
  categories: string[];
  selected: string;
  onSelect: (cat: string) => void;
}

export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((cat) => {
        const isSelected = cat === selected;
        return (
          <TouchableOpacity
            key={cat}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.secondary,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onSelect(cat);
            }}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "500" },
});
