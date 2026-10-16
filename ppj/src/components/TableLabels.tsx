"use client";

import { useEffect } from "react";

/**
 * Di layar sempit, tabel `.table` ditampilkan sebagai kartu bertumpuk (CSS). Komponen ini mengisi
 * atribut `data-label` tiap sel dari judul kolomnya agar label tetap terbaca di tampilan kartu.
 * Berlaku otomatis untuk semua tabel, termasuk yang dirender ulang (paging/filter).
 */
export function TableLabels() {
  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      for (const table of document.querySelectorAll<HTMLTableElement>("table.table")) {
        const heads = [...table.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
        for (const row of table.querySelectorAll("tbody tr")) {
          [...row.children].forEach((cell, i) => {
            const label = heads[i] ?? "";
            if (cell.getAttribute("data-label") !== label) cell.setAttribute("data-label", label);
          });
        }
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
