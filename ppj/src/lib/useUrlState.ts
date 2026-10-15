"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * State tabel disinkronkan ke URL (page, limit, sort, order, q, filter) agar dapat
 * di-bookmark dan bertahan saat reload (DESIGN.md — Data Tables & Pagination).
 */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state = useMemo(() => {
    const out: Record<string, string> = { ...defaults };
    for (const k of Object.keys(defaults)) {
      const v = sp.get(k);
      if (v != null) out[k] = v;
    }
    return out as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const set = useCallback(
    (patch: Partial<T>) => {
      const p = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "" || v === defaults[k]) p.delete(k);
        else p.set(k, String(v));
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sp, pathname, router],
  );

  return [state, set] as const;
}
