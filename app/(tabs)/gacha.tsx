import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { getRarityColor, getRarityStars } from "@/constants/Colors";
import { useGacha } from "@/contexts/GachaContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { GachaItem } from "@/types";
import { drawGacha } from "@/utils/gacha";

const MAX_DAILY = 10;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BUTTON_SIZE = SCREEN_WIDTH * 0.55;

// Rarity-based timing (ms): higher rarity = longer anticipation
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
  const [_phase, setPhase] = useState<"idle" | "spinning" | "revealing" | "done">("idle");
  const [statusText, setStatusText] = useState("ガチャる！");
  const [wasDupe, setWasDupe] = useState(false);
  const pendingResult = useRef<GachaItem | null>(null);

  // Button animation
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  // Result card
  const resultOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0.3);
  const resultTranslateY = useSharedValue(60);
  // Flash overlay
  const flashOpacity = useSharedValue(0);

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
    transform: [{ scale: scale.value }, { rotateZ: `${rotation.value}deg` }],
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
      setPhase("done");
      setPulling(false);
      setStatusText("ガチャる！");

      // Result card entrance
      resultOpacity.value = 0;
      resultScale.value = 0.3;
      resultTranslateY.value = 60;

      resultOpacity.value = withTiming(1, { duration: 400 });
      resultScale.value = withSpring(1, { damping: 8, stiffness: 100 });
      resultTranslateY.value = withSpring(0, { damping: 12, stiffness: 80 });

      // Flash for ★★★
      if (drawn.rarity === 3) {
        flashOpacity.value = withSequence(
          withTiming(0.7, { duration: 100 }),
          withTiming(0, { duration: 500 }),
        );
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else if (drawn.rarity === 2) {
        flashOpacity.value = withSequence(
          withTiming(0.3, { duration: 100 }),
          withTiming(0, { duration: 300 }),
        );
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    },
    [resultOpacity, resultScale, resultTranslateY, flashOpacity],
  );

  const handlePull = useCallback(async () => {
    if (!selectedTheme || pulling) return;
    const allowed = await incrementPulls();
    if (!allowed) return;

    // Draw the result now (but don't show yet), excluding collected items
    const drawn = drawGacha(items, category, themeCollected);
    if (!drawn) return;
    pendingResult.current = drawn;
    // Capture dupe status at draw time (before adding to collection)
    setWasDupe(themeCollected.includes(drawn.id));

    setPulling(true);
    setResult(null);
    setPhase("spinning");
    resultOpacity.value = 0;

    const duration = RARITY_TIMING[drawn.rarity as 1 | 2 | 3] || 800;

    // Initial press haptic
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // Phase 1: Shrink
    setStatusText("回転中...");
    scale.value = withTiming(0.75, { duration: 200 });

    // Phase 2: Spin fast (accelerate)
    rotation.value = withSequence(
      withTiming(360 * 2, { duration: duration * 0.5, easing: Easing.in(Easing.quad) }),
      // Phase 3: Spin slow (decelerate)
      withTiming(360 * 3 + 720, { duration: duration * 0.4, easing: Easing.out(Easing.cubic) }),
      // Reset
      withTiming(0, { duration: 0 }),
    );

    // Scale wobble during spin
    scale.value = withSequence(
      withTiming(0.75, { duration: 200 }),
      withTiming(1.1, { duration: duration * 0.3 }),
      withTiming(0.95, { duration: duration * 0.2 }),
      withTiming(1.05, { duration: duration * 0.2 }),
      // Final pop
      withTiming(1.3, { duration: 100 }),
      withSpring(1, { damping: 6, stiffness: 120 }),
    );

    // Glow pulses during spin
    glowOpacity.value = withSequence(
      withTiming(0.6, { duration: 300 }),
      withRepeat(
        withSequence(withTiming(0.3, { duration: 200 }), withTiming(0.8, { duration: 200 })),
        Math.ceil(duration / 400),
        true,
      ),
      withTiming(0, { duration: 200 }),
    );

    // Haptic buzz during spin
    hapticBurst(Math.ceil(duration / 150), 150);

    // Status text updates
    if (drawn.rarity >= 2) {
      setTimeout(() => setStatusText("おっ...!?"), duration * 0.4);
    }
    if (drawn.rarity === 3) {
      setTimeout(() => setStatusText("✨ キタ！！✨"), duration * 0.7);
    }

    // Reveal
    setTimeout(() => {
      runOnJS(revealResult)(drawn);
    }, duration + 200);
  }, [
    selectedTheme,
    pulling,
    items,
    category,
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
      const url = `https://www.google.com/maps/search/?api=1&query=${result.latitude},${result.longitude}&query_place_id=${encodeURIComponent(result.text)}`;
      Linking.openURL(url);
    }
  }, [result]);

  // No theme
  if (!selectedTheme) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🎰</Text>
        <Text style={[styles.placeholder, { color: colors.textSecondary }]}>
          テーマを選んでください
        </Text>
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
      {/* Flash overlay */}
      <Animated.View
        style={[
          styles.flashOverlay,
          flashAnimStyle,
          { backgroundColor: result?.rarity === 3 ? "#F59E0B" : "#3B82F6" },
        ]}
        pointerEvents="none"
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.topBtn, { borderColor: colors.cardBorder }]}
            onPress={() => router.push("/")}
          >
            <Text style={[styles.topBtnText, { color: colors.text }]}>‹ テーマへ</Text>
          </TouchableOpacity>
          <View style={[styles.themeBadge, { borderColor: colors.cardBorder }]}>
            <Text style={styles.themeBadgeIcon}>{selectedTheme.icon}</Text>
            <Text style={[styles.themeBadgeName, { color: colors.text }]}>
              {selectedTheme.name}
            </Text>
          </View>
        </View>

        {/* Heading */}
        <View style={styles.headingArea}>
          <Text style={[styles.headingTitle, { color: colors.text }]}>いま引くテーマ</Text>
          <Text style={[styles.headingSub, { color: colors.textSecondary }]}>
            {selectedTheme.description}
          </Text>
        </View>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={styles.catScrollContent}
        >
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

        {/* Remaining card */}
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
            <View style={[styles.resetBadge, { backgroundColor: `${colors.primary}25` }]}>
              <Text style={[styles.resetText, { color: colors.textSecondary }]}>
                ✨ 0時にリセット
              </Text>
            </View>
            {remaining <= 0 && __DEV__ && (
              <TouchableOpacity
                style={[
                  styles.devResetBtn,
                  { backgroundColor: `${colors.accent1}30`, borderColor: colors.accent1 },
                ]}
                onPress={resetPulls}
              >
                <Text style={[styles.devResetText, { color: colors.accent1 }]}>DEV リセット</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Gacha button */}
        <View style={styles.gachaArea}>
          {/* Glow ring behind button */}
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
                styles.gachaButtonOuter,
                { borderColor: remaining > 0 ? colors.primary : colors.cardBorder },
              ]}
              onPress={handlePull}
              disabled={remaining <= 0 || pulling}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.gachaButtonInner,
                  {
                    backgroundColor: remaining > 0 ? colors.card : colors.cardBorder,
                    borderColor: remaining > 0 ? colors.primaryLight : colors.cardBorder,
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

        {/* Result area */}
        {!result && !pulling && (
          <View
            style={[
              styles.emptyResult,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🎁</Text>
            <Text style={[styles.emptyTitle, { color: colors.primary }]}>まだ何も出ていません</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              中央のボタンを押すと、テーマに応じたカードが飛び出す！
            </Text>
          </View>
        )}

        {/* Pulling status */}
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
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                borderLeftColor: getRarityColor(result.rarity),
                borderLeftWidth: 4,
              },
            ]}
          >
            {wasDupe && (
              <View style={[styles.dupeBadge, { backgroundColor: colors.accent1 }]}>
                <Text style={styles.dupeText}>ダブり！</Text>
              </View>
            )}

            {/* Rarity reveal */}
            <View style={styles.rarityRow}>
              <View
                style={[styles.rarityBadge, { backgroundColor: getRarityColor(result.rarity) }]}
              >
                <Text style={styles.rarityText}>{getRarityStars(result.rarity)}</Text>
              </View>
              {result.rarity === 3 && <Text style={styles.rarityLabel}>🌟 レア！</Text>}
            </View>

            <Text style={[styles.resultText, { color: colors.text }]}>{result.text}</Text>
            {result.subtitle ? (
              <Text style={[styles.resultSub, { color: colors.textSecondary }]}>
                {result.subtitle}
              </Text>
            ) : null}
            {result.source || result.character ? (
              <Text style={[styles.resultCategory, { color: colors.textSecondary }]}>
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
                <Text style={styles.actionBtnText}>
                  {isInCollection ? "📦 コレクション済み" : "📦 コレクションに追加"}
                </Text>
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
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  placeholder: { fontSize: 18, fontWeight: "600" },
  placeholderSub: { fontSize: 14, marginTop: 8 },

  // Flash overlay
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  topBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  topBtnText: { fontSize: 14, fontWeight: "600" },
  themeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeBadgeIcon: { fontSize: 18, marginRight: 6 },
  themeBadgeName: { fontSize: 14, fontWeight: "600" },

  headingArea: { marginBottom: 16 },
  headingTitle: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  headingSub: { fontSize: 14, lineHeight: 20 },

  catScroll: { flexGrow: 0, marginBottom: 16 },
  catScrollContent: { paddingRight: 16 },
  catPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    marginRight: 8,
    borderWidth: 1.5,
  },
  catText: { fontSize: 14, fontWeight: "600" },

  remainingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  remainingLabel: { fontSize: 13, marginBottom: 4 },
  remainingCount: { fontSize: 28, fontWeight: "800" },
  remainingRight: { alignItems: "flex-end", gap: 8 },
  resetBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  resetText: { fontSize: 13, fontWeight: "600" },
  devResetBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  devResetText: { fontSize: 11, fontWeight: "700" },

  gachaArea: { alignItems: "center", marginBottom: 24, justifyContent: "center" },
  glowRing: {
    position: "absolute",
    width: BUTTON_SIZE + 24,
    height: BUTTON_SIZE + 24,
    borderRadius: (BUTTON_SIZE + 24) / 2,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 15,
  },
  gachaButtonOuter: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 6,
    padding: 8,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  gachaButtonInner: {
    flex: 1,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  gachaEmoji: { fontSize: 44, marginBottom: 4 },
  gachaLabel: { fontSize: 22, fontWeight: "800" },
  gachaThemeName: { fontSize: 13, marginTop: 4 },

  // Pulling status
  pullingStatus: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
  },
  pullingText: { fontSize: 18, fontWeight: "700" },

  emptyResult: { borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1 },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 20 },

  resultCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  dupeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dupeText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  rarityRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rarityText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  rarityLabel: { fontSize: 16, fontWeight: "700" },
  resultText: { fontSize: 20, fontWeight: "700", marginBottom: 6, lineHeight: 28 },
  resultSub: { fontSize: 14, marginBottom: 4, lineHeight: 20 },
  resultCategory: { fontSize: 13, marginBottom: 16, fontWeight: "500" },
  resultActions: { gap: 8 },
  actionBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  actionBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
