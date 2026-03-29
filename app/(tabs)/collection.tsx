import { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getRarityColor, getRarityStars } from "@/constants/Colors";
import { useGacha } from "@/contexts/GachaContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { GachaItem } from "@/types";
import * as storageUtils from "@/utils/storage";

const { width } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_WIDTH = (width - 32 - CARD_GAP) / 2;

export default function CollectionScreen() {
  const { colors } = useTheme();
  const { themes, loadThemes, loadItems, collected, itemsByTheme } = useGacha();
  const [activeThemeId, setActiveThemeId] = useState<string>("");
  const [category, setCategory] = useState("すべて");
  const [modalItem, setModalItem] = useState<GachaItem | null>(null);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  useEffect(() => {
    if (themes.length > 0 && !activeThemeId) {
      setActiveThemeId(themes[0].theme_id);
    }
  }, [themes, activeThemeId]);

  const activeTheme = themes.find((t) => t.theme_id === activeThemeId);

  useEffect(() => {
    if (activeTheme) {
      loadItems(activeTheme);
    }
  }, [activeTheme, loadItems]);

  const themeItems = activeThemeId ? (itemsByTheme[activeThemeId] ?? []) : [];
  const themeCollected = activeThemeId ? (collected[activeThemeId] ?? []) : [];

  useEffect(() => {
    if (activeThemeId && !collected[activeThemeId]) {
      storageUtils.getCollected(activeThemeId);
    }
  }, [activeThemeId, collected]);

  const categories = useMemo(() => {
    const cats = new Set(themeItems.map((i) => i.category));
    return ["すべて", ...Array.from(cats)];
  }, [themeItems]);

  const filteredItems = useMemo(() => {
    if (category === "すべて") return themeItems;
    return themeItems.filter((i) => i.category === category);
  }, [themeItems, category]);

  const collectedCount = themeItems.filter((i) => themeCollected.includes(i.id)).length;
  const totalCount = themeItems.length;
  const pct = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  const renderCard = ({ item }: { item: GachaItem }) => {
    const isCollected = themeCollected.includes(item.id);
    const rarityColor = getRarityColor(item.rarity);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            borderLeftColor: rarityColor,
            borderLeftWidth: 3,
          },
        ]}
        activeOpacity={isCollected ? 0.7 : 1}
        onPress={() => isCollected && setModalItem(item)}
      >
        <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
          <Text style={styles.rarityText}>{getRarityStars(item.rarity)}</Text>
        </View>
        {isCollected ? (
          <>
            <Text style={[styles.cardText, { color: colors.text }]} numberOfLines={3}>
              {item.text}
            </Text>
            {item.subtitle ? (
              <Text style={[styles.cardSub, { color: colors.accent1 }]} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
            {item.source || item.character ? (
              <Text style={[styles.cardSource, { color: colors.textSecondary }]} numberOfLines={1}>
                {[item.source, item.character].filter(Boolean).join(" / ")}
              </Text>
            ) : null}
            <Text style={[styles.cardCategory, { color: colors.textSecondary }]}>
              {item.category}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>???</Text>
            <Text style={[styles.cardSecretLabel, { color: colors.textSecondary }]}>
              シークレット
            </Text>
            <Text style={[styles.cardCategory, { color: colors.textSecondary }]}>未入手</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View>
      {/* Heading */}
      <View style={styles.headingArea}>
        <Text style={[styles.headingTitle, { color: colors.text }]}>テーマ別コレクション</Text>
        <Text style={[styles.headingSub, { color: colors.textSecondary }]}>
          テーマを切り替えながら、集めたカードと未入手カードをチェックできます。
        </Text>
      </View>

      {/* Theme tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeScroll}>
        {themes.map((t) => (
          <TouchableOpacity
            key={t.theme_id}
            style={[
              styles.themeTab,
              {
                backgroundColor: t.theme_id === activeThemeId ? colors.primary : "transparent",
                borderColor: t.theme_id === activeThemeId ? colors.primary : colors.cardBorder,
              },
            ]}
            onPress={() => {
              setActiveThemeId(t.theme_id);
              setCategory("すべて");
            }}
          >
            <Text style={styles.themeTabIcon}>{t.icon}</Text>
            <Text
              style={[
                styles.themeTabText,
                { color: t.theme_id === activeThemeId ? "#FFF" : colors.textSecondary },
              ]}
            >
              {t.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.catPill,
              {
                backgroundColor: cat === category ? colors.primary : "transparent",
                borderColor: cat === category ? colors.primary : colors.cardBorder,
              },
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text
              style={[styles.catText, { color: cat === category ? "#FFF" : colors.textSecondary }]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Progress bar */}
      <View
        style={[
          styles.progressCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.progressTop}>
          <Text style={[styles.progressLabel, { color: colors.text }]}>
            {collectedCount} / {totalCount} コンプリート
          </Text>
          <Text style={[styles.progressPct, { color: colors.accent2 }]}>{pct}%</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.cardBorder }]}>
          <View
            style={[styles.progressFill, { backgroundColor: colors.primary, width: `${pct}%` }]}
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={2}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
      />

      {/* Detail modal */}
      <Modal
        visible={!!modalItem}
        transparent
        animationType="fade"
        onRequestClose={() => setModalItem(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalItem(null)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                borderLeftColor: modalItem ? getRarityColor(modalItem.rarity) : colors.cardBorder,
                borderLeftWidth: 4,
              },
            ]}
          >
            {modalItem && (
              <>
                <View
                  style={[
                    styles.modalRarity,
                    { backgroundColor: getRarityColor(modalItem.rarity) },
                  ]}
                >
                  <Text style={styles.rarityText}>{getRarityStars(modalItem.rarity)}</Text>
                </View>
                <Text style={[styles.modalText, { color: colors.text }]}>{modalItem.text}</Text>
                {modalItem.subtitle ? (
                  <Text style={[styles.modalSub, { color: colors.accent1 }]}>
                    {modalItem.subtitle}
                  </Text>
                ) : null}
                {modalItem.source || modalItem.character ? (
                  <Text style={[styles.modalSource, { color: colors.textSecondary }]}>
                    {[modalItem.source, modalItem.character].filter(Boolean).join(" / ")}
                  </Text>
                ) : null}
                <Text style={[styles.modalCategory, { color: colors.textSecondary }]}>
                  {modalItem.category}
                </Text>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setModalItem(null)}
                >
                  <Text style={styles.closeBtnText}>閉じる</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },

  // Heading
  headingArea: { marginBottom: 16 },
  headingTitle: { fontSize: 26, fontWeight: "800", marginBottom: 6 },
  headingSub: { fontSize: 14, lineHeight: 20 },

  // Theme tabs
  themeScroll: { flexGrow: 0, marginBottom: 16 },
  themeTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
  },
  themeTabIcon: { fontSize: 18, marginRight: 6 },
  themeTabText: { fontSize: 13, fontWeight: "600" },

  // Category
  catScroll: { flexGrow: 0, marginBottom: 16 },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 1.5,
  },
  catText: { fontSize: 13, fontWeight: "600" },

  // Progress
  progressCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressLabel: { fontSize: 15, fontWeight: "700" },
  progressPct: { fontSize: 18, fontWeight: "800" },
  progressBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },

  // Cards
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    minHeight: 140,
    justifyContent: "flex-start",
  },
  rarityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  rarityText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  cardText: { fontSize: 15, fontWeight: "700", lineHeight: 22, marginBottom: 6 },
  cardSub: { fontSize: 12, marginBottom: 4, fontWeight: "500" },
  cardSource: { fontSize: 11, fontWeight: "500", marginBottom: 2 },
  cardSecretLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  cardCategory: { fontSize: 11, marginTop: "auto", paddingTop: 8 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: { width: "100%", borderRadius: 20, padding: 24, borderWidth: 1 },
  modalRarity: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 16,
  },
  modalText: { fontSize: 22, fontWeight: "700", lineHeight: 32, marginBottom: 8 },
  modalSub: { fontSize: 15, lineHeight: 22, marginBottom: 4, fontWeight: "500" },
  modalSource: { fontSize: 13, marginBottom: 4, fontWeight: "500" },
  modalCategory: { fontSize: 13, marginBottom: 20 },
  closeBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
