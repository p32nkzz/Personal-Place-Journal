"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ActiveChip,
  CategoryChips,
  RelationChip,
  TagList,
  VisitContextChip,
  VisitStatusChip,
} from "~/components/chips";
import { MapTypeSwitch } from "~/components/map/MapTypeSwitch";
import { MapView } from "~/components/map/MapView";
import { useMapColors } from "~/components/map/useMapColors";
import { MyPlacePhotos } from "~/components/MyPlacePhotos";
import { Coords, DescQuote, InfoRow } from "~/components/PlaceInfo";
import { PlaceDeleteDialog } from "~/components/PlaceDeleteDialog";
import { PlaceThumb } from "~/components/PlaceThumb";
import { PhotoGallery } from "~/components/PhotoGallery";
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Pagination,
  Spinner,
  StatusChip,
  Stars,
  useErrorMessage,
  useToast,
} from "~/components/ui";
import { VisitFormModal, type VisitInit } from "~/components/VisitFormModal";
import { useFormat, useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { Icon } from "~/components/Icon";

export default function PlaceDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const { t } = useT();
  const fmt = useFormat();
  const router = useRouter();
  const fromMap = useSearchParams().get("from") === "map";
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const { data: p, isLoading } = api.place.get.useQuery({ uid });
  // Kunjungan dipaging di server; ukuran halaman dari Pengaturan (visit.page_size).
  const [visitPage, setVisitPage] = useState(1);
  const vq = api.place.visits.useQuery({ uid, page: visitPage }, { placeholderData: (prev) => prev });
  const rules = api.settings.photoRules.useQuery();
  const mapColors = useMapColors();

  const [visitModal, setVisitModal] = useState<null | { visit?: VisitInit }>(null);
  const [delVisit, setDelVisit] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "submit" | "inactive" | "active" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  // Galeri foto kunjungan yang sedang dibuka (satu per satu) agar halaman tetap ringkas.
  const [openPhotos, setOpenPhotos] = useState<string | null>(null);
  // Lipat/buka section; pilihan diingat per perangkat (localStorage, aman bila tidak tersedia).
  const [col, setCol] = useState<{ visits: boolean; photos: boolean; relation: boolean }>({ visits: false, photos: false, relation: false });
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ppj.place.collapsed");
      if (raw) setCol((c) => ({ ...c, ...(JSON.parse(raw) as object) }));
    } catch {
      // penyimpanan tidak tersedia: tampil terbuka
    }
  }, []);
  const toggle = (k: "visits" | "photos" | "relation") =>
    setCol((c) => {
      const next = { ...c, [k]: !c[k] };
      try {
        localStorage.setItem("ppj.place.collapsed", JSON.stringify(next));
      } catch {
        // abaikan
      }
      return next;
    });

  const refresh = () => {
    void utils.place.get.invalidate({ uid });
    void utils.place.visits.invalidate({ uid });
  };
  const onError = (e: unknown) => {
    setError(errMsg(e));
    setConfirm(null);
  };

  const fav = api.place.setFavorite.useMutation({ onSuccess: refresh, onError });
  const active = api.place.setActive.useMutation({
    onSuccess: () => {
      refresh();
      setConfirm(null);
      toast.push(t("common.saved"), "success");
    },
    onError,
  });
  const submit = api.place.submit.useMutation({
    onSuccess: () => {
      refresh();
      setConfirm(null);
      toast.push(t("place.submitted"), "success");
    },
    onError,
  });
  const delVisitMut = api.visit.delete.useMutation({
    onSuccess: () => {
      refresh();
      setDelVisit(null);
    },
    onError: (e) => {
      setError(errMsg(e));
      setDelVisit(null);
    },
  });
  const delPhoto = api.visit.deletePhoto.useMutation();
  const capPhoto = api.visit.updatePhotoCaption.useMutation();
  const urlPhoto = api.visit.addExternalPhoto.useMutation();

  if (isLoading) return <Spinner />;
  if (!p) return <EmptyState title={t("place.notFound")} action={<Link href="/places" className="btn btn-primary">{t("nav.myPlaces")}</Link>} />;

  const lastRejected = p.history.find((h) => h.action === "REJECTED");

  const visitTotal = vq.data?.total ?? p.visits.length;
  const lastVisit = vq.data ? vq.data.lastVisitedAt : (p.visits[0]?.visitedAt ?? null);
  const pageRows = vq.data?.rows ?? [];
  const backHref = fromMap ? `/?${new URLSearchParams({ my: uid, lat: String(p.latitude), lng: String(p.longitude) })}` : "/places";

  return (
    <div className="container page pd">
      {/* ---------- Kepala: sampul + identitas + aksi ---------- */}
      <section className="pd-hero card">
        <Link href={backHref} className="pd-back">
          <Icon name="arrow-left" fixedWidth={false} /> {fromMap ? t("nav.map") : t("nav.myPlaces")}
        </Link>
        <div className="pd-hero-body">
          <div className="pd-cover">
            <PlaceThumb href={`/places/${uid}`} name={p.name} lat={p.latitude} lng={p.longitude} photos={p.photos} />
          </div>
          <div className="pd-id">
            {(p.categories.length > 0 || p.tags.length > 0) && (
              <div className="pl-chips">
                {p.categories.length > 0 && <CategoryChips items={p.categories} />}
                {p.tags.length > 0 && <TagList items={p.tags} />}
              </div>
            )}
            <h1 className="pd-title">
              {p.name}
              <button
                type="button"
                className={`pd-fav${p.isFavorite ? " is-on" : ""}`}
                onClick={() => fav.mutate({ uid, isFavorite: !p.isFavorite })}
                disabled={fav.isPending}
                aria-pressed={p.isFavorite}
                title={t("place.favorite")}
                aria-label={t("place.favorite")}
              >
                <Icon name={p.isFavorite ? "star" : "star-regular"} fixedWidth={false} />
              </button>
            </h1>
            {p.address && (
              <div className="pd-addr">
                <Icon name="map-pin" fixedWidth={false} /> {p.address}
              </div>
            )}
            {p.description && <DescQuote text={p.description} side />}
            <div className="pd-meta">
              <VisitStatusChip status={p.visitStatus} />
              <RelationChip status={p.masterRelationStatus} />
              {!p.isActive && <ActiveChip active={false} />}
              <Stars value={p.rating.avg} count={p.rating.count} />
            </div>
          </div>
          <div className="pd-actions">
            <Link className="btn btn-secondary btn-sm" href={`/places/${uid}/edit`}>
              <Icon name="pen" /> {t("common.edit")}
            </Link>
            {p.isActive ? (
              <button className="btn btn-sm btn-tone btn-tone-off" onClick={() => setConfirm("inactive")}><Icon name="eye-slash" /> {t("place.deactivate")}</button>
            ) : (
              <button className="btn btn-sm btn-tone btn-tone-on" onClick={() => setConfirm("active")}><Icon name="eye" /> {t("place.activate")}</button>
            )}
          </div>
        </div>
      </section>

      {error && <div style={{ marginBottom: 12 }}><Alert kind="error">{error}</Alert></div>}
      {!p.isActive && <div style={{ marginBottom: 12 }}><Alert kind="warning">{t("place.inactiveNote")}</Alert></div>}

      <div className="pd-grid">
        <div className="pd-main">
          {/* ---------- Kunjungan (timeline) ---------- */}
          <section className="card pd-card">
            <div className="pd-card-head">
              <h2>
                <Icon name="calendar" fixedWidth={false} /> {t("visit.title")}
                <span className={`vstat${visitTotal ? "" : " is-zero"}`} title={lastVisit ? `${t("place.lastVisit")}: ${fmt.dateTime(lastVisit)}` : t("visit.empty")}>
                  <span className="vstat-n">
                    <Icon name="map-pin" fixedWidth={false} />
                    <b>{visitTotal}</b>&nbsp;{t("place.visitsShort")}
                  </span>
                  {lastVisit && (
                    <span className="vstat-last">
                      <Icon name="history" fixedWidth={false} /> {t("place.lastVisitShort")} {fmt.relative(lastVisit)}
                    </span>
                  )}
                </span>
              </h2>
              {p.isActive && (
                <button className="btn btn-secondary btn-sm" onClick={() => setVisitModal({})}><Icon name="plus" /> {t("visit.add")}</button>
              )}
              <button type="button" className="pd-toggle" aria-expanded={!col.visits} onClick={() => toggle("visits")} title={col.visits ? t("common.expand") : t("common.collapse")} aria-label={col.visits ? t("common.expand") : t("common.collapse")}>
                <Icon name={col.visits ? "chevron-down" : "chevron-up"} fixedWidth={false} />
              </button>
            </div>
            <div className="pd-body" hidden={col.visits}>
              {!visitTotal ? (
                <EmptyState title={t("visit.empty")} text={t("visit.emptyHint")} />
              ) : (
                <ul className="pp-visits pp-timeline pd-timeline">
                  {pageRows.map((v, i) => (
                    <li key={v.uid} className={`pp-tl-${v.context.toLowerCase()}${i === 0 && (vq.data?.page ?? 1) === 1 ? " is-latest" : ""}`}>
                      <div className="pd-visit-top">
                        <div className="pp-visit-top">
                          <b>{fmt.dateTime(v.visitedAt)}</b>
                          <Stars value={v.rating} />
                          {v.context !== "STANDALONE" && <VisitContextChip context={v.context} itineraryName={v.itineraryName} />}
                        </div>
                        <span className="pd-visit-actions">
                          <button type="button" className="pp-icon-btn" title={t("common.edit")} aria-label={t("common.edit")} onClick={() => setVisitModal({ visit: v })}>
                            <Icon name="pen" fixedWidth={false} />
                          </button>
                          <button type="button" className="pp-icon-btn is-danger" title={t("common.delete")} aria-label={t("common.delete")} onClick={() => setDelVisit(v.uid)}>
                            <Icon name="trash" fixedWidth={false} />
                          </button>
                        </span>
                      </div>
                      {v.note && <div className="pp-note pd-note">{v.note}</div>}
                      {openPhotos === v.uid ? (
                        <div className="pd-photos">
                          <PhotoGallery
                            fancy
                            kind="visit"
                            photos={v.photos}
                            canEdit
                            uploadEndpoint="/api/upload/visit-photo"
                            parentField="visitUid"
                            parentUid={v.uid}
                            max={rules.data?.maxPerVisit}
                            onChanged={refresh}
                            onDelete={(photoUid) => delPhoto.mutateAsync({ photoUid })}
                            onCaption={(photoUid, caption) => capPhoto.mutateAsync({ photoUid, caption })}
                            onAddUrl={(url, caption) => urlPhoto.mutateAsync({ visitUid: v.uid, url, caption })}
                          />
                        </div>
                      ) : (
                        <PhotoGallery
                          fancy
                          compact
                          kind="visit"
                          photos={v.photos}
                          canEdit
                          onChanged={refresh}
                          onDelete={(photoUid) => delPhoto.mutateAsync({ photoUid })}
                          onCaption={(photoUid, caption) => capPhoto.mutateAsync({ photoUid, caption })}
                        />
                      )}
                      <button type="button" className="pp-link-btn pd-photo-toggle" onClick={() => setOpenPhotos(openPhotos === v.uid ? null : v.uid)}>
                        <Icon name={openPhotos === v.uid ? "chevron-up" : "camera"} fixedWidth={false} />{" "}
                        {openPhotos === v.uid ? t("place.closePhotos") : t("place.manageVisitPhotos", { n: v.photos.length })}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {vq.data && vq.data.total > vq.data.pageSize && (
                <div className="pd-pager">
                  <Pagination
                    page={vq.data.page}
                    limit={vq.data.pageSize}
                    total={vq.data.total}
                    onPage={(n) => {
                      setVisitPage(n);
                      setOpenPhotos(null);
                    }}
                  />
                </div>
              )}
            </div>
          </section>

          {/* ---------- Foto pantauan ---------- */}
          <section className="card pd-card">
            <div className="pd-card-head">
              <h2><Icon name="image" fixedWidth={false} /> {t("place.reviewPhotos")} <span className="mini-tab-n">{p.photos.length}</span></h2>
              <button type="button" className="pd-toggle" aria-expanded={!col.photos} onClick={() => toggle("photos")} title={col.photos ? t("common.expand") : t("common.collapse")} aria-label={col.photos ? t("common.expand") : t("common.collapse")}>
                <Icon name={col.photos ? "chevron-down" : "chevron-up"} fixedWidth={false} />
              </button>
            </div>
            <div className="pd-body" hidden={col.photos}>
              <MyPlacePhotos placeUid={uid} photos={p.photos} onChanged={refresh} />
            </div>
          </section>
        </div>

        <aside className="pd-side">
          {/* ---------- Info & lokasi ---------- */}
          <section className="card pd-card">
            <MapTypeSwitch />
            <div className="map-box-sm pd-map">
              <MapView markers={[{ id: "p", lat: p.latitude, lng: p.longitude, color: p.isFavorite ? mapColors.favorite : mapColors.mine, glyph: p.isFavorite ? "★" : undefined, title: p.name }]} fit />
            </div>
            <div className="pp-info">
              <InfoRow icon="pin" label={t("common.coordinates")}><Coords lat={p.latitude} lng={p.longitude} placeId={p.googlePlaceId} googleLink streetView name={p.name} /></InfoRow>
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
            </div>
          </section>

          {/* ---------- Relasi MASTER ---------- */}
          <section className="card pd-card">
            <div className="pd-card-head">
              <h2><Icon name="link" fixedWidth={false} /> {t("relation.title")}</h2>
              <RelationChip status={p.masterRelationStatus} />
              <button type="button" className="pd-toggle" aria-expanded={!col.relation} onClick={() => toggle("relation")} title={col.relation ? t("common.expand") : t("common.collapse")} aria-label={col.relation ? t("common.expand") : t("common.collapse")}>
                <Icon name={col.relation ? "chevron-down" : "chevron-up"} fixedWidth={false} />
              </button>
            </div>
            <div className="pd-body" hidden={col.relation}>
              {p.master ? (
                <div className="t-small">
                  {t("relation.referencing")}:{" "}
                  <Link href={`/masters/${p.master.uid}`} className="pp-a">{p.master.name}</Link>{" "}
                  {p.master.status === "INACTIVE" && <StatusChip tone="neutral">{t("master.inactive")}</StatusChip>}
                </div>
              ) : (
                <p className="helper" style={{ margin: 0 }}>{t(`relation.hint.${p.masterRelationStatus}`)}</p>
              )}
              {p.masterRelationStatus === "REJECTED" && lastRejected?.reason && (
                <Alert kind="error">
                  <b>{t("relation.rejectReason")}:</b> {lastRejected.reason}
                </Alert>
              )}
              {p.masterRelationStatus === "REVIEW" && <Alert kind="info">{t("relation.reviewNote")}</Alert>}
              {p.canSubmit && (
                <div>
                  <button className="btn btn-primary btn-sm" onClick={() => setConfirm("submit")}>
                    {p.masterRelationStatus === "REJECTED" ? t("relation.resubmit") : t("relation.submit")}
                  </button>
                </div>
              )}
              {!p.isActive && (p.masterRelationStatus === "UNREFERRED" || p.masterRelationStatus === "REJECTED") && (
                <p className="helper" style={{ margin: 0 }}>{t("relation.inactiveCannotSubmit")}</p>
              )}
              {p.history.length > 0 && (
                <ul className="pp-history pd-history">
                  {p.history.map((h) => (
                    <li key={h.uid}>
                      <b>{t(`history.${h.action}`)}</b> <span className="muted t-caption">{fmt.dateTime(h.performedAt)}</span>
                      {(h.fromName ?? h.toName) && <div className="t-small muted">{h.fromName ?? "—"} → {h.toName ?? "—"}</div>}
                      {h.reason && <div className="pp-note">{h.reason}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Hapus di bagian paling bawah agar tidak mudah salah klik */}
          <section className="pd-manage">
            <button className="btn btn-danger btn-sm" onClick={() => setConfirm("delete")}><Icon name="trash" /> {t("place.deleteThis")}</button>
          </section>
        </aside>
      </div>

      {visitModal && (
        <VisitFormModal
          placeUid={uid}
          visit={visitModal.visit}
          onClose={() => setVisitModal(null)}
          onSaved={refresh}
        />
      )}

      {delVisit && (
        <ConfirmDialog
          title={t("visit.deleteTitle")}
          message={<p style={{ margin: 0 }}>{t("visit.deleteText")}</p>}
          danger
          confirmLabel={t("common.delete")}
          busy={delVisitMut.isPending}
          onClose={() => setDelVisit(null)}
          onConfirm={() => delVisitMut.mutate({ uid: delVisit })}
        />
      )}

      {confirm === "submit" && (
        <ConfirmDialog
          title={t("relation.submitTitle")}
          message={<p style={{ margin: 0 }}>{t("relation.submitText")}</p>}
          busy={submit.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() => submit.mutate({ uid })}
        />
      )}
      {confirm === "inactive" && (
        <ConfirmDialog
          title={t("place.deactivateTitle")}
          message={<p style={{ margin: 0 }}>{t("place.deactivateText")}</p>}
          busy={active.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() => active.mutate({ uid, isActive: false })}
        />
      )}
      {confirm === "active" && (
        <ConfirmDialog
          title={t("place.activate")}
          busy={active.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() => active.mutate({ uid, isActive: true })}
        />
      )}

      {confirm === "delete" && (
        <PlaceDeleteDialog
          uid={uid}
          isActive={p.isActive}
          onClose={() => setConfirm(null)}
          onDeleted={() => router.push("/places")}
          onSuggestDeactivate={() => setConfirm("inactive")}
        />
      )}
    </div>
  );
}
