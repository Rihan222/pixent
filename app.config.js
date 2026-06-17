module.exports = {
  expo: {
    name: "Pixent",
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "pixent",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#0D0D0F"
    },
    ios: {
      supportsTablet: false,
      infoPlist: {
        NSPhotoLibraryUsageDescription: "Pixent saves downloaded media to your photo library."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#0D0D0F"
      },
      permissions: [
        "android.permission.INTERNET",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
        "android.permission.ACCESS_MEDIA_LOCATION",
        "android.permission.READ_MEDIA_AUDIO"
      ],
      package: "com.rihanhadla.mobile"
    },
    web: {
      favicon: "./assets/images/icon.png"
    },
    plugins: [
      [
        "expo-router",
        {
          origin: "https://replit.com/"
        }
      ],
      "expo-font",
      "expo-web-browser",
      "expo-av",
      [
        "expo-media-library",
        {
          photosPermission: "Pixent saves downloaded media to your photo library.",
          savePhotosPermission: "Pixent saves downloaded media to your photo library.",
          isAccessMediaLocationEnabled: true
        }
      ],
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID,
          iosAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID
        }
      ],
      "expo-audio",
      "expo-asset"
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      router: {
        origin: "https://replit.com/"
      },
      eas: {
        projectId: "e875729a-d244-4f46-9816-62cd8400a410"
      }
    }
  }
};