export interface Theme {
  theme_id: string;
  name: string;
  icon: string;
  description: string;
  has_location: boolean;
  sheet_name: string;
}

export interface GachaItem {
  id: string;
  text: string;
  subtitle: string;
  category: string;
  rarity: number;
  source?: string;
  character?: string;
  latitude?: number;
  longitude?: number;
}

export interface DailyPulls {
  date: string;
  count: number;
}

export interface FavoriteEntry {
  theme_id: string;
  item_id: string;
}
