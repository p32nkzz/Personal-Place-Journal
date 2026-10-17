"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";

type Mode = "date" | "time" | "datetime";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
/** Pecah nilai bergaya input bawaan: "YYYY-MM-DD", "HH:mm", atau "YYYY-MM-DDTHH:mm". */
const parse = (mode: Mode, v: string) => {
  const date = mode === "time" ? "" : v.slice(0, 10);
  const time = mode === "date" ? "" : mode === "time" ? v.slice(0, 5) : v.slice(11, 16);
  const ok = (s: string, re: RegExp) => (re.test(s) ? s : "");
  return { date: ok(date, /^\d{4}-\d{2}-\d{2}$/), time: ok(time, /^\d{2}:\d{2}$/) };
};

/**
 * Pengganti `<input type="date|time|datetime-local">` yang mengikuti BAHASA AKTIF aplikasi
 * (pemilih bawaan browser selalu memakai bahasa browser/OS). Nilai tetap berformat sama dengan
 * input bawaan sehingga dapat langsung menggantikannya.
 */
export function DateField({
  id,
  mode = "date",
  value,
  onChange,
  max,
  min,
  clearable,
  invalid,
  placeholder,
}: {
  id?: string;
  mode?: Mode;
  value: string;
  onChange: (v: string) => void;
  /** Batas atas dengan format yang sama dengan `value` (mis. waktu sekarang). */
  max?: string;
  min?: string;
  /** Tampilkan tombol kosongkan (untuk isian opsional). */
  clearable?: boolean;
  invalid?: boolean;
  placeholder?: string;
}) {
  const { t, lang } = useT();
  const locale = lang === "ID" ? "id-ID" : "en-GB";
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean } | null>(null);

  const cur = parse(mode, value);
  const maxP = max ? parse(mode, max) : { date: "", time: "" };
  const minP = min ? parse(mode, min) : { date: "", time: "" };
  const today = useMemo(() => {
    const d = new Date();
    return ymd(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);
  const base = cur.date || (maxP.date && maxP.date < today ? maxP.date : today);
  const [view, setView] = useState({ y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 });
  useEffect(() => {
    if (!open) return;
    const b = cur.date || (maxP.date && maxP.date < today ? maxP.date : today);
    setView({ y: Number(b.slice(0, 4)), m: Number(b.slice(5, 7)) - 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ----- Format tampilan sesuai bahasa aktif -----
  const fmt = useMemo(
    () => ({
      date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
      time: new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" }),
      month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
      full: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    }),
    [locale],
  );
  const asUtc = (date: string, time = "00:00") => new Date(`${date}T${time}:00Z`);
  const label =
    mode === "time"
      ? cur.time && fmt.time.format(asUtc("2000-01-01", cur.time))
      : mode === "datetime"
        ? cur.date && `${fmt.date.format(asUtc(cur.date))}, ${fmt.time.format(asUtc(cur.date, cur.time || "00:00"))}`
        : cur.date && fmt.date.format(asUtc(cur.date));

  // Senin sebagai awal minggu (lazim untuk ID & EN-GB).
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => fmt.weekday.format(new Date(Date.UTC(2024, 0, 1 + i)))), [fmt]);
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1));
    const lead = (first.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [view]);

  // ----- Posisi popover (fixed, di-portal agar tidak terpotong modal/kartu) -----
  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = 300;
    const h = popRef.current?.offsetHeight ?? 360;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const up = r.bottom + 6 + h > window.innerHeight && r.top - 6 - h > 0;
    setPos({ left, top: up ? r.top - 6 - h : r.bottom + 6, up });
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place, view]);

  // Tutup saat klik di luar / Escape (Escape tidak ikut menutup modal di bawahnya).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!popRef.current?.contains(n) && !btnRef.current?.contains(n)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  // ----- Perubahan nilai -----
  const clampDT = (date: string, time: string) => {
    let d = date;
    let tm = time;
    if (maxP.date && (d > maxP.date || (d === maxP.date && maxP.time && tm > maxP.time))) {
      d = maxP.date;
      if (maxP.time && tm > maxP.time) tm = maxP.time;
    }
    if (minP.date && (d < minP.date || (d === minP.date && minP.time && tm < minP.time))) {
      d = minP.date;
      if (minP.time && tm < minP.time) tm = minP.time;
    }
    return { d, tm };
  };
  const emit = (date: string, time: string) => {
    if (mode === "date") onChange(date);
    else if (mode === "time") onChange(time);
    else {
      const { d, tm } = clampDT(date, time || "00:00");
      onChange(`${d}T${tm}`);
    }
  };
  const pickDay = (day: number) => {
    const d = ymd(view.y, view.m, day);
    emit(d, cur.time || (maxP.date === d && maxP.time ? maxP.time : "12:00"));
    if (mode === "date") setOpen(false);
  };
  const setTime = (h: number, m: number) => emit(cur.date || (maxP.date && maxP.date < today ? maxP.date : today), `${pad(h)}:${pad(m)}`);
  const goToday = () => {
    const now = new Date();
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (mode === "time") onChange(time);
    else if (mode === "date") onChange(today);
    else emit(today, maxP.date === today && maxP.time && time > maxP.time ? maxP.time : time);
    if (mode !== "datetime") setOpen(false);
  };
  const disabledDay = (d: string) => (!!maxP.date && d > maxP.date) || (!!minP.date && d < minP.date);
  const [hh, mm] = (cur.time || "00:00").split(":").map(Number) as [number, number];

  const pop =
    open &&
    createPortal(
      <div
        ref={popRef}
        className={`dp-pop${pos?.up ? " is-up" : ""}`}
        role="dialog"
        aria-label={mode === "time" ? t("date.pickTime") : t("date.pick")}
        style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
      >
        {mode !== "time" && (
          <>
            <div className="dp-head">
              <button type="button" className="dp-nav" onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))} aria-label={t("date.prevMonth")} title={t("date.prevMonth")}>
                <Icon name="angle-left" fixedWidth={false} />
              </button>
              <span className="dp-month">{fmt.month.format(new Date(Date.UTC(view.y, view.m, 1)))}</span>
              <button type="button" className="dp-nav" onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))} aria-label={t("date.nextMonth")} title={t("date.nextMonth")}>
                <Icon name="angle-right" fixedWidth={false} />
              </button>
            </div>
            <div className="dp-grid" role="grid">
              {weekdays.map((w) => (
                <span key={w} className="dp-wd" role="columnheader">{w}</span>
              ))}
              {cells.map((day, i) => {
                if (day == null) return <span key={`e${i}`} />;
                const d = ymd(view.y, view.m, day);
                const dis = disabledDay(d);
                return (
                  <button
                    key={d}
                    type="button"
                    className={`dp-day${d === cur.date ? " is-sel" : ""}${d === today ? " is-today" : ""}`}
                    disabled={dis}
                    aria-pressed={d === cur.date}
                    aria-label={fmt.full.format(asUtc(d))}
                    onClick={() => pickDay(day)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {mode !== "date" && (
          <div className="dp-time">
            <Icon name="history" fixedWidth={false} />
            <span className="dp-time-label">{t("date.time")}</span>
            <select className="dp-sel" aria-label={t("date.hour")} value={hh} onChange={(e) => setTime(Number(e.target.value), mm)}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{pad(h)}</option>
              ))}
            </select>
            <span className="dp-colon">:</span>
            <select className="dp-sel" aria-label={t("date.minute")} value={mm} onChange={(e) => setTime(hh, Number(e.target.value))}>
              {Array.from({ length: 60 }, (_, m) => (
                <option key={m} value={m}>{pad(m)}</option>
              ))}
            </select>
          </div>
        )}
        <div className="dp-foot">
          <button type="button" className="dp-link" onClick={goToday}>
            {mode === "date" ? t("date.today") : t("date.now")}
          </button>
          <span className="dp-foot-right">
            {clearable && value && (
              <button type="button" className="dp-link is-muted" onClick={() => { onChange(""); setOpen(false); }}>
                {t("date.clear")}
              </button>
            )}
            {mode !== "date" && (
              <button type="button" className="dp-done" onClick={() => setOpen(false)}>
                {t("date.done")}
              </button>
            )}
          </span>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={`input dp-input${value ? "" : " is-empty"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-invalid={invalid || undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={mode === "time" ? "history" : "calendar"} fixedWidth={false} className="dp-ico" />
        <span className="dp-value">{label || placeholder || (mode === "time" ? t("date.pickTime") : t("date.pick"))}</span>
      </button>
      {pop}
    </>
  );
}
