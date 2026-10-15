"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { MasterForm, type MasterFormValues } from "~/components/MasterForm";
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

  // P-04 — draft MASTER disalin dari MY PLACE sumber (read-only); Admin mengubah draft, bukan MY PLACE.
  const fromPlace = sp.get("fromPlace");
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
    onSuccess: (r) => {
      toast.push(t("common.saved"), "success");
      router.push(`/admin/masters/${r.uid}`);
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
        error={error}
        submitLabel={t("common.save")}
        onCancel={() => router.back()}
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
