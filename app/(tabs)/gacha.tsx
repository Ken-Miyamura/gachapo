import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { getRarityColor, getRarityGlow, getRarityStars } from "@/constants/Colors";
import { useGacha } from "@/contexts/GachaContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { GachaItem } from "@/types";
import { drawGacha } from "@/utils/gacha";

const MAX_DAILY = 10;
const { width: SW } = Dimensions.get("window");
const BUTTON_SIZE = SW * 0.52;

const RARITY_TIMING = { 1: 800, 2: 1400, 3: 2200 };

function hapticBurst(count: number, interval: number) {
  if (Platform.OS === "web") return;
  let i = 0;
  const id = setInterval(() => {
    if (i >= count) {
      clearInterval(id);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    i++;
  }, interval);
}

export default function GachaScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    selectedTheme,
    items,
    itemsLoading,
    collected,
    addToCollection,
    favorites,
    toggleFav,
    dailyCount,
    incrementPulls,
    resetPulls,
  } = useGacha();

  const [category, setCategory] = useState("すべて");
  const [result, setResult] = useState<GachaItem | null>(null);
  const [pulling, setPulling] = useState(false);
  const [statusText, setStatusText] = useState("ガチャる！");
  const [wasDupe, setWasDupe] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const pendingResult = useRef<GachaItem | null>(null);

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const _glowColor = useSharedValue(0); // 0=cyan, 1=gold
  const resultOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0.3);
  const resultTranslateY = useSharedValue(60);
  const flashOpacity = useSharedValue(0);
  // Idle pulse
  const idlePulse = useSharedValue(1);

  // Start idle breathing animation
  useEffect(() => {
    idlePulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [idlePulse]);

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return ["すべて", ...Array.from(cats)];
  }, [items]);

  const themeCollected = selectedTheme ? (collected[selectedTheme.theme_id] ?? []) : [];
  const isFav = result
    ? favorites.some((f) => f.theme_id === selectedTheme?.theme_id && f.item_id === result.id)
    : false;
  const isInCollection = result ? themeCollected.includes(result.id) : false;

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulling ? scale.value : scale.value * idlePulse.value },
      { rotateZ: `${rotation.value}deg` },
    ],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const resultAnimStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ scale: resultScale.value }, { translateY: resultTranslateY.value }],
  }));

  const flashAnimStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const revealResult = useCallback(
    (drawn: GachaItem) => {
      setResult(drawn);
      setPulling(false);
      setStatusText("ガチャる！");
      resultOpacity.value = 0;
      resultScale.value = 0.3;
      resultTranslateY.value = 60;
      resultOpacity.value = withTiming(1, { duration: 400 });
      resultScale.value = withSpring(1, { damping: 8, stiffness: 100 });
      resultTranslateY.value = withSpring(0, { damping: 12, stiffness: 80 });

      if (drawn.rarity === 3) {
        flashOpacity.value = withSequence(
          withTiming(0.6, { duration: 100 }),
          withTiming(0, { duration: 600 }),
        );
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (drawn.rarity === 2) {
        flashOpacity.value = withSequence(
          withTiming(0.25, { duration: 100 }),
          withTiming(0, { duration: 300 }),
        );
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [resultOpacity, resultScale, resultTranslateY, flashOpacity],
  );

  const handlePull = useCallback(async () => {
    if (!selectedTheme || pulling) return;
    const allowed = await incrementPulls();
    if (!allowed) return;
    const drawn = drawGacha(items, category, themeCollected);
    if (!drawn) return;
    pendingResult.current = drawn;
    setWasDupe(themeCollected.includes(drawn.id));
    setPulling(true);
    setResult(null);
    resultOpacity.value = 0;

    const duration = RARITY_TIMING[drawn.rarity as 1 | 2 | 3] || 800;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    setStatusText("回転中...");
    scale.value = withTiming(0.75, { duration: 200 });
    rotation.value = withSequence(
      withTiming(360 * 2, { duration: duration * 0.5, easing: Easing.in(Easing.quad) }),
      withTiming(360 * 3 + 720, { duration: duration * 0.4, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 0 }),
    );
    scale.value = withSequence(
      withTiming(0.75, { duration: 200 }),
      withTiming(1.1, { duration: duration * 0.3 }),
      withTiming(0.95, { duration: duration * 0.2 }),
      withTiming(1.05, { duration: duration * 0.2 }),
      withTiming(1.3, { duration: 100 }),
      withSpring(1, { damping: 6, stiffness: 120 }),
    );
    glowOpacity.value = withSequence(
      withTiming(0.6, { duration: 300 }),
      withRepeat(
        withSequence(withTiming(0.3, { duration: 200 }), withTiming(0.8, { duration: 200 })),
        Math.ceil(duration / 400),
        true,
      ),
      withTiming(0, { duration: 200 }),
    );
    hapticBurst(Math.ceil(duration / 150), 150);
    if (drawn.rarity >= 2) setTimeout(() => setStatusText("おっ...!?"), duration * 0.4);
    if (drawn.rarity === 3) setTimeout(() => setStatusText("✨ キタ！！✨"), duration * 0.7);
    setTimeout(() => revealResult(drawn), duration + 200);
  }, [
    selectedTheme,
    pulling,
    items,
    category,
    themeCollected,
    incrementPulls,
    scale,
    rotation,
    glowOpacity,
    resultOpacity,
    revealResult,
  ]);

  const handleCollect = useCallback(() => {
    if (result && selectedTheme) {
      addToCollection(selectedTheme.theme_id, result.id);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [result, selectedTheme, addToCollection]);

  const handleFav = useCallback(() => {
    if (result && selectedTheme) {
      toggleFav(selectedTheme.theme_id, result.id);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [result, selectedTheme, toggleFav]);

  const handleOpenMap = useCallback(() => {
    if (result?.latitude && result?.longitude) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${result.latitude},${result.longitude}&query_place_id=${encodeURIComponent(result.text)}`,
      );
    }
  }, [result]);

  if (!selectedTheme) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <SymbolView
            name={{ ios: "sparkles", android: "auto_awesome", web: "auto_awesome" }}
            tintColor={colors.primary}
            size={36}
          />
        </View>
        <Text style={[styles.placeholder, { color: colors.text }]}>テーマを選んでください</Text>
        <Text style={[styles.placeholderSub, { color: colors.textSecondary }]}>
          「テーマ」タブからテーマを選択してね
        </Text>
      </View>
    );
  }

  if (itemsLoading && items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const remaining = MAX_DAILY - dailyCount;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.flashOverlay,
          flashAnimStyle,
          { backgroundColor: result?.rarity === 3 ? "#F59E0B" : "#3B82F6" },
        ]}
        pointerEvents="none"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[
              styles.topBtn,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => router.push("/")}
          >
            <Text style={[styles.topBtnText, { color: colors.text }]}>‹ テーマへ</Text>
          </TouchableOpacity>
          <View
            style={[
              styles.themeBadge,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={styles.themeBadgeIcon}>{selectedTheme.icon}</Text>
            <Text style={[styles.themeBadgeName, { color: colors.text }]}>
              {selectedTheme.name}
            </Text>
          </View>
        </View>

        <View style={styles.headingArea}>
          <View style={styles.headingRow}>
            <Text style={[styles.headingTitle, { color: colors.text }]}>いま引くテーマ</Text>
            <TouchableOpacity
              style={[
                styles.ratesBtn,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
              onPress={() => setShowRates(true)}
              accessibilityLabel="排出確率を表示"
            >
              <SymbolView
                name={{ ios: "info.circle", android: "info", web: "info" }}
                tintColor={colors.textSecondary}
                size={16}
              />
              <Text style={[styles.ratesBtnText, { color: colors.textSecondary }]}>確率</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.headingSub, { color: colors.textSecondary }]}>
            {selectedTheme.description}
          </Text>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.catPill,
                {
                  backgroundColor: cat === category ? colors.primary : colors.card,
                  borderColor: cat === category ? colors.primary : colors.cardBorder,
                },
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.catText,
                  { color: cat === category ? "#FFF" : colors.textSecondary },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Remaining */}
        <View
          style={[
            styles.remainingCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View>
            <Text style={[styles.remainingLabel, { color: colors.textSecondary }]}>
              本日の残りガチャ
            </Text>
            <Text style={[styles.remainingCount, { color: colors.accent2 }]}>
              {remaining} / {MAX_DAILY}
            </Text>
          </View>
          <View style={styles.remainingRight}>
            <View style={[styles.resetBadge, { backgroundColor: colors.cardHighlight }]}>
              <View style={styles.resetContent}>
                <SymbolView
                  name={{ ios: "clock.arrow.circlepath", android: "schedule", web: "schedule" }}
                  tintColor={colors.textSecondary}
                  size={14}
                />
                <Text style={[styles.resetText, { color: colors.textSecondary }]}>0時リセット</Text>
              </View>
            </View>
            {remaining <= 0 && __DEV__ && (
              <TouchableOpacity
                style={[styles.devResetBtn, { borderColor: colors.accent1 }]}
                onPress={resetPulls}
              >
                <Text style={[styles.devResetText, { color: colors.accent1 }]}>DEV リセット</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Gacha button */}
        <View style={styles.gachaArea}>
          <Animated.View
            style={[
              styles.glowRing,
              glowAnimStyle,
              { borderColor: colors.primary, shadowColor: colors.primary },
            ]}
          />
          <Animated.View style={buttonAnimStyle}>
            <TouchableOpacity
              style={[
                styles.gachaOuter,
                { borderColor: remaining > 0 ? colors.primary : colors.cardBorder },
              ]}
              onPress={handlePull}
              disabled={remaining <= 0 || pulling}
              activeOpacity={0.85}
              accessibilityLabel={`ガチャを回す。残り${remaining}回`}
            >
              <View
                style={[
                  styles.gachaInner,
                  {
                    backgroundColor: remaining > 0 ? colors.card : colors.cardBorder,
                    borderColor: remaining > 0 ? colors.cardBorder : "transparent",
                  },
                ]}
              >
                <Text style={styles.gachaEmoji}>{selectedTheme.icon}</Text>
                <Text style={[styles.gachaLabel, { color: colors.text }]}>
                  {remaining <= 0 ? "本日終了" : statusText}
                </Text>
                <Text style={[styles.gachaThemeName, { color: colors.textSecondary }]}>
                  {selectedTheme.name}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Empty / Pulling / Result */}
        {!result && !pulling && (
          <View
            style={[
              styles.emptyResult,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🎁</Text>
            <Text style={[styles.emptyTitle, { color: colors.primary }]}>まだ何も出ていません</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              中央のボタンを押すと、テーマに応じたカードが飛び出す！
            </Text>
          </View>
        )}

        {pulling && !result && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[
              styles.pullingStatus,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={{ fontSize: 28, marginBottom: 4 }}>🎰</Text>
            <Text style={[styles.pullingText, { color: colors.primary }]}>{statusText}</Text>
          </Animated.View>
        )}

        {result && (
          <Animated.View
            style={[
              styles.resultCard,
              resultAnimStyle,
              getRarityGlow(result.rarity),
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            {/* Top rarity strip */}
            <View
              style={[styles.resultStrip, { backgroundColor: getRarityColor(result.rarity) }]}
            />

            {wasDupe && (
              <View style={[styles.dupeBadge, { backgroundColor: colors.accent1 }]}>
                <Text style={styles.dupeText}>ダブり！</Text>
              </View>
            )}

            <View style={styles.resultBody}>
              <View style={styles.rarityRow}>
                <View
                  style={[styles.rarityBadge, { backgroundColor: getRarityColor(result.rarity) }]}
                >
                  <Text style={styles.rarityText}>{getRarityStars(result.rarity)}</Text>
                </View>
                {result.rarity === 3 && <Text style={styles.rarityLabel}>🌟 SR！</Text>}
              </View>

              <Text style={[styles.resultText, { color: colors.text }]}>{result.text}</Text>
              {result.subtitle ? (
                <Text style={[styles.resultSub, { color: colors.textSecondary }]}>
                  {result.subtitle}
                </Text>
              ) : null}
              {result.source || result.character ? (
                <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>
                  {[result.source, result.character].filter(Boolean).join(" / ")}
                </Text>
              ) : null}

              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: isInCollection ? colors.cardBorder : colors.primary },
                  ]}
                  onPress={handleCollect}
                  disabled={isInCollection}
                >
                  <View style={styles.actionBtnInner}>
                    <SymbolView
                      name={
                        isInCollection
                          ? {
                              ios: "checkmark.circle.fill",
                              android: "check_circle",
                              web: "check_circle",
                            }
                          : {
                              ios: "plus.rectangle.on.folder.fill",
                              android: "library_add",
                              web: "library_add",
                            }
                      }
                      tintColor="#FFF"
                      size={16}
                    />
                    <Text style={styles.actionBtnText}>
                      {isInCollection ? "コレクション済み" : "コレクションに追加"}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: isFav ? colors.accent1 : "transparent",
                      borderWidth: 1.5,
                      borderColor: colors.accent1,
                    },
                  ]}
                  onPress={handleFav}
                >
                  <Text style={[styles.actionBtnText, { color: isFav ? "#FFF" : colors.accent1 }]}>
                    {isFav ? "♥ お気に入り済み" : "♥ お気に入り"}
                  </Text>
                </TouchableOpacity>
                {selectedTheme.has_location && result.latitude && result.longitude && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.accent3 }]}
                    onPress={handleOpenMap}
                  >
                    <Text style={styles.actionBtnText}>📍 マップで見る</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Rates modal */}
      <Modal
        visible={showRates}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRates(false)}
      >
        <TouchableOpacity
          style={styles.ratesOverlay}
          activeOpacity={1}
          onPress={() => setShowRates(false)}
        >
          <View
            style={[
              styles.ratesSheet,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.ratesDragHandle, { backgroundColor: colors.textSecondary }]} />
            <Text style={[styles.ratesTitle, { color: colors.text }]}>排出確率</Text>
            <View style={styles.ratesTable}>
              <View style={styles.ratesRow}>
                <View style={[styles.ratesRarityDot, { backgroundColor: "#22C55E" }]} />
                <Text style={[styles.ratesLabel, { color: colors.text }]}>★ N（ノーマル）</Text>
                <Text style={[styles.ratesValue, { color: colors.accent2 }]}>50%</Text>
              </View>
              <View style={styles.ratesRow}>
                <View style={[styles.ratesRarityDot, { backgroundColor: "#3B82F6" }]} />
                <Text style={[styles.ratesLabel, { color: colors.text }]}>★★ R（レア）</Text>
                <Text style={[styles.ratesValue, { color: colors.accent2 }]}>35%</Text>
              </View>
              <View style={styles.ratesRow}>
                <View style={[styles.ratesRarityDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={[styles.ratesLabel, { color: colors.text }]}>
                  ★★★ SR（スーパーレア）
                </Text>
                <Text style={[styles.ratesValue, { color: colors.accent2 }]}>15%</Text>
              </View>
            </View>
            <Text style={[styles.ratesNote, { color: colors.textSecondary }]}>
              まずレアリティが確率に基づいて決定され、そのレアリティのアイテムからランダムに1つ選ばれます。未取得アイテムが優先されますが、全取得後はダブりが発生します。
            </Text>
            <TouchableOpacity
              style={[styles.ratesCloseBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowRates(false)}
            >
              <Text style={styles.ratesCloseBtnText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  placeholder: { fontSize: 18, fontWeight: "700" },
  placeholderSub: { fontSize: 14, marginTop: 8, opacity: 0.7 },

  flashOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  topBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1 },
  topBtnText: { fontSize: 14, fontWeight: "600" },
  themeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  themeBadgeIcon: { fontSize: 16, marginRight: 6 },
  themeBadgeName: { fontSize: 14, fontWeight: "600" },

  headingArea: { marginBottom: 18 },
  headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headingTitle: { fontSize: 26, fontWeight: "800", marginBottom: 4, letterSpacing: -0.5 },
  headingSub: { fontSize: 14, lineHeight: 20, opacity: 0.7 },
  ratesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  ratesBtnText: { fontSize: 12, fontWeight: "600" },

  catScroll: { flexGrow: 0, marginBottom: 16 },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
  },
  catText: { fontSize: 13, fontWeight: "600" },

  remainingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 28,
  },
  remainingLabel: { fontSize: 12, marginBottom: 4, fontWeight: "500" },
  remainingCount: { fontSize: 32, fontWeight: "800" },
  remainingRight: { alignItems: "flex-end", gap: 8 },
  resetBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  resetContent: { flexDirection: "row", alignItems: "center", gap: 5 },
  resetText: { fontSize: 12, fontWeight: "600" },
  devResetBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  devResetText: { fontSize: 10, fontWeight: "700" },

  gachaArea: { alignItems: "center", marginBottom: 28, justifyContent: "center" },
  glowRing: {
    position: "absolute",
    width: BUTTON_SIZE + 28,
    height: BUTTON_SIZE + 28,
    borderRadius: (BUTTON_SIZE + 28) / 2,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 15,
  },
  gachaOuter: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 4,
    padding: 6,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  gachaInner: {
    flex: 1,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gachaEmoji: { fontSize: 40, marginBottom: 4 },
  gachaLabel: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  gachaThemeName: { fontSize: 12, marginTop: 4, opacity: 0.6 },

  pullingStatus: { borderRadius: 18, padding: 20, alignItems: "center", borderWidth: 1 },
  pullingText: { fontSize: 18, fontWeight: "700" },

  emptyResult: { borderRadius: 18, padding: 28, alignItems: "center", borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 20, opacity: 0.7 },

  resultCard: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
  },
  resultStrip: { height: 4, width: "100%" },
  resultBody: { padding: 22 },
  dupeBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  dupeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  rarityRow: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 8 },
  rarityBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  rarityText: { color: "#FFF", fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  rarityLabel: { fontSize: 15, fontWeight: "700" },
  resultText: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  resultSub: { fontSize: 14, marginBottom: 4, lineHeight: 20, opacity: 0.75 },
  resultMeta: { fontSize: 13, marginBottom: 18, fontWeight: "500", opacity: 0.6 },
  resultActions: { gap: 10 },
  actionBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  actionBtnInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  // Rates modal
  ratesOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  ratesSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 40,
  },
  ratesDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
    opacity: 0.3,
  },
  ratesTitle: { fontSize: 20, fontWeight: "800", marginBottom: 20, letterSpacing: -0.3 },
  ratesTable: { gap: 14, marginBottom: 20 },
  ratesRow: { flexDirection: "row", alignItems: "center" },
  ratesRarityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  ratesLabel: { fontSize: 15, fontWeight: "600", flex: 1 },
  ratesValue: { fontSize: 18, fontWeight: "800" },
  ratesNote: { fontSize: 12, lineHeight: 18, marginBottom: 20, opacity: 0.6 },
  ratesCloseBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  ratesCloseBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
