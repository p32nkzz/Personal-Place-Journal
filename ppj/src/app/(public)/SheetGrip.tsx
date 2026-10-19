"use client";

import { useRef } from "react";

import { useT } from "~/lib/i18n";

/** Jarak geser (px) atau kecepatan (px/ms) minimum agar sheet ditutup saat dilepas. */
const CLOSE_DISTANCE = 80;
const CLOSE_VELOCITY = 0.5;

/**
 * Garis pegangan bottom sheet detail di Peta (tampilan ponsel): geser ke bawah untuk menutup.
 * Sheet ikut bergeser mengikuti jari; dilepas melewati batas → sheet turun keluar lalu ditutup,
 * bila belum → kembali ke posisinya. Di desktop pegangan disembunyikan lewat CSS.
 */
export function SheetGrip({ sheet, onClose }: { sheet: React.RefObject<HTMLElement | null>; onClose: () => void }) {
  const { t } = useT();
  const drag = useRef<{ id: number; y0: number; t0: number; dy: number } | null>(null);

  const setY = (y: number, animate: boolean) => {
    const el = sheet.current;
    if (!el) return;
    el.style.transition = animate ? "transform 200ms ease-out" : "none";
    el.style.transform = y ? `translateY(${y}px)` : "";
  };

  const end = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const el = sheet.current;
    const v = d.dy / Math.max(1, performance.now() - d.t0);
    if (el && (d.dy > CLOSE_DISTANCE || (d.dy > 20 && v > CLOSE_VELOCITY))) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        setY(0, false);
        onClose();
        return;
      }
      setY(el.offsetHeight + 24, true);
      window.setTimeout(() => {
        onClose();
        // Sheet berikutnya (pin lain) tampil dari posisi normal.
        if (sheet.current) {
          sheet.current.style.transform = "";
          sheet.current.style.transition = "";
        }
      }, 200);
    } else {
      setY(0, true);
    }
  };

  return (
    <div
      className="pp-grip"
      role="button"
      tabIndex={-1}
      aria-label={t("map.sheetSwipeClose")}
      title={t("map.sheetSwipeClose")}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, y0: e.clientY, t0: performance.now(), dy: 0 };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        // Hanya ke bawah; ke atas diberi hambatan kecil agar terasa elastis.
        const raw = e.clientY - d.y0;
        d.dy = Math.max(0, raw);
        setY(raw >= 0 ? raw : raw / 6, false);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onClick={(e) => e.stopPropagation()}
    >
      <span aria-hidden />
    </div>
  );
}
