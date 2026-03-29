import React, { createContext, useCallback, useContext, useState } from "react";
import type { FavoriteEntry, GachaItem, Theme } from "@/types";
import * as api from "@/utils/api";
import * as storage from "@/utils/storage";

interface GachaContextValue {
  // Themes
  themes: Theme[];
  loadThemes: (force?: boolean) => Promise<void>;
  themesLoading: boolean;

  // Selected theme & items
  selectedTheme: Theme | null;
  selectTheme: (theme: Theme) => void;
  items: GachaItem[];
  itemsLoading: boolean;
  loadItems: (theme: Theme, force?: boolean) => Promise<void>;

  // Collection
  collected: Record<string, string[]>; // theme_id -> item ids
  addToCollection: (themeId: string, itemId: string) => Promise<void>;

  // Favorites
  favorites: FavoriteEntry[];
  toggleFav: (themeId: string, itemId: string) => Promise<void>;
  removeFav: (themeId: string, itemId: string) => Promise<void>;
  loadFavorites: () => Promise<void>;

  // Daily pulls
  dailyCount: number;
  incrementPulls: () => Promise<boolean>; // returns false if limit reached
  resetPulls: () => Promise<void>;

  // Items cache by theme
  itemsByTheme: Record<string, GachaItem[]>;
}

const GachaContext = createContext<GachaContextValue>(null as any);

export function GachaProvider({ children }: { children: React.ReactNode }) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [items, setItems] = useState<GachaItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [collected, setCollected] = useState<Record<string, string[]>>({});
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [dailyCount, setDailyCount] = useState(0);
  const [itemsByTheme, setItemsByTheme] = useState<Record<string, GachaItem[]>>({});

  const loadThemes = useCallback(async (force = false) => {
    setThemesLoading(true);
    try {
      if (!force) {
        const cached = await storage.getCached<Theme[]>("themes");
        if (cached) {
          setThemes(cached);
          setThemesLoading(false);
          // Background refresh
          api
            .fetchThemes()
            .then((fresh) => {
              setThemes(fresh);
              storage.setCache("themes", fresh);
            })
            .catch(() => {});
          return;
        }
      }
      const fresh = await api.fetchThemes();
      setThemes(fresh);
      await storage.setCache("themes", fresh);
    } catch {
      const cached = await storage.getCached<Theme[]>("themes");
      if (cached) setThemes(cached);
    } finally {
      setThemesLoading(false);
    }
  }, []);

  const loadItems = useCallback(async (theme: Theme, force = false) => {
    setItemsLoading(true);
    try {
      if (!force) {
        const cached = await storage.getCached<GachaItem[]>(theme.theme_id);
        if (cached) {
          setItems(cached);
          setItemsByTheme((prev) => ({ ...prev, [theme.theme_id]: cached }));
          setItemsLoading(false);
          api
            .fetchThemeItems(theme.sheet_name)
            .then((fresh) => {
              setItems(fresh);
              setItemsByTheme((prev) => ({ ...prev, [theme.theme_id]: fresh }));
              storage.setCache(theme.theme_id, fresh);
            })
            .catch(() => {});
          return;
        }
      }
      const fresh = await api.fetchThemeItems(theme.sheet_name);
      setItems(fresh);
      setItemsByTheme((prev) => ({ ...prev, [theme.theme_id]: fresh }));
      await storage.setCache(theme.theme_id, fresh);
    } catch {
      const cached = await storage.getCached<GachaItem[]>(theme.theme_id);
      if (cached) {
        setItems(cached);
        setItemsByTheme((prev) => ({ ...prev, [theme.theme_id]: cached }));
      }
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const selectTheme = useCallback(
    (theme: Theme) => {
      setSelectedTheme(theme);
      loadItems(theme);
      // Load collected for this theme
      storage.getCollected(theme.theme_id).then((c) => {
        setCollected((prev) => ({ ...prev, [theme.theme_id]: c }));
      });
    },
    [loadItems],
  );

  const addToCollection = useCallback(async (themeId: string, itemId: string) => {
    const updated = await storage.addCollected(themeId, itemId);
    setCollected((prev) => ({ ...prev, [themeId]: updated }));
  }, []);

  const loadFavorites = useCallback(async () => {
    const favs = await storage.getFavorites();
    setFavorites(favs);
  }, []);

  const toggleFav = useCallback(async (themeId: string, itemId: string) => {
    const updated = await storage.toggleFavorite(themeId, itemId);
    setFavorites(updated);
  }, []);

  const removeFav = useCallback(async (themeId: string, itemId: string) => {
    const updated = await storage.removeFavorite(themeId, itemId);
    setFavorites(updated);
  }, []);

  const incrementPulls = useCallback(async (): Promise<boolean> => {
    const pulls = await storage.getDailyPulls();
    if (pulls.count >= 10) return false;
    const updated = await storage.incrementDailyPulls();
    setDailyCount(updated.count);
    return true;
  }, []);

  const resetPulls = useCallback(async () => {
    await storage.resetDailyPulls();
    setDailyCount(0);
  }, []);

  // Init daily count
  React.useEffect(() => {
    storage.getDailyPulls().then((p) => setDailyCount(p.count));
    loadFavorites();
  }, [loadFavorites]);

  return (
    <GachaContext.Provider
      value={{
        themes,
        loadThemes,
        themesLoading,
        selectedTheme,
        selectTheme,
        items,
        itemsLoading,
        loadItems,
        collected,
        addToCollection,
        favorites,
        toggleFav,
        removeFav,
        loadFavorites,
        dailyCount,
        incrementPulls,
        resetPulls,
        itemsByTheme,
      }}
    >
      {children}
    </GachaContext.Provider>
  );
}

export function useGacha() {
  return useContext(GachaContext);
}
