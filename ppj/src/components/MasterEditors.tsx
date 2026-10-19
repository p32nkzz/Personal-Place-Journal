"use client";

import { useMemo, useState } from "react";

import { MasterForm, type MasterFormValues } from "~/components/MasterForm";
import { PendingPhotoPicker, savePendingPhotos, type PendingKey } from "~/components/PendingPhotoPicker";
import { uploadPhotos } from "~/components/PhotoGallery";
import type { PlacePreset, SavedPlace } from "~/components/PlaceEditors";
import { Alert, EmptyState, Spinner, useErrorMessage, useToast } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

/**
 * Editor tambah & ubah MASTER PLACE (Admin) yang dipakai bersama oleh halaman
 * (/admin/masters/new, tab Data di /admin/masters/[uid]) dan modal di menu Peta.
 * Perubahan aturan form cukup dilakukan di sini; tujuan Batal/Simpan ditentukan pemanggil.
 */

export function NewMasterEditor({
  preset,
  fromPlace,
  onCancel,
  onSaved,
  mapZoom,
}: {
  /** Zoom Peta utama (modal di Peta). */
  mapZoom?: number;
  preset?: PlacePreset;
  /** P-04 — draft disalin dari MY PLACE sumber (Kurasi). */
  fromPlace?: string | null;
  onCancel: (v: MasterFormValues) => void;
  /** Dipanggil setelah MASTER & fotonya tersimpan serta data disegarkan. */
  onSaved: (r: SavedPlace) => void | Promise<void>;
}) {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const [error, setError] = useState<string | null>(null);
  const [referenceSource, setReferenceSource] = useState(false);
  // Foto MASTER langsung dari form tambah (skema sama dengan Foto Pantauan MY PLACE); diunggah setelah MASTER tersimpan.
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Map<File | string, string>>(new Map());
  const [primary, setPrimary] = useState<PendingKey | null>(null);
  const photoMax = api.settings.photoRules.useQuery().data?.maxPerMasterPlace;
  const addPhotoUrl = api.master.addExternalPhoto.useMutation();
  const draft = api.review.draft.useQuery({ placeUid: fromPlace ?? "", source: "current" }, { enabled: !!fromPlace });

  const { lat, lng, name, address, gid } = preset ?? {};
  const initial: MasterFormValues = useMemo(() => {
    if (fromPlace && draft.data)
      return {
        name: draft.data.name,
        address: draft.data.address,
        description: draft.data.description ?? "",
        latitude: draft.data.latitude,
        longitude: draft.data.longitude,
        googlePlaceId: draft.data.googlePlaceId,
        categoryUids: draft.data.categoryUids,
      };
    return {
      name: name ?? "",
      address: address ?? "",
      description: "",
      latitude: lat ?? null,
      longitude: lng ?? null,
      googlePlaceId: gid ?? null,
      categoryUids: [],
    };
  }, [fromPlace, draft.data, lat, lng, name, address, gid]);

  const create = api.master.create.useMutation({
    onSuccess: async (r, vars) => {
      toast.push(t("common.saved"), "success");
      if (files.length || urls.length) {
        // Foto MASTER diproses setelah MASTER tersimpan (foto utama lebih dulu); kegagalan tidak membatalkan penyimpanan.
        const res = await savePendingPhotos({
          files,
          urls,
          captions,
          primary,
          uploadFile: (f, caption) => uploadPhotos("/api/upload/master-photo", "masterUid", r.uid, [f], caption),
          addUrl: (url, caption) => addPhotoUrl.mutateAsync({ masterUid: r.uid, url, caption }),
        });
        if (res.fileError) {
          const key = `err.${res.fileError}`;
          toast.push(t(key) !== key ? t(key) : t("master.photoUploadFailedAfterSave"), "error");
        }
        if (res.urlFailed) toast.push(t("master.photoUrlFailedAfterSave", { n: res.urlFailed }), "error");
      }
      await utils.master.invalidate();
      await onSaved({ uid: r.uid, latitude: vars.latitude, longitude: vars.longitude });
    },
    onError: (e) => setError(errMsg(e)),
  });

  if (fromPlace && draft.isLoading) return <Spinner />;

  return (
    <MasterForm
      initial={initial}
      mapZoom={mapZoom}
      busy={create.isPending}
      photoSlot={<PendingPhotoPicker files={files} urls={urls} onFiles={setFiles} onUrls={setUrls} captions={captions} onCaptions={setCaptions} max={photoMax} cameraTitle={t("master.cameraTitle")} primary={primary} onPrimary={setPrimary} />}
      pickedGoogleUrls={urls}
      onPickGooglePhoto={(u) => setUrls((x) => (x.includes(u) || (photoMax != null && files.length + x.length >= photoMax) ? x : [...x, u]))}
      error={error}
      submitLabel={t("common.save")}
      onCancel={onCancel}
      onSubmit={(v) => {
        setError(null);
        create.mutate({
          googlePlaceId: v.googlePlaceId,
          name: v.name,
          address: v.address,
          description: v.description,
          latitude: v.latitude!,
          longitude: v.longitude!,
          categoryUids: v.categoryUids,
          sourcePlaceUid: fromPlace ?? undefined,
          referenceSource: !!fromPlace && referenceSource,
        });
      }}
    >
      {fromPlace && (
        <div className="card stack-sm">
          <Alert kind="info">
            {t("master.sourceNote")}{" "}
            {draft.data?.masterRelationStatus === "REFERRED" && <b>{t("master.sourceReferredNote")}</b>}
          </Alert>
          <label className="check">
            <input type="checkbox" checked={referenceSource} onChange={(e) => setReferenceSource(e.target.checked)} />
            <span>{t("master.referenceSource")}</span>
          </label>
        </div>
      )}
    </MasterForm>
  );
}

export function EditMasterEditor({
  uid,
  onCancel,
  onSaved,
  mapZoom,
}: {
  uid: string;
  /** Zoom Peta utama (modal di Peta). */
  mapZoom?: number;
  /** Tombol Batal (modal); halaman detail tidak memakai Batal. */
  onCancel?: () => void;
  onSaved?: (r: SavedPlace) => void | Promise<void>;
}) {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const [error, setError] = useState<string | null>(null);
  const { data: m, isLoading } = api.master.get.useQuery({ uid });

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

  const update = api.master.update.useMutation({
    onSuccess: async (_r, vars) => {
      await utils.master.invalidate();
      void utils.review.referencing.invalidate({ masterUid: uid });
      toast.push(t("common.saved"), "success");
      await onSaved?.({ uid, latitude: vars.latitude, longitude: vars.longitude });
    },
    onError: (e) => setError(errMsg(e)),
  });

  if (isLoading) return <Spinner />;
  if (!m || !initial) return <EmptyState title={t("master.notFound")} />;

  return (
    <MasterForm
      initial={initial}
      mapZoom={mapZoom}
      followMap={{ name: false, address: true }}
      busy={update.isPending}
      error={error}
      submitLabel={t("common.save")}
      onCancel={onCancel ? () => onCancel() : undefined}
      onSubmit={(v) => {
        setError(null);
        update.mutate({ uid, googlePlaceId: v.googlePlaceId, name: v.name, address: v.address, description: v.description, latitude: v.latitude!, longitude: v.longitude!, categoryUids: v.categoryUids });
      }}
    >
      <Alert kind="info">{t("master.editNote")}</Alert>
    </MasterForm>
  );
}
