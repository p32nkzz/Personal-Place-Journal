"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";
import { openPhotoPreview } from "~/lib/photoPreview";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Peta statis Google (grayscale) di titik tempat — pengganti bila belum ada foto pantauan. */
function staticMapUrl(lat: number, lng: number) {
  if (!KEY) return null;
  const q = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "15",
    size: "120x120",
    scale: "2",
    maptype: "roadmap",
    markers: `size:small|color:0x334155|${lat},${lng}`,
    key: KEY,
  });
  q.append("style", "feature:all|saturation:-100");
  q.append("style", "feature:poi|visibility:off");
  return `https://maps.googleapis.com/maps/api/staticmap?${q.toString()}`;
}

/**
 * Cadangan bila Static Maps API tidak aktif: 2×2 tile OpenStreetMap (zoom 15, ditampilkan 50%)
 * yang digeser agar titik tempat tepat di tengah thumbnail.
 */
function OsmTiles({ lat, lng, size }: { lat: number; lng: number; size: number }) {
  const z = 15;
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  const x = ((lng + 180) / 360) * n * 256;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * 256;
  const tx0 = Math.floor(x / 256 - 0.5);
  const ty0 = Math.floor(y / 256 - 0.5);
  const scale = 0.5;
  const left = size / 2 - (x - tx0 * 256) * scale;
  const top = size / 2 - (y - ty0 * 256) * scale;
  const tiles = [0, 1].flatMap((dy) => [0, 1].map((dx) => ({ dx, dy, tx: (((tx0 + dx) % n) + n) % n, ty: ty0 + dy })));
  return (
    <span className="pl-osm" aria-hidden>
      <span style={{ position: "absolute", left, top, width: 512 * scale, height: 512 * scale }}>
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${t.dx}${t.dy}`}
            src={`https://tile.openstreetmap.org/${z}/${t.tx}/${t.ty}.png`}
            alt=""
            loading="lazy"
            style={{ position: "absolute", left: t.dx * 256 * scale, top: t.dy * 256 * scale, width: 256 * scale, height: 256 * scale }}
          />
        ))}
      </span>
      <span className="pl-osm-pin" />
    </span>
  );
}

/**
 * Thumbnail baris daftar MY PLACE: foto pantauan utama (klik → pratinjau semua foto beserta caption),
 * atau peta grayscale di lokasi tempat bila belum ada foto (klik → halaman detail).
 */
export function PlaceThumb({
  href,
  name,
  lat,
  lng,
  photos,
}: {
  href: string;
  name: string;
  lat: number;
  lng: number;
  photos: { uid: string; url: string; caption: string | null; isPrimary: boolean }[];
}) {
  const { t } = useT();
  const [mapFailed, setMapFailed] = useState(false);

  if (photos.length) {
    const cover = photos.find((p) => p.isPrimary) ?? photos[0]!;
    const ordered = [cover, ...photos.filter((p) => p !== cover)];
    return (
      <button
        type="button"
        className="pl-thumb"
        title={cover.caption ?? t("photo.view")}
        aria-label={`${t("photo.view")}: ${name}`}
        onClick={() => openPhotoPreview(ordered.map((p) => ({ src: p.url, caption: p.caption })), 0)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover.url} alt={cover.caption ?? name} loading="lazy" referrerPolicy="no-referrer" />
        {photos.length > 1 && (
          <span className="pl-thumb-n">
            <Icon name="image" fixedWidth={false} /> {photos.length}
          </span>
        )}
      </button>
    );
  }

  const map = mapFailed ? null : staticMapUrl(lat, lng);
  return (
    <Link href={href} className="pl-thumb is-map" title={t("place.noPhotoMap")} aria-label={name}>
      {map ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={map} alt="" loading="lazy" onError={() => setMapFailed(true)} />
      ) : (
        <OsmTiles lat={lat} lng={lng} size={72} />
      )}
    </Link>
  );
}
