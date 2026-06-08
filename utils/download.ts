import { Platform, Alert } from "react-native";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";

/**
 * Downloads a media file and saves it to the device's gallery (phone memory).
 * Falls back to sharing the file if the Media Library is not available.
 */
export async function downloadMediaFile(
  url: string,
  filePrefix: string,
  extension: string,
  onProgress?: (progress: number) => void
): Promise<boolean> {
  // Web implementation
  if (Platform.OS === "web") {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filePrefix}_${Date.now()}.${extension}`;
      link.click();
      return true;
    } catch (error) {
      console.error("[Download] Web download failed:", error);
      Alert.alert("فشل التحميل", "لا يمكن تحميل الملف في المتصفح.");
      return false;
    }
  }

  // Native implementation
  try {
    const dir = FileSystemLegacy.cacheDirectory;
    const filename = `${filePrefix}_${Date.now()}.${extension}`;
    const fileUri = `${dir}${filename}`;

    console.log(`[Download] Downloading to: ${fileUri}`);
    
    let downloadResult;
    
    if (onProgress) {
      const callback = (downloadProgress: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
        const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
        onProgress(Math.min(Math.max(progress, 0), 100));
      };

      const downloadResumable = FileSystemLegacy.createDownloadResumable(
        url,
        fileUri,
        {},
        callback
      );

      downloadResult = await downloadResumable.downloadAsync();
    } else {
      downloadResult = await FileSystemLegacy.downloadAsync(url, fileUri);
    }

    if (!downloadResult || downloadResult.status !== 200) {
      throw new Error(`Download failed with status: ${downloadResult?.status}`);
    }

    // Try to save to media library (gallery)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status === "granted") {
        console.log("[Download] Permission granted, saving to media library...");
        await MediaLibrary.createAssetAsync(downloadResult.uri);
        return true;
      } else {
        throw new Error("Media library permission denied");
      }
    } catch (libError) {
      console.warn("[Download] MediaLibrary error:", libError);
      throw libError;
    }
  } catch (error) {
    console.error("[Download] Error:", error);
    throw error;
  }
}
