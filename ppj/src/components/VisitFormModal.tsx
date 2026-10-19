"use client";

import { useState } from "react";

import { DateField } from "~/components/DateField";
import { PendingPhotoPicker, savePendingPhotos, type PendingKey } from "~/components/PendingPhotoPicker";
import { PhotoGallery, uploadPhotos, type GalleryPhoto } from "~/components/PhotoGallery";
import { Alert, Field, Modal, StarInput, useClosingAnimation, useErrorMessage, useToast } from "~/components/ui";
import { useT, useZonedInput } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { Icon } from "./Icon";

export type VisitInit = {
  uid: string;
  visitedAt: Date | string;
  rating: number | null;
  note: string | null;
};

/** P-06 — mencatat / mengubah VISIT (standalone, planned, atau unexpected). */
export function VisitFormModal({
  placeUid,
  visit,
  itineraryUid,
  itineraryPlaceUid,
  photos,
  onPhotosChanged,
  onClose,
  onSaved,
}: {
  placeUid: string;
  visit?: VisitInit;
  itineraryUid?: string;
  itineraryPlaceUid?: string;
  /** Saat mengubah: foto kunjungan terkini (dikelola langsung, tersimpan seketika). */
  photos?: GalleryPhoto[];
  onPhotosChanged?: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  // Batal & setelah Simpan: modal beranimasi keluar dulu.
  const [closing, closeThen] = useClosingAnimation();
  const zi = useZonedInput();
  const [visitedAt, setVisitedAt] = useState(visit ? zi.toInput(visit.visitedAt) : zi.nowInput());
  const [rating, setRating] = useState<number | null>(visit?.rating ?? null);
  const [note, setNote] = useState(visit?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Map<File | string, string>>(new Map());
  const [primary, setPrimary] = useState<PendingKey | null>(null);
  const maxPerVisit = api.settings.photoRules.useQuery().data?.maxPerVisit;
  const addUrl = api.visit.addExternalPhoto.useMutation();
  const delPhoto = api.visit.deletePhoto.useMutation();
  const capPhoto = api.visit.updatePhotoCaption.useMutation();

  const ok = async (uid: string) => {
    if (files.length || urls.length) {
      // Foto kunjungan diproses setelah kunjungan tersimpan (foto utama lebih dulu).
      const res = await savePendingPhotos({
        files,
        urls,
        captions,
        primary,
        uploadFile: (f, caption) => uploadPhotos("/api/upload/visit-photo", "visitUid", uid, [f], caption),
        addUrl: (url, caption) => addUrl.mutateAsync({ visitUid: uid, url, caption }),
      });
      if (res.fileError) {
        const key = `err.${res.fileError}`;
        toast.push(t(key) !== key ? t(key) : t("photo.uploadFailedAfterSave"), "error");
      }
      if (res.urlFailed) toast.push(t("photo.urlFailedAfterSave", { n: res.urlFailed }), "error");
    }
    toast.push(t("common.saved"), "success");
    onSaved();
    closeThen(onClose);
  };

  const create = api.visit.create.useMutation({
    onSuccess: (r) => void ok(r.uid),
    onError: (e) => setError(errMsg(e)),
  });
  const update = api.visit.update.useMutation({
    onSuccess: () => void ok(visit!.uid),
    onError: (e) => setError(errMsg(e)),
  });
  const busy = create.isPending || update.isPending;

  const submit = () => {
    setError(null);
    const iso = zi.fromInput(visitedAt);
    if (visit) update.mutate({ uid: visit.uid, visitedAt: new Date(iso), rating, note });
    else
      create.mutate({
        placeUid,
        visitedAt: new Date(iso),
        rating,
        note,
        itineraryUid,
        itineraryPlaceUid,
      });
  };

  return (
    // Tampilan senada dengan modal tambah/ubah tempat: kepala dengan ✕, kartu bernomor, aksi menempel di bawah.
    <Modal form narrow title={visit ? t("visit.edit") : t("visit.add")} onClose={onClose} closing={closing}>
      <form
        className="pf vf"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && visitedAt) submit();
        }}
      >
        {error && <Alert kind="error">{error}</Alert>}
        {itineraryUid && !itineraryPlaceUid && !visit && <Alert kind="info">{t("visit.unexpectedNote")}</Alert>}

        <section className="card pf-card">
          <div className="pf-head">
            <h2 className="pf-title"><span className="pf-step">1</span>{t("visit.formDetail")}</h2>
          </div>
          <div className="vf-row">
            <Field label={t("visit.visitedAt")} required htmlFor="v-at" helper={t("visit.visitedAtHint", { tz: zi.tz })}>
              <DateField id="v-at" mode="datetime" max={zi.nowInput()} value={visitedAt} onChange={setVisitedAt} />
            </Field>
            <div className="field vf-rating">
              <span className="label">{t("visit.rating")}</span>
              <StarInput value={rating} onChange={setRating} />
            </div>
          </div>
          <div className="field">
            <div className="pf-label-row">
              <label className="label" htmlFor="v-note">{t("visit.note")}</label>
              <span className="vf-count">{note.length}/2000</span>
            </div>
            <textarea id="v-note" className="textarea" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </section>

        <section className="card pf-card">
          <div className="pf-head">
            <h2 className="pf-title"><span className="pf-step">2</span>{t("visit.photos")}</h2>
            <span className="pf-badge">{t("common.optional")}</span>
          </div>
          {visit && photos ? (
            <PhotoGallery
              fancy
              kind="visit"
              photos={photos}
              canEdit
              camera
              cameraTitle={t("visit.cameraTitle")}
              uploadEndpoint="/api/upload/visit-photo"
              parentField="visitUid"
              parentUid={visit.uid}
              max={maxPerVisit}
              onChanged={() => onPhotosChanged?.()}
              onDelete={(photoUid) => delPhoto.mutateAsync({ photoUid })}
              onCaption={(photoUid, caption) => capPhoto.mutateAsync({ photoUid, caption })}
              onAddUrl={(url, caption) => addUrl.mutateAsync({ visitUid: visit.uid, url, caption })}
            />
          ) : (
            <PendingPhotoPicker
              files={files}
              urls={urls}
              onFiles={setFiles}
              onUrls={setUrls}
              captions={captions}
              onCaptions={setCaptions}
              max={maxPerVisit}
              cameraTitle={t("visit.cameraTitle")}
              primary={primary}
              onPrimary={setPrimary}
            />
          )}
        </section>

        <div className="pf-actions">
          <span className="pf-note"><span className="req" aria-hidden>*</span> {t("visit.requiredNote")}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => closeThen(onClose)} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-primary btn-sm" disabled={busy || !visitedAt}>
            <Icon name="save" /> {busy ? t("common.processing") : t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
