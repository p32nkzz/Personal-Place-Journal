"use client";

import { EditMasterEditor, NewMasterEditor } from "~/components/MasterEditors";
import { EditPlaceEditor, NewPlaceEditor, type PlacePreset, type SavedPlace } from "~/components/PlaceEditors";
import { Modal, useClosingAnimation } from "~/components/ui";
import { useT } from "~/lib/i18n";

/** Form tambah/ubah yang dibuka sebagai modal di menu Peta (tanpa pindah halaman). */
export type MapForm =
  | { kind: "place-new"; masterUid?: string; preset?: PlacePreset }
  | { kind: "place-edit"; uid: string }
  | { kind: "master-new"; preset: PlacePreset }
  | { kind: "master-edit"; uid: string };

/**
 * Modal form tambah/ubah MY PLACE & MASTER di Peta. Isi form memakai editor yang sama dengan halaman
 * (/places/new, /places/[uid]/edit, /admin/masters/new, /admin/masters/[uid]) agar aturannya selalu seragam.
 */
export function MapFormModal({
  form,
  onClose,
  onCancelAt,
  onSaved,
  mapZoom,
}: {
  form: MapForm;
  /**
   * Zoom Peta utama saat modal dibuka: peta form mengikuti nilai ini bila lebih besar dari zoom Pengaturan,
   * bila lebih kecil memakai zoom Pengaturan.
   */
  mapZoom?: number;
  onClose: () => void;
  /** Batal pada form tambah dari pin: titik terakhir di form (pin di peta ikut ke titik itu). */
  onCancelAt?: (lat: number, lng: number) => void;
  /** Setelah simpan: jenis data & titik tersimpan (pop-up data itu dibuka di peta). */
  onSaved: (kind: "my" | "master", r: SavedPlace) => void;
}) {
  const { t } = useT();
  const title =
    form.kind === "place-new" ? t("place.new") : form.kind === "place-edit" ? t("place.edit") : form.kind === "master-new" ? t("master.new") : t("master.edit");
  // Batal & setelah Simpan: modal memainkan animasi keluar dulu (✕ / Escape ditangani Modal sendiri).
  const [closing, closeThen] = useClosingAnimation();
  const cancel = () => closeThen(onClose);
  const cancelAt = (v: { latitude: number | null; longitude: number | null }) =>
    closeThen(() => {
      if (v.latitude != null && v.longitude != null) onCancelAt?.(v.latitude, v.longitude);
      onClose();
    });
  const saved = (kind: "my" | "master") => (r: SavedPlace) => closeThen(() => onSaved(kind, r));

  return (
    <Modal form title={title} onClose={onClose} closing={closing}>
      {form.kind === "place-new" && (
        <NewPlaceEditor
          masterUid={form.masterUid}
          preset={form.preset}
          onCancel={form.masterUid ? cancel : cancelAt}
          onSaved={saved("my")}
          mapZoom={mapZoom}
        />
      )}
      {form.kind === "place-edit" && <EditPlaceEditor uid={form.uid} mapZoom={mapZoom} onCancel={cancel} onSaved={saved("my")} />}
      {form.kind === "master-new" && <NewMasterEditor preset={form.preset} mapZoom={mapZoom} onCancel={cancelAt} onSaved={saved("master")} />}
      {form.kind === "master-edit" && <EditMasterEditor uid={form.uid} mapZoom={mapZoom} onCancel={cancel} onSaved={saved("master")} />}
    </Modal>
  );
}
