"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { messages, type Lang, type MessageKey } from "./messages";

export type { Lang } from "./messages";

type Ctx = {
  lang: Lang;
  /** Zona waktu tampilan (IANA) dari pengaturan aplikasi. */
  timezone: string;
  setLang: (l: Lang) => void;
  t: (key: MessageKey | (string & {}), vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export const LANG_COOKIE = "ppj_lang";

export const DEFAULT_TIMEZONE = "Asia/Jakarta";

export function I18nProvider({
  initialLang,
  timezone = DEFAULT_TIMEZONE,
  children,
}: {
  initialLang: Lang;
  timezone?: string;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l === "ID" ? "id" : "en";
  }, []);

  const t = useCallback<Ctx["t"]>(
    (key, vars) => {
      const dict = messages[lang] as Record<string, string>;
      let s = dict[key] ?? (messages.ID as Record<string, string>)[key] ?? key;
      if (vars)
        for (const [k, v] of Object.entries(vars))
          s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, timezone, setLang, t }), [lang, timezone, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx;
}

/** Zona waktu tampilan dari pengaturan aplikasi (default Asia/Jakarta). */
export function useTimezone() {
  return useT().timezone;
}

/** Singkatan zona waktu pada saat tertentu, mis. "WIB" atau "GMT+7". */
export function tzShortName(tz: string, locale: string, at: Date = new Date()) {
  try {
    return (
      new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: "short" })
        .formatToParts(at)
        .find((p) => p.type === "timeZoneName")?.value ?? tz
    );
  } catch {
    return tz;
  }
}

/**
 * Format tanggal/waktu dengan pemisah jam ":" di semua bahasa (locale id-ID bawaan memakai ".",
 * mis. "10.16"). Hanya literal di antara jam–menit–detik yang diganti; bagian tanggal tidak tersentuh.
 */
export function formatWithColon(f: Intl.DateTimeFormat, d: Date) {
  const parts = f.formatToParts(d);
  return parts
    .map((p, i) =>
      p.type === "literal" &&
      (parts[i - 1]?.type === "hour" || parts[i - 1]?.type === "minute") &&
      (parts[i + 1]?.type === "minute" || parts[i + 1]?.type === "second")
        ? ":"
        : p.value,
    )
    .join("");
}

export function useFormat() {
  const { lang, timezone: TZ } = useT();
  const locale = lang === "ID" ? "id-ID" : "en-GB";
  return useMemo(
    () => ({
      dateTime: (d: Date | string | null | undefined) =>
        d
          ? formatWithColon(
              new Intl.DateTimeFormat(locale, {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
                timeZone: TZ,
                timeZoneName: "short",
              }),
              new Date(d),
            )
          : "—",
      date: (d: Date | string | null | undefined) => {
        if (!d) return "—";
        // Tanggal murni (YYYY-MM-DD) tidak dikonversi zona waktu.
        if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
          const [y, m, day] = d.split("-").map(Number);
          return new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeZone: "UTC",
          }).format(new Date(Date.UTC(y!, m! - 1, day)));
        }
        return new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeZone: TZ,
        }).format(new Date(d));
      },
      /**
       * Waktu relatif ("hari ini", "kemarin", "3 hari lalu", "2 minggu lalu", ...) dihitung per HARI KALENDER
       * pada zona waktu aplikasi aktif — bukan selisih 24 jam — sehingga "kemarin" tepat pada pergantian
       * tengah malam zona tersebut.
       */
      relative: (d: Date | string | null | undefined, now: Date = new Date()) => {
        if (!d) return "—";
        const ymd = (x: Date) => {
          const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(x);
          const g = (t: string) => Number(p.find((q) => q.type === t)?.value);
          return { y: g("year"), m: g("month"), d: g("day") };
        };
        const a = ymd(new Date(d));
        const b = ymd(now);
        const days = Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / 86400000);
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
        const abs = Math.abs(days);
        if (abs < 7) return rtf.format(days, "day");
        if (abs < 30) return rtf.format(Math.trunc(days / 7), "week");
        // Bulan/tahun: selisih bulan kalender (dikurangi 1 bila tanggalnya belum genap sebulan).
        let months = (a.y - b.y) * 12 + (a.m - b.m);
        if (months > 0 && a.d < b.d) months -= 1;
        if (months < 0 && a.d > b.d) months += 1;
        if (Math.abs(months) < 12) return rtf.format(months || Math.sign(days), "month");
        return rtf.format(Math.trunc(months / 12), "year");
      },
      number: (n: number, digits = 1) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n),
    }),
    [locale, TZ],
  );
}

/** Offset zona waktu (ms) pada instan UTC tertentu. */
export function tzOffsetMs(tz: string, utcMs: number) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const g = (type: string) => Number(p.find((x) => x.type === type)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Date → nilai `datetime-local` pada zona waktu `tz`. */
export function toZonedInput(d: Date | string, tz: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d));
  return parts.replace(" ", "T");
}

/** Nilai `datetime-local` (waktu dinding pada zona `tz`) → ISO UTC. */
export function fromZonedInput(v: string, tz: string) {
  const [dPart, tPart = "00:00"] = v.split("T");
  const [y, m, day] = dPart!.split("-").map(Number);
  const [h, mi] = tPart.split(":").map(Number);
  const guess = Date.UTC(y!, m! - 1, day!, h!, mi!);
  let utc = guess - tzOffsetMs(tz, guess);
  utc = guess - tzOffsetMs(tz, utc);
  return new Date(utc).toISOString();
}

/** Helper input tanggal-waktu pada zona waktu aplikasi. */
export function useZonedInput() {
  const tz = useTimezone();
  return useMemo(
    () => ({
      tz,
      toInput: (d: Date | string) => toZonedInput(d, tz),
      fromInput: (v: string) => fromZonedInput(v, tz),
      nowInput: () => toZonedInput(new Date(), tz),
    }),
    [tz],
  );
}
