"use client";

import { useCallback, useMemo } from "react";

import { useToast } from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

/** Ekstensi (sesuai Pengaturan) → tipe MIME yang dikenali browser. */
const MIME: Record<string, string[]> = {
  jpg: ["image/jpeg", "image/jpg", "image/pjpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  avif: ["image/avif"],
  heic: ["image/heic", "image/heic-sequence"],
  heif: ["image/heif", "image/heif-sequence"],
  bmp: ["image/bmp"],
  tiff: ["image/tiff"],
  svg: ["image/svg+xml"],
};
const norm = (ext: string) => {
  const e = ext.toLowerCase().replace(/^\./, "");
  return e === "jpeg" || e === "jfif" ? "jpg" : e === "tif" ? "tiff" : e;
};

/** Jenis berkas dari tipe MIME (diutamakan) atau ekstensi nama berkas. */
export function photoExt(f: File) {
  const byMime = Object.entries(MIME).find(([, m]) => m.includes(f.type.toLowerCase()))?.[0];
  if (byMime) return byMime;
  const m = /\.([a-z0-9]+)$/i.exec(f.name);
  return m ? norm(m[1]!) : f.type.replace(/^image\//, "") || "?";
}

/**
 * Validasi foto di sisi klien terhadap aturan aplikasi (format & ukuran maksimum dari Pengaturan),
 * sebelum diunggah. Server tetap memvalidasi ulang. `kind`: foto tempat/kunjungan/MASTER atau avatar.
 */
export function usePhotoGuard(kind: "photo" | "avatar" = "photo") {
  const { t } = useT();
  const fmt = useFormat();
  const toast = useToast();
  const photo = api.settings.photoRules.useQuery(undefined, { enabled: kind === "photo", staleTime: 60_000 });
  const avatar = api.settings.avatarRules.useQuery(undefined, { enabled: kind === "avatar", staleTime: 60_000 });
  const rules = kind === "photo" ? photo.data : avatar.data;

  const allowed = useMemo(() => (rules ? [...new Set(rules.allowedTypes.map(norm))] : null), [rules]);
  const maxBytes = rules ? rules.maxSizeMb * 1024 * 1024 : null;

  /** Nilai atribut `accept` input file: hanya format yang diizinkan (selagi aturan dimuat: semua gambar). */
  const accept = useMemo(() => {
    if (!allowed) return "image/*";
    const parts = allowed.flatMap((e) => [`.${e}`, ...(e === "jpg" ? [".jpeg"] : []), ...(MIME[e] ?? [])]);
    return [...new Set(parts)].join(",");
  }, [allowed]);

  /** Pesan penolakan untuk satu berkas, atau null bila lolos. */
  const check = useCallback(
    (f: File): string | null => {
      if (!allowed || maxBytes == null) return null; // aturan belum dimuat: server yang memvalidasi
      const ext = photoExt(f);
      if (!allowed.includes(ext))
        return t("photo.rejectType", { name: f.name, type: ext.toUpperCase(), allowed: allowed.map((x) => x.toUpperCase()).join(", ") });
      if (f.size > maxBytes)
        return t("photo.rejectSize", { name: f.name, size: fmt.number(f.size / 1024 / 1024, 1), max: rules!.maxSizeMb });
      return null;
    },
    [allowed, maxBytes, rules, t, fmt],
  );

  /** Saring berkas: yang tidak sesuai ditolak dengan notifikasi (maks. 3 pesan + ringkasan sisanya). */
  const filter = useCallback(
    (files: File[]): File[] => {
      const ok: File[] = [];
      const bad: string[] = [];
      for (const f of files) {
        const msg = check(f);
        if (msg) bad.push(msg);
        else ok.push(f);
      }
      bad.slice(0, 3).forEach((m) => toast.push(m, "error"));
      if (bad.length > 3) toast.push(t("photo.rejectMore", { n: bad.length - 3 }), "error");
      return ok;
    },
    [check, toast, t],
  );

  return { accept, check, filter, rules };
}
