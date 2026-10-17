"use client";

import { useRef, useState } from "react";

import { CameraCapture } from "~/components/CameraCapture";
import { PhotoAddBar } from "~/components/PhotoAddBar";
import { usePhotoGuard } from "~/components/usePhotoGuard";
import { Alert, ConfirmDialog, Modal, useErrorMessage, useToast } from "~/components/ui";
import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";
import { openPhotoPreview } from "~/lib/photoPreview";
import { api } from "~/trpc/react";

export type GalleryPhoto = {
  uid: string;
  url: string;
  caption: string | null;
  isPrimary: boolean;
  badge?: string;
};

/** Upload multipart ke route handler (validasi aturan app_settings + hapus EXIF di server). */
export async function uploadPhotos(
  endpoint: string,
  field: "visitUid" | "masterUid" | "placeUid",
  uid: string,
  files: File[],
  caption?: string,
) {
  const fd = new FormData();
  fd.set(field, uid);
  if (caption) fd.set("caption", caption);
  for (const f of files) fd.append("file", f);
  const res = await fetch(endpoint, { method: "POST", body: fd });
  const json = (await res.json()) as { ok?: boolean; error?: string; saved?: number };
  if (!res.ok) {
    const e = new Error(json.error ?? "UPLOAD_FAILED") as Error & { saved?: number };
    e.saved = json.saved;
    throw e;
  }
  return json;
}

/** Batas karakter keterangan pada kartu foto; selebihnya diganti "…". */
const CAPTION_MAX = 32;

export function PhotoGallery({
  photos,
  canEdit,
  camera = false,
  cameraTitle,
  uploadEndpoint,
  parentField,
  parentUid,
  onSetPrimary,
  onDelete,
  onCaption,
  onAddUrl,
  onChanged,
  max,
  fancy = false,
  compact = false,
  kind,
}: {
  photos: GalleryPhoto[];
  canEdit: boolean;
  /** Tampilkan tombol "Kamera" (ambil foto langsung dari kamera perangkat; diunggah per jepretan). */
  camera?: boolean;
  /** Judul dialog kamera (bawaan: "Ambil foto pantauan"). */
  cameraTitle?: string;
  uploadEndpoint?: string;
  parentField?: "visitUid" | "masterUid" | "placeUid";
  parentUid?: string;
  onSetPrimary?: (uid: string) => Promise<unknown>;
  onDelete?: (uid: string) => Promise<unknown>;
  onCaption?: (uid: string, caption: string) => Promise<unknown>;
  onAddUrl?: (url: string, caption: string) => Promise<unknown>;
  onChanged: () => void;
  max?: number;
  /**
   * Foto dipratinjau dengan Fancybox yang tetap menyediakan aksi Ubah keterangan & Hapus. Setelah dialog
   * (ubah/hapus) ditutup, pratinjau dibuka lagi bila masih ada foto; bila tidak ada, pratinjau tidak muncul.
   */
  fancy?: boolean;
  /** Hanya thumbnail kecil (tanpa tombol overlay & kontrol unggah); klik membuka pratinjau. */
  compact?: boolean;
  /** Jenis foto: membedakan label dialog ubah keterangan & konfirmasi hapus ("visit" = foto kunjungan, "my" = foto pantauan). */
  kind?: "visit" | "my";
}) {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const rules = api.settings.photoRules.useQuery(undefined, { enabled: canEdit });
  const fileRef = useRef<HTMLInputElement>(null);
  const guard = usePhotoGuard();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<GalleryPhoto | null>(null);
  const [del, setDel] = useState<GalleryPhoto | null>(null);
  const [editCap, setEditCap] = useState<GalleryPhoto | null>(null);
  const [capText, setCapText] = useState("");
  const [urlOpen, setUrlOpen] = useState(false);
  // Kamera: tiap jepretan langsung diunggah; foto dapat dipratinjau, diberi keterangan & dihapus dari dialog.
  const [camOpen, setCamOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [urlCaption, setUrlCaption] = useState("");
  // Foto yang sedang dikerjakan dari dalam pratinjau (untuk membuka kembali pratinjau sesudahnya).
  const lbl = (base: "caption" | "deleteTitle" | "deleteText") => {
    const key = `photo.${base}.${kind}`;
    return kind && t(key) !== key ? t(key) : t(`photo.${base}`);
  };
  const [resume, setResume] = useState<{ uid: string } | null>(null);

  /** Buka pratinjau untuk `list` mulai dari `uid` (atau foto terdekat bila sudah tidak ada). */
  const openPreview = (list: GalleryPhoto[], uid: string, fallbackIndex = 0) => {
    if (!list.length) return;
    const found = list.findIndex((x) => x.uid === uid);
    const start = found >= 0 ? found : Math.min(fallbackIndex, list.length - 1);
    // Foto utama selama pratinjau terbuka (diperbarui lokal begitu "Jadikan utama" ditekan).
    let primary = list.find((x) => x.isPrimary)?.uid;
    openPhotoPreview(
      list.map((x) => ({ src: x.url, caption: x.caption })),
      start,
      undefined,
      canEdit
        ? [
            ...(onSetPrimary
              ? [{
                  label: t("photo.setPrimaryTip"),
                  doneLabel: t("photo.primaryTip"),
                  iconOnly: "primary" as const,
                  keepOpen: true,
                  isDone: (_: unknown, i: number) => list[i]!.uid === primary,
                  onAction: (_: unknown, i: number) => {
                    const ph = list[i]!;
                    primary = ph.uid;
                    void run(() => onSetPrimary(ph.uid), t("common.saved"));
                  },
                }]
              : []),
            ...(onCaption
              ? [{ label: t("common.edit"), tone: "edit" as const, onAction: (_: unknown, i: number) => { const ph = list[i]!; setResume({ uid: ph.uid }); setEditCap(ph); setCapText(ph.caption ?? ""); } }]
              : []),
            ...(onDelete
              ? [{ label: t("common.delete"), danger: true, onAction: (_: unknown, i: number) => { const ph = list[i]!; setResume({ uid: ph.uid }); setDel(ph); } }]
              : []),
          ]
        : undefined,
    );
  };

  const run = async (fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      if (okMsg) toast.push(okMsg, "success");
      onChanged();
    } catch (e) {
      const code = (e as Error).message;
      const key = `err.${code}`;
      const tr = t(key);
      setErr(tr !== key ? tr : errMsg(e));
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const limit = max ?? undefined;
  const full = limit != null && photos.length >= limit;

  return (
    <div className="stack-sm">
      {err && <Alert kind="error">{err}</Alert>}
      {photos.length === 0 ? (
        compact ? null : <p className="muted t-small" style={{ margin: 0 }}>{t("photo.none")}</p>
      ) : (
        <div className={compact ? "photo-grid photo-grid-compact" : "photo-grid"}>
          {photos.map((p) => (
            <div key={p.uid} className="photo">
              <button type="button" style={{ all: "unset", cursor: "zoom-in", display: "block", width: "100%", height: "100%" }} onClick={() => (fancy ? openPreview(photos, p.uid) : setView(p))} aria-label={p.caption ?? t("photo.view")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption ?? ""} loading="lazy" />
              </button>
              <div className="photo-badge row" style={{ gap: 4 }}>
                {p.isPrimary && onSetPrimary && (
                  <span className="photo-primary" title={t("photo.primaryTip")} aria-label={t("photo.primaryTip")}>
                    <Icon name="thumbtack" fixedWidth={false} />
                  </span>
                )}
                {p.badge && <span className="status status-neutral">{p.badge}</span>}
              </div>
              {canEdit && !compact && (
                <div className="photo-actions">
                  {!p.isPrimary && onSetPrimary && (
                    <button type="button" className="ph-btn ph-primary" disabled={busy} title={t("photo.setPrimaryTip")} aria-label={t("photo.setPrimaryTip")} onClick={() => void run(() => onSetPrimary(p.uid))}>
                      <Icon name="thumbtack" fixedWidth={false} />
                    </button>
                  )}
                  {onCaption && (
                    <button type="button" className="ph-btn ph-edit" disabled={busy} title={lbl("caption")} aria-label={lbl("caption")} onClick={() => { setEditCap(p); setCapText(p.caption ?? ""); }}>
                      <Icon name="pen" fixedWidth={false} />
                    </button>
                  )}
                  {onDelete && (
                    <button type="button" className="ph-btn ph-del" disabled={busy} title={t("common.delete")} aria-label={t("common.delete")} onClick={() => setDel(p)}>
                      <Icon name="trash" fixedWidth={false} />
                    </button>
                  )}
                </div>
              )}
              {p.caption && !compact && (
                // Keterangan dipotong agar tidak menutupi foto (isi lengkap ada di tooltip dan saat dipratinjau).
                <div className="photo-caption" title={p.caption} style={{ bottom: canEdit ? 46 : 0 }}>
                  {p.caption.length > CAPTION_MAX ? `${p.caption.slice(0, CAPTION_MAX).trimEnd()}…` : p.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && !compact && full && (
        <Alert kind="warning">{t("photo.maxReached", { max: limit ?? "—" })}</Alert>
      )}
      {canEdit && !compact && (
        <>
          {uploadEndpoint && parentField && parentUid && (
            <input
              ref={fileRef}
              type="file"
              accept={guard.accept}
              multiple
              hidden
              onChange={(e) => {
                // Tolak di sisi klien: format/ukuran di luar aturan Pengaturan (dengan notifikasi).
                const files = guard.filter(Array.from(e.target.files ?? []));
                e.target.value = "";
                if (files.length) void run(() => uploadPhotos(uploadEndpoint, parentField, parentUid, files), t("photo.uploaded"));
              }}
            />
          )}
          <PhotoAddBar
            disabled={busy || full}
            busy={busy}
            onUpload={uploadEndpoint && parentField && parentUid ? () => fileRef.current?.click() : undefined}
            onCamera={camera && uploadEndpoint && parentField && parentUid ? () => setCamOpen(true) : undefined}
            onLink={onAddUrl ? () => setUrlOpen(true) : undefined}
          />
          {camOpen && uploadEndpoint && parentField && parentUid && (
            <CameraCapture
              title={cameraTitle}
              items={photos.map((p) => ({ key: p.uid, src: p.url, caption: p.caption }))}
              max={limit}
              onCapture={async (f) => {
                const msg = guard.check(f);
                if (msg) throw new Error(msg);
                await uploadPhotos(uploadEndpoint, parentField, parentUid, [f]);
                onChanged();
              }}
              onDelete={
                onDelete
                  ? async (uid) => {
                      await onDelete(uid);
                      onChanged();
                    }
                  : undefined
              }
              onCaption={
                onCaption
                  ? async (uid, caption) => {
                      await onCaption(uid, caption);
                      onChanged();
                    }
                  : undefined
              }
              onClose={() => setCamOpen(false)}
            />
          )}
          {rules.data && (
            <p className="helper" style={{ margin: 0 }}>
              {t("photo.rulesHint", {
                types: rules.data.allowedTypes.join(", ").toUpperCase(),
                size: rules.data.maxSizeMb,
                max: limit ?? "—",
              })}
              {full && ` ${t("photo.limitReached")}`}
            </p>
          )}
        </>
      )}

      {view && (
        <Modal title={view.caption ?? t("photo.view")} onClose={() => setView(null)} large actions={<button type="button" className="btn btn-secondary" onClick={() => setView(null)}>{t("common.close")}</button>}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={view.url} alt={view.caption ?? ""} style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }} />
        </Modal>
      )}

      {del && onDelete && (
        <ConfirmDialog
          title={lbl("deleteTitle")}
          message={
            <div className="stack-sm">
              {/* Dibuka dari pratinjau (resume terisi) → tanpa foto; dari tombol hapus di galeri → dengan foto. */}
              {!resume && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={del.url} alt={del.caption ?? ""} className="ph-dialog-img" />
                  {del.caption && <div className="t-small muted">{del.caption}</div>}
                </>
              )}
              <p style={{ margin: 0 }}>{lbl("deleteText")}</p>
            </div>
          }
          danger
          confirmLabel={t("common.delete")}
          busy={busy}
          onClose={() => {
            // Batal: pratinjau dibuka lagi di foto yang sama.
            const idx = photos.findIndex((x) => x.uid === del.uid);
            setDel(null);
            if (fancy && resume) openPreview(photos, resume.uid, idx);
            setResume(null);
          }}
          onConfirm={() => {
            const idx = photos.findIndex((x) => x.uid === del.uid);
            const gone = del.uid;
            void run(() => onDelete(del.uid), t("common.deleted")).then(() => {
              setDel(null);
              // Pratinjau dibuka lagi dengan foto yang tersisa; bila habis, tidak ada pratinjau.
              if (fancy && resume) openPreview(photos.filter((x) => x.uid !== gone), gone, idx);
              setResume(null);
            });
          }}
        />
      )}

      {editCap && onCaption && (
        <Modal
          title={lbl("caption")}
          onClose={() => {
            const uid = editCap.uid;
            setEditCap(null);
            if (fancy && resume) openPreview(photos, uid);
            setResume(null);
          }}
          actions={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => {
                const uid = editCap.uid;
                setEditCap(null);
                if (fancy && resume) openPreview(photos, uid);
                setResume(null);
              }}>{t("common.cancel")}</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => {
                const uid = editCap.uid;
                const caption = capText.trim() || null;
                void run(() => onCaption(uid, capText), t("common.saved")).then(() => {
                  setEditCap(null);
                  // Pratinjau dibuka lagi dengan keterangan yang baru disimpan.
                  if (fancy && resume) openPreview(photos.map((x) => (x.uid === uid ? { ...x, caption } : x)), uid);
                  setResume(null);
                });
              }}>
                <Icon name="save" /> {t("common.save")}
              </button>
            </>
          }
        >
          <div className="stack-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={editCap.url} alt={editCap.caption ?? ""} className="ph-dialog-img" />
            <textarea className="textarea" maxLength={2000} value={capText} onChange={(e) => setCapText(e.target.value)} aria-label={lbl("caption")} autoFocus />
          </div>
        </Modal>
      )}

      {urlOpen && onAddUrl && (
        <Modal
          title={t("photo.addUrl")}
          onClose={() => setUrlOpen(false)}
          actions={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setUrlOpen(false)}>{t("common.cancel")}</button>
              <button type="button"
                className="btn btn-primary"
                disabled={busy || !/^https?:\/\//i.test(url)}
                onClick={() => void run(() => onAddUrl(url, urlCaption), t("photo.uploaded")).then(() => { setUrlOpen(false); setUrl(""); setUrlCaption(""); })}
              >
                <Icon name="save" /> {t("common.save")}
              </button>
            </>
          }
        >
          <div className="stack">
            <div className="field">
              <label className="label" htmlFor="ph-url">URL<span className="req">*</span></label>
              <input id="ph-url" className="input" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
              <div className="helper">{t("photo.urlHint")}</div>
            </div>
            <div className="field">
              <label className="label" htmlFor="ph-cap">{t("photo.caption")}</label>
              <input id="ph-cap" className="input" maxLength={2000} value={urlCaption} onChange={(e) => setUrlCaption(e.target.value)} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
