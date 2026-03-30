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
import Animated, { FadeInDown } from "react-native-reanimated";
import { getRarityColor, getRarityGlow, getRarityStars } from "@/constants/Colors";
import { useGacha } from "@/contexts/GachaContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { GachaItem } from "@/types";

const { width } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2;

export default function CollectionScreen() {
  const { colors } = useTheme();
  const { themes, loadThemes, loadItems, collected, loadCollected, itemsByTheme } = useGacha();
  const [activeThemeId, setActiveThemeId] = useState<string>("");
  const [category, setCategory] = useState("すべて");
  const [modalItem, setModalItem] = useState<GachaItem | null>(null);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);
  useEffect(() => {
    if (themes.length > 0 && !activeThemeId) setActiveThemeId(themes[0].theme_id);
  }, [themes, activeThemeId]);

  const activeTheme = themes.find((t) => t.theme_id === activeThemeId);
  useEffect(() => {
    if (activeTheme) loadItems(activeTheme);
  }, [activeTheme, loadItems]);

  const themeItems = activeThemeId ? (itemsByTheme[activeThemeId] ?? []) : [];
  const themeCollected = activeThemeId ? (collected[activeThemeId] ?? []) : [];

  useEffect(() => {
    if (activeThemeId) loadCollected(activeThemeId);
  }, [activeThemeId, loadCollected]);

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

  const renderCard = ({ item, index }: { item: GachaItem; index: number }) => {
    const isCollected = themeCollected.includes(item.id);
    const rarityColor = getRarityColor(item.rarity);

    return (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
        <TouchableOpacity
          style={[
            styles.card,
            isCollected ? getRarityGlow(item.rarity) : {},
            {
              backgroundColor: colors.card,
              borderColor: isCollected ? "transparent" : colors.cardBorder,
            },
          ]}
          activeOpacity={isCollected ? 0.75 : 1}
          onPress={() => isCollected && setModalItem(item)}
        >
          {/* Top rarity strip */}
          <View
            style={[
              styles.cardStrip,
              { backgroundColor: isCollected ? rarityColor : colors.cardBorder },
            ]}
          />

          <View style={styles.cardBody}>
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
                  <Text
                    style={[styles.cardSource, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {[item.source, item.character].filter(Boolean).join(" / ")}
                  </Text>
                ) : null}
                <Text style={[styles.cardCategory, { color: colors.textSecondary }]}>
                  {item.category}
                </Text>
              </>
            ) : (
              <View style={styles.secretArea}>
                <Text style={[styles.lockIcon, { color: colors.textSecondary }]}>🔒</Text>
                <Text style={[styles.secretLabel, { color: colors.textSecondary }]}>
                  シークレット
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Progress milestones
  const milestones = [25, 50, 75, 100];

  const listHeader = (
    <View>
      <View style={styles.headingArea}>
        <Text style={[styles.headingTitle, { color: colors.text }]}>コレクション</Text>
        <Text style={[styles.headingSub, { color: colors.textSecondary }]}>
          テーマを切り替えながら、集めたカードをチェック。
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeScroll}>
        {themes.map((t) => (
          <TouchableOpacity
            key={t.theme_id}
            style={[
              styles.themeTab,
              {
                backgroundColor: t.theme_id === activeThemeId ? colors.primary : colors.card,
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

      {/* Progress */}
      <View
        style={[
          styles.progressCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.progressTop}>
          <Text style={[styles.progressLabel, { color: colors.text }]}>
            {collectedCount} / {totalCount}
          </Text>
          <Text style={[styles.progressPct, { color: colors.accent2 }]}>{pct}%</Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.cardBorder }]}>
          <View
            style={[styles.progressFill, { backgroundColor: colors.primary, width: `${pct}%` }]}
          />
          {/* Milestone markers */}
          {milestones.map((m) => (
            <View
              key={m}
              style={[
                styles.milestone,
                {
                  left: `${m}%`,
                  backgroundColor: pct >= m ? colors.primary : colors.textSecondary,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.milestoneLabels}>
          {milestones.map((m) => (
            <Text
              key={m}
              style={[
                styles.milestoneText,
                { left: `${m}%`, color: pct >= m ? colors.primary : colors.textSecondary },
              ]}
            >
              {m}%
            </Text>
          ))}
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

      {/* Bottom sheet style modal */}
      <Modal
        visible={!!modalItem}
        transparent
        animationType="slide"
        onRequestClose={() => setModalItem(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalItem(null)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            {/* Drag handle */}
            <View style={[styles.dragHandle, { backgroundColor: colors.textSecondary }]} />
            {modalItem && (
              <>
                <View
                  style={[styles.modalStrip, { backgroundColor: getRarityColor(modalItem.rarity) }]}
                />
                <View style={styles.modalBody}>
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
                </View>
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
  list: { padding: 20 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },

  headingArea: { marginBottom: 18 },
  headingTitle: { fontSize: 26, fontWeight: "800", marginBottom: 6, letterSpacing: -0.5 },
  headingSub: { fontSize: 14, lineHeight: 20, opacity: 0.7 },

  themeScroll: { flexGrow: 0, marginBottom: 14 },
  themeTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
  },
  themeTabIcon: { fontSize: 16, marginRight: 6 },
  themeTabText: { fontSize: 13, fontWeight: "600" },

  catScroll: { flexGrow: 0, marginBottom: 14 },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
  },
  catText: { fontSize: 12, fontWeight: "600" },

  progressCard: { padding: 18, borderRadius: 18, borderWidth: 1, marginBottom: 18 },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  progressLabel: { fontSize: 16, fontWeight: "700" },
  progressPct: { fontSize: 22, fontWeight: "800" },
  progressBarBg: { height: 6, borderRadius: 3, overflow: "visible", position: "relative" },
  progressFill: { height: "100%", borderRadius: 3 },
  milestone: {
    position: "absolute",
    top: -2,
    width: 3,
    height: 10,
    borderRadius: 1.5,
    marginLeft: -1.5,
  },
  milestoneLabels: { position: "relative", height: 18, marginTop: 4 },
  milestoneText: { position: "absolute", fontSize: 9, fontWeight: "600", marginLeft: -10 },

  card: { width: CARD_WIDTH, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  cardStrip: { height: 3, width: "100%" },
  cardBody: { padding: 14, minHeight: 130 },
  rarityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  rarityText: { color: "#FFF", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  cardText: { fontSize: 14, fontWeight: "700", lineHeight: 20, marginBottom: 4 },
  cardSub: { fontSize: 11, marginBottom: 3, fontWeight: "500" },
  cardSource: { fontSize: 10, fontWeight: "500", opacity: 0.6, marginBottom: 2 },
  cardCategory: { fontSize: 10, marginTop: "auto", paddingTop: 6, opacity: 0.5 },
  secretArea: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 8 },
  lockIcon: { fontSize: 24, marginBottom: 6, opacity: 0.3 },
  secretLabel: { fontSize: 12, fontWeight: "600", opacity: 0.4 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 40,
    overflow: "hidden",
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
    opacity: 0.3,
  },
  modalStrip: { height: 4, width: "100%" },
  modalBody: { padding: 24 },
  modalRarity: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  modalSub: { fontSize: 15, lineHeight: 22, marginBottom: 4, fontWeight: "500" },
  modalSource: { fontSize: 13, marginBottom: 4, fontWeight: "500", opacity: 0.6 },
  modalCategory: { fontSize: 13, marginBottom: 24, opacity: 0.5 },
  closeBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
