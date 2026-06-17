export const ADS_ENABLED = true;
export const SHOW_BANNER = true;
export const SHOW_INTERSTITIAL = true;
export const SHOW_NATIVE = true;
export const SHOW_REWARDED = false;

export const ADMOB_IDS = {
  appId: process.env.EXPO_PUBLIC_ADMOB_APP_ID ?? "",
  banner: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID ?? "",
  interstitial: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ?? "",
  native: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID ?? "ca-app-pub-4094611521207676/1019941343",
  rewarded: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID ?? "",
};
