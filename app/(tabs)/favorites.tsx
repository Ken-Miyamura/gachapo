import { useCallback, useEffect, useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getRarityColor, getRarityGlow, getRarityStars } from "@/constants/Colors";
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

  useEffect(() => {
    const themeIds = new Set(favorites.map((f) => f.theme_id));
    themeIds.forEach((tid) => {
      const theme = themes.find((t) => t.theme_id === tid);
      if (theme && !itemsByTheme[tid]) loadItems(theme);
    });
  }, [favorites, themes, itemsByTheme, loadItems]);

  const favsWithData: FavWithData[] = useMemo(() => {
    return favorites.map((fav) => {
      const theme = themes.find((t) => t.theme_id === fav.theme_id);
      const themeItems = itemsByTheme[fav.theme_id] ?? [];
      const item = themeItems.find((i) => i.id === fav.item_id);
      return { ...fav, item, themeIcon: theme?.icon, themeName: theme?.name };
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
      <Text style={[styles.headingTitle, { color: colors.text }]}>お気に入り</Text>
      <Text style={[styles.headingSub, { color: colors.textSecondary }]}>
        テーマをまたいで一覧表示。
      </Text>
    </View>
  );

  if (favsWithData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.listPadding}>{listHeader}</View>
        <View style={styles.emptyArea}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={{ fontSize: 36 }}>❤️</Text>
          </View>
          <Text style={[styles.emptyText, { color: colors.text }]}>お気に入りはまだありません</Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
            ガチャ結果から♥をタップして追加しよう
          </Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: FavWithData; index: number }) => {
    const rarityColor = item.item ? getRarityColor(item.item.rarity) : colors.cardBorder;
    const glow = item.item ? getRarityGlow(item.item.rarity) : {};

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
        <View
          style={[
            styles.card,
            glow,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {/* Rarity strip */}
          <View style={[styles.cardStrip, { backgroundColor: rarityColor }]} />

          <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardBadges}>
                {item.themeIcon && item.themeName && (
                  <View style={[styles.themeBadge, { backgroundColor: colors.cardHighlight }]}>
                    <Text style={styles.themeBadgeIcon}>{item.themeIcon}</Text>
                    <Text style={[styles.themeBadgeText, { color: colors.textSecondary }]}>
                      {item.themeName}
                    </Text>
                  </View>
                )}
                {item.item && (
                  <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                    <Text style={styles.rarityText}>{getRarityStars(item.item.rarity)}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.removeBtn, { backgroundColor: colors.cardHighlight }]}
                onPress={() => handleDelete(item)}
              >
                <Text style={[styles.removeBtnText, { color: colors.textSecondary }]}>外す</Text>
              </TouchableOpacity>
            </View>

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
                  <Text
                    style={[styles.cardSource, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
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
        </View>
      </Animated.View>
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
  list: { padding: 20 },
  listPadding: { padding: 20 },

  headingArea: { marginBottom: 18 },
  headingTitle: { fontSize: 26, fontWeight: "800", marginBottom: 6, letterSpacing: -0.5 },
  headingSub: { fontSize: 14, lineHeight: 20, opacity: 0.7 },

  emptyArea: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 80 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: { fontSize: 16, fontWeight: "700" },
  emptySubText: { fontSize: 13, marginTop: 8, opacity: 0.6 },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  cardStrip: { height: 3, width: "100%" },
  cardBody: { padding: 18 },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardBadges: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" },
  themeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  themeBadgeIcon: { fontSize: 13, marginRight: 4 },
  themeBadgeText: { fontSize: 11, fontWeight: "600" },
  rarityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rarityText: { color: "#FFF", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, marginLeft: 8 },
  removeBtnText: { fontSize: 12, fontWeight: "600" },

  cardText: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 25,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardSub: { fontSize: 13, fontWeight: "500", marginBottom: 2 },
  cardSource: { fontSize: 12, fontWeight: "500", opacity: 0.6, marginBottom: 2 },
  cardCategory: { fontSize: 11, marginTop: 6, opacity: 0.45 },
});
