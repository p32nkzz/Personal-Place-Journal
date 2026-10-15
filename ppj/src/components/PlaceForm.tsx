"use client";

import Link from "next/link";
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
}: {
  initial: PlaceFormValues;
  masterUid?: string | null;
  masterName?: string | null;
  excludeUid?: string;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (v: PlaceFormValues) => void;
  cancelHref: string;
  showFavorite?: boolean;
}) {
  const { t } = useT();
  const [v, setV] = useState<PlaceFormValues>(initial);
  const [touched, setTouched] = useState(false);
  const { location } = useDeviceLocation(initial.latitude == null);
  const cats = api.categories.listActive.useQuery();
  const mapColors = useMapColors();
  const tags = api.tag.list.useQuery();

  useEffect(() => setV(initial), [initial]);

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

  const markers = useMemo(
    () =>
      hasCoord
        ? [{ id: "pin", lat: v.latitude!, lng: v.longitude!, color: mapColors.newPin, glyph: "+", selected: true }]
        : [],
    [hasCoord, v.latitude, v.longitude, mapColors.newPin],
  );

  const nameError = touched && !v.name.trim() ? t("err.REQUIRED") : null;
  const coordError = touched && !hasCoord ? t("place.coordRequired") : null;

  // Kategori nonaktif yang sudah melekat tetap ditampilkan agar tidak hilang diam-diam.
  const selectableCats = cats.data ?? [];

  return (
    <form
      className="stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!v.name.trim() || !hasCoord) return;
        onSubmit(v);
      }}
    >
      {error && <Alert kind="error">{error}</Alert>}
      {masterUid && (
        <Alert kind="info">
          {t("place.fromMasterNote", { name: masterName ?? "MASTER" })}
        </Alert>
      )}

      <div className="split">
        <div className="card stack">
          <h2 className="card-title">{t("place.formDetail")}</h2>
          <Field label={t("common.name")} required htmlFor="name" error={nameError}>
            <input id="name" className="input" maxLength={255} value={v.name} aria-invalid={!!nameError} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label={t("common.address")} htmlFor="address">
            <textarea id="address" className="textarea" style={{ minHeight: 72 }} maxLength={2000} value={v.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label={t("common.description")} htmlFor="desc" helper={t("common.max2000")}>
            <textarea id="desc" className="textarea" maxLength={2000} value={v.description} onChange={(e) => set("description", e.target.value)} />
          </Field>

          <div className="form-grid cols-2">
            <Field label={t("common.latitude")} required htmlFor="lat" error={coordError}>
              <input id="lat" className="input mono" inputMode="decimal" value={v.latitude ?? ""} aria-invalid={!!coordError} onChange={(e) => set("latitude", e.target.value === "" || Number.isNaN(Number(e.target.value)) ? null : Number(e.target.value))} />
            </Field>
            <Field label={t("common.longitude")} required htmlFor="lng">
              <input id="lng" className="input mono" inputMode="decimal" value={v.longitude ?? ""} onChange={(e) => set("longitude", e.target.value === "" || Number.isNaN(Number(e.target.value)) ? null : Number(e.target.value))} />
            </Field>
          </div>

          <div className="field">
            <span className="label">{t("common.category")}</span>
            <div className="row">
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
            <div className="row">
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

          {showFavorite && (
            <label className="check">
              <input type="checkbox" checked={v.isFavorite} onChange={(e) => set("isFavorite", e.target.checked)} />
              <span><Icon name="star" /> {t("place.markFavorite")}</span>
            </label>
          )}
        </div>

        <div className="stack">
          <div className="card stack-sm">
            <h2 className="card-title">{t("place.formLocation")}</h2>
            <GooglePlaceSearch
              placeholder={t("map.googlePlaceholder")}
              onSelect={(g: GooglePlaceResult) =>
                setV((x) => ({
                  ...x,
                  googlePlaceId: g.googlePlaceId,
                  name: x.name || g.name,
                  address: x.address || g.address,
                  latitude: g.lat,
                  longitude: g.lng,
                }))
              }
            />
            <div className="map-box-sm">
              <MapView
                markers={markers}
                fit={hasCoord}
                deviceLocation={location}
                onMapClick={(lat, lng) =>
                  setV((x) => ({ ...x, latitude: Number(lat.toFixed(7)), longitude: Number(lng.toFixed(7)), googlePlaceId: x.googlePlaceId }))
                }
              />
            </div>
            <p className="helper" style={{ margin: 0 }}>{t("place.pinHint")}</p>
            {v.googlePlaceId && <p className="helper mono" style={{ margin: 0 }}>Google ID: {v.googlePlaceId}</p>}
          </div>

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
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy}>
          <Icon name="save" /> {busy ? t("common.processing") : submitLabel}
        </button>
        <Link className="btn btn-secondary" href={cancelHref}>
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}

