"use client";

import { useState } from "react";

import { PendingPhotoPicker } from "~/components/PendingPhotoPicker";
import { uploadPhotos } from "~/components/PhotoGallery";
import { Alert, Field, Modal, StarInput, useErrorMessage, useToast } from "~/components/ui";
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
  onClose,
  onSaved,
}: {
  placeUid: string;
  visit?: VisitInit;
  itineraryUid?: string;
  itineraryPlaceUid?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const zi = useZonedInput();
  const [visitedAt, setVisitedAt] = useState(visit ? zi.toInput(visit.visitedAt) : zi.nowInput());
  const [rating, setRating] = useState<number | null>(visit?.rating ?? null);
  const [note, setNote] = useState(visit?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Map<File | string, string>>(new Map());
  const maxPerVisit = api.settings.photoRules.useQuery().data?.maxPerVisit;
  const addUrl = api.visit.addExternalPhoto.useMutation();

  const ok = async (uid: string) => {
    if (files.length) {
      try {
        // Berkas berketerangan diunggah satu per satu (keterangan per foto); sisanya sekaligus.
        const plain = files.filter((f) => !captions.get(f));
        for (const f of files.filter((x) => captions.get(x))) await uploadPhotos("/api/upload/visit-photo", "visitUid", uid, [f], captions.get(f));
        if (plain.length) await uploadPhotos("/api/upload/visit-photo", "visitUid", uid, plain);
      } catch (e) {
        const key = `err.${(e as Error).message}`;
        toast.push(t(key) !== key ? t(key) : t("photo.uploadFailedAfterSave"), "error");
      }
    }
    if (urls.length) {
      let failed = 0;
      for (const url of urls) {
        try {
          await addUrl.mutateAsync({ visitUid: uid, url, caption: captions.get(url) || undefined });
        } catch {
          failed++;
        }
      }
      if (failed) toast.push(t("photo.urlFailedAfterSave", { n: failed }), "error");
    }
    toast.push(t("common.saved"), "success");
    onSaved();
    onClose();
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
    <Modal
      title={visit ? t("visit.edit") : t("visit.add")}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !visitedAt}>
            <Icon name="save" /> {busy ? t("common.processing") : t("common.save")}
          </button>
        </>
      }
    >
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        {itineraryUid && !itineraryPlaceUid && !visit && <Alert kind="info">{t("visit.unexpectedNote")}</Alert>}
        <Field label={t("visit.visitedAt")} required htmlFor="v-at" helper={t("visit.visitedAtHint", { tz: zi.tz })}>
          <input id="v-at" className="input" type="datetime-local" max={zi.nowInput()} value={visitedAt} onChange={(e) => setVisitedAt(e.target.value)} />
        </Field>
        <Field label={t("visit.rating")}>
          <StarInput value={rating} onChange={setRating} />
        </Field>
        <Field label={t("visit.note")} htmlFor="v-note" helper={t("common.max2000")}>
          <textarea id="v-note" className="textarea" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {!visit && (
          <div className="field">
            <span className="label">{t("visit.photos")}</span>
            <PendingPhotoPicker
              files={files}
              urls={urls}
              onFiles={setFiles}
              onUrls={setUrls}
              captions={captions}
              onCaptions={setCaptions}
              max={maxPerVisit}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
