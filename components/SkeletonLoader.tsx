import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height = 16, borderRadius, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          borderRadius: borderRadius ?? 8,
          backgroundColor: colors.border,
          opacity,
        },
        // width/height must be applied as a separate spread to avoid union type mismatch
        typeof width === "number"
          ? { width, height: height as number }
          : { width: "100%", height: height as number },
        style,
      ]}
    />
  );
}

export function PhotoSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.photoSkeleton, { backgroundColor: colors.card }]}>
      <Skeleton height={180} borderRadius={0} />
      <View style={styles.photoSkeletonFooter}>
        <Skeleton width={80} height={12} />
        <Skeleton width={60} height={12} />
      </View>
    </View>
  );
}

export function SoundSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.soundSkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.soundSkeletonText}>
        <Skeleton height={14} width={160} />
        <Skeleton height={12} width={100} style={{ marginTop: 6 }} />
        <Skeleton height={8} width="100%" style={{ marginTop: 10, borderRadius: 4 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photoSkeleton: { borderRadius: 8, overflow: "hidden", marginBottom: 8 },
  photoSkeletonFooter: { padding: 8, gap: 4 },
  soundSkeleton: { flexDirection: "row", padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 12, alignItems: "center" },
  soundSkeletonText: { flex: 1 },
});
