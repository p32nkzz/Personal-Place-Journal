"use client";

import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { useState } from "react";

import { Icon } from "~/components/Icon";
import { Alert, ConfirmDialog, Spinner, useErrorMessage, useToast } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

/**
 * P-10 — konfirmasi hapus MY PLACE: menampilkan data terkait yang ikut terhapus dan meminta
 * DELETE CONSENT bila diperlukan. Dipakai di daftar dan halaman detail MY PLACE.
 */
export function PlaceDeleteDialog({
  uid,
  isActive,
  onClose,
  onDeleted,
  onSuggestDeactivate,
}: {
  uid: string;
  isActive: boolean;
  onClose: () => void;
  onDeleted: () => void;
  /** Ditawarkan bila user belum menyetujui consent: nonaktifkan saja alih-alih menghapus. */
  onSuggestDeactivate?: () => void;
}) {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const qc = useQueryClient();
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Setelah dihapus, pratinjau tidak boleh dimuat ulang (tempatnya sudah tidak ada → NOT_FOUND di console).
  const [finished, setFinished] = useState(false);
  const preview = api.place.deletePreview.useQuery({ uid }, { retry: false, enabled: !finished });
  // Tempat sudah tidak ada (mis. terhapus dari tab/perangkat lain): anggap selesai dan segarkan daftar.
  const gone = (e: unknown) => (e as { message?: string } | null)?.message === "NOT_FOUND";
  const forget = () => {
    // Buang cache tempat ini agar halaman detail/peta tidak mengambil ulang data yang sudah tidak ada (404 sekilas).
    qc.removeQueries({ queryKey: getQueryKey(api.place.get, { uid }, "query") });
    qc.removeQueries({ queryKey: getQueryKey(api.place.visits, undefined, "any") });
  };
  // Segarkan data MY PLACE kecuali pratinjau hapus (tempatnya sudah tidak ada: memuat ulang = NOT_FOUND).
  const refreshAfterDelete = () =>
    void qc.invalidateQueries({
      queryKey: getQueryKey(api.place),
      predicate: (q) => !JSON.stringify(q.queryKey).includes("deletePreview"),
    });
  const del = api.place.delete.useMutation({
    onSuccess: async () => {
      setFinished(true);
      forget();
      toast.push(t("common.deleted"), "success");
      onDeleted();
      refreshAfterDelete();
    },
    onError: (e) => {
      if (gone(e)) {
        setFinished(true);
        forget();
        toast.push(t("place.alreadyDeleted"), "info");
        onDeleted();
        refreshAfterDelete();
        return;
      }
      setError(errMsg(e));
    },
  });

  return (
    <ConfirmDialog
      title={t("place.deleteTitle")}
      danger
      confirmLabel={t("common.delete")}
      busy={del.isPending}
      disabled={!preview.data || (preview.data.needsConsent && !consent)}
      onClose={onClose}
      onConfirm={() => del.mutate({ uid, consent })}
      message={
        preview.error ? (
          <>
            <Alert kind="error">{gone(preview.error) ? t("place.alreadyDeleted") : errMsg(preview.error)}</Alert>
            {gone(preview.error) ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setFinished(true); forget(); onDeleted(); refreshAfterDelete(); }}>
                {t("common.close")}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void preview.refetch()}>
                <Icon name="refresh" /> {t("common.retry")}
              </button>
            )}
          </>
        ) : !preview.data ? (
          <Spinner />
        ) : (
          <>
            {error && <Alert kind="error">{error}</Alert>}
            <p style={{ margin: 0 }}>{t("place.deleteText", { visits: preview.data.visits, photos: preview.data.visitPhotos })}</p>
            {preview.data.myPlacePhotos > 0 && <p style={{ margin: 0 }}>{t("place.deleteMyPhotos", { n: preview.data.myPlacePhotos })}</p>}
            {preview.data.needsConsent && (
              <>
                <Alert kind="warning">
                  <div>{t("place.deleteConsentWhy")}</div>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    <li>{t("place.deleteVisits", { n: preview.data.visits })}</li>
                    <li>{t("place.deletePhotos", { n: preview.data.visitPhotos })}</li>
                    <li>{t("place.deleteHistories", { n: preview.data.histories })}</li>
                    {preview.data.itineraryPlaces.length > 0 && (
                      <li>{t("place.deleteItineraries", { names: preview.data.itineraryPlaces.join(", ") })}</li>
                    )}
                  </ul>
                </Alert>
                <label className="check">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>{t("place.deleteConsent")}</span>
                </label>
                {!consent && (
                  <div className="helper">
                    {t("place.deleteSuggestInactive")}{" "}
                    {isActive && onSuggestDeactivate && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={onSuggestDeactivate}>
                        <Icon name="circle-xmark" /> {t("place.deactivate")}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )
      }
    />
  );
}
