"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { NewMasterEditor } from "~/components/MasterEditors";
import { Spinner } from "~/components/ui";
import { useT } from "~/lib/i18n";

function NewMaster() {
  const { t } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  // P-04 — draft MASTER disalin dari MY PLACE sumber (read-only); Admin mengubah draft, bukan MY PLACE.
  const fromPlace = sp.get("fromPlace");
  // Asal halaman: Peta (from=map), daftar MASTER (from=list), atau Kurasi (fromPlace).
  const from = sp.get("from");
  const lat = sp.get("lat");
  const lng = sp.get("lng");

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("master.new")}</h1>
          <p>{fromPlace ? t("master.newFromPlaceHint") : t("master.newHint")}</p>
        </div>
      </div>
      <NewMasterEditor
        fromPlace={fromPlace}
        preset={{ lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null, name: sp.get("name"), address: sp.get("address"), gid: sp.get("gid") }}
        // Batal kembali ke asal: Peta (pin bebas aktif, pin di titik form), daftar MASTER, atau Kurasi sumber.
        onCancel={(v) => {
          if (from === "map") {
            const q = new URLSearchParams({ freepin: "1" });
            if (v.latitude != null && v.longitude != null) {
              q.set("lat", String(v.latitude));
              q.set("lng", String(v.longitude));
            }
            router.push(`/?${q.toString()}`);
          } else if (fromPlace) router.push(`/admin/curation/${fromPlace}`);
          else router.push("/admin/masters");
        }}
        // Setelah simpan kembali ke asal: Peta (pop-up MASTER baru terbuka), daftar MASTER, atau detail (bawaan).
        onSaved={(r) =>
          router.push(
            from === "map"
              ? `/?${new URLSearchParams({ master: r.uid, lat: String(r.latitude), lng: String(r.longitude) })}`
              : from === "list"
                ? "/admin/masters"
                : `/admin/masters/${r.uid}`,
          )
        }
      />
    </div>
  );
}

export default function NewMasterPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <NewMaster />
    </Suspense>
  );
}
