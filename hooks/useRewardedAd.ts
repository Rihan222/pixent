import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { showRewarded } from "@/services/adsManager";

export function useRewardedAd() {
  const [adLoading, setAdLoading] = useState(false);

  const runWithReward = useCallback((onSuccess: () => void) => {
    setAdLoading(true);
    showRewarded(
      () => {
        setAdLoading(false);
        onSuccess();
      },
      (errorMsg) => {
        setAdLoading(false);
        Alert.alert(
          "مشاهدة إعلان",
          errorMsg,
          [
            {
              text: "إعادة المحاولة",
              onPress: () => runWithReward(onSuccess),
            },
            {
              text: "إلغاء",
              style: "cancel",
            },
          ],
          { cancelable: false }
        );
      },
      (loading) => {
        setAdLoading(loading);
      }
    );
  }, []);

  return {
    runWithReward,
    adLoading,
  };
}
