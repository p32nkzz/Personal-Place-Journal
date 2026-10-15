"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { MyPlacePhotos } from "~/components/MyPlacePhotos";
import { PlaceForm, type PlaceFormValues } from "~/components/PlaceForm";
import { Alert, EmptyState, Spinner, useErrorMessage, useToast } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

export default function EditPlacePage() {
  const { uid } = useParams<{ uid: string }>();
  const { t } = useT();
  const router = useRouter();
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
    onSuccess: async () => {
      await utils.place.invalidate();
      toast.push(t("common.saved"), "success");
      router.push(`/places/${uid}`);
    },
    onError: (e) => setError(errMsg(e)),
  });

  if (isLoading) return <Spinner />;
  if (!p || !initial) return <EmptyState title={t("place.notFound")} />;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("place.edit")}</h1>
          <p>{p.name}</p>
        </div>
      </div>
      {p.masterRelationStatus === "REVIEW" && <Alert kind="info">{t("place.editDuringReview")}</Alert>}
      <div style={{ height: 16 }} />
      <PlaceForm
        initial={initial}
        masterUid={p.master?.uid ?? null}
        masterName={p.master?.name}
        excludeUid={uid}
        submitLabel={t("common.save")}
        busy={update.isPending}
        error={error}
        cancelHref={`/places/${uid}`}
        showFavorite
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
    </div>
  );
}
