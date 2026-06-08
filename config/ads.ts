export const ADS_ENABLED = false;
export const SHOW_BANNER = true;
export const SHOW_INTERSTITIAL = true;
export const SHOW_NATIVE = false;
export const SHOW_REWARDED = false;

export const ADMOB_IDS = {
  appId: process.env.EXPO_PUBLIC_ADMOB_APP_ID ?? "",
  banner: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID ?? "",
  interstitial: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ?? "",
  native: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID ?? "",
  rewarded: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID ?? "",
};
