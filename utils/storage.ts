import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyPulls, FavoriteEntry } from "@/types";

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// --- Cache ---

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(`cache_${key}`);
  if (!raw) return null;
  const entry = safeParse<CacheEntry<T> | null>(raw, null);
  if (!entry || Date.now() - entry.timestamp > CACHE_TTL) return null;
  return entry.data;
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));
}

// --- Collected ---

export async function getCollected(themeId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(`collected_${themeId}`);
  return raw ? safeParse<string[]>(raw, []) : [];
}

export async function addCollected(themeId: string, itemId: string): Promise<string[]> {
  const collected = await getCollected(themeId);
  if (!collected.includes(itemId)) {
    collected.push(itemId);
    await AsyncStorage.setItem(`collected_${themeId}`, JSON.stringify(collected));
  }
  return collected;
}

// --- Favorites ---

export async function getFavorites(): Promise<FavoriteEntry[]> {
  const raw = await AsyncStorage.getItem("favorites");
  return raw ? safeParse<FavoriteEntry[]>(raw, []) : [];
}

export async function toggleFavorite(themeId: string, itemId: string): Promise<FavoriteEntry[]> {
  const favorites = await getFavorites();
  const idx = favorites.findIndex((f) => f.theme_id === themeId && f.item_id === itemId);
  if (idx >= 0) {
    favorites.splice(idx, 1);
  } else {
    favorites.push({ theme_id: themeId, item_id: itemId });
  }
  await AsyncStorage.setItem("favorites", JSON.stringify(favorites));
  return favorites;
}

export async function removeFavorite(themeId: string, itemId: string): Promise<FavoriteEntry[]> {
  const favorites = await getFavorites();
  const filtered = favorites.filter((f) => !(f.theme_id === themeId && f.item_id === itemId));
  await AsyncStorage.setItem("favorites", JSON.stringify(filtered));
  return filtered;
}

// --- Daily Pulls ---

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getDailyPulls(): Promise<DailyPulls> {
  const raw = await AsyncStorage.getItem("daily_pulls");
  if (!raw) return { date: todayString(), count: 0 };
  const pulls = safeParse<DailyPulls>(raw, { date: todayString(), count: 0 });
  if (pulls.date !== todayString()) {
    return { date: todayString(), count: 0 };
  }
  return pulls;
}

export async function incrementDailyPulls(): Promise<DailyPulls> {
  const pulls = await getDailyPulls();
  pulls.count += 1;
  pulls.date = todayString();
  await AsyncStorage.setItem("daily_pulls", JSON.stringify(pulls));
  return pulls;
}

export async function resetDailyPulls(): Promise<void> {
  await AsyncStorage.setItem("daily_pulls", JSON.stringify({ date: todayString(), count: 0 }));
}

// --- Theme Mode ---

export type ThemeMode = "system" | "light" | "dark";

export async function getThemeMode(): Promise<ThemeMode> {
  const raw = await AsyncStorage.getItem("theme_mode");
  return (raw as ThemeMode) || "system";
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem("theme_mode", mode);
}
