import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useGacha } from "@/contexts/GachaContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/types";

const { width } = Dimensions.get("window");
const CARD_GAP = 14;
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2;

export default function ThemeSelectScreen() {
  const { colors, mode, setMode, scheme } = useTheme();
  const { themes, loadThemes, themesLoading, selectTheme } = useGacha();
  const router = useRouter();

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(() => {
    loadThemes(true);
    setRefreshKey((k) => k + 1);
  }, [loadThemes]);

  const handleThemePress = (theme: Theme) => {
    selectTheme(theme);
    router.push("/gacha");
  };

  const cycleThemeMode = () => {
    if (mode === "system") setMode("light");
    else if (mode === "light") setMode("dark");
    else setMode("system");
  };

  const themeSymbol =
    scheme === "dark"
      ? { ios: "sun.max.fill" as const, android: "light_mode" as const, web: "light_mode" as const }
      : { ios: "moon.fill" as const, android: "dark_mode" as const, web: "dark_mode" as const };

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerTextArea}>
          <Text style={[styles.appLabel, { color: colors.primary }]}>GACHAPO</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>テーマをえらぼう</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            テーマを選んで、気分に合わせてガチャを回そう！
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.actionCircle,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={cycleThemeMode}
            accessibilityLabel="テーマモード切替"
          >
            <SymbolView
              name={themeSymbol}
              tintColor={scheme === "dark" ? colors.accent2 : colors.primary}
              size={18}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionCircle,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={onRefresh}
            accessibilityLabel="データを更新"
          >
            <SymbolView
              name={{ ios: "arrow.clockwise", android: "refresh", web: "refresh" }}
              tintColor={scheme === "dark" ? colors.accent2 : colors.primary}
              size={18}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderCard = ({ item, index }: { item: Theme; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 80)
        .duration(400)
        .springify()}
    >
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        activeOpacity={0.75}
        onPress={() => handleThemePress(item)}
      >
        {/* Top highlight line */}
        <View style={[styles.cardHighlight, { backgroundColor: colors.cardHighlight }]} />
        <View style={styles.cardContent}>
          <View style={[styles.iconWrap, { backgroundColor: colors.cardHighlight }]}>
            <Text style={styles.icon}>{item.icon}</Text>
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={3}>
            {item.description}
          </Text>
          {item.has_location && (
            <View style={[styles.mapBadge, { backgroundColor: `${colors.accent3}18` }]}>
              <Text style={[styles.mapBadgeText, { color: colors.accent3 }]}>📍 マップ対応</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  if (themesLoading && themes.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>読み込み中...</Text>
      </View>
    );
  }

  if (!themesLoading && themes.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          テーマを取得できませんでした。{"\n"}下に引っ張って再試行してください。
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={themes}
        keyExtractor={(item) => `${item.theme_id}_${refreshKey}`}
        renderItem={renderCard}
        numColumns={2}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={themesLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  header: { marginBottom: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerTextArea: { flex: 1, marginRight: 12 },
  appLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  headerTitle: { fontSize: 28, fontWeight: "800", marginBottom: 8, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, lineHeight: 21, opacity: 0.8 },
  headerActions: { gap: 10, alignItems: "center" },
  actionCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: { padding: 20 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },

  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHighlight: {
    height: 3,
    width: "100%",
  },
  cardContent: {
    padding: 18,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  icon: { fontSize: 28 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6, letterSpacing: -0.2 },
  cardDesc: { fontSize: 12, lineHeight: 18, opacity: 0.75 },
  mapBadge: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mapBadgeText: { fontSize: 11, fontWeight: "600" },

  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: { fontSize: 14, textAlign: "center", lineHeight: 22 },
});
