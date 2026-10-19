"use client";

import { useMemo, useState } from "react";

import { MyPlacePhotos } from "~/components/MyPlacePhotos";
import { PendingPhotoPicker, savePendingPhotos, type PendingKey } from "~/components/PendingPhotoPicker";
import { uploadPhotos } from "~/components/PhotoGallery";
import { PlaceForm, type PlaceFormValues } from "~/components/PlaceForm";
import { Alert, EmptyState, Spinner, useErrorMessage, useToast } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

/**
 * Editor tambah & ubah MY PLACE yang dipakai bersama oleh halaman (/places/new, /places/[uid]/edit)
 * dan modal di menu Peta. Perubahan aturan form cukup dilakukan di sini agar keduanya tetap seragam;
 * hanya tujuan Batal/Simpan yang ditentukan pemanggil.
 */

/** Titik awal form tambah (pin peta / hasil pencarian Google). */
export type PlacePreset = {
  lat?: number | null;
  lng?: number | null;
  name?: string | null;
  address?: string | null;
  gid?: string | null;
};

export type SavedPlace = { uid: string; latitude: number; longitude: number };

export function NewPlaceEditor({
  masterUid,
  preset,
  onCancel,
  cancelHref,
  onSaved,
  mapZoom,
}: {
  /** Zoom Peta utama (modal di Peta). */
  mapZoom?: number;
  /** Disalin dari MASTER (tombol "Simpan ke Tempat Saya"). */
  masterUid?: string | null;
  preset?: PlacePreset;
  /** Tujuan Batal: aksi (modal) atau tautan (halaman). */
  onCancel?: (v: PlaceFormValues) => void;
  cancelHref?: string | ((v: PlaceFormValues) => string);
  /** Dipanggil setelah MY PLACE & fotonya tersimpan serta data disegarkan. */
  onSaved: (r: SavedPlace) => void | Promise<void>;
}) {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Map<File | string, string>>(new Map());
  const [primary, setPrimary] = useState<PendingKey | null>(null);
  const addPhotoUrl = api.place.addExternalPhoto.useMutation();
  const photoMax = api.settings.photoRules.useQuery().data?.maxPerMyPlace;
  const master = api.master.get.useQuery({ uid: masterUid ?? "" }, { enabled: !!masterUid });

  const { lat, lng, name, address, gid } = preset ?? {};
  const initial: PlaceFormValues = useMemo(() => {
    if (masterUid && master.data) {
      return {
        name: master.data.name,
        address: master.data.address,
        description: master.data.description ?? "",
        latitude: master.data.latitude,
        longitude: master.data.longitude,
        googlePlaceId: master.data.googlePlaceId,
        categoryUids: master.data.categories.filter((c) => c.isActive).map((c) => c.uid),
        tagUids: [],
        isFavorite: false,
      };
    }
    return {
      name: name ?? "",
      address: address ?? "",
      description: "",
      latitude: lat ?? null,
      longitude: lng ?? null,
      googlePlaceId: gid ?? null,
      categoryUids: [],
      tagUids: [],
      isFavorite: false,
    };
  }, [masterUid, master.data, lat, lng, name, address, gid]);

  const create = api.place.create.useMutation({
    onSuccess: async (r, vars) => {
      toast.push(t("common.saved"), "success");
      if (files.length || urls.length) {
        // Foto pantauan diproses setelah MY PLACE tersimpan (foto utama lebih dulu); kegagalan tidak membatalkan penyimpanan.
        const res = await savePendingPhotos({
          files,
          urls,
          captions,
          primary,
          uploadFile: (f, caption) => uploadPhotos("/api/upload/my-place-photo", "placeUid", r.uid, [f], caption),
          addUrl: (url, caption) => addPhotoUrl.mutateAsync({ placeUid: r.uid, url, caption }),
        });
        if (res.fileError) {
          const key = `err.${res.fileError}`;
          toast.push(t(key) !== key ? t(key) : t("photo.uploadFailedAfterSave"), "error");
        }
        if (res.urlFailed) toast.push(t("photo.urlFailedAfterSave", { n: res.urlFailed }), "error");
      }
      // Segarkan daftar MY PLACE (peta, daftar, opsi) setelah foto terunggah agar tempat baru langsung muncul di tujuan.
      await utils.place.invalidate();
      await onSaved({ uid: r.uid, latitude: vars.latitude, longitude: vars.longitude });
    },
    onError: (e) => setError(errMsg(e)),
  });

  if (masterUid && master.isLoading) return <Spinner />;

  return (
    <PlaceForm
      initial={initial}
      masterUid={master.data ? masterUid : null}
      masterName={master.data?.name}
      submitLabel={t("common.save")}
      busy={create.isPending}
      error={error}
      onCancel={onCancel}
      cancelHref={cancelHref}
      mapZoom={mapZoom}
      showFavorite
      photoSlot={<PendingPhotoPicker files={files} urls={urls} onFiles={setFiles} onUrls={setUrls} captions={captions} onCaptions={setCaptions} primary={primary} onPrimary={setPrimary} />}
      pickedGoogleUrls={urls}
      onPickGooglePhoto={(u) => setUrls((x) => (x.includes(u) || (photoMax != null && files.length + x.length >= photoMax) ? x : [...x, u]))}
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
          tagUids: v.tagUids,
          isFavorite: v.isFavorite,
          masterUid: master.data ? masterUid : null,
        });
      }}
    />
  );
}

export function EditPlaceEditor({
  uid,
  onCancel,
  cancelHref,
  onSaved,
  mapZoom,
}: {
  uid: string;
  /** Zoom Peta utama (modal di Peta). */
  mapZoom?: number;
  /** Tujuan Batal: aksi (modal) atau tautan (halaman); tautan menerima koordinat tersimpan. */
  onCancel?: () => void;
  cancelHref?: (saved: { latitude: number; longitude: number }) => string;
  /** Dipanggil setelah perubahan tersimpan dan data disegarkan. */
  onSaved: (r: SavedPlace) => void | Promise<void>;
}) {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const [error, setError] = useState<string | null>(null);
  const { data: p, isLoading } = api.place.get.useQuery({ uid });

  const initial: PlaceFormValues | null = useMemo(
    () =>
      p
        ? {
            name: p.name,
            address: p.address ?? "",
            description: p.description ?? "",
            latitude: p.latitude,
            longitude: p.longitude,
            googlePlaceId: p.googlePlaceId,
            // Edit memakai kategori tersimpan milik MY PLACE (bukan effective category).
            categoryUids: p.storedCategories.map((c) => c.uid),
            tagUids: p.tags.map((x) => x.uid),
            isFavorite: p.isFavorite,
          }
        : null,
    [p],
  );

  const addPhotoUrl = api.place.addExternalPhoto.useMutation({
    onSuccess: () => void utils.place.get.invalidate({ uid }),
    onError: (e) => setError(errMsg(e)),
  });
  const update = api.place.update.useMutation({
    onSuccess: async (_r, vars) => {
      await utils.place.invalidate();
      toast.push(t("common.saved"), "success");
      await onSaved({ uid, latitude: vars.latitude, longitude: vars.longitude });
    },
    onError: (e) => setError(errMsg(e)),
  });

  if (isLoading) return <Spinner />;
  if (!p || !initial) return <EmptyState title={t("place.notFound")} />;

  return (
    <>
      {p.masterRelationStatus === "REVIEW" && <Alert kind="info">{t("place.editDuringReview")}</Alert>}
      <PlaceForm
        initial={initial}
        masterUid={p.master?.uid ?? null}
        masterName={p.master?.name}
        excludeUid={uid}
        mapZoom={mapZoom}
        submitLabel={t("common.save")}
        busy={update.isPending}
        error={error}
        onCancel={onCancel}
        cancelHref={cancelHref ? cancelHref({ latitude: p.latitude, longitude: p.longitude }) : undefined}
        showFavorite
        followMap={{ name: false, address: true }}
        pickedGoogleUrls={p.photos.map((x) => x.url)}
        onPickGooglePhoto={(url) => addPhotoUrl.mutate({ placeUid: uid, url })}
        photoSlot={<MyPlacePhotos placeUid={uid} photos={p.photos} onChanged={() => void utils.place.get.invalidate({ uid })} />}
        onSubmit={(v) => {
          setError(null);
          update.mutate({
            uid,
            googlePlaceId: v.googlePlaceId,
            name: v.name,
            address: v.address,
            description: v.description,
            latitude: v.latitude!,
            longitude: v.longitude!,
            categoryUids: v.categoryUids,
            tagUids: v.tagUids,
            isFavorite: v.isFavorite,
          });
        }}
      />
    </>
  );
}
