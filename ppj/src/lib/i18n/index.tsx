"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { messages, type Lang, type MessageKey } from "./messages";

export type { Lang } from "./messages";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey | (string & {}), vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export const LANG_COOKIE = "ppj_lang";

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
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

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx;
}

/** Zona waktu tampilan: WIB (NFR-I18N-001). */
const TZ = "Asia/Jakarta";

export function useFormat() {
  const { lang } = useT();
  const locale = lang === "ID" ? "id-ID" : "en-GB";
  return useMemo(
    () => ({
      dateTime: (d: Date | string | null | undefined) =>
        d
          ? new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: TZ,
            }).format(new Date(d)) + " WIB"
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
      number: (n: number, digits = 1) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n),
    }),
    [locale],
  );
}

/** Date → nilai `datetime-local` (WIB). */
export function toWibInput(d: Date | string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d));
  return parts.replace(" ", "T");
}

/** Nilai `datetime-local` (diasumsikan WIB) → ISO UTC. */
export function fromWibInput(v: string) {
  return new Date(`${v}:00+07:00`).toISOString();
}

export function nowWibInput() {
  return toWibInput(new Date());
}
