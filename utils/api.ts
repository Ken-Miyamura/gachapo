import type { GachaItem, Theme } from "@/types";
import { csvToObjects } from "./csv";

const BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBy8bpSQrJBjwzeGVHLbAvSoDdCuF9QdTrtKVwPDKAxtkoDc4AAzU8JtCh1voPYg/pub?output=csv&gid=";

const THEMES_GID = "245030007";

const SHEET_GID_MAP: Record<string, string> = {
  名言: "987470300",
  トークテーマ: "174274238",
  映画アニメ: "932248228",
  東京Bar: "1760962605",
};

export async function fetchThemes(): Promise<Theme[]> {
  const res = await fetch(BASE_URL + THEMES_GID);
  const text = await res.text();
  return csvToObjects(text, (headers, values) => {
    const get = (key: string) => {
      const idx = headers.indexOf(key);
      return idx >= 0 ? (values[idx]?.trim() ?? "") : "";
    };
    return {
      theme_id: get("theme_id"),
      name: get("name"),
      icon: get("icon"),
      description: get("description"),
      has_location: get("has_location").toUpperCase() === "TRUE",
      sheet_name: get("sheet_name"),
    };
  });
}

export async function fetchThemeItems(sheetName: string): Promise<GachaItem[]> {
  const gid = SHEET_GID_MAP[sheetName];
  if (!gid) throw new Error(`Unknown sheet: ${sheetName}`);
  const res = await fetch(BASE_URL + gid);
  const text = await res.text();
  return csvToObjects(text, (headers, values) => {
    const get = (key: string) => {
      const idx = headers.indexOf(key);
      return idx >= 0 ? (values[idx]?.trim() ?? "") : "";
    };
    return {
      id: get("id"),
      text: get("text"),
      subtitle: get("subtitle"),
      category: get("category"),
      rarity: parseInt(get("rarity"), 10) || 1,
      source: get("source") || undefined,
      character: get("character") || undefined,
      latitude: get("latitude") ? parseFloat(get("latitude")) : undefined,
      longitude: get("longitude") ? parseFloat(get("longitude")) : undefined,
    };
  });
}
