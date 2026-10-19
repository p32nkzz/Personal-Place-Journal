"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { NewPlaceEditor } from "~/components/PlaceEditors";
import type { PlaceFormValues } from "~/components/PlaceForm";
import { Spinner } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

function NewPlace() {
  const { t } = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const masterUid = sp.get("master");
  const master = api.master.get.useQuery({ uid: masterUid ?? "" }, { enabled: !!masterUid });
  const lat = sp.get("lat");
  const lng = sp.get("lng");

  const itineraryUid = sp.get("itinerary");
  const addStop = api.itinerary.addPlace.useMutation();
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

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("place.new")}</h1>
          <p>{t("place.newHint")}</p>
        </div>
      </div>
      <NewPlaceEditor
        masterUid={masterUid}
        preset={{ lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null, name: sp.get("name"), address: sp.get("address"), gid: sp.get("gid") }}
        cancelHref={backHref}
        onSaved={async (r) => {
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
              ? `/?${new URLSearchParams({ my: r.uid, lat: String(r.latitude), lng: String(r.longitude) })}`
              : from === "list"
                ? "/places"
                : `/places/${r.uid}`,
          );
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
