import React, { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { SHOW_BANNER } from "@/config/ads";
import { isAdsEnabled, getBannerAdId, BannerAd, BannerAdSize } from "@/services/adsManager";
import { useColors } from "@/hooks/useColors";

export function BannerAdView() {
  const colors = useColors();
  const [adLoaded, setAdLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const enabled = isAdsEnabled() && SHOW_BANNER;

  console.log("[BannerAdView] Enabled:", enabled, "SHOW_BANNER:", SHOW_BANNER, "Platform:", Platform.OS);

  if (!enabled || Platform.OS === "web") {
    console.log("[BannerAdView] Returning null - enabled:", enabled, "isWeb:", Platform.OS === "web");
    return null;
  }

  const adUnitId = getBannerAdId();
  console.log("[BannerAdView] Ad Unit ID:", adUnitId);
  if (!adUnitId || !BannerAd) {
    console.log("[BannerAdView] No ad unit ID or BannerAd component not available");
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card },
        !adLoaded && styles.hidden,
      ]}
    >
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log("[AdMob] Banner ad loaded");
          setAdLoaded(true);
        }}
        onAdFailedToLoad={(error: any) => {
          // Suppress no-fill and invalid-request errors as they're normal in development
          const isNoFill = error?.message?.includes('no-fill') || error?.code === 'no-fill';
          const isInvalidRequest = error?.message?.includes('invalid-request') || error?.code === 'invalid-request';
          console.error("[AdMob] Banner failed to load:", { code: error?.code, message: error?.message, isNoFill, isInvalidRequest });
          setAdLoaded(false);
          setHasError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
    width: "100%",
  },
  hidden: {
    height: 0,
    overflow: "hidden",
    margin: 0,
    padding: 0,
  },
});
