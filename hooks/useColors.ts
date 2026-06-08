import { useColorScheme } from "react-native";
import colors from "@/constants/colors";
import { useSettingsStore } from "@/store/settingsStore";

type Palette = typeof colors.light;

/**
 * Returns the design tokens for the current color scheme.
 * Respects the app theme setting (system, light, dark).
 */
export function useColors(): Palette & { radius: number; isDark: boolean } {
  const systemScheme = useColorScheme();
  const themeSetting = useSettingsStore((s) => s.theme);

  const isDark =
    themeSetting === "dark" ||
    (themeSetting === "system" && systemScheme === "dark");

  const palette: Palette = isDark ? (colors.dark as Palette) : colors.light;

  return { ...palette, radius: colors.radius, isDark };
}
