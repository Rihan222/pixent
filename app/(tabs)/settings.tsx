import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettingsStore } from "@/store/settingsStore";
import { useColors } from "@/hooks/useColors";

interface SettingRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

function SettingRow({ icon, label, value, onPress, rightElement }: SettingRowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>}
        {rightElement}
        {onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { theme, load, setTheme } = useSettingsStore();

  useEffect(() => {
    load();
  }, [load]);

  const handleContactDev = () => {
    Linking.openURL("mailto:rihanapp26@gmail.com?subject=Pixent App Support");
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPadding + 120 }}
    >
      <View style={{ paddingTop: topPadding + 8, paddingHorizontal: 16, marginBottom: 20 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </View>

      <SectionHeader title="Appearance" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="moon"
          label="Theme"
          value={theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}
          onPress={() => {
            const next = theme === "system" ? "dark" : theme === "dark" ? "light" : "system";
            setTheme(next);
          }}
        />
      </View>

      <SectionHeader title="Support" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="mail"
          label="Contact Developer"
          onPress={handleContactDev}
        />
      </View>

      <SectionHeader title="About" />
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow icon="info" label="Version" value="1.0.0" />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          Powered by Pexels · Pixabay · Freesound
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  sectionHeader: { fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 16, marginBottom: 6, marginTop: 20 },
  section: { borderRadius: 14, marginHorizontal: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 14 },
  footer: { marginTop: 32, alignItems: "center" },
  footerText: { fontSize: 12 },
});
