"use client";

import { useEffect, useRef, useState } from "react";

type Tip = { text: string; x: number; y: number; below: boolean };

const DELAY = 300;
const GAP = 8;

/**
 * Tooltip global yang ringkas & elegan untuk SEMUA elemen ber-atribut `title` di aplikasi.
 * Saat kursor/fokus masuk, `title` dipindah ke `data-tip` (tooltip bawaan browser tidak muncul)
 * lalu ditampilkan sebagai gelembung bergaya. Elemen milik Google Maps & Fancybox dibiarkan.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef<number | null>(null);
  const current = useRef<HTMLElement | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clear = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      current.current = null;
      setTip(null);
    };

    const targetOf = (node: EventTarget | null): HTMLElement | null => {
      if (!(node instanceof Element)) return null;
      const el = node.closest<HTMLElement>("[title], [data-tip]");
      if (!el) return null;
      // Jangan ganggu kontrol pihak ketiga yang mengatur tooltip sendiri.
      if (el.closest(".gm-style, .fancybox__container")) return null;
      return el;
    };

    const capture = (el: HTMLElement) => {
      const title = el.getAttribute("title");
      if (title != null) {
        if (title.trim()) {
          el.setAttribute("data-tip", title);
          // Pertahankan nama aksesibel untuk tombol ikon tanpa teks/label.
          if (!el.getAttribute("aria-label") && !el.textContent?.trim()) el.setAttribute("aria-label", title);
        }
        el.removeAttribute("title");
      }
      return el.getAttribute("data-tip") ?? "";
    };

    const show = (el: HTMLElement) => {
      const text = capture(el);
      if (!text) return;
      current.current = el;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (current.current !== el || !el.isConnected) return;
        const r = el.getBoundingClientRect();
        const below = r.top < 44; // tidak cukup ruang di atas
        setTip({ text, x: r.left + r.width / 2, y: below ? r.bottom + GAP : r.top - GAP, below });
      }, DELAY);
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = targetOf(e.target);
      if (!el) return;
      if (el === current.current) return;
      show(el);
    };
    const onOut = (e: PointerEvent) => {
      const el = current.current;
      if (!el) return;
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
      clear();
    };
    const onFocus = (e: FocusEvent) => {
      const el = targetOf(e.target);
      if (el && (e.target as Element).matches(":focus-visible")) show(el);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && clear();

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", clear);
    document.addEventListener("pointerdown", clear, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", clear);
      document.removeEventListener("pointerdown", clear, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("resize", clear);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  // Jaga gelembung tetap di dalam layar (geser horizontal bila mepet tepi).
  const [shift, setShift] = useState(0);
  useEffect(() => {
    if (!tip || !box.current) return setShift(0);
    const r = box.current.getBoundingClientRect();
    const pad = 8;
    let dx = 0;
    if (r.left < pad) dx = pad - r.left;
    else if (r.right > window.innerWidth - pad) dx = window.innerWidth - pad - r.right;
    setShift(dx);
  }, [tip]);

  if (!tip) return null;
  return (
    <div
      ref={box}
      role="tooltip"
      className={`ui-tip${tip.below ? " is-below" : ""}`}
      style={{ left: tip.x, top: tip.y, ["--tip-shift" as string]: `${shift}px` }}
    >
      {tip.text}
    </div>
  );
}
