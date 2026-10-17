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
import { MapTypeSwitch } from "~/components/map/MapTypeSwitch";
import { GoogleId, StreetViewDialog } from "~/components/PlaceInfo";
import { useCategoryPageSize } from "~/components/useCategoryPageSize";
import { useTagPageSize } from "~/components/useTagPageSize";
import { GooglePhotoPreview } from "~/components/GooglePhotoPreview";
import { useMapColors } from "~/components/map/useMapColors";
import { tagColor } from "~/components/ui";
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
  followMap = { name: true, address: true },
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
  /** Nilai awal switch "Ikuti peta" per field. Form ubah: nama OFF (tidak tertimpa), alamat ON. */
  followMap?: { name: boolean; address: boolean };
  /** Konten foto pantauan (galeri saat ubah, pemilih berkas saat buat). */
  photoSlot?: React.ReactNode;
  /** Memilih foto Google Maps sebagai foto pantauan (disimpan sebagai link eksternal). */
  onPickGooglePhoto?: (url: string) => void;
  pickedGoogleUrls?: string[];
}) {
  const { t } = useT();
  const [v, setV] = useState<PlaceFormValues>(initial);
  const [touched, setTouched] = useState(false);
  // Saat ON, nama & alamat form mengikuti hasil pencarian / pin peta. Koordinat selalu mengikuti pin.
  // "Ikuti peta" per field: nama & alamat masing-masing dapat mengikuti hasil pencarian / pin peta.
  const [followName, setFollowName] = useState(followMap.name);
  const [followAddress, setFollowAddress] = useState(followMap.address);
  const [resolving, setResolving] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);
  const reqRef = useRef(0);
  // Section foto pantauan dapat dilipat; pilihan diingat per perangkat.
  const [svOpen, setSvOpen] = useState(false);
  const [photosCollapsed, setPhotosCollapsed] = useState(false);
  useEffect(() => {
    try {
      setPhotosCollapsed(localStorage.getItem("ppj.place.form.photosCollapsed") === "1");
    } catch {
      // penyimpanan tidak tersedia: tampil terbuka
    }
  }, []);
  const togglePhotos = () =>
    setPhotosCollapsed((c) => {
      try {
        localStorage.setItem("ppj.place.form.photosCollapsed", c ? "0" : "1");
      } catch {
        // abaikan
      }
      return !c;
    });
  const { location } = useDeviceLocation(initial.latitude == null);
  const cats = api.categories.listActive.useQuery();
  const mapColors = useMapColors();
  const tags = api.tag.list.useQuery();
  // Chip kategori & TAG dimuat bertahap (jumlah awal/per muat dari Pengaturan, terpisah untuk keduanya).
  const catPage = useCategoryPageSize();
  const tagPage = useTagPageSize();
  const [catShown, setCatShown] = useState(0);
  const [tagShown, setTagShown] = useState(0);

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

  // Pin baru atau digeser: koordinat DAN Google Place ID selalu diperbarui; nama/alamat hanya bila switch field-nya ON.
  // ID lama dikosongkan seketika (agar tidak tertinggal di titik yang sudah berbeda) lalu diisi hasil pencarian titik baru.
  const movePin = (lat: number, lng: number) => {
    const latitude = Number(lat.toFixed(7));
    const longitude = Number(lng.toFixed(7));
    setV((x) => ({ ...x, latitude, longitude, googlePlaceId: null }));
    const req = ++reqRef.current;
    setResolving(true);
    // Tempat terdekat tetap dicari walau nama tidak diikuti: place id-nya dipakai untuk Google ID.
    void Promise.all([reverseGeocode(lat, lng), nearestPlacePhotos(lat, lng)]).then(([addr, near]) => {
      if (req !== reqRef.current) return; // pin sudah berpindah lagi
      setResolving(false);
      setV((x) => ({
        ...x,
        googlePlaceId: near?.placeId ?? addr?.placeId ?? null,
        ...(followAddress ? { address: addr?.address ?? x.address } : {}),
        ...(followName ? { name: near?.name ?? x.name } : {}),
      }));
    });
  };

  // Koordinat diketik manual: ID lama tidak berlaku lagi; cari ulang setelah berhenti mengetik.
  const idTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (idTimer.current && clearTimeout(idTimer.current)), []);
  const resolveIdLater = (lat: number | null, lng: number | null) => {
    if (idTimer.current) clearTimeout(idTimer.current);
    const req = ++reqRef.current;
    setResolving(false);
    if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    idTimer.current = setTimeout(() => {
      setResolving(true);
      void Promise.all([reverseGeocode(lat, lng), nearestPlacePhotos(lat, lng)]).then(([addr, near]) => {
        if (req !== reqRef.current) return;
        setResolving(false);
        setV((x) => ({ ...x, googlePlaceId: near?.placeId ?? addr?.placeId ?? null }));
      });
    }, 700);
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
  // Item terpilih selalu tampil walau di luar jumlah termuat, agar pilihan tidak "hilang".
  const windowed = <T extends { uid: string }>(items: T[], shown: number, page: number, picked: string[]) => {
    const limit = Math.max(shown, page);
    const visible = items.filter((x, i) => i < limit || picked.includes(x.uid));
    return { visible, hidden: items.length - visible.length };
  };
  const catWin = windowed(selectableCats, catShown, catPage, v.categoryUids);
  const tagWin = windowed(tags.data ?? [], tagShown, tagPage, v.tagUids);
  const more = (hidden: number, page: number, onMore: () => void) =>
    hidden > 0 && (
      <button type="button" className="chip pf-more" onClick={onMore} title={t("place.loadMoreInfo", { n: hidden })}>
        <Icon name="plus" fixedWidth={false} /> {t("place.loadMore", { n: Math.min(page, hidden) })}
        <span className="pf-more-n">{t("place.remaining", { n: hidden })}</span>
      </button>
    );

  const coordInput = (k: "latitude" | "longitude") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" || Number.isNaN(Number(e.target.value)) ? null : Number(e.target.value);
    setV((x) => ({ ...x, [k]: val, googlePlaceId: null }));
    resolveIdLater(k === "latitude" ? val : v.latitude, k === "longitude" ? val : v.longitude);
  };

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
              <MapTypeSwitch className="is-inline" />
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
                name: followName ? g.name || x.name : x.name || g.name,
                address: followAddress ? g.address || x.address : x.address || g.address,
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

          {/* Petunjuk pin (dan status pencarian alamat) di atas field koordinat */}
          <div className="pf-hint-row pf-hint-top">
            {resolving ? (
              <span className="pf-hint"><Icon name="refresh" spin fixedWidth={false} /> {t("place.resolving")}</span>
            ) : (
              <span className="pf-hint">{t("place.pinHint")}</span>
            )}
          </div>

          <div className="pf-coords">
            <label htmlFor="lat">Lat<span className="req" aria-hidden>*</span></label>
            <input id="lat" className="input mono" inputMode="decimal" value={v.latitude ?? ""} aria-invalid={!!coordError} aria-label={t("common.latitude")} onChange={coordInput("latitude")} />
            <label htmlFor="lng">Lng<span className="req" aria-hidden>*</span></label>
            <input id="lng" className="input mono" inputMode="decimal" value={v.longitude ?? ""} aria-invalid={!!coordError} aria-label={t("common.longitude")} onChange={coordInput("longitude")} />
            {/* Google Place ID hanya bila titik berasal dari tempat Google yang valid. */}
            {hasCoord && v.googlePlaceId && <GoogleId id={v.googlePlaceId} className="is-field" />}
            {/* Street View: hanya bila titik sudah dipilih; panorama dibuka di dialog. */}
            {hasCoord && (
              <button
                type="button"
                className="pf-sv"
                title={t("map.streetView")}
                aria-label={t("map.streetView")}
                onClick={() => setSvOpen(true)}
              >
                <Icon name="street-view" fixedWidth={false} />
              </button>
            )}
          </div>
          {svOpen && hasCoord && (
            <StreetViewDialog lat={v.latitude!} lng={v.longitude!} title={v.name || undefined} onClose={() => setSvOpen(false)} />
          )}
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
              <div className="pf-tools">
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
            </div>

            <div className="field">
              <div className="pf-label-row">
                <label className="label" htmlFor="name">
                  {t("common.name")}
                  <span className="req" aria-hidden>*</span>
                </label>
                <FollowSwitch on={followName} onToggle={() => setFollowName((f) => !f)} hint={t("place.followNameHint")} field={t("common.name")} />
              </div>
              <input id="name" className={`input${followName ? " is-following" : ""}`} maxLength={255} value={v.name} aria-invalid={!!nameError} onChange={(e) => set("name", e.target.value)} />
              {nameError && (
                <div className="helper helper-error" role="alert">
                  <Icon name="warning" fixedWidth={false} /> {nameError}
                </div>
              )}
            </div>
            <div className="field">
              <div className="pf-label-row">
                <label className="label" htmlFor="address">{t("common.address")}</label>
                <FollowSwitch on={followAddress} onToggle={() => setFollowAddress((f) => !f)} hint={t("place.followAddressHint")} field={t("common.address")} />
              </div>
              <textarea id="address" className={`textarea${followAddress ? " is-following" : ""}`} rows={2} maxLength={2000} value={v.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <Field label={t("common.description")} htmlFor="desc">
              <textarea id="desc" className="textarea" rows={3} maxLength={2000} placeholder={t("common.max2000")} value={v.description} onChange={(e) => set("description", e.target.value)} />
            </Field>

            <div className="field">
              <span className="label">{t("common.category")}</span>
              <div className="pf-chips">
                {catWin.visible.map((c) => (
                  <button type="button" key={c.uid} className="cat pick" aria-pressed={v.categoryUids.includes(c.uid)} onClick={() => toggle("categoryUids", c.uid)}>
                    <Icon name={v.categoryUids.includes(c.uid) ? "circle-check" : "layers"} fixedWidth={false} />
                    {c.name}
                  </button>
                ))}
                {more(catWin.hidden, catPage, () => setCatShown(Math.max(catShown, catPage) + catPage))}
                {!selectableCats.length && <span className="muted t-small">—</span>}
              </div>
              {masterUid && <div className="helper">{t("place.categoryMasterHint")}</div>}
            </div>

            <div className="field">
              <span className="label">{t("nav.tags")}</span>
              <div className="pf-chips">
                {tagWin.visible.map((tg) => (
                  <button
                    type="button"
                    key={tg.uid}
                    className="tag pick"
                    style={{ ["--tc" as string]: tagColor(tg.color) }}
                    aria-pressed={v.tagUids.includes(tg.uid)}
                    onClick={() => toggle("tagUids", tg.uid)}
                  >
                    {v.tagUids.includes(tg.uid) && <Icon name="circle-check" fixedWidth={false} />}
                    {tg.name}
                  </button>
                ))}
                {more(tagWin.hidden, tagPage, () => setTagShown(Math.max(tagShown, tagPage) + tagPage))}
                {tags.data && !tags.data.length && (
                  <span className="muted t-small">
                    {t("place.noTags")} <Link href="/tags" style={{ color: "var(--color-primary)", fontWeight: 600 }}>{t("tag.manage")}</Link>
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* 3 — Foto pantauan */}
          {photoSlot && (
            <section className="card pf-card">
              <div className="pf-head pf-head-collapsible">
                <h2 className="pf-title"><span className="pf-step">3</span>{t("place.reviewPhotos")}</h2>
                <span className="pf-badge">{t("common.optional")}</span>
                <button
                  type="button"
                  className="pd-toggle"
                  aria-expanded={!photosCollapsed}
                  title={photosCollapsed ? t("common.expand") : t("common.collapse")}
                  aria-label={photosCollapsed ? t("common.expand") : t("common.collapse")}
                  onClick={togglePhotos}
                >
                  <Icon name={photosCollapsed ? "chevron-down" : "chevron-up"} fixedWidth={false} />
                </button>
              </div>
              <div className="pd-body" hidden={photosCollapsed}>
                {photoSlot}
              </div>
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

/** Switch mini "Ikuti peta" di samping label field: saat ON, nilai field mengikuti pencarian / pin peta. */
export function FollowSwitch({ on, onToggle, hint, field }: { on: boolean; onToggle: () => void; hint: string; field: string }) {
  const { t } = useT();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${t("place.followMap")}: ${field}`}
      title={hint}
      className="pf-follow"
      onClick={onToggle}
    >
      <Icon name="map-pin" fixedWidth={false} />
      <span>{t("place.followMap")}</span>
      <span className="pf-follow-track" aria-hidden><span className="pf-follow-thumb" /></span>
    </button>
  );
}
