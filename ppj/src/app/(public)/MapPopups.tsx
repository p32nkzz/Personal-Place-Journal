"use client";

import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { ActiveChip, CategoryChips, MasterStatusChip, RelationChip, TagList, VisitContextChip, VisitStatusChip } from "~/components/chips";
import { Icon } from "~/components/Icon";
import { googlePhotosFor, nearestPlacePhotos, reverseGeocode, type GooglePhoto, type GooglePlaceResult } from "~/components/map/MapView";
import { Alert, Spinner, StatusChip, Stars } from "~/components/ui";
import { Coords, DescQuote, InfoRow, ThumbStrip } from "~/components/PlaceInfo";
import { VisitFormModal } from "~/components/VisitFormModal";
import { useFormat, useT } from "~/lib/i18n";
import { useMapColors } from "~/components/map/useMapColors";
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
 * foto milik tempat (MASTER / pantauan) dan foto Google Maps (dimuat saat tab dibuka).
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

/* ------------------------- Blok tampilan ringkas pop-up ------------------------- */

/** Kepala pop-up: penanda jenis (berwarna), tombol aksi kecil, tutup; judul di bawahnya. */
function PopHead({
  kind,
  color,
  title,
  favorite,
  actions,
  onClose,
}: {
  kind: string;
  color: string;
  title?: string;
  favorite?: boolean;
  actions?: React.ReactNode;
  onClose: () => void;
}) {
  const { t } = useT();
  return (
    <div className="pp-head">
      <div className="pp-head-top">
        <span className="pp-kind">
          <i style={{ background: color }} />
          {kind}
        </span>
        <span className="pp-head-actions">
          {actions}
          <button type="button" className="pp-icon-btn" onClick={onClose} aria-label={t("common.close")} title={t("common.close")}>
            <Icon name="xmark" fixedWidth={false} />
          </button>
        </span>
      </div>
      {title && (
        <h2 className="pp-title">
          {favorite && <Icon name="star" fixedWidth={false} style={{ color: "#eab308" }} />} {title}
        </h2>
      )}
    </div>
  );
}

/** Detail lengkap MASTER PLACE langsung pada peta. */
export function MasterPopup({ uid, viewer, onClose }: { uid: string; viewer: Viewer; onClose: () => void }) {
  const { t } = useT();
  const colors = useMapColors();
  const { data: m, isLoading } = api.master.get.useQuery({ uid });
  return (
    <div className="pp">
      <PopHead kind="MASTER" color={colors.master} title={m?.name} onClose={onClose} />
      {isLoading || !m ? (
        <Spinner />
      ) : (
        <>
          <div className="pp-meta">
            <MasterStatusChip status={m.status} />
            <Stars value={m.rating.avg} count={m.rating.count} />
          </div>
          <PhotoTabs key={m.uid} ownLabel={t("map.tabMasterPhotos")} photos={m.photos} placeId={m.googlePlaceId} lat={m.latitude} lng={m.longitude} name={m.name} />
          <div className="pp-info">
            {m.categories.length > 0 && <InfoRow icon="layers" label={t("common.category")}><CategoryChips items={m.categories} /></InfoRow>}
            <InfoRow icon="map-pin" label={t("common.address")}>{m.address}</InfoRow>
            {m.description && <DescQuote text={m.description} />}
            <InfoRow icon="pin" label={t("common.coordinates")}><Coords lat={m.latitude} lng={m.longitude} placeId={m.googlePlaceId} googleLink streetView name={m.name} /></InfoRow>
          </div>
          <div className="pp-actions">
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

/** Pager ringkas (sebelumnya/berikutnya + posisi) untuk daftar di dalam pop-up. */
function MiniPager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (n: number) => void }) {
  const { t } = useT();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="pp-pager">
      <span className="pp-pager-info">{t("table.showing", { from, to, total })}</span>
      <span className="pp-pager-nav">
        <button type="button" className="pp-icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("table.prev")} title={t("table.prev")}>
          <Icon name="angle-left" fixedWidth={false} />
        </button>
        <b>{page}/{pages}</b>
        <button type="button" className="pp-icon-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={t("table.next")} title={t("table.next")}>
          <Icon name="angle-right" fixedWidth={false} />
        </button>
      </span>
    </div>
  );
}

/** Detail lengkap MY PLACE (kunjungan, foto, relasi MASTER) langsung pada peta. */
export function MyPlacePopup({ uid, onClose }: { uid: string; onClose: () => void }) {
  const { t } = useT();
  const fmt = useFormat();
  const utils = api.useUtils();
  const colors = useMapColors();
  const { data: p, isLoading } = api.place.get.useQuery({ uid });
  const [visitOpen, setVisitOpen] = useState(false);
  const [tab, setTab] = useState<"visits" | "history">("visits");
  // Kunjungan dipaging di server; ukuran halaman dari Pengaturan (visit.page_size), sama dengan halaman detail.
  const [visitPage, setVisitPage] = useState(1);
  const vq = api.place.visits.useQuery({ uid, page: visitPage }, { placeholderData: (prev) => prev });
  const visitTotal = vq.data?.total ?? p?.visits.length ?? 0;

  return (
    <div className="pp">
      <PopHead
        kind={t("nav.myPlaces")}
        color={p?.isFavorite ? colors.favorite : colors.mine}
        title={p?.name}
        favorite={p?.isFavorite}
        onClose={onClose}
        actions={
          p && (
            <Link className="pp-icon-btn" href={`/places/${p.uid}/edit?from=map`} title={t("common.edit")} aria-label={t("common.edit")}>
              <Icon name="pen" fixedWidth={false} />
            </Link>
          )
        }
      />
      {isLoading || !p ? (
        <Spinner />
      ) : (
        <>
          <div className="pp-meta">
            <VisitStatusChip status={p.visitStatus} />
            <RelationChip status={p.masterRelationStatus} />
            {!p.isActive && <ActiveChip active={false} />}
            <Stars value={p.rating.avg} count={p.rating.count} />
          </div>
          <PhotoTabs key={p.uid} ownLabel={t("place.reviewPhotos")} photos={p.photos} placeId={p.googlePlaceId} lat={p.latitude} lng={p.longitude} name={p.name} />
          <div className="pp-info">
            {(p.categories.length > 0 || p.tags.length > 0) && (
              <InfoRow icon="layers" label={`${t("common.category")} / ${t("nav.tags")}`}>
                <span className="pp-chips">
                  {p.categories.length > 0 && <CategoryChips items={p.categories} />}
                  {p.tags.length > 0 && <TagList items={p.tags} />}
                </span>
              </InfoRow>
            )}
            <InfoRow icon="map-pin" label={t("common.address")}>{p.address ?? "—"}</InfoRow>
            {p.description && <DescQuote text={p.description} />}
            {p.master && (
              <InfoRow icon="link" label="MASTER">
                <Link href={`/masters/${p.master.uid}`} className="pp-a">{p.master.name}</Link>
                {p.master.status === "INACTIVE" && <> <StatusChip tone="neutral">{t("master.inactive")}</StatusChip></>}
              </InfoRow>
            )}
            {p.itineraries.length > 0 && (
              <InfoRow icon="route" label={t("nav.itineraries")}>
                {p.itineraries.map((i, n) => (
                  <span key={i.uid}>
                    {n > 0 && ", "}
                    <Link href={`/itineraries/${i.uid}`} className="pp-a">{i.name}</Link>
                  </span>
                ))}
              </InfoRow>
            )}
            <InfoRow icon="pin" label={t("common.coordinates")}><Coords lat={p.latitude} lng={p.longitude} placeId={p.googlePlaceId} googleLink streetView name={p.name} /></InfoRow>
          </div>

          {/* Kunjungan & riwayat dalam tab agar pop-up tidak memanjang */}
          <div className="pp-section">
            <div className="mini-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === "visits"} className="mini-tab" onClick={() => setTab("visits")}>
                <Icon name="calendar" fixedWidth={false} /> {t("visit.title")} <span className="mini-tab-n">{visitTotal}</span>
              </button>
              {p.history.length > 0 && (
                <button type="button" role="tab" aria-selected={tab === "history"} className="mini-tab" onClick={() => setTab("history")}>
                  <Icon name="history" fixedWidth={false} /> {t("relation.history")} <span className="mini-tab-n">{p.history.length}</span>
                </button>
              )}
            </div>
            {tab === "visits" ? (
              !visitTotal ? (
                <p className="muted t-small" style={{ margin: 0 }}>{t("visit.empty")}</p>
              ) : (
                <ul className="pp-visits pp-timeline">
                  {(vq.data?.rows ?? []).map((v, i) => (
                    <li key={v.uid} className={`pp-tl-${v.context.toLowerCase()}${i === 0 && (vq.data?.page ?? 1) === 1 ? " is-latest" : ""}`}>
                      <div className="pp-visit-top">
                        <b>{fmt.dateTime(v.visitedAt)}</b>
                        <Stars value={v.rating} />
                        {v.context !== "STANDALONE" && <VisitContextChip context={v.context} />}
                      </div>
                      {v.note && <div className="pp-note">{v.note}</div>}
                      <ThumbStrip photos={v.photos} />
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <ul className="pp-history">
                {p.history.map((h) => (
                  <li key={h.uid}>
                    <b>{t(`history.${h.action}`)}</b> <span className="muted t-caption">{fmt.dateTime(h.performedAt)}</span>
                    {h.reason && <div className="pp-note">{h.reason}</div>}
                  </li>
                ))}
              </ul>
            )}
            {tab === "visits" && vq.data && vq.data.total > vq.data.pageSize && (
              <MiniPager page={vq.data.page} pageSize={vq.data.pageSize} total={vq.data.total} onPage={setVisitPage} />
            )}
          </div>

          <div className="pp-actions">
            {p.isActive && (
              <button className="btn btn-primary btn-sm" onClick={() => setVisitOpen(true)}>
                <Icon name="plus" /> {t("visit.add")}
              </button>
            )}
            <Link className="btn btn-secondary btn-sm" href={`/places/${p.uid}?from=map`}>
              <Icon name="circle-info" /> {t("map.viewDetail")}
            </Link>
          </div>

          {visitOpen && (
            <VisitFormModal
              placeUid={p.uid}
              onClose={() => setVisitOpen(false)}
              onSaved={() => {
                void utils.place.get.invalidate({ uid });
                void utils.place.visits.invalidate({ uid });
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
  const colors = useMapColors();
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
    <div className="pp">
      <PopHead kind={t("map.pin")} color={colors.newPin} title={placeName ?? t("map.manualPin")} onClose={onClose} />
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
      {/* Kartu info seperti detail MASTER, hanya baris yang relevan untuk titik baru (alamat, tempat terdekat, koordinat). */}
      <div className="pp-info">
        <InfoRow icon="map-pin" label={t("common.address")}>
          {address ?? (state === "loading" ? <Spinner label={t("map.findingAddress")} /> : <span className="muted">{t("map.addressUnknown")}</span>)}
        </InfoRow>
        {!fromSearch && nearPhotos && (
          <InfoRow icon="circle-info" label={t("map.nearestPlaceLabel")}>
            <span className="muted">{t("map.nearestPlace", { d: nearPhotos.distance })}</span>
          </InfoRow>
        )}
        <InfoRow icon="pin" label={t("common.coordinates")}>
          <Coords lat={sel.lat} lng={sel.lng} placeId={fromSearch ? sel.google!.googlePlaceId : geo?.placeId} googleLink streetView name={placeName} />
        </InfoRow>
      </div>
      {viewer !== "GUEST" && (
        <p className="pp-tip">
          <Icon name="pin" fixedWidth={false} /> {t("map.dragHint")}
        </p>
      )}
      <div className="pp-actions">
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
