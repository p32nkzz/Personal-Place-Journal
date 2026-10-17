"use client";

import Link from "next/link";
import { useState } from "react";

import { CategoryChips } from "~/components/chips";
import { GooglePhotoPreview } from "~/components/GooglePhotoPreview";
import { Icon } from "~/components/Icon";
import { MapTypeSwitch } from "~/components/map/MapTypeSwitch";
import { MapView } from "~/components/map/MapView";
import { useMapColors } from "~/components/map/useMapColors";
import { PhotoGallery } from "~/components/PhotoGallery";
import { Coords, DescQuote, InfoRow } from "~/components/PlaceInfo";
import { PlaceThumb } from "~/components/PlaceThumb";
import { Alert, EmptyState, Spinner, StatusChip, Stars } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

/**
 * Detail MASTER PLACE untuk semua pengunjung. Tata letak senada dengan detail MY PLACE / MASTER admin:
 * kartu hero (sampul, kategori, nama, alamat, deskripsi, rating, aksi) lalu grid foto | peta & info.
 */
export type MasterBack =
  | { kind: "map" }
  | { kind: "map-place"; place: string; lat: number; lng: number }
  | { kind: "place"; place: string };

export function MasterPublicView({
  uid,
  viewer,
  back = { kind: "map" },
}: {
  uid: string;
  viewer: "GUEST" | "EXPLORER" | "ADMIN";
  /** Asal halaman: menentukan tujuan & label tautan kembali. */
  back?: MasterBack;
}) {
  const { t } = useT();
  const { data: m, isLoading, error } = api.master.get.useQuery({ uid });
  const [tab, setTab] = useState<"own" | "google">("own");
  const mapColors = useMapColors();

  if (isLoading) return <Spinner />;
  if (error || !m)
    return (
      <div className="container page">
        <EmptyState title={t("master.notFound")} action={<Link href="/" className="btn btn-primary">{t("nav.map")}</Link>} />
      </div>
    );

  const active = m.status === "ACTIVE";
  // Tautan kembali sesuai asal: detail MY PLACE yang mereferensikan, pop-up MY PLACE di Peta,
  // atau (bawaan) Peta dengan pop-up MASTER ini terbuka di titiknya.
  const backHref =
    back.kind === "place"
      ? `/places/${back.place}`
      : back.kind === "map-place"
        ? `/?${new URLSearchParams({ my: back.place, lat: String(back.lat), lng: String(back.lng) })}`
        : `/?${new URLSearchParams({ master: m.uid, lat: String(m.latitude), lng: String(m.longitude) })}`;
  const backLabel = back.kind === "place" ? t("nav.myPlaces") : t("nav.map");

  return (
    <div className="container page pd">
      {/* ---------- Kepala: sampul + identitas + aksi ---------- */}
      <section className="pd-hero card">
        <Link href={backHref} className="pd-back">
          <Icon name="arrow-left" fixedWidth={false} /> {backLabel}
        </Link>
        <div className="pd-hero-body">
          <div className="pd-cover">
            <PlaceThumb href={`/masters/${m.uid}`} name={m.name} lat={m.latitude} lng={m.longitude} photos={m.photos} />
          </div>
          <div className="pd-id">
            {m.categories.length > 0 && (
              <div className="pl-chips">
                <CategoryChips items={m.categories} />
              </div>
            )}
            <h1 className="pd-title">{m.name}</h1>
            <div className="pd-addr">
              <Icon name="map-pin" fixedWidth={false} /> {m.address}
            </div>
            {m.description && <DescQuote text={m.description} side />}
            <div className="pd-meta">
              <span className="mp-kind">
                <i style={{ background: mapColors.master }} /> MASTER
              </span>
              {!active && <StatusChip tone="neutral">{t("master.inactive")}</StatusChip>}
              <Stars value={m.rating.avg} count={m.rating.count} />
            </div>
          </div>
          {(viewer === "EXPLORER" && active) || viewer === "ADMIN" ? (
            <div className="pd-actions">
              {viewer === "EXPLORER" && active && (
                <Link className="btn btn-primary btn-sm" href={`/places/new?master=${m.uid}&from=master`}>
                  <Icon name="plus" /> {t("map.saveAsMine")}
                </Link>
              )}
              {viewer === "ADMIN" && (
                <Link className="btn btn-secondary btn-sm" href={`/admin/masters/${m.uid}`}>
                  <Icon name="gear" /> {t("common.manage")}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {!active && <div className="pd-alert"><Alert kind="warning">{t("master.inactiveNote")}</Alert></div>}

      <div className="pd-grid">
        {/* ---------- Foto: milik MASTER & Google Maps ---------- */}
        <div className="pd-main">
          <section className="card pd-card">
            <div className="mini-tabs mp-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "own"} className="mini-tab" onClick={() => setTab("own")}>
                <Icon name="image" fixedWidth={false} /> {t("master.tabPhotos")} <span className="mini-tab-n">{m.photos.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={tab === "google"} className="mini-tab" title={t("map.googlePhotosHint")} onClick={() => setTab("google")}>
                <Icon name="map" fixedWidth={false} /> {t("map.googlePhotos")}
              </button>
            </div>
            {tab === "own" ? (
              m.photos.length ? (
                <PhotoGallery fancy photos={m.photos} canEdit={false} onChanged={() => undefined} />
              ) : (
                <div className="mp-empty">
                  <Icon name="image" fixedWidth={false} /> {t("master.noPhotos")}
                </div>
              )
            ) : (
              <GooglePhotoPreview placeId={m.googlePlaceId} lat={m.latitude} lng={m.longitude} fallbackName={m.name} />
            )}
          </section>
        </div>

        {/* ---------- Peta & informasi lokasi ---------- */}
        <aside className="pd-side">
          <section className="card pd-card">
            <MapTypeSwitch />
            <div className="map-box-sm pd-map">
              <MapView markers={[{ id: "m", lat: m.latitude, lng: m.longitude, color: mapColors.master, glyph: "M", title: m.name }]} fit />
            </div>
            <div className="pp-info">
              <InfoRow icon="pin" label={t("common.coordinates")}>
                <Coords lat={m.latitude} lng={m.longitude} placeId={m.googlePlaceId} googleLink streetView name={m.name} />
              </InfoRow>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
