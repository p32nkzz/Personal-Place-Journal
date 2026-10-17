"use client";

import { useEffect, useMemo, useState } from "react";

import {
  GooglePlaceSearch,
  MapView,
  useDeviceLocation,
  type GooglePlaceResult,
} from "~/components/map/MapView";
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
  children,
}: {
  initial: MasterFormValues;
  busy: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (v: MasterFormValues) => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useT();
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState(false);
  const [svOpen, setSvOpen] = useState(false);
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
  const movePin = (lat: number, lng: number) => setV((x) => ({ ...x, latitude: Number(lat.toFixed(7)), longitude: Number(lng.toFixed(7)) }));
  const coordInput = (k: "latitude" | "longitude") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value === "" || Number.isNaN(Number(e.target.value)) ? null : Number(e.target.value) }));

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
            </div>
          </div>

          <GooglePlaceSearch
            placeholder={t("map.googlePlaceholder")}
            origin={location ?? (hasCoord ? { lat: v.latitude!, lng: v.longitude! } : null)}
            onSelect={(g: GooglePlaceResult) =>
              setV((x) => ({ ...x, googlePlaceId: g.googlePlaceId, name: x.name || g.name, address: x.address || g.address, latitude: g.lat, longitude: g.lng }))
            }
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
          <div className="pf-hint-row">
            <span className="pf-hint">{t("place.pinHint")}</span>
          </div>
          {errs.coord && (
            <div className="helper helper-error" role="alert" style={{ marginTop: -4 }}>
              <Icon name="warning" fixedWidth={false} /> {errs.coord}
            </div>
          )}
          {svOpen && hasCoord && <StreetViewDialog lat={v.latitude!} lng={v.longitude!} title={v.name || undefined} onClose={() => setSvOpen(false)} />}
        </section>

        {/* 2 — Data MASTER */}
        <section className="card pf-card">
          <div className="pf-head">
            <h2 className="pf-title"><span className="pf-step">2</span>{t("master.formDetail")}</h2>
          </div>
          <Field label={t("common.name")} required htmlFor="m-name" error={errs.name}>
            <input id="m-name" className="input" maxLength={255} value={v.name} aria-invalid={!!errs.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field label={t("common.address")} required htmlFor="m-addr" error={errs.address}>
            <textarea id="m-addr" className="textarea" rows={2} maxLength={2000} value={v.address} aria-invalid={!!errs.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
          </Field>
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
      </div>

      <div className="pf-actions">
        <span className="pf-note"><span className="req" aria-hidden>*</span> {t("master.requiredNote")}</span>
        {onCancel && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
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
