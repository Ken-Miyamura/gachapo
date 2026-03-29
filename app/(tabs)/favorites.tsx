import { useCallback, useEffect, useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getRarityColor } from "@/constants/Colors";
import { useGacha } from "@/contexts/GachaContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { FavoriteEntry, GachaItem } from "@/types";

interface FavWithData extends FavoriteEntry {
  item?: GachaItem;
  themeIcon?: string;
  themeName?: string;
}

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { favorites, loadFavorites, removeFav, themes, loadThemes, itemsByTheme, loadItems } =
    useGacha();

  useEffect(() => {
    loadThemes();
    loadFavorites();
  }, [loadThemes, loadFavorites]);

  // Load items for all themes that have favorites
  useEffect(() => {
    const themeIds = new Set(favorites.map((f) => f.theme_id));
    themeIds.forEach((tid) => {
      const theme = themes.find((t) => t.theme_id === tid);
      if (theme && !itemsByTheme[tid]) {
        loadItems(theme);
      }
    });
  }, [favorites, themes, itemsByTheme, loadItems]);

  const favsWithData: FavWithData[] = useMemo(() => {
    return favorites.map((fav) => {
      const theme = themes.find((t) => t.theme_id === fav.theme_id);
      const themeItems = itemsByTheme[fav.theme_id] ?? [];
      const item = themeItems.find((i) => i.id === fav.item_id);
      return {
        ...fav,
        item,
        themeIcon: theme?.icon,
        themeName: theme?.name,
      };
    });
  }, [favorites, themes, itemsByTheme]);

  const handleDelete = useCallback(
    (fav: FavoriteEntry) => {
      removeFav(fav.theme_id, fav.item_id);
    },
    [removeFav],
  );

  const listHeader = (
    <View style={styles.headingArea}>
      <Text style={[styles.headingTitle, { color: colors.text }]}>お気に入りのカード</Text>
      <Text style={[styles.headingSub, { color: colors.textSecondary }]}>
        テーマをまたいで一覧表示。左スワイプで外せます。
      </Text>
    </View>
  );

  if (favsWithData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.listPadding}>{listHeader}</View>
        <View style={styles.emptyArea}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>❤️</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            お気に入りはまだありません
          </Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
            ガチャ結果から♥をタップして追加しよう
          </Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item }: { item: FavWithData }) => {
    const rarityColor = item.item ? getRarityColor(item.item.rarity) : colors.cardBorder;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            borderLeftColor: rarityColor,
            borderLeftWidth: 4,
          },
        ]}
      >
        {/* Top row: badges + remove button */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardBadges}>
            <View style={[styles.favBadge, { backgroundColor: colors.accent1 }]}>
              <Text style={styles.favBadgeText}>❤ お気に入り</Text>
            </View>
            {item.themeIcon && item.themeName && (
              <View style={[styles.themeLabelBadge, { backgroundColor: colors.cardBorder }]}>
                <Text style={styles.themeLabelIcon}>{item.themeIcon}</Text>
                <Text style={[styles.themeLabelText, { color: colors.textSecondary }]}>
                  {item.themeName}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.removeBtn, { borderColor: colors.cardBorder }]}
            onPress={() => handleDelete(item)}
          >
            <Text style={[styles.removeBtnText, { color: colors.textSecondary }]}>外す</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {item.item ? (
          <>
            <Text style={[styles.cardText, { color: colors.text }]} numberOfLines={2}>
              {item.item.text}
            </Text>
            {item.item.subtitle ? (
              <Text style={[styles.cardSub, { color: colors.accent1 }]} numberOfLines={1}>
                {item.item.subtitle}
              </Text>
            ) : null}
            {item.item.source || item.item.character ? (
              <Text style={[styles.cardSource, { color: colors.textSecondary }]} numberOfLines={1}>
                {[item.item.source, item.item.character].filter(Boolean).join(" / ")}
              </Text>
            ) : null}
            <Text style={[styles.cardCategory, { color: colors.textSecondary }]}>
              {item.item.category}
            </Text>
          </>
        ) : (
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>読み込み中...</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={favsWithData}
        keyExtractor={(item, index) => `${item.theme_id}_${item.item_id}_${index}`}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  listPadding: { padding: 16 },

  // Heading
  headingArea: { marginBottom: 16 },
  headingTitle: { fontSize: 26, fontWeight: "800", marginBottom: 6 },
  headingSub: { fontSize: 14, lineHeight: 20 },

  // Empty
  emptyArea: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 80 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySubText: { fontSize: 13, marginTop: 8 },

  // Card
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardBadges: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" },
  favBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  favBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  themeLabelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  themeLabelIcon: { fontSize: 14, marginRight: 4 },
  themeLabelText: { fontSize: 12, fontWeight: "600" },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 8,
  },
  removeBtnText: { fontSize: 13, fontWeight: "600" },

  cardText: { fontSize: 18, fontWeight: "700", lineHeight: 26, marginBottom: 4 },
  cardSub: { fontSize: 13, fontWeight: "500", marginBottom: 2 },
  cardSource: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  cardCategory: { fontSize: 12, marginTop: 4 },
});
