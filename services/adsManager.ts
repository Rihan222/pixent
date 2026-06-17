import { Platform, AppState } from "react-native";
import {
  ADS_ENABLED,
  SHOW_BANNER,
  SHOW_INTERSTITIAL,
  SHOW_NATIVE,
  SHOW_REWARDED,
  ADMOB_IDS,
} from "@/config/ads";

// ── Safe Module Loading ──────────────────────────────────────────────
let mobileAdsModule: any = null;
let BannerAd: any = null;
let BannerAdSize: any = { ANCHORED_ADAPTIVE_BANNER: "ANCHORED_ADAPTIVE_BANNER" };
let TestIds: any = { BANNER: "test-banner", INTERSTITIAL: "test-interstitial", REWARDED: "test-rewarded" };
let AdEventType: any = { LOADED: "loaded", ERROR: "error", CLOSED: "closed" };
let RewardedAdEventType: any = { LOADED: "loaded", EARNED_REWARD: "earned_reward" };
let InterstitialAd: any = null;
let RewardedAd: any = null;

try {
  if (Platform.OS !== "web") {
    const GoogleMobileAds = require("react-native-google-mobile-ads");
    mobileAdsModule = GoogleMobileAds.default;
    BannerAd = GoogleMobileAds.BannerAd;
    BannerAdSize = GoogleMobileAds.BannerAdSize;
    TestIds = GoogleMobileAds.TestIds;
    AdEventType = GoogleMobileAds.AdEventType;
    RewardedAdEventType = GoogleMobileAds.RewardedAdEventType;
    InterstitialAd = GoogleMobileAds.InterstitialAd;
    RewardedAd = GoogleMobileAds.RewardedAd;
  }
} catch (error) {
  console.warn("[AdMob] Native module not found, ads will be disabled.");
}

const isModuleAvailable = !!mobileAdsModule;

// ── Helpers ──────────────────────────────────────────────────────────
export function isAdsEnabled(): boolean {
  return ADS_ENABLED && isModuleAvailable;
}

export function getBannerAdId(): string {
  if (__DEV__) {
    return TestIds.BANNER;
  }
  return ADMOB_IDS.banner || TestIds.BANNER;
}

export function getInterstitialAdId(): string {
  if (__DEV__) {
    return TestIds.INTERSTITIAL;
  }
  return ADMOB_IDS.interstitial || TestIds.INTERSTITIAL;
}

export function getNativeAdId(): string {
  if (__DEV__) {
    return TestIds.BANNER;
  }
  return ADMOB_IDS.native || TestIds.BANNER;
}

export function getRewardedAdId(): string {
  if (__DEV__) {
    return TestIds.REWARDED;
  }
  return ADMOB_IDS.rewarded || TestIds.REWARDED;
}

// ── Re-exports for components ────────────────────────────────────────
export { BannerAd, BannerAdSize };

// ── Initialize ───────────────────────────────────────────────────────
export function initAdMob() {
  if (!ADS_ENABLED || Platform.OS === "web" || !isModuleAvailable) return;

  try {
    mobileAdsModule()
      .initialize()
      .then((adapterStatuses: any) => {
        console.log("[AdMob] SDK initialized:", adapterStatuses);
        const preloadAds = () => {
          if (SHOW_INTERSTITIAL) preloadInterstitial();
          if (SHOW_REWARDED) preloadRewarded();
        };
        if (AppState.currentState === "active") {
          setTimeout(preloadAds, 500);
        } else {
          const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
              setTimeout(preloadAds, 500);
              subscription.remove();
            }
          });
        }
      })
      .catch((err: any) => {
        console.error("[AdMob] SDK init error:", err);
      });
  } catch (err) {
    console.error("[AdMob] Failed to call initialize:", err);
  }
}

// ── Interstitial ─────────────────────────────────────────────────────
let interstitialAdInstance: any = null;

export function preloadInterstitial() {
  if (!ADS_ENABLED || !SHOW_INTERSTITIAL || Platform.OS === "web" || !isModuleAvailable) return;

  try {
    const adUnitId = getInterstitialAdId();
    console.log("[AdMob] Preloading interstitial ad with ID:", adUnitId);
    interstitialAdInstance = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    interstitialAdInstance.addAdEventListener(AdEventType.LOADED, () => {
      console.log("[AdMob] Interstitial loaded successfully");
    });

    interstitialAdInstance.addAdEventListener(AdEventType.ERROR, (error: any) => {
      const isNoFill = error?.message?.includes('no-fill') || error?.code === 'no-fill';
      if (!isNoFill) {
        console.error("[AdMob] Interstitial load error:", error);
      }
      interstitialAdInstance = null;
    });

    interstitialAdInstance.addAdEventListener(AdEventType.CLOSED, () => {
      console.log("[AdMob] Interstitial closed");
      interstitialAdInstance = null;
      preloadInterstitial();
    });

    interstitialAdInstance.load();
  } catch (error) {
    console.error("[AdMob] preloadInterstitial exception:", error);
    interstitialAdInstance = null;
  }
}

export async function showInterstitial(): Promise<boolean> {
  if (!ADS_ENABLED || !SHOW_INTERSTITIAL || Platform.OS === "web" || !isModuleAvailable) return false;

  try {
    if (interstitialAdInstance) {
      await interstitialAdInstance.show();
      return true;
    }
    preloadInterstitial();
    return false;
  } catch (error) {
    console.error("[AdMob] showInterstitial error:", error);
    interstitialAdInstance = null;
    preloadInterstitial();
    return false;
  }
}

// ── Rewarded ─────────────────────────────────────────────────────────
let rewardedAdInstance: any = null;

export function preloadRewarded() {
  if (!ADS_ENABLED || !SHOW_REWARDED || Platform.OS === "web" || !isModuleAvailable) return;

  try {
    const adUnitId = getRewardedAdId();
    rewardedAdInstance = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    rewardedAdInstance.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log("[AdMob] Rewarded loaded");
    });

    rewardedAdInstance.addAdEventListener(AdEventType.ERROR, (error: any) => {
      const isNoFill = error?.message?.includes('no-fill') || error?.code === 'no-fill';
      if (!isNoFill) {
        console.error("[AdMob] Rewarded load error:", error);
      }
      rewardedAdInstance = null;
    });

    rewardedAdInstance.load();
  } catch (error) {
    console.error("[AdMob] preloadRewarded exception:", error);
    rewardedAdInstance = null;
  }
}

export function showRewarded(
  onEarned: () => void,
  onFailed: (errorMsg: string) => void,
  onLoadingStatusChange?: (loading: boolean) => void
) {
  if (!ADS_ENABLED || !SHOW_REWARDED || Platform.OS === "web" || !isModuleAvailable) {
    onEarned();
    return;
  }

  if (rewardedAdInstance) {
    try {
      let earnedReward = false;
      const currentAd = rewardedAdInstance;

      const rewardListener = currentAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward: any) => {
          earnedReward = true;
        }
      );

      const closedListener = currentAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          rewardListener();
          closedListener();
          rewardedAdInstance = null;
          preloadRewarded();

          if (earnedReward) {
            onEarned();
          } else {
            onFailed("يجب مشاهدة الإعلان بالكامل للحصول على المكافأة وتحميل الملف.");
          }
        }
      );

      currentAd.show().catch((err: any) => {
        rewardListener();
        closedListener();
        rewardedAdInstance = null;
        preloadRewarded();
        onFailed("حدث خطأ أثناء عرض الإعلان. يرجى المحاولة مرة أخرى.");
      });
    } catch (error) {
      rewardedAdInstance = null;
      preloadRewarded();
      onFailed("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
    }
  } else {
    onLoadingStatusChange?.(true);
    preloadRewarded();
    onFailed("الإعلان جاري تحميله حالياً. يرجى المحاولة خلال ثوانٍ معدودة.");
  }
}
