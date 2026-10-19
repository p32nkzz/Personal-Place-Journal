"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Icon } from "~/components/Icon";
import { EditPlaceEditor } from "~/components/PlaceEditors";
import { EmptyState, Spinner } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

export default function EditPlacePage() {
  const { uid } = useParams<{ uid: string }>();
  const { t } = useT();
  const router = useRouter();
  // Asal halaman menentukan tujuan Batal/Simpan: Peta, daftar MY PLACE, atau detail (bawaan).
  const from = useSearchParams().get("from");
  const fromMap = from === "map";
  const fromList = from === "list";
  const fromDetail = !fromMap && !fromList;
  const { data: p, isLoading } = api.place.get.useQuery({ uid });

  // Tujuan Batal/Simpan: Peta (pop-up tempat ini terbuka di koordinatnya), daftar MY PLACE, atau halaman detail.
  const dest = (lat: number, lng: number) =>
    fromMap ? `/?${new URLSearchParams({ my: uid, lat: String(lat), lng: String(lng) })}` : fromList ? "/places" : `/places/${uid}`;

  if (isLoading) return <Spinner />;
  if (!p) return <EmptyState title={t("place.notFound")} />;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          {fromDetail && (
            <Link href="/places" className="pd-back pe-back">
              <Icon name="arrow-left" fixedWidth={false} /> {t("nav.myPlaces")}
            </Link>
          )}
          <h1>{t("place.edit")}</h1>
          <p>{p.name}</p>
        </div>
      </div>
      <div className="pe-body">
        <EditPlaceEditor
          uid={uid}
          cancelHref={(s) => dest(s.latitude, s.longitude)}
          onSaved={(r) => router.push(dest(r.latitude, r.longitude))}
        />
      </div>
    </div>
  );
}
