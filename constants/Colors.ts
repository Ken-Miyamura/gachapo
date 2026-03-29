import type { ViewStyle } from "react-native";

const Colors = {
  light: {
    primary: "#7C3AED",
    primaryLight: "#A78BFA",
    accent1: "#EC4899",
    accent2: "#FBBF24",
    accent3: "#06B6D4",
    background: "#F5F0FF",
    card: "rgba(255, 255, 255, 0.85)",
    cardBorder: "rgba(124, 58, 237, 0.12)",
    cardHighlight: "rgba(124, 58, 237, 0.06)",
    text: "#1F2937",
    textSecondary: "#6B7280",
    tabBar: "rgba(255, 255, 255, 0.92)",
    tabBarBorder: "rgba(124, 58, 237, 0.08)",
    tint: "#7C3AED",
    overlay: "rgba(245, 240, 255, 0.6)",
  },
  dark: {
    primary: "#A78BFA",
    primaryLight: "#7C3AED",
    accent1: "#F472B6",
    accent2: "#FCD34D",
    accent3: "#22D3EE",
    background: "#0A0118",
    card: "rgba(22, 8, 53, 0.75)",
    cardBorder: "rgba(167, 139, 250, 0.12)",
    cardHighlight: "rgba(167, 139, 250, 0.06)",
    text: "#F3F0FF",
    textSecondary: "#9B8FBB",
    tabBar: "rgba(10, 1, 24, 0.92)",
    tabBarBorder: "rgba(167, 139, 250, 0.1)",
    tint: "#A78BFA",
    overlay: "rgba(10, 1, 24, 0.6)",
  },
  rarityCommon: "#22C55E",
  rarityUncommon: "#3B82F6",
  rarityRare: "#F59E0B",
};

export type ColorSchemeColors = typeof Colors.dark;

export function getRarityColor(rarity: number): string {
  if (rarity === 3) return Colors.rarityRare;
  if (rarity === 2) return Colors.rarityUncommon;
  return Colors.rarityCommon;
}

export function getRarityGlow(rarity: number): ViewStyle {
  if (rarity === 3)
    return { shadowColor: Colors.rarityRare, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12 };
  if (rarity === 2)
    return {
      shadowColor: Colors.rarityUncommon,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 8,
    };
  return { shadowColor: Colors.rarityCommon, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 };
}

export function getRarityStars(rarity: number): string {
  if (rarity === 3) return "★★★";
  if (rarity === 2) return "★★";
  return "★";
}

export default Colors;
