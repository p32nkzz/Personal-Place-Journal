"use client";

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
  const utils = api.useUtils();
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = api.place.deletePreview.useQuery({ uid });
  const del = api.place.delete.useMutation({
    onSuccess: async () => {
      await utils.place.invalidate();
      toast.push(t("common.deleted"), "success");
      onDeleted();
    },
    onError: (e) => setError(errMsg(e)),
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
        !preview.data ? (
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
