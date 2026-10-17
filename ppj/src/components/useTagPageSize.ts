"use client";

import { api } from "~/trpc/react";

/** Nilai bawaan selagi konfigurasi dimuat atau bila belum diatur Admin. */
export const TAG_PAGE_SIZE_DEFAULT = 4;

/** Jumlah TAG awal & per "muat lagi" (Pengaturan → Umum → Daftar TAG). */
export function useTagPageSize() {
  const { data } = api.settings.tagPageSize.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  return data?.pageSize ?? TAG_PAGE_SIZE_DEFAULT;
}
