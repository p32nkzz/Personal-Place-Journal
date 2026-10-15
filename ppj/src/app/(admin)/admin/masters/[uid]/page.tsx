"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ActiveChip, MasterStatusChip } from "~/components/chips";
import { MasterForm, type MasterFormValues } from "~/components/MasterForm";
import { PhotoGallery } from "~/components/PhotoGallery";
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Modal,
  Spinner,
  Stars,
  Tabs,
  useErrorMessage,
  useToast,
} from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { Icon } from "~/components/Icon";

type Tab = "data" | "photos" | "refs";

export default function MasterEditPage() {
  const { uid } = useParams<{ uid: string }>();
  const { t } = useT();
  const router = useRouter();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const { data: m, isLoading } = api.master.get.useQuery({ uid });
  const refs = api.review.referencing.useQuery({ masterUid: uid });
  const rules = api.settings.photoRules.useQuery();
  const [tab, setTab] = useState<Tab>("data");
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "delete" | "toggle">(null);
  const [pickOpen, setPickOpen] = useState(false);

  const refresh = () => {
    void utils.master.get.invalidate({ uid });
    void utils.review.referencing.invalidate({ masterUid: uid });
  };
  const onError = (e: unknown) => {
    setError(errMsg(e));
    setConfirm(null);
  };

  const update = api.master.update.useMutation({ onSuccess: () => { refresh(); toast.push(t("common.saved"), "success"); }, onError });
  const setActive = api.master.setActive.useMutation({ onSuccess: () => { refresh(); setConfirm(null); toast.push(t("common.saved"), "success"); }, onError });
  const softDelete = api.master.softDelete.useMutation({ onSuccess: (r) => { toast.push(t("master.deleted", { n: r.unreferred }), "success"); router.push("/admin/masters"); }, onError });
  const setPrimary = api.master.setPrimaryPhoto.useMutation();
  const delPhoto = api.master.deletePhoto.useMutation();
  const capPhoto = api.master.updatePhotoCaption.useMutation();
  const urlPhoto = api.master.addExternalPhoto.useMutation();

  const initial: MasterFormValues | null = useMemo(
    () =>
      m
        ? {
            name: m.name,
            address: m.address,
            description: m.description ?? "",
            latitude: m.latitude,
            longitude: m.longitude,
            googlePlaceId: m.googlePlaceId,
            categoryUids: m.categories.map((c) => c.uid),
          }
        : null,
    [m],
  );

  if (isLoading) return <Spinner />;
  if (!m || !initial) return <EmptyState title={t("master.notFound")} action={<Link href="/admin/masters" className="btn btn-primary">{t("nav.masters")}</Link>} />;

  const deleted = m.status === "DELETED";

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <p style={{ margin: 0 }}><Link href="/admin/masters" className="muted"><Icon name="arrow-left" /> {t("nav.masters")}</Link></p>
          <h1>{m.name}</h1>
          <div className="row" style={{ marginTop: 8 }}>
            <MasterStatusChip status={m.status} />
            <Stars value={m.rating.avg} count={m.rating.count} />
          </div>
        </div>
        {!deleted && (
          <div className="row">
            <Link className="btn btn-secondary" href={`/masters/${m.uid}`}>{t("master.publicView")}</Link>
            {m.status === "ACTIVE" ? (
              <button className="btn btn-secondary" onClick={() => setConfirm("toggle")}><Icon name="circle-xmark" /> {t("place.deactivate")}</button>
            ) : (
              <button className="btn btn-secondary" onClick={() => setActive.mutate({ uid, isActive: true })}><Icon name="circle-check" /> {t("place.activate")}</button>
            )}
            <button className="btn btn-danger-ghost" onClick={() => setConfirm("delete")}><Icon name="trash" /> {t("common.delete")}</button>
          </div>
        )}
      </div>

      {deleted && <div style={{ marginBottom: 16 }}><Alert kind="error">{t("master.deletedNote")}</Alert></div>}
      {m.status === "INACTIVE" && <div style={{ marginBottom: 16 }}><Alert kind="warning">{t("master.inactiveAdminNote")}</Alert></div>}

      <Tabs
        tabs={[
          { id: "data", label: t("master.tabData") },
          { id: "photos", label: `${t("master.tabPhotos")} (${m.photos.length})` },
          { id: "refs", label: `${t("master.tabRefs")} (${refs.data?.length ?? 0})` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "data" && (
        deleted ? (
          <div className="card"><dl className="kv" style={{ margin: 0 }}>
            <dt>{t("common.address")}</dt><dd>{m.address}</dd>
            <dt>{t("common.description")}</dt><dd>{m.description ?? "—"}</dd>
            <dt>{t("common.coordinates")}</dt><dd className="mono">{m.latitude.toFixed(6)}, {m.longitude.toFixed(6)}</dd>
          </dl></div>
        ) : (
          <MasterForm
            initial={initial}
            busy={update.isPending}
            error={error}
            submitLabel={t("common.save")}
            onSubmit={(v) => {
              setError(null);
              update.mutate({ uid, googlePlaceId: v.googlePlaceId, name: v.name, address: v.address, description: v.description, latitude: v.latitude!, longitude: v.longitude!, categoryUids: v.categoryUids });
            }}
          >
            <Alert kind="info">{t("master.editNote")}</Alert>
          </MasterForm>
        )
      )}

      {tab === "photos" && (
        <div className="card stack">
          {error && <Alert kind="error">{error}</Alert>}
          <div className="row-between">
            <h2 className="card-title" style={{ margin: 0 }}>{t("master.tabPhotos")}</h2>
            {!deleted && <button className="btn btn-secondary btn-sm" onClick={() => setPickOpen(true)}>{t("master.photoFromVisit")}</button>}
          </div>
          <PhotoGallery
            photos={m.photos.map((p) => ({ uid: p.uid, url: p.url, caption: p.caption, isPrimary: p.isPrimary, badge: p.originType === "VISIT" ? t("master.photoVisitOrigin") : p.originType === "MY_PLACE" ? t("master.photoMyPlaceOrigin") : undefined }))}
            canEdit={!deleted}
            uploadEndpoint="/api/upload/master-photo"
            parentField="masterUid"
            parentUid={uid}
            max={rules.data?.maxPerMasterPlace}
            onChanged={refresh}
            onSetPrimary={(photoUid) => setPrimary.mutateAsync({ photoUid })}
            onDelete={(photoUid) => delPhoto.mutateAsync({ photoUid })}
            onCaption={(photoUid, caption) => capPhoto.mutateAsync({ photoUid, caption })}
            onAddUrl={(url, caption) => urlPhoto.mutateAsync({ masterUid: uid, url, caption })}
          />
          <p className="helper" style={{ margin: 0 }}>{t("master.photoNote")}</p>
        </div>
      )}

      {tab === "refs" && (
        <div className="card card-flush">
          {!refs.data?.length ? (
            <EmptyState title={t("master.noRefs")} />
          ) : (
            <ul className="list">
              {refs.data.map((r) => (
                <li key={r.uid}>
                  <Link href={`/admin/curation/${r.uid}`} className="list-item">
                    <span className="grow"><span className="title">{r.name}</span><span className="sub" style={{ display: "block" }}>{r.ownerName}</span></span>
                    <ActiveChip active={r.isActive} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="helper" style={{ padding: "0 16px 16px", margin: 0 }}>{t("master.refsNote")}</p>
        </div>
      )}

      {pickOpen && <VisitPhotoPicker masterUid={uid} onClose={() => setPickOpen(false)} onAdded={refresh} />}

      {confirm === "toggle" && (
        <ConfirmDialog
          title={t("master.deactivateTitle")}
          message={<p style={{ margin: 0 }}>{t("master.deactivateText")}</p>}
          busy={setActive.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() => setActive.mutate({ uid, isActive: false })}
        />
      )}
      {confirm === "delete" && (
        <ConfirmDialog
          title={t("master.deleteTitle")}
          message={
            <>
              <p style={{ margin: 0 }}>{t("master.deleteText", { name: m.name })}</p>
              {!!refs.data?.length && <Alert kind="warning">{t("master.deleteUnrefer", { n: refs.data.length })}</Alert>}
              <p className="helper" style={{ margin: 0 }}>{t("master.deleteNoRestore")}</p>
            </>
          }
          danger
          confirmLabel={t("common.delete")}
          busy={softDelete.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() => softDelete.mutate({ uid })}
        />
      )}
    </div>
  );
}

function VisitPhotoPicker({
  masterUid,
  onClose,
  onAdded,
}: {
  masterUid: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { t } = useT();
  const fmt = useFormat();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const [source, setSource] = useState<"VISIT" | "MY_PLACE">("VISIT");
  const visitQ = api.master.visitPhotoCandidates.useQuery({ masterUid }, { enabled: source === "VISIT" });
  const myQ = api.master.myPlacePhotoCandidates.useQuery({ masterUid }, { enabled: source === "MY_PLACE" });
  const { data, isLoading } = source === "VISIT" ? visitQ : myQ;
  const [error, setError] = useState<string | null>(null);
  const cbs = {
    onSuccess: () => {
      toast.push(t("photo.uploaded"), "success");
      onAdded();
    },
    onError: (e: unknown) => setError(errMsg(e)),
  };
  const addVisit = api.master.addFromVisitPhoto.useMutation(cbs);
  const addMy = api.master.addFromMyPlacePhoto.useMutation(cbs);
  const pending = addVisit.isPending || addMy.isPending;
  return (
    <Modal title={t("master.photoFromVisit")} large onClose={onClose} actions={<button className="btn btn-secondary" onClick={onClose}>{t("common.close")}</button>}>
      <div className="stack">
        <div className="row" role="tablist">
          <button role="tab" aria-selected={source === "VISIT"} className={`btn btn-sm ${source === "VISIT" ? "btn-primary" : "btn-secondary"}`} onClick={() => setSource("VISIT")}>{t("master.sourceVisit")}</button>
          <button role="tab" aria-selected={source === "MY_PLACE"} className={`btn btn-sm ${source === "MY_PLACE" ? "btn-primary" : "btn-secondary"}`} onClick={() => setSource("MY_PLACE")}>{t("master.sourceMyPlace")}</button>
        </div>
        <Alert kind="info">{source === "VISIT" ? t("master.photoFromVisitNote") : t("master.photoFromMyPlaceNote")}</Alert>
        {error && <Alert kind="error">{error}</Alert>}
        {isLoading ? <Spinner /> : !data?.length ? <EmptyState title={t("master.noCandidates")} /> : (
          <div className="photo-grid">
            {data.map((p) => (
              <div key={p.uid} className="photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption ?? ""} loading="lazy" />
                <div className="photo-actions">
                  <button className="btn" disabled={pending} onClick={() => (source === "VISIT" ? addVisit.mutate({ masterUid, visitPhotoUid: p.uid }) : addMy.mutate({ masterUid, myPlacePhotoUid: p.uid }))}><Icon name="plus" /> {t("master.useThis")}</button>
                </div>
                <div style={{ position: "absolute", top: 6, left: 6, background: "rgb(15 23 42 / 0.6)", color: "#fff", fontSize: 11, padding: "2px 6px", borderRadius: 4 }}>
                  {p.placeName} · {fmt.date(p.visitedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
