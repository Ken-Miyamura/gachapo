import type { GachaItem } from "@/types";

/**
 * Pick a gacha item with weighted rarity probabilities.
 * ★ (1) = 50%, ★★ (2) = 35%, ★★★ (3) = 15%
 */
export function drawGacha(
  items: GachaItem[],
  categoryFilter?: string,
  excludeIds?: string[],
): GachaItem | null {
  let pool = items;
  if (categoryFilter && categoryFilter !== "すべて") {
    pool = items.filter((i) => i.category === categoryFilter);
  }
  // Exclude already-collected items
  if (excludeIds && excludeIds.length > 0) {
    const filtered = pool.filter((i) => !excludeIds.includes(i.id));
    if (filtered.length > 0) pool = filtered;
    // If all items are collected, fall back to full pool (allow dupes)
  }
  if (pool.length === 0) return null;

  // Determine rarity
  const rand = Math.random();
  let targetRarity: number;
  if (rand < 0.15) {
    targetRarity = 3;
  } else if (rand < 0.5) {
    targetRarity = 2;
  } else {
    targetRarity = 1;
  }

  // Filter by rarity
  let candidates = pool.filter((i) => i.rarity === targetRarity);
  // Fallback if no items of that rarity
  if (candidates.length === 0) {
    candidates = pool;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}
