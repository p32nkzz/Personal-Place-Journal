"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Icon } from "~/components/Icon";
import { Modal } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { openPhotoPreview } from "~/lib/photoPreview";

/* Blok tampilan info tempat yang ringkas — dipakai pop-up Peta dan halaman detail MY PLACE. */

/** Satu baris info berikon (alamat, kategori, koordinat, ...). */
export function InfoRow({ icon, label, children }: { icon?: React.ComponentProps<typeof Icon>["name"]; label: string; children: React.ReactNode }) {
  return (
    <div className={`pp-info-row${icon ? "" : " no-ico"}`} title={label}>
      {icon && <Icon name={icon} fixedWidth={false} aria-hidden />}
      <div className="pp-info-val">
        <span className="sr-only">{label}: </span>
        {children}
      </div>
    </div>
  );
}

/** Deskripsi sebagai kutipan (blockquote) miring, dipotong 2 baris (`inline`: 1 baris, tombol di kanan teks; `side`: tetap 2 baris, tombol di kanan teks); "selengkapnya" hanya muncul bila teks benar-benar terpotong. */
export function DescQuote({ text, inline, side }: { text: string; inline?: boolean; side?: boolean }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const ref = useRef<HTMLQuoteElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // Saat terbuka tetap ingat bahwa teks panjang (jangan menyembunyikan tombol "lebih sedikit").
      if (!open) setOverflow(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);

  return (
    <div className={`pp-quote-wrap${inline ? " is-inline" : ""}${side ? " is-side" : ""}`}>
      <blockquote ref={ref} className={open ? "pp-quote" : "pp-quote is-clamped"}>{text}</blockquote>
      {(overflow || open) && (
        <button
          type="button"
          className="pp-link-btn"
          aria-expanded={open}
          onClick={(e) => {
            // Dipakai di dalam baris yang berupa tautan: jangan ikut membuka halaman detail.
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          {open ? t("map.readLess") : t("map.readMore")}
        </button>
      )}
    </div>
  );
}

/** Dialog Google Street View untuk sebuah titik; memberi tahu bila tidak ada cakupan di sekitarnya (±150 m). */
export function StreetViewDialog({ lat, lng, title, onClose }: { lat: number; lng: number; title?: string; onClose: () => void }) {
  const { t } = useT();
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Maps JS API dimuat oleh peta di halaman ini; tunggu sampai siap.
      for (let i = 0; i < 50 && !(typeof google !== "undefined" && google.maps?.importLibrary); i++)
        await new Promise((r) => setTimeout(r, 100));
      if (cancelled || typeof google === "undefined" || !google.maps?.importLibrary) return setState("none");
      const { StreetViewService, StreetViewPanorama } = (await google.maps.importLibrary("streetView")) as google.maps.StreetViewLibrary;
      void new StreetViewService().getPanorama({ location: { lat, lng }, radius: 150 }, (data, status) => {
        if (cancelled) return;
        if ((status as string) !== "OK" || !data?.location?.latLng || !box.current) return setState("none");
        // Hadapkan kamera ke titik yang dipilih (arah dari posisi panorama menuju titik itu).
        const from = data.location.latLng;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const y = Math.sin(toRad(lng - from.lng())) * Math.cos(toRad(lat));
        const x = Math.cos(toRad(from.lat())) * Math.sin(toRad(lat)) - Math.sin(toRad(from.lat())) * Math.cos(toRad(lat)) * Math.cos(toRad(lng - from.lng()));
        const heading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
        new StreetViewPanorama(box.current, {
          pano: data.location.pano,
          pov: { heading, pitch: 0 },
          zoom: 1,
          addressControl: true,
          fullscreenControl: true,
          motionTracking: false,
        });
        setState("ok");
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return (
    <Modal title={title ? `${t("map.streetView")} — ${title}` : t("map.streetView")} large onClose={onClose} actions={<button type="button" className="btn btn-secondary" onClick={onClose}>{t("common.close")}</button>}>
      <div className="sv-wrap">
        <div ref={box} className="sv-box" style={{ visibility: state === "ok" ? "visible" : "hidden" }} />
        {state === "loading" && <div className="sv-msg"><Icon name="refresh" spin fixedWidth={false} /> {t("common.processing")}</div>}
        {state === "none" && <div className="sv-msg">{t("map.streetViewNone")}</div>}
      </div>
    </Modal>
  );
}

/** Koordinat ringkas + tombol salin. */
/** Google Place ID (tempat valid hasil pencarian / pin di peta) yang dapat disalin. */
export function GoogleId({ id, className }: { id: string; className?: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  return (
    <span className={`pp-gid${className ? ` ${className}` : ""}`}>
      <span className="pp-gid-label">{t("map.googleId")}</span>
      <code className="pp-gid-val" title={id}>{id}</code>
      <button
        type="button"
        className={`pp-gid-copy${copied ? " is-done" : ""}`}
        title={copied ? t("common.copied") : t("common.copy")}
        aria-label={`${t("common.copy")}: ${t("map.googleId")}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void navigator.clipboard?.writeText(id).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        <Icon name={copied ? "circle-check" : "copy"} fixedWidth={false} />
      </button>
    </span>
  );
}

export function Coords({
  lat,
  lng,
  placeId,
  googleLink,
  streetView,
  name,
}: {
  lat: number;
  lng: number;
  placeId?: string | null;
  /** Tampilkan tautan "Buka di Google Maps" di bawah koordinat. */
  googleLink?: boolean;
  /** Tampilkan tombol Street View (panorama Google di dalam dialog); butuh Maps JS API termuat di halaman. */
  streetView?: boolean;
  /** Nama tempat untuk judul dialog Street View. */
  name?: string;
}) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const [sv, setSv] = useState(false);
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
      {placeId && <GoogleId id={placeId} />}
      {(googleLink || streetView) && (
        <span className="pp-links">
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
          {streetView && (
            <button type="button" className="pp-link-btn pp-svbtn" onClick={() => setSv(true)}>
              <Icon name="street-view" fixedWidth={false} /> {t("map.streetView")}
            </button>
          )}
        </span>
      )}
      {sv && <StreetViewDialog lat={lat} lng={lng} title={name} onClose={() => setSv(false)} />}
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
