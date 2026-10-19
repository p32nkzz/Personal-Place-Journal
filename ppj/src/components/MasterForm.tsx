"use client";

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
import { FollowSwitch } from "~/components/PlaceForm";
import { MapTypeSwitch } from "~/components/map/MapTypeSwitch";
import { useMapColors } from "~/components/map/useMapColors";
import { useCategoryPageSize } from "~/components/useCategoryPageSize";
import { GoogleId, StreetViewDialog } from "~/components/PlaceInfo";
import { Alert, Field } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { Icon } from "./Icon";

export type MasterFormValues = {
  name: string;
  address: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  categoryUids: string[];
};

/**
 * Form draft MASTER PLACE (Admin). Address wajib (K-29h).
 * Tata letak sama dengan form MY PLACE: 1 — Lokasi (peta), 2 — Data tempat, aksi menempel di bawah.
 */
export function MasterForm({
  initial,
  busy,
  error,
  submitLabel,
  onSubmit,
  onCancel,
  followMap = { name: true, address: true },
  photoSlot,
  onPickGooglePhoto,
  pickedGoogleUrls,
  mapZoom,
  children,
}: {
  initial: MasterFormValues;
  busy: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (v: MasterFormValues) => void;
  onCancel?: (v: MasterFormValues) => void;
  /** Nilai awal switch "Ikuti peta" per field (sama dengan form MY PLACE). */
  followMap?: { name: boolean; address: boolean };
  /** Foto MASTER langsung dari form (hanya form tambah): pemilih foto tertunda, sama dengan Foto Pantauan MY PLACE. */
  photoSlot?: React.ReactNode;
  /** Memilih foto Google Maps sebagai foto MASTER (disimpan sebagai link eksternal); mengaktifkan chip "Foto Google Maps". */
  onPickGooglePhoto?: (url: string) => void;
  pickedGoogleUrls?: string[];
  /** Zoom Peta utama saat form dibuka sebagai modal: peta form memakai nilai ini bila lebih besar dari zoom bawaan. */
  mapZoom?: number;
  children?: React.ReactNode;
}) {
  const { t } = useT();
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState(false);
  const [svOpen, setSvOpen] = useState(false);
  // "Ikuti peta" per field: nama & alamat masing-masing dapat mengikuti hasil pencarian / pin peta.
  const [followName, setFollowName] = useState(followMap.name);
  const [followAddress, setFollowAddress] = useState(followMap.address);
  const [resolving, setResolving] = useState(false);
  const reqRef = useRef(0);
  // Pratinjau foto Google Maps di bawah koordinat & lipat/buka kartu foto (diingat per perangkat).
  const [showPhotos, setShowPhotos] = useState(true);
  const [photosCollapsed, setPhotosCollapsed] = useState(false);
  useEffect(() => {
    try {
      setPhotosCollapsed(localStorage.getItem("ppj.master.form.photosCollapsed") === "1");
    } catch {
      // penyimpanan tidak tersedia: tampil terbuka
    }
  }, []);
  const togglePhotos = () =>
    setPhotosCollapsed((c) => {
      try {
        localStorage.setItem("ppj.master.form.photosCollapsed", c ? "0" : "1");
      } catch {
        // abaikan
      }
      return !c;
    });
  const { location } = useDeviceLocation(initial.latitude == null);
  const cats = api.categories.adminList.useQuery();
  // Chip kategori dimuat bertahap (jumlah awal/per muat dari Pengaturan), sama dengan form MY PLACE.
  const catPage = useCategoryPageSize();
  const [catShown, setCatShown] = useState(0);
  const mapColors = useMapColors();
  useEffect(() => setV(initial), [initial]);

  const hasCoord = v.latitude != null && v.longitude != null;
  const markers = useMemo(
    () => (hasCoord ? [{ id: "pin", lat: v.latitude!, lng: v.longitude!, color: mapColors.newPin, glyph: "+", selected: true, draggable: true }] : []),
    [hasCoord, v.latitude, v.longitude, mapColors.newPin],
  );

  const errs = {
    name: touched && !v.name.trim() ? t("err.REQUIRED") : null,
    address: touched && !v.address.trim() ? t("err.REQUIRED") : null,
    coord: touched && !hasCoord ? t("place.coordRequired") : null,
  };

  // CATEGORY nonaktif hanya ditampilkan bila sudah melekat; yang baru harus aktif.
  const visibleCats = (cats.data ?? []).filter((c) => c.isActive || v.categoryUids.includes(c.uid));

  // Item terpilih selalu tampil walau di luar jumlah termuat, agar pilihan tidak "hilang".
  const catLimit = Math.max(catShown, catPage);
  const catVisible = visibleCats.filter((c, i) => i < catLimit || v.categoryUids.includes(c.uid));
  const catHidden = visibleCats.length - catVisible.length;

  const toggle = (uid: string) =>
    setV((x) => ({
      ...x,
      categoryUids: x.categoryUids.includes(uid) ? x.categoryUids.filter((i) => i !== uid) : [...x.categoryUids, uid],
    }));
  // Pin baru/digeser: koordinat DAN Google Place ID selalu diperbarui; nama/alamat hanya bila switch field-nya ON
  // (sama dengan form MY PLACE). ID lama dikosongkan seketika lalu diisi hasil pencarian titik baru.
  const movePin = (lat: number, lng: number) => {
    setV((x) => ({ ...x, latitude: Number(lat.toFixed(7)), longitude: Number(lng.toFixed(7)), googlePlaceId: null }));
    const req = ++reqRef.current;
    setResolving(true);
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
  const coordInput = (k: "latitude" | "longitude") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" || Number.isNaN(Number(e.target.value)) ? null : Number(e.target.value);
    setV((x) => ({ ...x, [k]: val, googlePlaceId: null }));
    const lat = k === "latitude" ? val : v.latitude;
    const lng = k === "longitude" ? val : v.longitude;
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

  return (
    <form
      className="pf"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!v.name.trim() || !v.address.trim() || !hasCoord) return;
        onSubmit(v);
      }}
    >
      {error && <Alert kind="error">{error}</Alert>}
      {children}

      <div className="pf-grid">
        {/* 1 — Lokasi */}
        <section className="card pf-card">
          <div className="pf-head">
            <h2 className="pf-title"><span className="pf-step">1</span>{t("place.formLocation")}</h2>
            <div className="pf-tools">
              <MapTypeSwitch className="is-inline" />
              {onPickGooglePhoto && (
                <button type="button" className="chip" aria-pressed={showPhotos} title={t("map.googlePhotosHint")} onClick={() => setShowPhotos((s) => !s)}>
                  <Icon name="image" /> {t("map.googlePhotos")}
                </button>
              )}
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
              startZoom={mapZoom}
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
            <label htmlFor="m-lat">Lat<span className="req" aria-hidden>*</span></label>
            <input id="m-lat" className="input mono" inputMode="decimal" value={v.latitude ?? ""} aria-invalid={!!errs.coord} aria-label={t("common.latitude")} onChange={coordInput("latitude")} />
            <label htmlFor="m-lng">Lng<span className="req" aria-hidden>*</span></label>
            <input id="m-lng" className="input mono" inputMode="decimal" value={v.longitude ?? ""} aria-invalid={!!errs.coord} aria-label={t("common.longitude")} onChange={coordInput("longitude")} />
            {hasCoord && v.googlePlaceId && <GoogleId id={v.googlePlaceId} className="is-field" />}
            {hasCoord && (
              <button type="button" className="pf-sv" title={t("map.streetView")} aria-label={t("map.streetView")} onClick={() => setSvOpen(true)}>
                <Icon name="street-view" fixedWidth={false} />
              </button>
            )}
          </div>
          {errs.coord && (
            <div className="helper helper-error" role="alert" style={{ marginTop: -4 }}>
              <Icon name="warning" fixedWidth={false} /> {errs.coord}
            </div>
          )}
          {onPickGooglePhoto && showPhotos && hasCoord && (
            <GooglePhotoPreview placeId={v.googlePlaceId} lat={v.latitude!} lng={v.longitude!} fallbackName={v.name} onPick={onPickGooglePhoto} picked={pickedGoogleUrls} pickHint={t("master.googlePhotoPickHint")} pickLabel={t("master.pickGoogle")} />
          )}
          {svOpen && hasCoord && <StreetViewDialog lat={v.latitude!} lng={v.longitude!} title={v.name || undefined} onClose={() => setSvOpen(false)} />}
        </section>

        <div className="pf-side">
          {/* 2 — Data MASTER */}
          <section className="card pf-card">
            <div className="pf-head">
              <h2 className="pf-title"><span className="pf-step">2</span>{t("master.formDetail")}</h2>
            </div>
            <div className="field">
              <div className="pf-label-row">
                <label className="label" htmlFor="m-name">
                  {t("common.name")}
                  <span className="req" aria-hidden>*</span>
                </label>
                <FollowSwitch on={followName} onToggle={() => setFollowName((f) => !f)} hint={t("place.followNameHint")} field={t("common.name")} />
              </div>
              <input id="m-name" className={`input${followName ? " is-following" : ""}`} maxLength={255} value={v.name} aria-invalid={!!errs.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
              {errs.name && (
                <div className="helper helper-error" role="alert">
                  <Icon name="warning" fixedWidth={false} /> {errs.name}
                </div>
              )}
            </div>
            <div className="field">
              <div className="pf-label-row">
                <label className="label" htmlFor="m-addr">
                  {t("common.address")}
                  <span className="req" aria-hidden>*</span>
                </label>
                <FollowSwitch on={followAddress} onToggle={() => setFollowAddress((f) => !f)} hint={t("place.followAddressHint")} field={t("common.address")} />
              </div>
              <textarea id="m-addr" className={`textarea${followAddress ? " is-following" : ""}`} rows={2} maxLength={2000} value={v.address} aria-invalid={!!errs.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
              {errs.address && (
                <div className="helper helper-error" role="alert">
                  <Icon name="warning" fixedWidth={false} /> {errs.address}
                </div>
              )}
            </div>
            <Field label={t("common.description")} htmlFor="m-desc">
              <textarea id="m-desc" className="textarea" rows={3} maxLength={2000} placeholder={t("common.max2000")} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
            </Field>
            <div className="field">
              <span className="label">{t("common.category")}</span>
              <div className="pf-chips">
                {catVisible.map((c) => (
                  <button type="button" key={c.uid} className="cat pick" aria-pressed={v.categoryUids.includes(c.uid)} onClick={() => toggle(c.uid)}>
                    <Icon name={v.categoryUids.includes(c.uid) ? "circle-check" : "layers"} fixedWidth={false} />
                    {c.name}
                    {!c.isActive && ` (${t("common.inactive")})`}
                  </button>
                ))}
                {catHidden > 0 && (
                  <button type="button" className="chip pf-more" onClick={() => setCatShown(catLimit + catPage)} title={t("place.loadMoreInfo", { n: catHidden })}>
                    <Icon name="plus" fixedWidth={false} /> {t("place.loadMore", { n: Math.min(catPage, catHidden) })}
                    <span className="pf-more-n">{t("place.remaining", { n: catHidden })}</span>
                  </button>
                )}
                {cats.data && !visibleCats.length && <span className="muted t-small">—</span>}
              </div>
            </div>
          </section>

          {/* 3 — Foto MASTER (hanya form tambah) */}
          {photoSlot && (
            <section className="card pf-card">
              <div className="pf-head pf-head-collapsible">
                <h2 className="pf-title"><span className="pf-step">3</span>{t("master.formPhotos")}</h2>
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
        <span className="pf-note"><span className="req" aria-hidden>*</span> {t("master.requiredNote")}</span>
        {onCancel && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCancel(v)}>
            {t("common.cancel")}
          </button>
        )}
        <button className="btn btn-primary btn-sm" disabled={busy}>
          <Icon name="save" /> {busy ? t("common.processing") : submitLabel}
        </button>
      </div>
    </form>
  );
}
