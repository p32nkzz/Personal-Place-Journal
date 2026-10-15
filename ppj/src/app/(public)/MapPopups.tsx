"use client";

import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { ActiveChip, CategoryChips, MasterStatusChip, RelationChip, TagList, VisitStatusChip } from "~/components/chips";
import { Icon } from "~/components/Icon";
import { googlePhotosFor, nearestPlacePhotos, reverseGeocode, type GooglePhoto, type GooglePlaceResult } from "~/components/map/MapView";
import { Alert, Spinner, StatusChip, Stars } from "~/components/ui";
import { VisitFormModal } from "~/components/VisitFormModal";
import { useFormat, useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

export type Viewer = "GUEST" | "EXPLORER" | "ADMIN";
export type Selection =
  | { kind: "my"; uid: string }
  | { kind: "master"; uid: string }
  | {
      kind: "pin";
      lat: number;
      lng: number;
      google?: GooglePlaceResult;
      /** Pin sudah digeser: alamat/ID tempat dari hasil pencarian tidak berlaku lagi. */
      moved?: boolean;
    };

function Header({ label, onClose }: { label: string; onClose: () => void }) {
  const { t } = useT();
  return (
    <div className="row-between">
      <span className="t-overline muted">{label}</span>
      <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label={t("common.close")}>
        <Icon name="xmark" />
      </button>
    </div>
  );
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Foto pada pop-up; klik membuka pratinjau Fancybox (dengan caption bila ada). */
function Photos({ photos, alt }: { photos: { uid: string; url: string; caption: string | null }[]; alt: string }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const group = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    Fancybox.bind(el, "a[data-fancybox]", { Hash: false });
    return () => Fancybox.unbind(el);
  }, []);
  if (!photos.length) return null;
  const idx = Math.min(i, photos.length - 1);
  const cur = photos[idx]!;
  return (
    <div className="stack-sm" ref={ref}>
      {photos.map((p, n) => (
        <a
          key={p.uid}
          href={p.url}
          data-fancybox={group}
          data-caption={p.caption ? escapeHtml(p.caption) : undefined}
          aria-label={p.caption ?? alt}
          style={n === idx ? { display: "block", cursor: "zoom-in" } : { display: "none" }}
        >
          {n === idx && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cur.url} alt={cur.caption ?? alt} style={{ width: "100%", height: 170, objectFit: "cover", borderRadius: 8, display: "block" }} />
          )}
        </a>
      ))}
      {cur.caption && <div className="t-caption muted">{cur.caption}</div>}
      {photos.length > 1 && (
        <div className="row" style={{ gap: 6 }}>
          {photos.map((p, n) => (
            <button
              key={p.uid}
              onClick={() => setI(n)}
              aria-label={p.caption ?? `${n + 1}`}
              style={{ padding: 0, width: 48, height: 36, borderRadius: 6, overflow: "hidden", cursor: "pointer", border: n === idx ? "2px solid var(--color-primary)" : "1px solid var(--color-border)", background: "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Foto Google Maps untuk tempat tersimpan — hanya dimuat saat tab-nya dibuka. */
function GooglePhotosPanel({
  placeId,
  lat,
  lng,
  fallbackName,
}: {
  placeId: string | null;
  lat: number;
  lng: number;
  fallbackName: string;
}) {
  const { t } = useT();
  const [state, setState] = useState<"loading" | "done">("loading");
  const [data, setData] = useState<Awaited<ReturnType<typeof googlePhotosFor>>>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    void googlePhotosFor(placeId, lat, lng).then((r) => {
      if (cancelled) return;
      setData(r);
      setState("done");
    });
    return () => {
      cancelled = true;
    };
  }, [placeId, lat, lng]);

  if (state === "loading") return <Spinner />;
  if (!data) return <p className="muted t-small" style={{ margin: 0 }}>{t("map.googlePhotosNone")}</p>;
  return (
    <div className="stack-sm">
      <Photos photos={data.photos.map((ph, i) => ({ uid: `gp${i}`, url: ph.url, caption: null }))} alt={data.name || fallbackName} />
      <div className="t-caption muted">
        {data.exact ? (data.name || fallbackName) : t("map.photoNear2", { name: data.name })} · {t("map.photoBy")}{" "}
        {[...new Map(data.photos.flatMap((ph) => ph.credits).map((c) => [c.name, c])).values()].map((c, i) => (
          <span key={c.name}>
            {i > 0 && ", "}
            {c.href ? <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>{c.name}</a> : c.name}
          </span>
        ))}{" "}
        · Google Maps
      </div>
    </div>
  );
}

/**
 * Foto pada pop-up dikelompokkan dalam tab chip agar pop-up tidak memanjang:
 * foto milik tempat (MASTER / tinjauan) dan foto Google Maps (dimuat saat tab dibuka).
 */
function PhotoTabs({
  ownLabel,
  photos,
  placeId,
  lat,
  lng,
  name,
}: {
  ownLabel: string;
  photos: { uid: string; url: string; caption: string | null }[];
  placeId: string | null;
  lat: number;
  lng: number;
  name: string;
}) {
  const { t } = useT();
  const [tab, setTab] = useState<"own" | "google">("own");
  return (
    <div className="stack-sm">
      <div className="mini-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "own"} className="mini-tab" onClick={() => setTab("own")}>
          <Icon name="image" fixedWidth={false} /> {ownLabel} <span className="mini-tab-n">{photos.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "google"} className="mini-tab" title={t("map.googlePhotosHint")} onClick={() => setTab("google")}>
          <Icon name="map" fixedWidth={false} /> {t("map.googlePhotos")}
        </button>
      </div>
      {tab === "own" ? (
        photos.length ? <Photos photos={photos} alt={name} /> : <p className="muted t-small" style={{ margin: 0 }}>{t("photo.none")}</p>
      ) : (
        <GooglePhotosPanel placeId={placeId} lat={lat} lng={lng} fallbackName={name} />
      )}
    </div>
  );
}

/** Detail lengkap MASTER PLACE langsung pada peta. */
export function MasterPopup({ uid, viewer, onClose }: { uid: string; viewer: Viewer; onClose: () => void }) {
  const { t } = useT();
  const { data: m, isLoading } = api.master.get.useQuery({ uid });
  return (
    <div className="stack-sm">
      <Header label="MASTER" onClose={onClose} />
      {isLoading || !m ? (
        <Spinner />
      ) : (
        <>
          <h2 className="t-subhead">{m.name}</h2>
          <div className="row">
            <MasterStatusChip status={m.status} />
            <Stars value={m.rating.avg} count={m.rating.count} />
          </div>
          <PhotoTabs key={m.uid} ownLabel={t("map.tabMasterPhotos")} photos={m.photos} placeId={m.googlePlaceId} lat={m.latitude} lng={m.longitude} name={m.name} />
          <dl className="kv" style={{ margin: 0, gridTemplateColumns: "96px 1fr" }}>
            <dt>{t("common.address")}</dt>
            <dd>{m.address}</dd>
            {m.description && (
              <>
                <dt>{t("common.description")}</dt>
                <dd style={{ whiteSpace: "pre-wrap" }}>{m.description}</dd>
              </>
            )}
            <dt>{t("common.category")}</dt>
            <dd><CategoryChips items={m.categories} /></dd>
            <dt>{t("common.coordinates")}</dt>
            <dd className="mono">{m.latitude.toFixed(6)}, {m.longitude.toFixed(6)}</dd>
          </dl>
          <div className="row">
            {viewer === "EXPLORER" && m.status === "ACTIVE" && (
              <Link className="btn btn-primary btn-sm" href={`/places/new?master=${m.uid}&from=map`}>
                <Icon name="plus" /> {t("map.saveAsMine")}
              </Link>
            )}
            <Link className="btn btn-secondary btn-sm" href={viewer === "ADMIN" ? `/admin/masters/${m.uid}` : `/masters/${m.uid}`}>
              <Icon name="circle-info" /> {t("map.viewDetail")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

/** Detail lengkap MY PLACE (kunjungan, foto, relasi MASTER) langsung pada peta. */
export function MyPlacePopup({ uid, onClose }: { uid: string; onClose: () => void }) {
  const { t } = useT();
  const fmt = useFormat();
  const utils = api.useUtils();
  const { data: p, isLoading } = api.place.get.useQuery({ uid });
  const [visitOpen, setVisitOpen] = useState(false);

  return (
    <div className="stack-sm">
      <Header label={t("nav.myPlaces")} onClose={onClose} />
      {isLoading || !p ? (
        <Spinner />
      ) : (
        <>
          <div className="row-between" style={{ alignItems: "flex-start", gap: 8 }}>
            <h2 className="t-subhead" style={{ margin: 0, minWidth: 0 }}>
              {p.isFavorite && <Icon name="star" style={{ color: "#f59e0b" }} />} {p.name}
            </h2>
            <Link
              className="btn btn-secondary btn-sm btn-icon"
              style={{ flexShrink: 0, width: 34, minHeight: 34 }}
              href={`/places/${p.uid}/edit`}
              title={t("common.edit")}
              aria-label={t("common.edit")}
            >
              <Icon name="pen" />
            </Link>
          </div>
          <div className="row">
            <VisitStatusChip status={p.visitStatus} />
            <RelationChip status={p.masterRelationStatus} />
            {!p.isActive && <ActiveChip active={false} />}
          </div>
          <Stars value={p.rating.avg} count={p.rating.count} />
          <PhotoTabs key={p.uid} ownLabel={t("place.reviewPhotos")} photos={p.photos} placeId={p.googlePlaceId} lat={p.latitude} lng={p.longitude} name={p.name} />
          <dl className="kv" style={{ margin: 0, gridTemplateColumns: "96px 1fr" }}>
            <dt>{t("common.address")}</dt>
            <dd>{p.address ?? "—"}</dd>
            {p.description && (
              <>
                <dt>{t("common.description")}</dt>
                <dd style={{ whiteSpace: "pre-wrap" }}>{p.description}</dd>
              </>
            )}
            <dt>{t("common.category")}</dt>
            <dd><CategoryChips items={p.categories} /></dd>
            {p.tags.length > 0 && (
              <>
                <dt>{t("nav.tags")}</dt>
                <dd><TagList items={p.tags} /></dd>
              </>
            )}
            <dt>{t("common.coordinates")}</dt>
            <dd className="mono">{p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}</dd>
            {p.master && (
              <>
                <dt>MASTER</dt>
                <dd>
                  <Link href={`/masters/${p.master.uid}`} style={{ color: "var(--color-primary)", fontWeight: 600 }}>{p.master.name}</Link>{" "}
                  {p.master.status === "INACTIVE" && <StatusChip tone="neutral">{t("master.inactive")}</StatusChip>}
                </dd>
              </>
            )}
            {p.itineraries.length > 0 && (
              <>
                <dt>{t("nav.itineraries")}</dt>
                <dd>
                  {p.itineraries.map((i, n) => (
                    <span key={i.uid}>
                      {n > 0 && ", "}
                      <Link href={`/itineraries/${i.uid}`} style={{ color: "var(--color-primary)" }}>{i.name}</Link>
                    </span>
                  ))}
                </dd>
              </>
            )}
          </dl>

          <hr className="divider" style={{ margin: "4px 0" }} />
          <div className="t-overline muted">{t("visit.title")} ({p.visits.length})</div>
          {!p.visits.length ? (
            <p className="muted t-small" style={{ margin: 0 }}>{t("visit.empty")}</p>
          ) : (
            <ul className="timeline" style={{ gap: 12 }}>
              {p.visits.map((v) => (
                <li key={v.uid}>
                  <div><b>{fmt.dateTime(v.visitedAt)}</b></div>
                  <div className="row">
                    <Stars value={v.rating} />
                    {v.context === "PLANNED" && <StatusChip tone="info">{t("visit.planned")}</StatusChip>}
                    {v.context === "UNEXPECTED" && <StatusChip tone="warning">{t("visit.unexpected")}</StatusChip>}
                  </div>
                  {v.note && <div className="t-small" style={{ whiteSpace: "pre-wrap" }}>{v.note}</div>}
                  {v.photos.length > 0 && <div style={{ marginTop: 6 }}><Photos photos={v.photos} alt={p.name} /></div>}
                </li>
              ))}
            </ul>
          )}

          {p.history.length > 0 && (
            <>
              <div className="t-overline muted">{t("relation.history")}</div>
              <ul className="timeline" style={{ gap: 8 }}>
                {p.history.map((h) => (
                  <li key={h.uid}>
                    <b>{t(`history.${h.action}`)}</b> <span className="muted t-caption">{fmt.dateTime(h.performedAt)}</span>
                    {h.reason && <div className="t-small">{h.reason}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="row" style={{ marginTop: 4 }}>
            {p.isActive && (
              <button className="btn btn-primary btn-sm" onClick={() => setVisitOpen(true)}>
                <Icon name="plus" /> {t("visit.add")}
              </button>
            )}
            <Link className="btn btn-secondary btn-sm" href={`/places/${p.uid}`}>
              <Icon name="circle-info" /> {t("map.viewDetail")}
            </Link>
          </div>

          {visitOpen && (
            <VisitFormModal
              placeUid={p.uid}
              onClose={() => setVisitOpen(false)}
              onSaved={() => {
                void utils.place.get.invalidate({ uid });
                void utils.place.list.invalidate();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function pinParams(a: { lat: number; lng: number; name?: string; address?: string; gid?: string }) {
  const p = new URLSearchParams({ lat: String(a.lat), lng: String(a.lng) });
  if (a.gid) p.set("gid", a.gid);
  if (a.name) p.set("name", a.name);
  if (a.address) p.set("address", a.address);
  return p.toString();
}

/** Pin baru: alamat diambil dari reverse geocoding Google Maps bila bukan hasil pencarian. */
export function PinPopup({
  sel,
  viewer,
  onClose,
}: {
  sel: Extract<Selection, { kind: "pin" }>;
  viewer: Viewer;
  onClose: () => void;
}) {
  const { t } = useT();
  const [geo, setGeo] = useState<{ address: string; placeId: string } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [nearPhotos, setNearPhotos] = useState<{ name: string; distance: number; photos: GooglePhoto[] } | null>(null);

  useEffect(() => {
    if (sel.google && !sel.moved) {
      setState("done");
      return;
    }
    let cancelled = false;
    setState("loading");
    setGeo(null);
    void reverseGeocode(sel.lat, sel.lng).then((r) => {
      if (cancelled) return;
      setGeo(r);
      setState(r ? "done" : "failed");
    });
    return () => {
      cancelled = true;
    };
  }, [sel.lat, sel.lng, sel.google, sel.moved]);

  // Pin manual / digeser: cari foto Google dari tempat yang berada di titik tersebut.
  useEffect(() => {
    setNearPhotos(null);
    if (sel.google && !sel.moved) return;
    let cancelled = false;
    void nearestPlacePhotos(sel.lat, sel.lng).then((r) => {
      if (!cancelled) setNearPhotos(r);
    });
    return () => {
      cancelled = true;
    };
  }, [sel.lat, sel.lng, sel.google, sel.moved]);

  const fromSearch = !!sel.google && !sel.moved;
  const address = fromSearch ? sel.google!.address : geo?.address;
  // Nama mengikuti titik pin: hasil pencarian, atau tempat Google terdekat bila pin digeser/diklik.
  const placeName = fromSearch ? sel.google!.name : nearPhotos?.name;
  const params = pinParams({
    lat: sel.lat,
    lng: sel.lng,
    gid: fromSearch ? sel.google!.googlePlaceId : geo?.placeId,
    name: placeName,
    address,
  });

  return (
    <div className="stack-sm">
      <Header label={t("map.pin")} onClose={onClose} />
      {fromSearch && !!sel.google?.photos?.length && (
        <div className="stack-sm">
          <Photos
            photos={sel.google.photos.map((ph, i) => ({ uid: `g${i}`, url: ph.url, caption: null }))}
            alt={sel.google.name}
          />
          <div className="t-caption muted">
            {t("map.photoBy")}{" "}
            {[...new Map(sel.google.photos.flatMap((ph) => ph.credits).map((c) => [c.name, c])).values()].map((c, i) => (
              <span key={c.name}>
                {i > 0 && ", "}
                {c.href ? (
                  <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>{c.name}</a>
                ) : (
                  c.name
                )}
              </span>
            ))}{" "}
            · Google Maps
          </div>
        </div>
      )}
      {!fromSearch && !!nearPhotos?.photos.length && (
        <div className="stack-sm">
          <Photos photos={nearPhotos.photos.map((ph, i) => ({ uid: `n${i}`, url: ph.url, caption: null }))} alt={nearPhotos.name} />
          <div className="t-caption muted">
            {t("map.photoNear", { name: nearPhotos.name, d: nearPhotos.distance })} ·{" "}
            {t("map.photoBy")}{" "}
            {[...new Map(nearPhotos.photos.flatMap((ph) => ph.credits).map((c) => [c.name, c])).values()].map((c, i) => (
              <span key={c.name}>
                {i > 0 && ", "}
                {c.href ? <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>{c.name}</a> : c.name}
              </span>
            ))}{" "}
            · Google Maps
          </div>
        </div>
      )}
      <h2 className="t-subhead">{placeName ?? t("map.manualPin")}</h2>
      {!fromSearch && nearPhotos && (
        <div className="t-caption muted" style={{ marginTop: -4 }}>{t("map.nearestPlace", { d: nearPhotos.distance })}</div>
      )}
      <dl className="kv" style={{ margin: 0, gridTemplateColumns: "96px 1fr" }}>
        <dt>{t("common.address")}</dt>
        <dd>
          {address ?? (state === "loading" ? <Spinner label={t("map.findingAddress")} /> : <span className="muted">{t("map.addressUnknown")}</span>)}
        </dd>
        <dt>{t("common.coordinates")}</dt>
        <dd className="mono">{sel.lat.toFixed(6)}, {sel.lng.toFixed(6)}</dd>
      </dl>
      {viewer !== "GUEST" && (
        <p className="helper" style={{ margin: 0 }}>
          <Icon name="pin" fixedWidth={false} /> {t("map.dragHint")}
        </p>
      )}
      <div className="row">
        {viewer === "EXPLORER" && (
          <Link className="btn btn-primary btn-sm" href={`/places/new?${params}&from=map`}>
            <Icon name="plus" /> {t("map.addAsMine")}
          </Link>
        )}
        {viewer === "ADMIN" && (
          <Link className="btn btn-primary btn-sm" href={`/admin/masters/new?${params}`}>
            <Icon name="plus" /> {t("map.createMaster")}
          </Link>
        )}
      </div>
      {viewer === "GUEST" && <Alert>{t("map.loginToSave")}</Alert>}
    </div>
  );
}
