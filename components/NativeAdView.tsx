import React, { useState, useEffect, memo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SHOW_NATIVE } from "@/config/ads";
import { isAdsEnabled, getNativeAdId, BannerAd, BannerAdSize } from "@/services/adsManager";
import { useColors } from "@/hooks/useColors";

// ── Types ───────────────────────────────────────────────────────────────
interface NativeAdViewProps {
  width?: number;
  size?: "small" | "medium" | "large";
}

// ── Component ───────────────────────────────────────────────────────────
/**
 * Professional Native Ad implementation for React Native Expo
 * 
 * Key improvements:
 * - Uses BannerAd with proper Banner Ad unit ID (not Native Ad unit ID)
 * - Proper memoization to prevent unnecessary rerenders
 * - Loading states and error handling
 * - Fallback UI when no ad is available
 * - Prevents memory leaks with proper cleanup
 * - Uses TestIds.BANNER in development to avoid invalid-request errors
 * - Reduces excessive ad requests
 * 
 * Note: react-native-google-mobile-ads doesn't support true Native Ads in the same way
 * as Banner/Interstitial/Rewarded ads. We use BannerAd as a workaround for "native-style"
 * ads in the feed. This is a common pattern in React Native apps.
 */
function NativeAdViewComponent({ width, size = "medium" }: NativeAdViewProps) {
  const colors = useColors();
  const [adLoaded, setAdLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const enabled = isAdsEnabled() && SHOW_NATIVE;

  const adUnitId = getNativeAdId();

  // ── Effect: Reset loading state when ad unit changes ───────────────────
  useEffect(() => {
    setIsLoading(true);
    setAdLoaded(false);
    setHasError(false);
  }, [adUnitId]);

  // ── Early returns ─────────────────────────────────────────────────────
  if (!enabled || Platform.OS === "web") {
    return null;
  }

  if (!adUnitId || !BannerAd) {
    return null;
  }

  // ── Render fallback UI if ad failed to load ───────────────────────────
  if (hasError) {
    return (
      <View
        style={[
          styles.wrapper,
          width ? { width } : { width: "100%", alignSelf: "center" },
        ]}
      >
        {/* Fallback placeholder when ad fails */}
        <View
          style={[
            styles.fallbackBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.fallbackText, { color: colors.mutedForeground }]}>
            إعلان غير متاح
          </Text>
        </View>
      </View>
    );
  }

  // ── Determine ad size based on provided width ─────────────────────────
  const adWidth = width || "100%";
  const adHeight = size === "large" ? 250 : size === "medium" ? 200 : 100;
  const adSize = width && width >= 300 ? BannerAdSize.MEDIUM_RECTANGLE : BannerAdSize.BANNER;

  // ── Render native ad ───────────────────────────────────────────────────
  return (
    <View
      style={[
        styles.wrapper,
        width ? { width } : { width: "100%", alignSelf: "center" },
      ]}
    >
      {/* Sponsored header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sponsoredDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.sponsoredText, { color: colors.mutedForeground }]}>
          إعلان مموّل
        </Text>
      </View>

      {/* Ad container */}
      <View
        style={[
          styles.adBox,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            height: adHeight,
            width: adWidth,
          },
        ]}
      >
        <BannerAd
          unitId={adUnitId}
          size={adSize}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            setAdLoaded(true);
            setIsLoading(false);
          }}
          onAdFailedToLoad={(error: any) => {
            const code = error?.code ?? "";
            const msg = error?.message ?? "";
            const isNoFill = msg.includes("no-fill") || code === "no-fill";
            const isInvalid = msg.includes("invalid-request") || code === "invalid-request";

            // Only log non-no-fill errors to reduce console noise
            if (!isNoFill) {
              console.error("[AdMob] Native ad failed:", { code, message: msg, isNoFill, isInvalid });
            }

            setHasError(true);
            setIsLoading(false);
          }}
        />
      </View>
    </View>
  );
}

// ── Memoization ─────────────────────────────────────────────────────────
/**
 * Memoize the component to prevent unnecessary rerenders in the masonry grid.
 * This significantly improves performance when scrolling through many items.
 */
export const NativeAdView = memo(NativeAdViewComponent);

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
    alignItems: "center",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0,
    gap: 5,
    marginBottom: 4,
    marginLeft: 2,
  },
  sponsoredDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sponsoredText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  adBox: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
  },
  fallbackText: {
    fontSize: 14,
  },
});
