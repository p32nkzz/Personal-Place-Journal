import { eq, like } from "drizzle-orm";

import { db } from "~/server/db";
import { appSettings } from "~/server/db/schema";

export type PhotoRules = {
  allowedTypes: string[];
  maxSizeMb: number;
  maxPerVisit: number;
  maxPerMasterPlace: number;
};

/** DV-10 — aturan foto aktif dibaca dari app_settings saat upload (tidak hard-coded). */
export async function getPhotoRules(): Promise<PhotoRules> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(like(appSettings.key, "photo.%"));
  const m = new Map(rows.map((r) => [r.key, r.value]));
  return {
    allowedTypes: (m.get("photo.allowed_types") ?? "jpg,png,webp")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    maxSizeMb: Number(m.get("photo.max_size_mb") ?? 5),
    maxPerVisit: Number(m.get("photo.max_per_visit") ?? 10),
    maxPerMasterPlace: Number(m.get("photo.max_per_master_place") ?? 20),
  };
}

const IMAGE_TYPES = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

/** Validasi nilai per key (ERD 12.20). Mengembalikan null bila valid, atau kode error. */
export function validateSetting(key: string, value: string): string | null {
  switch (key) {
    case "photo.allowed_types": {
      const types = value
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (!types.length || !types.every((t) => IMAGE_TYPES.has(t)))
        return "SETTING_TYPES_INVALID";
      return null;
    }
    case "photo.max_size_mb": {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? null : "SETTING_POSITIVE_NUMBER";
    }
    case "photo.max_per_visit":
    case "photo.max_per_master_place": {
      const n = Number(value);
      return Number.isInteger(n) && n >= 1 ? null : "SETTING_POSITIVE_INTEGER";
    }
    case "map.recent_page_size": {
      const n = Number(value);
      return Number.isInteger(n) && n >= 1 && n <= 50 ? null : "SETTING_PAGE_SIZE";
    }
    case "map.color_master":
    case "map.color_mine":
    case "map.color_favorite":
    case "map.color_new_pin":
      return /^#[0-9A-Fa-f]{6}$/.test(value) ? null : "COLOR_FORMAT";
    default:
      return "SETTING_UNKNOWN";
  }
}

/** Warna pin peta (app_settings); kunci yang belum ada memakai warna bawaan. */
export const MAP_COLOR_DEFAULTS = {
  "map.color_master": "#111827",
  "map.color_mine": "#CA8A04",
  "map.color_favorite": "#FACC15",
  "map.color_new_pin": "#DC2626",
} as const;

export async function getMapColors() {
  const rows = await db.select().from(appSettings).where(like(appSettings.key, "map.color_%"));
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const pick = (k: keyof typeof MAP_COLOR_DEFAULTS) => {
    const v = m.get(k);
    return v && /^#[0-9A-Fa-f]{6}$/.test(v) ? v.toUpperCase() : MAP_COLOR_DEFAULTS[k];
  };
  return {
    master: pick("map.color_master"),
    mine: pick("map.color_mine"),
    favorite: pick("map.color_favorite"),
    newPin: pick("map.color_new_pin"),
  };
}

/** Nilai bawaan aplikasi untuk pengaturan peta; dipakai bila baris belum ada di app_settings. */
export const RECENT_PAGE_SIZE_DEFAULT = 3;

export const SETTING_DEFAULTS: Record<string, string> = {
  ...MAP_COLOR_DEFAULTS,
  "map.recent_page_size": String(RECENT_PAGE_SIZE_DEFAULT),
};

/** Jumlah data awal & per pemuatan pada daftar filter tempat (menu Peta). */
export async function getMapSearchConfig() {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "map.recent_page_size"));
  const n = Number(row?.value);
  return {
    recentPageSize: Number.isInteger(n) && n >= 1 && n <= 50 ? n : RECENT_PAGE_SIZE_DEFAULT,
  };
}
