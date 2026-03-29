import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
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
import { useGacha } from "@/contexts/GachaContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/types";

const { width } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_WIDTH = (width - 32 - CARD_GAP) / 2;

export default function ThemeSelectScreen() {
  const { colors, mode, setMode, scheme } = useTheme();
  const { themes, loadThemes, themesLoading, selectTheme } = useGacha();
  const router = useRouter();

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  const onRefresh = useCallback(() => {
    loadThemes(true);
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

  const themeIcon = scheme === "dark" ? "☀️" : "🌙";

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerTextArea}>
          <Text style={[styles.appLabel, { color: colors.accent1 }]}>ガチャポ</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>テーマをえらぼう</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            テーマを選んで、気分に合わせてガチャを回そう！
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionCircle, { borderColor: colors.cardBorder }]}
            onPress={cycleThemeMode}
          >
            <Text style={styles.actionIcon}>{themeIcon}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCircle, { borderColor: colors.cardBorder }]}
            onPress={onRefresh}
          >
            <Text style={styles.actionIcon}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderCard = ({ item }: { item: Theme }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      activeOpacity={0.7}
      onPress={() => handleThemePress(item)}
    >
      <Text style={styles.icon}>{item.icon}</Text>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={3}>
        {item.description}
      </Text>
      {item.has_location && (
        <View style={[styles.mapBadge, { backgroundColor: `${colors.primary}30` }]}>
          <Text style={[styles.mapBadgeText, { color: colors.accent1 }]}>📍 マップ対応</Text>
        </View>
      )}
    </TouchableOpacity>
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
        keyExtractor={(item) => item.theme_id}
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
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  header: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextArea: {
    flex: 1,
    marginRight: 12,
  },
  appLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 14,
    lineHeight: 20,
  },
  headerActions: {
    gap: 10,
    alignItems: "center",
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  actionIcon: {
    fontSize: 20,
  },
  list: {
    padding: 16,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "flex-start",
    minHeight: 160,
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  mapBadge: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mapBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
