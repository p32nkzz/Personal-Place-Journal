"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CameraCapture, type CamItem } from "~/components/CameraCapture";
import { Modal } from "~/components/ui";
import { Icon } from "~/components/Icon";
import { PhotoAddBar } from "~/components/PhotoAddBar";
import { usePhotoGuard } from "~/components/usePhotoGuard";
import { useT } from "~/lib/i18n";
import { openPhotoPreview } from "~/lib/photoPreview";
import { api } from "~/trpc/react";

export const isHttpUrl = (s: string) => {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

export type PendingKey = File | string;

/**
 * Simpan foto tertunda setelah record dibuat. Foto UTAMA diproses lebih dulu (server menjadikan foto
 * pertama sebagai utama), lalu sisanya sesuai urutan; keterangan per foto ikut tersimpan.
 * Kegagalan tidak membatalkan record: dikembalikan untuk diberitahukan ke pengguna.
 */
export async function savePendingPhotos(o: {
  files: File[];
  urls: string[];
  captions: Map<PendingKey, string>;
  primary: PendingKey | null;
  uploadFile: (f: File, caption?: string) => Promise<unknown>;
  addUrl: (url: string, caption?: string) => Promise<unknown>;
}) {
  const items: PendingKey[] = [...o.files, ...o.urls];
  const first = o.primary && items.includes(o.primary) ? o.primary : null;
  const ordered = first ? [first, ...items.filter((x) => x !== first)] : items;
  let fileError: string | null = null;
  let urlFailed = 0;
  for (const it of ordered) {
    const caption = o.captions.get(it) || undefined;
    if (typeof it === "string") {
      try {
        await o.addUrl(it, caption);
      } catch {
        urlFailed++;
      }
    } else {
      try {
        await o.uploadFile(it, caption);
      } catch (e) {
        fileError ??= (e as Error).message || "UPLOAD_FAILED";
      }
    }
  }
  return { fileError, urlFailed };
}

/**
 * Foto pantauan sebelum MY PLACE tersimpan: kombinasi berkas unggahan dan link eksternal
 * (termasuk foto Google Maps yang dipilih). Diproses setelah record dibuat.
 */
export function PendingPhotoPicker({
  files,
  urls,
  onFiles,
  onUrls,
  captions,
  onCaptions,
  max: maxProp,
  cameraTitle,
  primary,
  onPrimary,
}: {
  files: File[];
  urls: string[];
  onFiles: (f: File[]) => void;
  onUrls: (u: string[]) => void;
  /** Keterangan foto tertunda (kunci: berkas atau URL); disimpan bersama foto saat MY PLACE dibuat. */
  captions?: Map<File | string, string>;
  onCaptions?: (c: Map<File | string, string>) => void;
  /** Batas jumlah foto; bawaan: aturan foto pantauan MY PLACE. */
  max?: number;
  /** Judul dialog kamera (bawaan: "Ambil foto pantauan"). */
  cameraTitle?: string;
  /** Foto utama terpilih (berkas atau URL); bawaan foto pertama. */
  primary?: PendingKey | null;
  onPrimary?: (k: PendingKey) => void;
}) {
  const { t } = useT();
  const rules = api.settings.photoRules.useQuery();
  const ref = useRef<HTMLInputElement>(null);
  // Isian link eksternal dibuka/tutup dari tombol "Link" pada bar aksi.
  const [linkOpen, setLinkOpen] = useState(false);
  const guard = usePhotoGuard();
  const [text, setText] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [camOpen, setCamOpen] = useState(false);
  // Ubah keterangan foto tertunda (dialog).
  const [capKey, setCapKey] = useState<PendingKey | null>(null);
  const [capText, setCapText] = useState("");
  const max = maxProp ?? rules.data?.maxPerMyPlace;
  const total = files.length + urls.length;
  const room = max != null ? Math.max(0, max - total) : Infinity;
  const full = room === 0;
  // URL pratinjau di-cache per berkas agar slide yang masih terbuka di Fancybox tidak rusak
  // saat berkas lain dihapus; URL dilepas hanya untuk berkas yang sudah tidak ada.
  const cache = useRef(new Map<File, string>());
  const filesRef = useRef(files);
  const urlsRef = useRef(urls);
  const captionsRef = useRef(captions);
  filesRef.current = files;
  urlsRef.current = urls;
  captionsRef.current = captions;
  const previews = useMemo(
    () =>
      files.map((f) => {
        let u = cache.current.get(f);
        if (!u) {
          u = URL.createObjectURL(f);
          cache.current.set(f, u);
        }
        return u;
      }),
    [files],
  );
  useEffect(() => {
    const t = setTimeout(() => {
      for (const [f, u] of cache.current) {
        if (!files.includes(f)) {
          URL.revokeObjectURL(u);
          cache.current.delete(f);
        }
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [files]);
  useEffect(() => {
    const map = cache.current;
    return () => map.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const keyOfSrc = (src: string): PendingKey => [...cache.current].find(([, u]) => u === src)?.[0] ?? src;
  const primaryKey: PendingKey | null =
    primary && (files.includes(primary as File) || urls.includes(primary as string)) ? primary : (files[0] ?? urls[0] ?? null);
  const remove = (k: PendingKey) => {
    if (typeof k === "string") onUrls(urlsRef.current.filter((x) => x !== k));
    else onFiles(filesRef.current.filter((x) => x !== k));
    if (captionsRef.current?.has(k) && onCaptions) {
      const next = new Map(captionsRef.current);
      next.delete(k);
      onCaptions(next);
    }
  };
  const openCaption = (k: PendingKey) => {
    setCapKey(k);
    setCapText(captionsRef.current?.get(k) ?? "");
  };
  const saveCaption = () => {
    if (capKey == null || !onCaptions) return;
    const next = new Map(captionsRef.current);
    if (capText.trim()) next.set(capKey, capText.trim());
    else next.delete(capKey);
    onCaptions(next);
    setCapKey(null);
  };

  // Foto untuk dialog kamera: berkas (pratinjau lokal) lalu link; kunci = URL pratinjau / URL link.
  const camItems: CamItem[] = [
    ...files.map((f, i) => ({ key: previews[i]!, src: previews[i]!, caption: captions?.get(f) ?? null })),
    ...urls.map((u) => ({ key: u, src: u, caption: captions?.get(u) ?? null })),
  ];

  // Pratinjau seluruh foto terpilih (berkas dulu, lalu link) dengan aksi Jadikan utama · Ubah keterangan · Hapus.
  const preview = (index: number) => {
    let current = primaryKey;
    openPhotoPreview(
      [...previews.map((src, i) => ({ src, caption: captions?.get(files[i]!) ?? files[i]!.name })), ...urls.map((src) => ({ src, caption: captions?.get(src) ?? src }))],
      index,
      undefined,
      [
        ...(onPrimary
          ? [{
              label: t("photo.setPrimaryTip"),
              doneLabel: t("photo.primaryTip"),
              iconOnly: "primary" as const,
              keepOpen: true,
              isDone: (item: { src: string }) => keyOfSrc(item.src) === current,
              onAction: (item: { src: string }) => {
                current = keyOfSrc(item.src);
                onPrimary(current);
              },
            }]
          : []),
        ...(onCaptions ? [{ label: t("common.edit"), tone: "edit" as const, onAction: (item: { src: string }) => openCaption(keyOfSrc(item.src)) }] : []),
        // Pratinjau tertutup setelah hapus; pakai nilai terbaru (ref), bukan closure saat dibuka.
        { label: t("common.delete"), danger: true, onAction: (item: { src: string }) => remove(keyOfSrc(item.src)) },
      ],
    );
  };

  const addUrls = () => {
    const lines = text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    const valid = [...new Set(lines.filter(isHttpUrl))].filter((u) => !urls.includes(u));
    setSkipped(lines.length - lines.filter(isHttpUrl).length);
    onUrls([...urls, ...valid.slice(0, room === Infinity ? undefined : room)]);
    setText("");
  };

  return (
    <div className="stack-sm">
      {total === 0 ? (
        <p className="muted t-small" style={{ margin: 0 }}>{t("photo.none")}</p>
      ) : (
        <div className="photo-grid">
          {[...files.map((f, i) => ({ k: f as PendingKey, src: previews[i]!, isUrl: false, idx: i })), ...urls.map((u, n) => ({ k: u as PendingKey, src: u, isUrl: true, idx: files.length + n }))].map(
            ({ k, src, isUrl, idx }) => {
              const cap = captions?.get(k);
              const isPrimary = k === primaryKey;
              return (
                <div key={isUrl ? `u-${src}` : `f-${src}`} className="photo">
                  <button type="button" aria-label={cap ?? t("photo.view")} onClick={() => preview(idx)} style={{ all: "unset", cursor: "zoom-in", display: "block", width: "100%", height: "100%" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={cap ?? ""} loading="lazy" referrerPolicy={isUrl ? "no-referrer" : undefined} />
                  </button>
                  <div className="photo-badge row" style={{ gap: 4 }}>
                    {isPrimary && onPrimary && (
                      <span className="photo-primary" title={t("photo.primaryTip")} aria-label={t("photo.primaryTip")}>
                        <Icon name="thumbtack" fixedWidth={false} />
                      </span>
                    )}
                    {isUrl && (
                      <span className="pp-url-badge">
                        <Icon name="link" fixedWidth={false} /> URL
                      </span>
                    )}
                  </div>
                  <div className="photo-actions">
                    {!isPrimary && onPrimary && (
                      <button type="button" className="ph-btn ph-primary" title={t("photo.setPrimaryTip")} aria-label={t("photo.setPrimaryTip")} onClick={() => onPrimary(k)}>
                        <Icon name="thumbtack" fixedWidth={false} />
                      </button>
                    )}
                    {onCaptions && (
                      <button type="button" className="ph-btn ph-edit" title={t("photo.caption")} aria-label={t("photo.caption")} onClick={() => openCaption(k)}>
                        <Icon name="pen" fixedWidth={false} />
                      </button>
                    )}
                    <button type="button" className="ph-btn ph-del" title={t("common.delete")} aria-label={t("common.delete")} onClick={() => remove(k)}>
                      <Icon name="trash" fixedWidth={false} />
                    </button>
                  </div>
                  {cap && (
                    <div className="photo-caption" title={cap} style={{ bottom: 46 }}>
                      {cap.length > 32 ? `${cap.slice(0, 32).trimEnd()}…` : cap}
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}

      <input
        ref={ref}
        type="file"
        accept={guard.accept}
        multiple
        hidden
        onChange={(e) => {
          // Tolak di sisi klien: format/ukuran di luar aturan Pengaturan (dengan notifikasi).
          const picked = guard.filter(Array.from(e.target.files ?? []));
          e.target.value = "";
          onFiles([...files, ...picked.slice(0, room === Infinity ? undefined : room)]);
        }}
      />
      <PhotoAddBar
        disabled={full}
        onUpload={() => ref.current?.click()}
        onCamera={() => setCamOpen(true)}
        onLink={() => setLinkOpen((o) => !o)}
        linkActive={linkOpen}
      />
      {camOpen && (
        <CameraCapture
          title={cameraTitle}
          items={camItems}
          max={max}
          // Pakai nilai terbaru (ref): beberapa jepretan dapat ditambahkan selama kamera terbuka.
          onCapture={(f) => {
            const msg = guard.check(f);
            if (msg) throw new Error(msg);
            onFiles([...filesRef.current, f]);
          }}
          onDelete={(key) => remove(keyOfSrc(key))}
          onCaption={
            onCaptions
              ? (key, caption) => {
                  const file = [...cache.current].find(([, u]) => u === key)?.[0];
                  const next = new Map(captionsRef.current);
                  if (caption) next.set(file ?? key, caption);
                  else next.delete(file ?? key);
                  onCaptions(next);
                }
              : undefined
          }
          onClose={() => setCamOpen(false)}
        />
      )}
      {linkOpen && (
        <div className="ph-linkbox">
          <textarea
            className="textarea"
            rows={2}
            placeholder={t("photo.urlsPlaceholder")}
            value={text}
            disabled={full}
            aria-label={t("photo.modeUrl")}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="ph-linkbox-foot">
            <span className="helper" style={{ margin: 0 }}>{t("photo.urlHint")} {t("photo.urlsMultiHint")}</span>
            <button type="button" className="btn btn-primary btn-sm" disabled={full || !text.trim()} onClick={addUrls}>
              <Icon name="plus" /> {t("photo.addUrls")}
            </button>
          </div>
          {skipped > 0 && <span className="helper helper-error" style={{ margin: 0 }}>{t("photo.urlSkipped", { n: skipped })}</span>}
        </div>
      )}

      {rules.data && (
        <p className="helper" style={{ margin: 0 }}>
          {t("photo.rulesHint", { types: rules.data.allowedTypes.join(", ").toUpperCase(), size: rules.data.maxSizeMb, max: max ?? "—" })}
          {full && ` ${t("photo.limitReached")}`}
        </p>
      )}
      {capKey != null && (
        <Modal
          title={t("photo.caption")}
          onClose={() => setCapKey(null)}
          actions={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setCapKey(null)}>{t("common.cancel")}</button>
              <button type="button" className="btn btn-primary" onClick={saveCaption}>
                <Icon name="save" /> {t("common.save")}
              </button>
            </>
          }
        >
          <textarea className="textarea" rows={3} maxLength={2000} autoFocus value={capText} placeholder={t("photo.caption")} aria-label={t("photo.caption")} onChange={(e) => setCapText(e.target.value)} />
        </Modal>
      )}
    </div>
  );
}
