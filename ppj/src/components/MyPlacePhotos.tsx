"use client";

import { PhotoGallery, type GalleryPhoto } from "~/components/PhotoGallery";
import { api } from "~/trpc/react";

/** Galeri foto pantauan MY PLACE (upload / URL / utama / caption / hapus). */
export function MyPlacePhotos({
  placeUid,
  photos,
  onChanged,
}: {
  placeUid: string;
  photos: GalleryPhoto[];
  onChanged: () => void;
}) {
  const rules = api.settings.photoRules.useQuery();
  const setPrimary = api.place.setPrimaryPhoto.useMutation();
  const delPhoto = api.place.deletePhoto.useMutation();
  const capPhoto = api.place.updatePhotoCaption.useMutation();
  const urlPhoto = api.place.addExternalPhoto.useMutation();
  return (
    <PhotoGallery
      fancy
      kind="my"
      photos={photos}
      canEdit
      uploadEndpoint="/api/upload/my-place-photo"
      parentField="placeUid"
      parentUid={placeUid}
      max={rules.data?.maxPerMyPlace}
      onChanged={onChanged}
      onSetPrimary={(photoUid) => setPrimary.mutateAsync({ photoUid })}
      onDelete={(photoUid) => delPhoto.mutateAsync({ photoUid })}
      onCaption={(photoUid, caption) => capPhoto.mutateAsync({ photoUid, caption })}
      onAddUrl={(url, caption) => urlPhoto.mutateAsync({ placeUid, url, caption })}
    />
  );
}
