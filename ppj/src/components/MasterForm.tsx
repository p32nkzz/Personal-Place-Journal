"use client";

import { useEffect, useMemo, useState } from "react";

import {
  GooglePlaceSearch,
  MapView,
  useDeviceLocation,
  type GooglePlaceResult,
} from "~/components/map/MapView";
import { useMapColors } from "~/components/map/useMapColors";
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

/** Form draft MASTER PLACE (Admin). Address wajib (K-29h). */
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
  const { location } = useDeviceLocation(initial.latitude == null);
  const cats = api.categories.adminList.useQuery();
  const mapColors = useMapColors();
  useEffect(() => setV(initial), [initial]);

  const hasCoord = v.latitude != null && v.longitude != null;
  const markers = useMemo(
    () => (hasCoord ? [{ id: "pin", lat: v.latitude!, lng: v.longitude!, color: mapColors.newPin, glyph: "+", selected: true }] : []),
    [hasCoord, v.latitude, v.longitude, mapColors.newPin],
  );

  const errs = {
    name: touched && !v.name.trim() ? t("err.REQUIRED") : null,
    address: touched && !v.address.trim() ? t("err.REQUIRED") : null,
    coord: touched && !hasCoord ? t("place.coordRequired") : null,
  };

  // CATEGORY nonaktif hanya ditampilkan bila sudah melekat; yang baru harus aktif.
  const visibleCats = (cats.data ?? []).filter((c) => c.isActive || v.categoryUids.includes(c.uid));

  const toggle = (uid: string) =>
    setV((x) => ({
      ...x,
      categoryUids: x.categoryUids.includes(uid) ? x.categoryUids.filter((i) => i !== uid) : [...x.categoryUids, uid],
    }));

  return (
    <form
      className="stack"
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
      <div className="split">
        <div className="card stack">
          <h2 className="card-title">{t("master.formDetail")}</h2>
          <Field label={t("common.name")} required htmlFor="m-name" error={errs.name}>
            <input id="m-name" className="input" maxLength={255} value={v.name} aria-invalid={!!errs.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field label={t("common.address")} required htmlFor="m-addr" error={errs.address}>
            <textarea id="m-addr" className="textarea" style={{ minHeight: 72 }} maxLength={2000} value={v.address} aria-invalid={!!errs.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
          </Field>
          <Field label={t("common.description")} htmlFor="m-desc" helper={t("common.max2000")}>
            <textarea id="m-desc" className="textarea" maxLength={2000} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
          </Field>
          <div className="form-grid cols-2">
            <Field label={t("common.latitude")} required htmlFor="m-lat" error={errs.coord}>
              <input id="m-lat" className="input mono" inputMode="decimal" value={v.latitude ?? ""} aria-invalid={!!errs.coord} onChange={(e) => setV({ ...v, latitude: e.target.value === "" || Number.isNaN(Number(e.target.value)) ? null : Number(e.target.value) })} />
            </Field>
            <Field label={t("common.longitude")} required htmlFor="m-lng">
              <input id="m-lng" className="input mono" inputMode="decimal" value={v.longitude ?? ""} onChange={(e) => setV({ ...v, longitude: e.target.value === "" || Number.isNaN(Number(e.target.value)) ? null : Number(e.target.value) })} />
            </Field>
          </div>
          <div className="field">
            <span className="label">{t("common.category")}</span>
            <div className="row">
              {visibleCats.map((c) => (
                <button type="button" key={c.uid} className="chip" aria-pressed={v.categoryUids.includes(c.uid)} onClick={() => toggle(c.uid)}>
                  {c.name}{!c.isActive && ` (${t("common.inactive")})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card stack-sm">
          <h2 className="card-title">{t("place.formLocation")}</h2>
          <GooglePlaceSearch
            placeholder={t("map.googlePlaceholder")}
            origin={location ?? (v.latitude != null && v.longitude != null ? { lat: v.latitude, lng: v.longitude } : null)}
            onSelect={(g: GooglePlaceResult) =>
              setV((x) => ({ ...x, googlePlaceId: g.googlePlaceId, name: x.name || g.name, address: x.address || g.address, latitude: g.lat, longitude: g.lng }))
            }
          />
          <div className="map-box-sm">
            <MapView
              markers={markers}
              fit={hasCoord}
              deviceLocation={location}
              onMapClick={(lat, lng) => setV((x) => ({ ...x, latitude: Number(lat.toFixed(7)), longitude: Number(lng.toFixed(7)) }))}
            />
          </div>
          <p className="helper" style={{ margin: 0 }}>{t("place.pinHint")}</p>
          {v.googlePlaceId && <p className="helper mono" style={{ margin: 0 }}>Google ID: {v.googlePlaceId}</p>}
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy}>
          <Icon name="save" /> {busy ? t("common.processing") : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t("common.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
