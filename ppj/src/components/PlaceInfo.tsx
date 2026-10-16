"use client";

import { useState } from "react";

import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";
import { openPhotoPreview } from "~/lib/photoPreview";

/* Blok tampilan info tempat yang ringkas — dipakai pop-up Peta dan halaman detail MY PLACE. */

/** Satu baris info berikon (alamat, kategori, koordinat, ...). */
export function InfoRow({ icon, label, children }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string; children: React.ReactNode }) {
  return (
    <div className="pp-info-row" title={label}>
      <Icon name={icon} fixedWidth={false} aria-hidden />
      <div className="pp-info-val">
        <span className="sr-only">{label}: </span>
        {children}
      </div>
    </div>
  );
}

/** Deskripsi dipotong 3 baris dengan tombol "selengkapnya". */
export function ClampText({ text }: { text: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const long = text.length > 160 || text.split("\n").length > 3;
  return (
    <>
      <div className={open ? "pp-desc" : "pp-desc is-clamped"}>{text}</div>
      {long && (
        <button type="button" className="pp-link-btn" onClick={() => setOpen((o) => !o)}>
          {open ? t("map.readLess") : t("map.readMore")}
        </button>
      )}
    </>
  );
}

/** Koordinat ringkas + tombol salin. */
export function Coords({
  lat,
  lng,
  placeId,
  googleLink,
}: {
  lat: number;
  lng: number;
  placeId?: string | null;
  /** Tampilkan tautan "Buka di Google Maps" di bawah koordinat. */
  googleLink?: boolean;
}) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  return (
    <>
      <span className="pp-coords">
        <span className="mono">{text}</span>
        <button
          type="button"
          className="pp-link-btn"
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          <Icon name={copied ? "circle-check" : "copy"} fixedWidth={false} /> {copied ? t("common.copied") : t("common.copy")}
        </button>
      </span>
      {googleLink && (
        // Buka di Google Maps (tab baru); place id dipakai bila ada agar mengarah ke tempatnya.
        <a
          className="pp-link-btn pp-gmaps"
          href={`https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: `${lat},${lng}`, ...(placeId ? { query_place_id: placeId } : {}) }).toString()}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="map" fixedWidth={false} /> {t("map.openInGoogle")}
        </a>
      )}
    </>
  );
}

/** Thumbnail kecil foto kunjungan; klik membuka pratinjau Fancybox beserta caption. */
export function ThumbStrip({ photos }: { photos: { uid: string; url: string; caption: string | null }[] }) {
  const { t } = useT();
  if (!photos.length) return null;
  return (
    <div className="pp-thumbs">
      {photos.slice(0, 5).map((ph, i) => (
        <button
          key={ph.uid}
          type="button"
          aria-label={ph.caption ?? t("photo.view")}
          onClick={() => openPhotoPreview(photos.map((x) => ({ src: x.url, caption: x.caption })), i)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ph.url} alt="" loading="lazy" />
          {i === 4 && photos.length > 5 && <span>+{photos.length - 5}</span>}
        </button>
      ))}
    </div>
  );
}
