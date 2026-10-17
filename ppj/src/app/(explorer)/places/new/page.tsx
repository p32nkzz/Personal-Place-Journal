"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { PendingPhotoPicker, savePendingPhotos, type PendingKey } from "~/components/PendingPhotoPicker";
import { uploadPhotos } from "~/components/PhotoGallery";
import { PlaceForm, type PlaceFormValues } from "~/components/PlaceForm";
import { Spinner, useErrorMessage, useToast } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

function NewPlace() {
  const { t } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Map<File | string, string>>(new Map());
  const [primary, setPrimary] = useState<PendingKey | null>(null);
  const addPhotoUrl = api.place.addExternalPhoto.useMutation();
  const photoMax = api.settings.photoRules.useQuery().data?.maxPerMyPlace;

  const masterUid = sp.get("master");
  const master = api.master.get.useQuery({ uid: masterUid ?? "" }, { enabled: !!masterUid });

  const lat = sp.get("lat");
  const lng = sp.get("lng");
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
      name: sp.get("name") ?? "",
      address: sp.get("address") ?? "",
      description: "",
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
      googlePlaceId: sp.get("gid"),
      categoryUids: [],
      tagUids: [],
      isFavorite: false,
    };
  }, [masterUid, master.data, sp, lat, lng]);

  const itineraryUid = sp.get("itinerary");
  const addStop = api.itinerary.addPlace.useMutation();
  const utils = api.useUtils();
  const from = sp.get("from");
  /**
   * Tujuan tombol Batal sesuai asal halaman:
   * - Peta, dari pop-up MASTER → Peta dengan pop-up MASTER itu terbuka;
   * - Peta, dari pin baru → Peta dengan pin bebas aktif (pin di titik form bila sudah dipilih);
   * - halaman MASTER publik → kembali ke MASTER tersebut;
   * - ITINERARY → kembali ke ITINERARY;
   * - daftar MY PLACE / lainnya → daftar MY PLACE.
   */
  const backHref = (v?: PlaceFormValues) => {
    if (from === "map" && masterUid && master.data)
      return `/?${new URLSearchParams({ master: masterUid, lat: String(master.data.latitude), lng: String(master.data.longitude) })}`;
    if (from === "map") {
      const q = new URLSearchParams({ freepin: "1" });
      const lat = v?.latitude ?? (sp.get("lat") ? Number(sp.get("lat")) : null);
      const lng = v?.longitude ?? (sp.get("lng") ? Number(sp.get("lng")) : null);
      if (lat != null && lng != null) {
        q.set("lat", String(lat));
        q.set("lng", String(lng));
      }
      return `/?${q.toString()}`;
    }
    if (from === "master" && masterUid) return `/masters/${masterUid}`;
    if (itineraryUid) return `/itineraries/${itineraryUid}`;
    return "/places";
  };
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
      // Segarkan daftar MY PLACE (peta, daftar, opsi) setelah foto terunggah agar tempat baru langsung muncul di tujuan redirect.
      await utils.place.invalidate();
      if (itineraryUid) {
        // P-07 langkah 2b: tempat baru langsung menjadi ITINERARY PLACE.
        try {
          await addStop.mutateAsync({ itineraryUid, placeUid: r.uid });
          router.push(`/itineraries/${itineraryUid}`);
          return;
        } catch {
          // MY PLACE sudah tersimpan; lanjut ke detail.
        }
      }
      // Setelah simpan kembali ke asal: Peta (pop-up tempat baru terbuka), daftar MY PLACE, atau detail (bawaan).
      router.push(
        from === "map"
          ? `/?${new URLSearchParams({ my: r.uid, lat: String(vars.latitude), lng: String(vars.longitude) })}`
          : from === "list"
            ? "/places"
            : `/places/${r.uid}`,
      );
    },
    onError: (e) => setError(errMsg(e)),
  });

  if (masterUid && master.isLoading) return <Spinner />;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("place.new")}</h1>
          <p>{t("place.newHint")}</p>
        </div>
      </div>
      <PlaceForm
        initial={initial}
        masterUid={master.data ? masterUid : null}
        masterName={master.data?.name}
        submitLabel={t("common.save")}
        busy={create.isPending}
        error={error}
        cancelHref={backHref}
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
    </div>
  );
}

export default function NewPlacePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <NewPlace />
    </Suspense>
  );
}
