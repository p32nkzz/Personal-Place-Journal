/** Warna bawaan pin peta. Admin dapat mengubahnya di Pengaturan (app_settings `map.color_*`). */
export const MAP_COLOR_DEFAULTS = {
  master: "#3730A3",
  mine: "#C026D3",
  favorite: "#F59E0B",
  newPin: "#DC2626",
} as const;

export type MapColors = { [K in keyof typeof MAP_COLOR_DEFAULTS]: string };

/** Kunci app_settings untuk tiap warna. */
export const MAP_COLOR_KEYS: Record<keyof MapColors, string> = {
  master: "map.color_master",
  mine: "map.color_mine",
  favorite: "map.color_favorite",
  newPin: "map.color_new_pin",
};

/** Warna isi pin (glyph) yang terbaca di atas latar `hex`: gelap untuk latar terang, putih untuk latar gelap. */
export function readableOn(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1]!, 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? "#1F2937" : "#ffffff";
}
