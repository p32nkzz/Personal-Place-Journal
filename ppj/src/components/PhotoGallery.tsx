"use client";

import { useRef, useState } from "react";

import { Alert, ConfirmDialog, Modal, useErrorMessage, useToast } from "~/components/ui";
import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";
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
  field: "visitUid" | "masterUid",
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

export function PhotoGallery({
  photos,
  canEdit,
  uploadEndpoint,
  parentField,
  parentUid,
  onSetPrimary,
  onDelete,
  onCaption,
  onAddUrl,
  onChanged,
  max,
}: {
  photos: GalleryPhoto[];
  canEdit: boolean;
  uploadEndpoint?: string;
  parentField?: "visitUid" | "masterUid";
  parentUid?: string;
  onSetPrimary?: (uid: string) => Promise<unknown>;
  onDelete?: (uid: string) => Promise<unknown>;
  onCaption?: (uid: string, caption: string) => Promise<unknown>;
  onAddUrl?: (url: string, caption: string) => Promise<unknown>;
  onChanged: () => void;
  max?: number;
}) {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const rules = api.settings.photoRules.useQuery(undefined, { enabled: canEdit });
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<GalleryPhoto | null>(null);
  const [del, setDel] = useState<GalleryPhoto | null>(null);
  const [editCap, setEditCap] = useState<GalleryPhoto | null>(null);
  const [capText, setCapText] = useState("");
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [urlCaption, setUrlCaption] = useState("");

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
        <p className="muted t-small" style={{ margin: 0 }}>{t("photo.none")}</p>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <div key={p.uid} className="photo">
              <button style={{ all: "unset", cursor: "zoom-in", display: "block", width: "100%", height: "100%" }} onClick={() => setView(p)} aria-label={p.caption ?? t("photo.view")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption ?? ""} loading="lazy" />
              </button>
              <div className="photo-badge row" style={{ gap: 4 }}>
                {p.isPrimary && <span className="status status-info">{t("photo.primary")}</span>}
                {p.badge && <span className="status status-neutral">{p.badge}</span>}
              </div>
              {canEdit && (
                <div className="photo-actions">
                  {!p.isPrimary && onSetPrimary && (
                    <button className="btn" disabled={busy} onClick={() => void run(() => onSetPrimary(p.uid))}>
                      <Icon name="star" /> {t("photo.setPrimary")}
                    </button>
                  )}
                  {onCaption && (
                    <button className="btn" disabled={busy} onClick={() => { setEditCap(p); setCapText(p.caption ?? ""); }}>
                      <Icon name="pen" title={t("photo.caption")} />
                    </button>
                  )}
                  {onDelete && (
                    <button className="btn" disabled={busy} onClick={() => setDel(p)} aria-label={t("common.delete")}>
                      <Icon name="trash" />
                    </button>
                  )}
                </div>
              )}
              {p.caption && (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: canEdit ? 44 : 0, background: "rgb(15 23 42 / 0.55)", color: "#fff", fontSize: 12, padding: "2px 8px" }}>
                  {p.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <>
          <div className="row">
            {uploadEndpoint && parentField && parentUid && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length) void run(() => uploadPhotos(uploadEndpoint, parentField, parentUid, files), t("photo.uploaded"));
                  }}
                />
                <button className="btn btn-secondary btn-sm" disabled={busy || full} onClick={() => fileRef.current?.click()}>
                  <Icon name="upload" /> {t("photo.upload")}
                </button>
              </>
            )}
            {onAddUrl && (
              <button className="btn btn-ghost btn-sm" disabled={busy || full} onClick={() => setUrlOpen(true)}>
                <Icon name="link" /> {t("photo.addUrl")}
              </button>
            )}
            {busy && <Icon name="refresh" spin />}
          </div>
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
        <Modal title={view.caption ?? t("photo.view")} onClose={() => setView(null)} large actions={<button className="btn btn-secondary" onClick={() => setView(null)}>{t("common.close")}</button>}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={view.url} alt={view.caption ?? ""} style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }} />
        </Modal>
      )}

      {del && onDelete && (
        <ConfirmDialog
          title={t("photo.deleteTitle")}
          message={<p style={{ margin: 0 }}>{t("photo.deleteText")}</p>}
          danger
          confirmLabel={t("common.delete")}
          busy={busy}
          onClose={() => setDel(null)}
          onConfirm={() => void run(() => onDelete(del.uid), t("common.deleted")).then(() => setDel(null))}
        />
      )}

      {editCap && onCaption && (
        <Modal
          title={t("photo.caption")}
          onClose={() => setEditCap(null)}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => setEditCap(null)}>{t("common.cancel")}</button>
              <button className="btn btn-primary" disabled={busy} onClick={() => void run(() => onCaption(editCap.uid, capText), t("common.saved")).then(() => setEditCap(null))}>
                <Icon name="save" /> {t("common.save")}
              </button>
            </>
          }
        >
          <textarea className="textarea" maxLength={2000} value={capText} onChange={(e) => setCapText(e.target.value)} aria-label={t("photo.caption")} />
        </Modal>
      )}

      {urlOpen && onAddUrl && (
        <Modal
          title={t("photo.addUrl")}
          onClose={() => setUrlOpen(false)}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => setUrlOpen(false)}>{t("common.cancel")}</button>
              <button
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
