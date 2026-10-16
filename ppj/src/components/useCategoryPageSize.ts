"use client";

import { api } from "~/trpc/react";

/** Nilai bawaan selagi konfigurasi dimuat atau bila belum diatur Admin. */
export const CATEGORY_PAGE_SIZE_DEFAULT = 4;

/** Jumlah kategori awal & per "muat lagi" (Pengaturan → Umum → Daftar kategori). */
export function useCategoryPageSize() {
  const { data } = api.settings.categoryPageSize.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  return data?.pageSize ?? CATEGORY_PAGE_SIZE_DEFAULT;
}
