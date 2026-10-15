"use client";

import { api } from "~/trpc/react";
import { MAP_COLOR_DEFAULTS, type MapColors } from "./colors";

/** Warna pin dari konfigurasi aplikasi (dapat dibaca Guest); memakai warna bawaan selagi memuat. */
export function useMapColors(): MapColors {
  const { data } = api.settings.mapColors.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  return data ?? MAP_COLOR_DEFAULTS;
}
