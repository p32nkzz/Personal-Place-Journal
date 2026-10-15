"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import {
  ActiveChip,
  CategoryChips,
  RelationChip,
  TagList,
  VisitStatusChip,
} from "~/components/chips";
import { MapView } from "~/components/map/MapView";
import { useMapColors } from "~/components/map/useMapColors";
import { PhotoGallery } from "~/components/PhotoGallery";
import {
  Alert,
  ConfirmDialog,
  EmptyState,
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
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const { data: p, isLoading } = api.place.get.useQuery({ uid });
  const rules = api.settings.photoRules.useQuery();
  const mapColors = useMapColors();

  const [visitModal, setVisitModal] = useState<null | { visit?: VisitInit }>(null);
  const [delVisit, setDelVisit] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "submit" | "inactive" | "active" | "delete">(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => void utils.place.get.invalidate({ uid });
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
  const preview = api.place.deletePreview.useQuery({ uid }, { enabled: confirm === "delete" });
  const del = api.place.delete.useMutation({
    onSuccess: async () => {
      await utils.place.list.invalidate();
      toast.push(t("common.deleted"), "success");
      router.push("/places");
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
  const setPrimary = api.visit.setPrimaryPhoto.useMutation();
  const delPhoto = api.visit.deletePhoto.useMutation();
  const capPhoto = api.visit.updatePhotoCaption.useMutation();
  const urlPhoto = api.visit.addExternalPhoto.useMutation();

  if (isLoading) return <Spinner />;
  if (!p) return <EmptyState title={t("place.notFound")} action={<Link href="/places" className="btn btn-primary">{t("nav.myPlaces")}</Link>} />;

  const lastRejected = p.history.find((h) => h.action === "REJECTED");

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <p style={{ margin: 0 }}><Link href="/places" className="muted"><Icon name="arrow-left" /> {t("nav.myPlaces")}</Link></p>
          <h1>{p.isFavorite && <Icon name="star" style={{ color: "#f59e0b" }} />} {p.name}</h1>
          <div className="row" style={{ marginTop: 8 }}>
            <VisitStatusChip status={p.visitStatus} />
            <RelationChip status={p.masterRelationStatus} />
            <ActiveChip active={p.isActive} />
          </div>
        </div>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => fav.mutate({ uid, isFavorite: !p.isFavorite })} disabled={fav.isPending} aria-pressed={p.isFavorite}>
            <Icon name={p.isFavorite ? "star" : "star-regular"} /> {t("place.favorite")}
          </button>
          <Link className="btn btn-secondary" href={`/places/${uid}/edit`}><Icon name="pen" /> {t("common.edit")}</Link>
          {p.isActive && (
            <button className="btn btn-primary" onClick={() => setVisitModal({})}><Icon name="plus" /> {t("visit.add")}</button>
          )}
        </div>
      </div>

      {error && <div style={{ marginBottom: 16 }}><Alert kind="error">{error}</Alert></div>}
      {!p.isActive && <div style={{ marginBottom: 16 }}><Alert kind="warning">{t("place.inactiveNote")}</Alert></div>}

      <div className="split">
        <div className="stack">
          <div className="card stack-sm">
            <h2 className="card-title">{t("place.formDetail")}</h2>
            <dl className="kv" style={{ margin: 0 }}>
              <dt>{t("common.address")}</dt>
              <dd>{p.address ?? "—"}</dd>
              <dt>{t("common.description")}</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>{p.description ?? "—"}</dd>
              <dt>{t("common.category")}</dt>
              <dd>
                <CategoryChips items={p.categories} />
                {p.master && <div className="helper">{t("place.categoryFromMaster")}</div>}
              </dd>
              <dt>{t("nav.tags")}</dt>
              <dd>{p.tags.length ? <TagList items={p.tags} /> : "—"}</dd>
              <dt>{t("common.coordinates")}</dt>
              <dd className="mono">{p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}</dd>
              <dt>{t("master.rating")}</dt>
              <dd><Stars value={p.rating.avg} count={p.rating.count} /></dd>
            </dl>
          </div>

          <div className="card">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <h2 className="card-title" style={{ margin: 0 }}>{t("visit.title")} ({p.visits.length})</h2>
              {p.isActive && <button className="btn btn-secondary btn-sm" onClick={() => setVisitModal({})}><Icon name="plus" /> {t("visit.add")}</button>}
            </div>
            {!p.visits.length ? (
              <EmptyState title={t("visit.empty")} text={t("visit.emptyHint")} />
            ) : (
              <ul className="timeline">
                {p.visits.map((v) => (
                  <li key={v.uid}>
                    <div className="row-between">
                      <div className="stack-sm" style={{ gap: 4 }}>
                        <b>{fmt.dateTime(v.visitedAt)}</b>
                        <div className="row">
                          <Stars value={v.rating} />
                          {v.context === "PLANNED" && <StatusChip tone="info">{t("visit.planned")}{v.itineraryName ? `: ${v.itineraryName}` : ""}</StatusChip>}
                          {v.context === "UNEXPECTED" && <StatusChip tone="warning">{t("visit.unexpected")}{v.itineraryName ? `: ${v.itineraryName}` : ""}</StatusChip>}
                        </div>
                      </div>
                      <div className="row">
                        <button className="btn btn-ghost btn-sm" onClick={() => setVisitModal({ visit: v })}><Icon name="pen" /> {t("common.edit")}</button>
                        <button className="btn btn-danger-ghost btn-sm" onClick={() => setDelVisit(v.uid)}><Icon name="trash" /> {t("common.delete")}</button>
                      </div>
                    </div>
                    {v.note && <p style={{ margin: "6px 0", whiteSpace: "pre-wrap" }}>{v.note}</p>}
                    <PhotoGallery
                      photos={v.photos}
                      canEdit
                      uploadEndpoint="/api/upload/visit-photo"
                      parentField="visitUid"
                      parentUid={v.uid}
                      max={rules.data?.maxPerVisit}
                      onChanged={refresh}
                      onSetPrimary={(photoUid) => setPrimary.mutateAsync({ photoUid })}
                      onDelete={(photoUid) => delPhoto.mutateAsync({ photoUid })}
                      onCaption={(photoUid, caption) => capPhoto.mutateAsync({ photoUid, caption })}
                      onAddUrl={(url, caption) => urlPhoto.mutateAsync({ visitUid: v.uid, url, caption })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="map-box-md">
            <MapView markers={[{ id: "p", lat: p.latitude, lng: p.longitude, color: p.isFavorite ? mapColors.favorite : mapColors.mine, glyph: p.isFavorite ? "★" : undefined, title: p.name }]} fit />
          </div>

          <div className="card stack-sm">
            <h2 className="card-title">{t("relation.title")}</h2>
            <div className="row"><RelationChip status={p.masterRelationStatus} /></div>
            {p.master ? (
              <div className="t-small">
                {t("relation.referencing")}:{" "}
                <Link href={`/masters/${p.master.uid}`} style={{ color: "var(--color-primary)", fontWeight: 600 }}>{p.master.name}</Link>{" "}
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
              <>
                <hr className="divider" />
                <h3 className="t-overline muted">{t("relation.history")}</h3>
                <ul className="timeline">
                  {p.history.map((h) => (
                    <li key={h.uid}>
                      <div><b>{t(`history.${h.action}`)}</b> <span className="muted t-caption">{fmt.dateTime(h.performedAt)}</span></div>
                      {(h.fromName ?? h.toName) && (
                        <div className="t-small muted">{h.fromName ?? "—"} → {h.toName ?? "—"}</div>
                      )}
                      {h.reason && <div className="t-small">{h.reason}</div>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {p.itineraries.length > 0 && (
            <div className="card stack-sm">
              <h2 className="card-title">{t("nav.itineraries")}</h2>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {p.itineraries.map((i) => (
                  <li key={i.uid}><Link href={`/itineraries/${i.uid}`} style={{ color: "var(--color-primary)" }}>{i.name}</Link></li>
                ))}
              </ul>
            </div>
          )}

          <div className="card stack-sm">
            <h2 className="card-title">{t("place.manage")}</h2>
            <div className="row">
              {p.isActive ? (
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirm("inactive")}><Icon name="circle-xmark" /> {t("place.deactivate")}</button>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirm("active")}><Icon name="circle-check" /> {t("place.activate")}</button>
              )}
              <button className="btn btn-danger-ghost btn-sm" onClick={() => { setConsent(false); setConfirm("delete"); }}><Icon name="trash" /> {t("common.delete")}</button>
            </div>
          </div>
        </div>
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
        <ConfirmDialog
          title={t("place.deleteTitle")}
          danger
          confirmLabel={t("common.delete")}
          busy={del.isPending}
          disabled={!preview.data || (preview.data.needsConsent && !consent)}
          onClose={() => setConfirm(null)}
          onConfirm={() => del.mutate({ uid, consent })}
          message={
            !preview.data ? (
              <Spinner />
            ) : (
              <>
                <p style={{ margin: 0 }}>{t("place.deleteText", { visits: preview.data.visits, photos: preview.data.visitPhotos })}</p>
                {preview.data.needsConsent && (
                  <>
                    <Alert kind="warning">
                      <div>{t("place.deleteConsentWhy")}</div>
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                        <li>{t("place.deleteVisits", { n: preview.data.visits })}</li>
                        <li>{t("place.deletePhotos", { n: preview.data.visitPhotos })}</li>
                        <li>{t("place.deleteHistories", { n: preview.data.histories })}</li>
                        {preview.data.itineraryPlaces.length > 0 && (
                          <li>{t("place.deleteItineraries", { names: preview.data.itineraryPlaces.join(", ") })}</li>
                        )}
                      </ul>
                    </Alert>
                    <label className="check">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                      <span>{t("place.deleteConsent")}</span>
                    </label>
                    {!consent && (
                      <div className="helper">
                        {t("place.deleteSuggestInactive")}{" "}
                        {p.isActive && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setConfirm("inactive")}><Icon name="circle-xmark" /> {t("place.deactivate")}</button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )
          }
        />
      )}
    </div>
  );
}
