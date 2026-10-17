"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "~/components/Icon";
import { googlePhotosFor } from "~/components/map/MapView";
import { Spinner } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { openPhotoPreview } from "~/lib/photoPreview";

type Result = Awaited<ReturnType<typeof googlePhotosFor>>;

/** Foto Google Maps pada titik pin form (hanya ditampilkan, tidak disimpan); klik untuk pratinjau Fancybox. */
export function GooglePhotoPreview({
  placeId,
  lat,
  lng,
  fallbackName,
  onPick,
  picked = [],
}: {
  placeId: string | null;
  lat: number;
  lng: number;
  fallbackName: string;
  /** Bila diisi, tiap foto punya tombol untuk memilihnya sebagai foto pantauan. */
  onPick?: (url: string) => void;
  picked?: string[];
}) {
  const { t } = useT();
  const [state, setState] = useState<"loading" | "done">("loading");
  const [data, setData] = useState<Result>(null);
  // Foto yang baru dipilih dari dalam pratinjau (props `picked` baru tiba setelah render ulang).
  const pickedNow = useRef(new Set<string>());
  const pickedProp = useRef(picked);
  pickedProp.current = picked;

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    // Jeda singkat agar pin yang sedang digeser tidak memicu banyak permintaan.
    const h = setTimeout(() => {
      void googlePhotosFor(placeId, lat, lng).then((r) => {
        if (cancelled) return;
        setData(r);
        setState("done");
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
  }, [placeId, lat, lng]);

  if (state === "loading") return <Spinner />;
  if (!data || !data.photos.length)
    return <p className="muted t-small" style={{ margin: 0 }}>{t("map.googlePhotosNone")}</p>;

  const credits = [...new Map(data.photos.flatMap((ph) => ph.credits).map((c) => [c.name, c])).values()];
  return (
    <div className="stack-sm">
      {/* Hanya saat pemilihan foto pantauan dimungkinkan (form) dan fotonya tersedia. */}
      {onPick && (
        <p className="gp-hint">
          <Icon name="circle-info" fixedWidth={false} /> {t("place.googlePhotoPickHint")}
        </p>
      )}
      <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
        {data.photos.map((ph, i) => (
          <div key={i} style={{ position: "relative" }}>
            <button
              type="button"
              aria-label={t("photo.view")}
              onClick={() =>
                openPhotoPreview(
                  data.photos.map((p) => ({
                    src: p.url,
                    caption: p.credits.length ? `${t("map.photoBy")} ${p.credits.map((c) => c.name).join(", ")} · Google Maps` : "Google Maps",
                  })),
                  i,
                  onPick
                    ? {
                        label: t("photo.pickGoogle"),
                        doneLabel: t("photo.picked"),
                        isDone: (item) => pickedNow.current.has(item.src) || pickedProp.current.includes(item.src),
                        onAction: (item) => {
                          pickedNow.current.add(item.src);
                          onPick(item.src);
                        },
                      }
                    : undefined,
                )
              }
              style={{ all: "unset", display: "block", width: "100%", cursor: "zoom-in" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.url} alt="" loading="lazy" style={{ width: "100%", height: 72, objectFit: "cover", borderRadius: 6, display: "block" }} />
            </button>
            {onPick && (
              <button
                type="button"
                className="chip"
                aria-pressed={picked.includes(ph.url)}
                disabled={picked.includes(ph.url)}
                title={t("photo.pickGoogle")}
                onClick={() => onPick(ph.url)}
                style={{ position: "absolute", right: 4, bottom: 4, minHeight: 24, padding: "0 8px", fontSize: 11 }}
              >
                <Icon name={picked.includes(ph.url) ? "circle-check" : "plus"} fixedWidth={false} /> {picked.includes(ph.url) ? t("photo.picked") : t("photo.pick")}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="t-caption muted">
        {data.exact ? data.name || fallbackName : t("map.photoNear2", { name: data.name })} · {t("map.photoBy")}{" "}
        {credits.map((c, i) => (
          <span key={c.name}>
            {i > 0 && ", "}
            {c.href ? <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>{c.name}</a> : c.name}
          </span>
        ))}{" "}
        · Google Maps
      </div>
    </div>
  );
}
