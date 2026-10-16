"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { MapTypeSwitch } from "~/components/map/MapTypeSwitch";
import { ActiveChip, CategoryChips, RelationChip, VisitStatusChip } from "~/components/chips";
import { MapView } from "~/components/map/MapView";
import { useMapColors } from "~/components/map/useMapColors";
import {
  Alert,
  EmptyState,
  Field,
  Modal,
  Spinner,
  StatusChip,
  Stars,
  useErrorMessage,
  useToast,
} from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { Icon } from "~/components/Icon";

/** Detail MY PLACE read-only untuk kurasi (K-07); aksi relasi MASTER oleh Admin. */
export default function CurationDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const { t } = useT();
  const fmt = useFormat();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const { data: p, isLoading } = api.review.placeDetail.useQuery({ uid });
  const mapColors = useMapColors();
  const [modal, setModal] = useState<null | "refer" | "unrefer">(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    void utils.review.placeDetail.invalidate({ uid });
    void utils.review.curation.invalidate();
    void utils.review.queue.invalidate();
  };

  if (isLoading) return <Spinner />;
  if (!p) return <EmptyState title={t("place.notFound")} action={<Link href="/admin/curation" className="btn btn-primary">{t("nav.curation")}</Link>} />;

  const referred = p.masterRelationStatus === "REFERRED";

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <p style={{ margin: 0 }}><Link href="/admin/curation" className="muted"><Icon name="arrow-left" /> {t("nav.curation")}</Link></p>
          <h1>{p.name}</h1>
          <div className="row" style={{ marginTop: 8 }}>
            <VisitStatusChip status={p.visitStatus} />
            <RelationChip status={p.masterRelationStatus} />
            <ActiveChip active={p.isActive} />
          </div>
          <p>{t("curation.owner")}: <b>{p.ownerName}</b></p>
        </div>
        <div className="row">
          <Link className="btn btn-primary" href={`/admin/masters/new?fromPlace=${p.uid}`}>{t("curation.createMaster")}</Link>
          <button className="btn btn-secondary" onClick={() => { setError(null); setModal("refer"); }}>{referred ? t("curation.rerefer") : t("curation.refer")}</button>
          {referred && <button className="btn btn-danger-ghost" onClick={() => { setError(null); setModal("unrefer"); }}>{t("curation.unrefer")}</button>}
        </div>
      </div>

      <Alert kind="info">{t("curation.readOnlyNote")}</Alert>
      <div style={{ height: 16 }} />

      <div className="split">
        <div className="stack">
          <div className="card stack-sm">
            <h2 className="card-title">{t("place.formDetail")}</h2>
            <dl className="kv" style={{ margin: 0 }}>
              <dt>{t("common.address")}</dt><dd>{p.address ?? "—"}</dd>
              <dt>{t("common.description")}</dt><dd style={{ whiteSpace: "pre-wrap" }}>{p.description ?? "—"}</dd>
              <dt>{t("common.category")}</dt><dd><CategoryChips items={p.categories} /></dd>
              <dt>{t("common.coordinates")}</dt><dd className="mono">{p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}</dd>
              <dt>{t("master.rating")}</dt><dd><Stars value={p.rating.avg} count={p.rating.count} /></dd>
              <dt>{t("visit.title")}</dt><dd>{p.visitCount}</dd>
              <dt>{t("nav.itineraries")}</dt><dd>{p.itineraryCount}</dd>
              <dt>MASTER</dt>
              <dd>
                {p.master ? (
                  <>
                    <Link href={`/admin/masters/${p.master.uid}`} style={{ color: "var(--color-primary)", fontWeight: 600 }}>{p.master.name}</Link>{" "}
                    {p.master.status === "INACTIVE" && <StatusChip tone="neutral">{t("master.inactive")}</StatusChip>}
                  </>
                ) : "—"}
              </dd>
            </dl>
          </div>

          <div className="card stack-sm">
            <h2 className="card-title">{t("place.reviewPhotos")}</h2>
            {!p.reviewPhotos.length ? (
              <p className="muted" style={{ margin: 0 }}>{t("photo.none")}</p>
            ) : (
              <div className="photo-grid">
                {p.reviewPhotos.map((ph) => (
                  <div key={ph.uid} className="photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph.url} alt={ph.caption ?? ""} loading="lazy" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card stack-sm">
            <h2 className="card-title">{t("curation.visitPhotos")}</h2>
            {!p.photos.length ? (
              <p className="muted" style={{ margin: 0 }}>{t("photo.none")}</p>
            ) : (
              <div className="photo-grid">
                {p.photos.map((ph) => (
                  <div key={ph.uid} className="photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph.url} alt={ph.caption ?? ""} loading="lazy" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="stack">
          <MapTypeSwitch />
          <div className="map-box-md">
            <MapView markers={[{ id: "p", lat: p.latitude, lng: p.longitude, color: mapColors.mine, title: p.name }]} fit />
          </div>
          <div className="card stack-sm">
            <h2 className="card-title">{t("relation.history")}</h2>
            {!p.history.length ? (
              <p className="muted" style={{ margin: 0 }}>—</p>
            ) : (
              <ul className="timeline">
                {p.history.map((h) => (
                  <li key={h.uid}>
                    <div><b>{t(`history.${h.action}`)}</b> <span className="muted t-caption">{fmt.dateTime(h.performedAt)}</span></div>
                    {(h.fromName ?? h.toName) && <div className="t-small muted">{h.fromName ?? "—"} → {h.toName ?? "—"}</div>}
                    {h.reason && <div className="t-small">{h.reason}</div>}
                    {h.snapshot && <div className="t-caption muted">{t("review.snapshot")}: {h.snapshot.name}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {modal === "refer" && (
        <ReferModal
          placeUid={uid}
          currentMasterName={referred ? (p.master?.name ?? null) : null}
          error={error}
          setError={setError}
          onClose={() => setModal(null)}
          onDone={() => { refresh(); setModal(null); toast.push(t("common.saved"), "success"); }}
        />
      )}

      {modal === "unrefer" && (
        <UnreferModal
          placeUid={uid}
          error={error}
          setError={setError}
          onClose={() => setModal(null)}
          onDone={() => { refresh(); setModal(null); toast.push(t("common.saved"), "success"); }}
          errMsg={errMsg}
        />
      )}
    </div>
  );
}

function ReferModal({
  placeUid,
  currentMasterName,
  error,
  setError,
  onClose,
  onDone,
}: {
  placeUid: string;
  currentMasterName: string | null;
  error: string | null;
  setError: (e: string | null) => void;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const errMsg = useErrorMessage();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState("");
  const [reason, setReason] = useState("");
  const search = api.master.searchActive.useQuery({ q });
  const refer = api.review.refer.useMutation({ onSuccess: onDone, onError: (e) => setError(errMsg(e)) });
  return (
    <Modal
      title={currentMasterName ? t("curation.rerefer") : t("curation.refer")}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" disabled={!sel || refer.isPending} onClick={() => { setError(null); refer.mutate({ placeUid, masterUid: sel, reason }); }}><Icon name="save" /> {t("common.save")}</button>
        </>
      }
    >
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        {currentMasterName && <Alert kind="info">{t("curation.currentMaster", { name: currentMasterName })}</Alert>}
        <input className="input" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("common.search")} />
        <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
          {search.isLoading ? <Spinner /> : !search.data?.length ? <div className="empty" style={{ padding: 16 }}>{t("master.noActive")}</div> : search.data.map((m) => (
            <button key={m.uid} type="button" className="list-item" style={{ width: "100%", border: 0, borderBottom: "1px solid var(--color-border)", background: sel === m.uid ? "var(--color-tint-active)" : "transparent", textAlign: "left", cursor: "pointer", font: "inherit" }} onClick={() => setSel(m.uid)}>
              <span className="grow"><span className="title">{m.name}</span><span className="sub" style={{ display: "block" }}>{m.address}</span></span>
              {sel === m.uid && <Icon name="circle-check" />}
            </button>
          ))}
        </div>
        <Field label={t("review.reason")} htmlFor="rf-r" helper={t("curation.reasonOptional")}>
          <textarea id="rf-r" className="textarea" style={{ minHeight: 64 }} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function UnreferModal({
  placeUid,
  error,
  setError,
  onClose,
  onDone,
  errMsg,
}: {
  placeUid: string;
  error: string | null;
  setError: (e: string | null) => void;
  onClose: () => void;
  onDone: () => void;
  errMsg: (e: unknown) => string;
}) {
  const { t } = useT();
  const [reason, setReason] = useState("");
  const unrefer = api.review.unrefer.useMutation({ onSuccess: onDone, onError: (e) => setError(errMsg(e)) });
  return (
    <Modal
      title={t("curation.unrefer")}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-danger" disabled={unrefer.isPending} onClick={() => { setError(null); unrefer.mutate({ placeUid, reason }); }}>{t("curation.unrefer")}</button>
        </>
      }
    >
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <p style={{ margin: 0 }}>{t("curation.unreferText")}</p>
        <Field label={t("review.reason")} htmlFor="ur-r" helper={t("curation.reasonOptional")}>
          <textarea id="ur-r" className="textarea" style={{ minHeight: 64 }} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
