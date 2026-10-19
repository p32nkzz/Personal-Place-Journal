"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ActiveChip, CategoryChips, MasterStatusChip } from "~/components/chips";
import { EditMasterEditor } from "~/components/MasterEditors";
import { PhotoGallery } from "~/components/PhotoGallery";
import { Coords, DescQuote, InfoRow } from "~/components/PlaceInfo";
import { PlaceThumb } from "~/components/PlaceThumb";
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Modal,
  Spinner,
  Stars,
  useErrorMessage,
  useToast,
} from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { Icon, type IconName } from "~/components/Icon";

type Tab = "data" | "photos" | "refs";

export default function MasterEditPage() {
  const { uid } = useParams<{ uid: string }>();
  // Dibuka dari pop-up Peta (?from=map): tautan kembali & tujuan setelah hapus mengarah ke Peta.
  const fromMap = useSearchParams().get("from") === "map";
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

  const setActive = api.master.setActive.useMutation({ onSuccess: () => { refresh(); setConfirm(null); toast.push(t("common.saved"), "success"); }, onError });
  const softDelete = api.master.softDelete.useMutation({ onSuccess: (r) => { toast.push(t("master.deleted", { n: r.unreferred }), "success"); router.push(fromMap ? "/" : "/admin/masters"); }, onError });
  const setPrimary = api.master.setPrimaryPhoto.useMutation();
  const delPhoto = api.master.deletePhoto.useMutation();
  const capPhoto = api.master.updatePhotoCaption.useMutation();
  const urlPhoto = api.master.addExternalPhoto.useMutation();

  if (isLoading) return <Spinner />;
  if (!m) return <EmptyState title={t("master.notFound")} action={<Link href="/admin/masters" className="btn btn-primary">{t("nav.masters")}</Link>} />;

  const deleted = m.status === "DELETED";
  const refCount = refs.data?.length ?? 0;
  const TABS: { id: Tab; icon: IconName; label: string; n?: number }[] = [
    { id: "data", icon: "pen", label: t("master.tabData") },
    { id: "photos", icon: "image", label: t("master.tabPhotos"), n: m.photos.length },
    { id: "refs", icon: "link", label: t("master.tabRefs"), n: refCount },
  ];

  return (
    <div className="container page pd">
      {/* ---------- Kepala: sampul + identitas + aksi (sama dengan detail MY PLACE) ---------- */}
      <section className="pd-hero card">
        <Link
          href={fromMap ? `/?${new URLSearchParams({ master: uid, lat: String(m.latitude), lng: String(m.longitude) })}` : "/admin/masters"}
          className="pd-back"
        >
          <Icon name="arrow-left" fixedWidth={false} /> {fromMap ? t("nav.map") : t("nav.masters")}
        </Link>
        <div className="pd-hero-body">
          <div className="pd-cover">
            <PlaceThumb href={`/admin/masters/${uid}`} name={m.name} lat={m.latitude} lng={m.longitude} photos={m.photos} />
          </div>
          <div className="pd-id">
            {m.categories.length > 0 && (
              <div className="pl-chips">
                <CategoryChips items={m.categories} />
              </div>
            )}
            <h1 className="pd-title">{m.name}</h1>
            <div className="pd-addr">
              <Icon name="map-pin" fixedWidth={false} /> {m.address}
            </div>
            {m.description && <DescQuote text={m.description} side />}
            <div className="pd-meta">
              {/* ACTIVE/INACTIVE sudah terwakili tombol Nonaktifkan/Aktifkan; hanya status Dihapus yang ditampilkan. */}
              {deleted && <MasterStatusChip status={m.status} />}
              <button type="button" className={`vstat ms-ref${refCount ? "" : " is-zero"}`} title={t("master.referencedBy")} onClick={() => setTab("refs")}>
                <span className="vstat-n">
                  <Icon name="link" fixedWidth={false} />
                  <b>{refCount}</b>&nbsp;{t("master.referencedShort")}
                </span>
              </button>
              <Stars value={m.rating.avg} count={m.rating.count} />
            </div>
          </div>
          {!deleted && (
            <div className="pd-actions">
              <Link className="btn btn-secondary btn-sm" href={`/masters/${m.uid}`}>
                <Icon name="eye" /> {t("master.publicView")}
              </Link>
              {m.status === "ACTIVE" ? (
                <button className="btn btn-sm btn-tone btn-tone-off" onClick={() => setConfirm("toggle")}><Icon name="eye-slash" /> {t("place.deactivate")}</button>
              ) : (
                <button className="btn btn-sm btn-tone btn-tone-on" disabled={setActive.isPending} onClick={() => setActive.mutate({ uid, isActive: true })}><Icon name="eye" /> {t("place.activate")}</button>
              )}
              <button className="btn btn-sm btn-tone btn-tone-del" onClick={() => setConfirm("delete")}><Icon name="trash" /> {t("common.delete")}</button>
            </div>
          )}
        </div>
      </section>

      {deleted && <div className="pd-alert"><Alert kind="error">{t("master.deletedNote")}</Alert></div>}
      {m.status === "INACTIVE" && <div className="pd-alert"><Alert kind="warning">{t("master.inactiveAdminNote")}</Alert></div>}

      <div className="mini-tabs md-tabs" role="tablist" aria-label={m.name}>
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className="mini-tab" onClick={() => setTab(x.id)}>
            <Icon name={x.icon} fixedWidth={false} /> {x.label}
            {x.n != null && <span className="mini-tab-n">{x.n}</span>}
          </button>
        ))}
      </div>

      {tab === "data" &&
        (deleted ? (
          <section className="card pd-card">
            <div className="pp-info">
              <InfoRow icon="map-pin" label={t("common.address")}>{m.address}</InfoRow>
              <InfoRow icon="circle-info" label={t("common.description")}>{m.description ?? "—"}</InfoRow>
              <InfoRow icon="pin" label={t("common.coordinates")}><Coords lat={m.latitude} lng={m.longitude} placeId={m.googlePlaceId} googleLink streetView name={m.name} /></InfoRow>
            </div>
          </section>
        ) : (
          // Form ubah dipakai bersama dengan modal di menu Peta.
          <EditMasterEditor uid={uid} />
        ))}

      {tab === "photos" && (
        <section className="card pd-card">
          <div className="pd-card-head">
            <h2><Icon name="image" fixedWidth={false} /> {t("master.tabPhotos")} <span className="mini-tab-n">{m.photos.length}</span></h2>
            {!deleted && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickOpen(true)}>
                <Icon name="plus" /> {t("master.photoFromVisit")}
              </button>
            )}
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          {/* Skema sama dengan foto pantauan MY PLACE: pratinjau Fancybox, bar Unggah · Kamera · Link, validasi format/ukuran. */}
          <PhotoGallery
            fancy
            photos={m.photos.map((p) => ({ uid: p.uid, url: p.url, caption: p.caption, isPrimary: p.isPrimary, badge: p.originType === "VISIT" ? t("master.photoVisitOrigin") : p.originType === "MY_PLACE" ? t("master.photoMyPlaceOrigin") : undefined }))}
            canEdit={!deleted}
            camera={!deleted}
            cameraTitle={t("master.cameraTitle")}
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
          <p className="md-note"><Icon name="circle-info" fixedWidth={false} /> {t("master.photoNote")}</p>
        </section>
      )}

      {tab === "refs" && (
        <section className="card pd-card">
          <div className="pd-card-head">
            <h2><Icon name="link" fixedWidth={false} /> {t("master.tabRefs")} <span className="mini-tab-n">{refCount}</span></h2>
          </div>
          {refs.isLoading ? (
            <Spinner />
          ) : !refs.data?.length ? (
            <EmptyState title={t("master.noRefs")} />
          ) : (
            <ul className="md-ref-list">
              {refs.data.map((r) => (
                <li key={r.uid}>
                  <Link href={`/admin/curation/${r.uid}`} className={`md-ref${r.isActive ? "" : " is-off"}`}>
                    <span className="md-ref-ico"><Icon name="pin" fixedWidth={false} /></span>
                    <span className="md-ref-main">
                      <span className="md-ref-name">{r.name}</span>
                      <span className="md-ref-owner"><Icon name="user" fixedWidth={false} /> {r.ownerName}</span>
                    </span>
                    {!r.isActive && <ActiveChip active={false} />}
                    <Icon name="angle-right" fixedWidth={false} className="md-ref-go" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="md-note"><Icon name="circle-info" fixedWidth={false} /> {t("master.refsNote")}</p>
        </section>
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
