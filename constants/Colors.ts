const Colors = {
  light: {
    primary: "#7C3AED",
    primaryLight: "#A78BFA",
    accent1: "#EC4899",
    accent2: "#FBBF24",
    accent3: "#06B6D4",
    background: "#F5F0FF",
    card: "#FFFFFF",
    cardBorder: "#E5E7EB",
    text: "#1F2937",
    textSecondary: "#6B7280",
    tabBar: "#FFFFFF",
    tabBarBorder: "#E5E7EB",
    tint: "#7C3AED",
  },
  dark: {
    primary: "#A78BFA",
    primaryLight: "#7C3AED",
    accent1: "#F472B6",
    accent2: "#FCD34D",
    accent3: "#22D3EE",
    background: "#0F0520",
    card: "#1E1040",
    cardBorder: "#2E1A5E",
    text: "#F3F0FF",
    textSecondary: "#A09AB5",
    tabBar: "#160835",
    tabBarBorder: "#2E1A5E",
    tint: "#A78BFA",
  },
  rarityCommon: "#22C55E",
  rarityUncommon: "#3B82F6",
  rarityRare: "#F59E0B",
};

export type ColorSchemeColors = typeof Colors.light;

export function getRarityColor(rarity: number): string {
  if (rarity === 3) return Colors.rarityRare;
  if (rarity === 2) return Colors.rarityUncommon;
  return Colors.rarityCommon;
}

export function getRarityStars(rarity: number): string {
  if (rarity === 3) return "★★★";
  if (rarity === 2) return "★★";
  return "★";
}

export default Colors;
