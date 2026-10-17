"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { MasterForm, type MasterFormValues } from "~/components/MasterForm";
import { PendingPhotoPicker, savePendingPhotos, type PendingKey } from "~/components/PendingPhotoPicker";
import { uploadPhotos } from "~/components/PhotoGallery";
import { Alert, Spinner, useErrorMessage, useToast } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

function NewMaster() {
  const { t } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [referenceSource, setReferenceSource] = useState(false);
  const utils = api.useUtils();
  // Foto MASTER langsung dari form tambah (skema sama dengan Foto Pantauan MY PLACE); diunggah setelah MASTER tersimpan.
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Map<File | string, string>>(new Map());
  const [primary, setPrimary] = useState<PendingKey | null>(null);
  const photoMax = api.settings.photoRules.useQuery().data?.maxPerMasterPlace;
  const addPhotoUrl = api.master.addExternalPhoto.useMutation();

  // P-04 — draft MASTER disalin dari MY PLACE sumber (read-only); Admin mengubah draft, bukan MY PLACE.
  const fromPlace = sp.get("fromPlace");
  // Asal halaman: Peta (from=map), daftar MASTER (from=list), atau Kurasi (fromPlace).
  const from = sp.get("from");
  const draft = api.review.draft.useQuery({ placeUid: fromPlace ?? "", source: "current" }, { enabled: !!fromPlace });

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
      name: sp.get("name") ?? "",
      address: sp.get("address") ?? "",
      description: "",
      latitude: sp.get("lat") ? Number(sp.get("lat")) : null,
      longitude: sp.get("lng") ? Number(sp.get("lng")) : null,
      googlePlaceId: sp.get("gid"),
      categoryUids: [],
    };
  }, [fromPlace, draft.data, sp]);

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
      // Setelah simpan kembali ke asal: Peta (pop-up MASTER baru terbuka), daftar MASTER, atau detail (bawaan).
      router.push(
        from === "map"
          ? `/?${new URLSearchParams({ master: r.uid, lat: String(vars.latitude), lng: String(vars.longitude) })}`
          : from === "list"
            ? "/admin/masters"
            : `/admin/masters/${r.uid}`,
      );
    },
    onError: (e) => setError(errMsg(e)),
  });

  if (fromPlace && draft.isLoading) return <Spinner />;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("master.new")}</h1>
          <p>{fromPlace ? t("master.newFromPlaceHint") : t("master.newHint")}</p>
        </div>
      </div>
      <MasterForm
        initial={initial}
        busy={create.isPending}
        photoSlot={<PendingPhotoPicker files={files} urls={urls} onFiles={setFiles} onUrls={setUrls} captions={captions} onCaptions={setCaptions} max={photoMax} cameraTitle={t("master.cameraTitle")} primary={primary} onPrimary={setPrimary} />}
        pickedGoogleUrls={urls}
        onPickGooglePhoto={(u) => setUrls((x) => (x.includes(u) || (photoMax != null && files.length + x.length >= photoMax) ? x : [...x, u]))}
        error={error}
        submitLabel={t("common.save")}
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
