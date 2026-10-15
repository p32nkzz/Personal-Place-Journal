"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { PendingPhotoPicker } from "~/components/PendingPhotoPicker";
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
  const create = api.place.create.useMutation({
    onSuccess: async (r) => {
      toast.push(t("common.saved"), "success");
      if (files.length) {
        // Foto tinjauan diunggah setelah MY PLACE tersimpan; kegagalan tidak membatalkan penyimpanan.
        try {
          await uploadPhotos("/api/upload/my-place-photo", "placeUid", r.uid, files);
        } catch (e) {
          const key = `err.${(e as Error).message}`;
          toast.push(t(key) !== key ? t(key) : t("photo.uploadFailedAfterSave"), "error");
        }
      }
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
      router.push(`/places/${r.uid}`);
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
        cancelHref="/places"
        showFavorite
        photoSlot={<PendingPhotoPicker files={files} onChange={setFiles} />}
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
