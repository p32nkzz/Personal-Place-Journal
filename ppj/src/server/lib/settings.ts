import { eq, like } from "drizzle-orm";

import { db } from "~/server/db";
import { appSettings } from "~/server/db/schema";

export type PhotoRules = {
  allowedTypes: string[];
  maxSizeMb: number;
  maxPerVisit: number;
  maxPerMasterPlace: number;
  maxPerMyPlace: number;
};

export type AvatarRules = { allowedTypes: string[]; maxSizeMb: number };

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
    maxPerMyPlace: Number(m.get("photo.max_per_my_place") ?? 10),
  };
}

/** Aturan avatar profil (app_settings avatar.*), terpisah dari aturan foto tempat. */
export async function getAvatarRules(): Promise<AvatarRules> {
  const rows = await db.select().from(appSettings).where(like(appSettings.key, "avatar.%"));
  const m = new Map(rows.map((r) => [r.key, r.value]));
  return {
    allowedTypes: (m.get("avatar.allowed_types") ?? "jpg,png,webp")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    maxSizeMb: Number(m.get("avatar.max_size_mb") ?? 5),
  };
}

const IMAGE_TYPES = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

/** Validasi nilai per key (ERD 12.20). Mengembalikan null bila valid, atau kode error. */
export function validateSetting(key: string, value: string): string | null {
  switch (key) {
    case "photo.allowed_types":
    case "avatar.allowed_types": {
      const types = value
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (!types.length || !types.every((t) => IMAGE_TYPES.has(t)))
        return "SETTING_TYPES_INVALID";
      return null;
    }
    case "photo.max_size_mb":
    case "avatar.max_size_mb": {
      const n = Number(value);
      return value.trim() !== "" && Number.isFinite(n) && n >= 0 ? null : "SETTING_NON_NEGATIVE_NUMBER";
    }
    case "photo.max_per_visit":
    case "photo.max_per_master_place":
    case "photo.max_per_my_place": {
      const n = Number(value);
      return value.trim() !== "" && Number.isInteger(n) && n >= 0 ? null : "SETTING_NON_NEGATIVE_INTEGER";
    }
    case "app.timezone": {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return null;
      } catch {
        return "SETTING_TIMEZONE_INVALID";
      }
    }
    case "category.page_size":
    case "visit.page_size":
    case "tag.page_size":
    case "map.default_zoom": {
      const n = Number(value);
      return value.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= 20 ? null : "SETTING_ZOOM";
    }
    case "map.pin_scale":
    case "map.pin_scale_active": {
      const n = Number(value);
      return value.trim() !== "" && Number.isFinite(n) && n >= 0.5 && n <= 3 ? null : "SETTING_PIN_SCALE";
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
  "map.default_zoom": "15",
  "map.pin_scale": "1",
  "map.pin_scale_active": "1.4",
  "app.timezone": "Asia/Jakarta",
  "category.page_size": "4",
  "tag.page_size": "4",
  "visit.page_size": "5",
  "photo.max_per_my_place": "10",
  "avatar.allowed_types": "jpg,png,webp",
  "avatar.max_size_mb": "5",
};

/** Zona waktu default aplikasi (IANA); bawaan Asia/Jakarta (WIB). */
export async function getTimezone() {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "app.timezone"));
  const v = row?.value;
  if (v) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return v;
    } catch {
      // nilai rusak → pakai bawaan
    }
  }
  return "Asia/Jakarta";
}

/** Jumlah kunjungan per halaman pada detail MY PLACE (paging server-side). */
export async function getVisitPageSize() {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "visit.page_size"));
  const n = Number(row?.value);
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : 5;
}

/** Jumlah TAG yang dimuat awal & per "muat lagi" pada semua filter/pemilih TAG (umum). */
export async function getTagPageSize() {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "tag.page_size"));
  const n = Number(row?.value);
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : 4;
}

/** Jumlah kategori yang dimuat awal & per "muat lagi" pada semua filter/pemilih kategori (umum). */
export async function getCategoryPageSize() {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "category.page_size"));
  const n = Number(row?.value);
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : 4;
}

/** Jumlah data awal & per pemuatan pada daftar filter tempat (menu Peta). */
export async function getMapSearchConfig() {
  const rows = await db.select().from(appSettings).where(like(appSettings.key, "map.%"));
  const m = new Map(rows.map((r) => [r.key, Number(r.value)]));
  const n = m.get("map.recent_page_size");
  const z = m.get("map.default_zoom");
  const scale = (k: string, def: number) => {
    const v = m.get(k);
    return v != null && Number.isFinite(v) && v >= 0.5 && v <= 3 ? v : def;
  };
  return {
    recentPageSize: n != null && Number.isInteger(n) && n >= 1 && n <= 50 ? n : RECENT_PAGE_SIZE_DEFAULT,
    // Zoom bawaan peta (1–20): dipakai saat memfokuskan tempat, pin, lokasi perangkat, dan titik tunggal.
    defaultZoom: z != null && Number.isInteger(z) && z >= 1 && z <= 20 ? z : 15,
    // Ukuran pin (MASTER, MY PLACE, pin baru): normal & saat aktif/dipilih (skala 0,5–3).
    pinScale: scale("map.pin_scale", 1),
    pinScaleActive: scale("map.pin_scale_active", 1.4),
  };
}
