"use client";

import { api } from "~/trpc/react";

/** Nilai bawaan aplikasi; dipakai selagi konfigurasi dimuat atau bila belum diatur Admin. */
export const RECENT_PAGE_SIZE_DEFAULT = 3;

/** Jumlah data awal & per pemuatan pada daftar filter tempat (Pengaturan → Peta). */
export function useMapSearchConfig() {
  const { data } = api.settings.mapSearch.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  return { recentPageSize: data?.recentPageSize ?? RECENT_PAGE_SIZE_DEFAULT };
}
