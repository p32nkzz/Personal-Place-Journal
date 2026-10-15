"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  GooglePlaceSearch,
  MapView,
  nearestPlacePhotos,
  reverseGeocode,
  useDeviceLocation,
  type GooglePlaceResult,
} from "~/components/map/MapView";
import { GooglePhotoPreview } from "~/components/GooglePhotoPreview";
import { useMapColors } from "~/components/map/useMapColors";
import { Alert, Field } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { Icon } from "./Icon";

export type PlaceFormValues = {
  name: string;
  address: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  categoryUids: string[];
  tagUids: string[];
  isFavorite: boolean;
};

export function PlaceForm({
  initial,
  masterUid,
  masterName,
  excludeUid,
  submitLabel,
  busy,
  error,
  onSubmit,
  cancelHref,
  showFavorite,
  photoSlot,
  onPickGooglePhoto,
  pickedGoogleUrls,
}: {
  initial: PlaceFormValues;
  masterUid?: string | null;
  masterName?: string | null;
  excludeUid?: string;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (v: PlaceFormValues) => void;
  /** Tujuan tombol Batal; boleh fungsi dari nilai form saat ini. */
  cancelHref: string | ((v: PlaceFormValues) => string);
  showFavorite?: boolean;
  /** Konten foto tinjauan (galeri saat ubah, pemilih berkas saat buat). */
  photoSlot?: React.ReactNode;
  /** Memilih foto Google Maps sebagai foto tinjauan (disimpan sebagai link eksternal). */
  onPickGooglePhoto?: (url: string) => void;
  pickedGoogleUrls?: string[];
}) {
  const { t } = useT();
  const [v, setV] = useState<PlaceFormValues>(initial);
  const [touched, setTouched] = useState(false);
  // Saat ON, nama & alamat form mengikuti hasil pencarian / pin peta. Koordinat selalu mengikuti pin.
  const [follow, setFollow] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);
  const reqRef = useRef(0);
  const { location } = useDeviceLocation(initial.latitude == null);
  const cats = api.categories.listActive.useQuery();
  const mapColors = useMapColors();
  const tags = api.tag.list.useQuery();

  // Reset hanya saat nilai awal benar-benar berubah (bukan saat foto di-refetch).
  const initialKey = JSON.stringify(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setV(initial), [initialKey]);

  const set = <K extends keyof PlaceFormValues>(k: K, val: PlaceFormValues[K]) =>
    setV((x) => ({ ...x, [k]: val }));

  const hasCoord = v.latitude != null && v.longitude != null;
  const dup = api.place.checkDuplicates.useQuery(
    {
      googlePlaceId: v.googlePlaceId,
      masterUid: masterUid ?? null,
      latitude: v.latitude ?? 0,
      longitude: v.longitude ?? 0,
      excludeUid,
    },
    { enabled: hasCoord },
  );

  const toggle = (k: "categoryUids" | "tagUids", uid: string) =>
    setV((x) => ({
      ...x,
      [k]: x[k].includes(uid) ? x[k].filter((i) => i !== uid) : [...x[k], uid],
    }));

  // Pin baru atau digeser: koordinat selalu diperbarui; nama & alamat hanya bila switch ON.
  const movePin = (lat: number, lng: number) => {
    const latitude = Number(lat.toFixed(7));
    const longitude = Number(lng.toFixed(7));
    setV((x) => ({ ...x, latitude, longitude }));
    if (!follow) return;
    const req = ++reqRef.current;
    setResolving(true);
    void Promise.all([reverseGeocode(lat, lng), nearestPlacePhotos(lat, lng)]).then(([addr, near]) => {
      if (req !== reqRef.current) return; // pin sudah berpindah lagi
      setResolving(false);
      setV((x) => ({
        ...x,
        address: addr?.address ?? x.address,
        name: near?.name ?? x.name,
      }));
    });
  };

  const markers = useMemo(
    () =>
      hasCoord
        ? [{ id: "pin", lat: v.latitude!, lng: v.longitude!, color: mapColors.newPin, glyph: "+", selected: true, draggable: true }]
        : [],
    [hasCoord, v.latitude, v.longitude, mapColors.newPin],
  );

  const nameError = touched && !v.name.trim() ? t("err.REQUIRED") : null;
  const coordError = touched && !hasCoord ? t("place.coordRequired") : null;

  // Kategori nonaktif yang sudah melekat tetap ditampilkan agar tidak hilang diam-diam.
  const selectableCats = cats.data ?? [];

  const coordInput = (k: "latitude" | "longitude") => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, e.target.value === "" || Number.isNaN(Number(e.target.value)) ? null : Number(e.target.value));

  return (
    <form
      className="pf"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!v.name.trim() || !hasCoord) return;
        onSubmit(v);
      }}
    >
      {error && <Alert kind="error">{error}</Alert>}
      {masterUid && <Alert kind="info">{t("place.fromMasterNote", { name: masterName ?? "MASTER" })}</Alert>}

      <div className="pf-grid">
        {/* 1 — Lokasi: dicari/ditandai lebih dulu karena dapat mengisi nama & alamat. */}
        <section className="card pf-card">
          <div className="pf-head">
            <h2 className="pf-title"><span className="pf-step">1</span>{t("place.formLocation")}</h2>
            <div className="pf-tools">
              <button
                type="button"
                role="switch"
                aria-checked={follow}
                className="switch-btn"
                title={t("place.followMapHint")}
                onClick={() => setFollow((f) => !f)}
              >
                <span className="switch-track" aria-hidden><span className="switch-thumb" /></span>
                {t("place.followMap")}
              </button>
              <button type="button" className="chip" aria-pressed={showPhotos} title={t("map.googlePhotosHint")} onClick={() => setShowPhotos((s) => !s)}>
                <Icon name="image" /> {t("map.googlePhotos")}
              </button>
            </div>
          </div>

          <GooglePlaceSearch
            placeholder={t("map.googlePlaceholder")}
            origin={location ?? (hasCoord ? { lat: v.latitude!, lng: v.longitude! } : null)}
            onSelect={(g: GooglePlaceResult) => {
              reqRef.current++; // batalkan pencarian alamat pin yang masih berjalan
              setResolving(false);
              setV((x) => ({
                ...x,
                googlePlaceId: g.googlePlaceId,
                name: follow ? g.name || x.name : x.name || g.name,
                address: follow ? g.address || x.address : x.address || g.address,
                latitude: g.lat,
                longitude: g.lng,
              }));
            }}
          />

          <div className="map-box-sm pf-map">
            <MapView
              markers={markers}
              fit={hasCoord}
              deviceLocation={location}
              onMapClick={movePin}
              onMarkerDragEnd={(_id, lat, lng) => movePin(lat, lng)}
            />
          </div>

          <div className="pf-coords">
            <label htmlFor="lat">Lat<span className="req" aria-hidden>*</span></label>
            <input id="lat" className="input mono" inputMode="decimal" value={v.latitude ?? ""} aria-invalid={!!coordError} aria-label={t("common.latitude")} onChange={coordInput("latitude")} />
            <label htmlFor="lng">Lng<span className="req" aria-hidden>*</span></label>
            <input id="lng" className="input mono" inputMode="decimal" value={v.longitude ?? ""} aria-invalid={!!coordError} aria-label={t("common.longitude")} onChange={coordInput("longitude")} />
            {resolving ? (
              <span className="pf-hint"><Icon name="refresh" spin fixedWidth={false} /> {t("place.resolving")}</span>
            ) : (
              <span className="pf-hint">{t("place.pinHint")}</span>
            )}
          </div>
          {coordError && (
            <div className="helper helper-error" role="alert" style={{ marginTop: -4 }}>
              <Icon name="warning" fixedWidth={false} /> {coordError}
            </div>
          )}

          {showPhotos && hasCoord && (
            <GooglePhotoPreview placeId={v.googlePlaceId} lat={v.latitude!} lng={v.longitude!} fallbackName={v.name} onPick={onPickGooglePhoto} picked={pickedGoogleUrls} />
          )}

          {!!dup.data?.length && (
            <Alert kind="warning">
              <b>{t("place.duplicateWarning")}</b>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {dup.data.map((d) => (
                  <li key={d.uid}>
                    <Link href={`/places/${d.uid}`} style={{ textDecoration: "underline" }}>{d.name}</Link>{" "}
                    <span className="muted">({t(`place.dup.${d.reason}`)})</span>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 6 }}>{t("place.duplicateNote")}</div>
            </Alert>
          )}
        </section>

        <div className="pf-side">
          {/* 2 — Data tempat */}
          <section className="card pf-card">
            <div className="pf-head">
              <h2 className="pf-title"><span className="pf-step">2</span>{t("place.formDetail")}</h2>
              {showFavorite && (
                <button
                  type="button"
                  className="pf-fav"
                  aria-pressed={v.isFavorite}
                  title={t("place.markFavorite")}
                  onClick={() => set("isFavorite", !v.isFavorite)}
                >
                  <Icon name={v.isFavorite ? "star" : "star-regular"} fixedWidth={false} /> {t("place.favorite")}
                </button>
              )}
            </div>

            <Field label={t("common.name")} required htmlFor="name" error={nameError}>
              <input id="name" className="input" maxLength={255} value={v.name} aria-invalid={!!nameError} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label={t("common.address")} htmlFor="address">
              <textarea id="address" className="textarea" rows={2} maxLength={2000} value={v.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label={t("common.description")} htmlFor="desc">
              <textarea id="desc" className="textarea" rows={3} maxLength={2000} placeholder={t("common.max2000")} value={v.description} onChange={(e) => set("description", e.target.value)} />
            </Field>

            <div className="field">
              <span className="label">{t("common.category")}</span>
              <div className="pf-chips">
                {selectableCats.map((c) => (
                  <button type="button" key={c.uid} className="chip" aria-pressed={v.categoryUids.includes(c.uid)} onClick={() => toggle("categoryUids", c.uid)}>
                    {c.name}
                  </button>
                ))}
                {!selectableCats.length && <span className="muted t-small">—</span>}
              </div>
              {masterUid && <div className="helper">{t("place.categoryMasterHint")}</div>}
            </div>

            <div className="field">
              <span className="label">{t("nav.tags")}</span>
              <div className="pf-chips">
                {tags.data?.map((tg) => (
                  <button type="button" key={tg.uid} className="chip" aria-pressed={v.tagUids.includes(tg.uid)} onClick={() => toggle("tagUids", tg.uid)}>
                    <span className="tag-dot" style={{ background: tg.color }} />
                    {tg.name}
                  </button>
                ))}
                {tags.data && !tags.data.length && (
                  <span className="muted t-small">
                    {t("place.noTags")} <Link href="/tags" style={{ color: "var(--color-primary)", fontWeight: 600 }}>{t("tag.manage")}</Link>
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* 3 — Foto tinjauan */}
          {photoSlot && (
            <section className="card pf-card">
              <div className="pf-head">
                <h2 className="pf-title"><span className="pf-step">3</span>{t("place.reviewPhotos")}</h2>
                <span className="pf-badge">{t("common.optional")}</span>
              </div>
              {photoSlot}
            </section>
          )}
        </div>
      </div>

      <div className="pf-actions">
        <span className="pf-note"><span className="req" aria-hidden>*</span> {t("place.requiredNote")}</span>
        <Link className="btn btn-secondary btn-sm" href={typeof cancelHref === "function" ? cancelHref(v) : cancelHref}>
          {t("common.cancel")}
        </Link>
        <button className="btn btn-primary btn-sm" disabled={busy}>
          <Icon name="save" /> {busy ? t("common.processing") : submitLabel}
        </button>
      </div>
    </form>
  );
}

