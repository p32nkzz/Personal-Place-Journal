"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CameraCapture, type CamItem } from "~/components/CameraCapture";
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

  // Foto untuk dialog kamera: berkas (pratinjau lokal) lalu link; kunci = URL pratinjau / URL link.
  const camItems: CamItem[] = [
    ...files.map((f, i) => ({ key: previews[i]!, src: previews[i]!, caption: captions?.get(f) ?? null })),
    ...urls.map((u) => ({ key: u, src: u, caption: captions?.get(u) ?? null })),
  ];

  // Pratinjau seluruh foto terpilih (berkas dulu, lalu link); dapat menghapus langsung dari pratinjau.
  const preview = (index: number) =>
    openPhotoPreview(
      [...previews.map((src, i) => ({ src, caption: captions?.get(files[i]!) ?? files[i]!.name })), ...urls.map((src) => ({ src, caption: captions?.get(src) ?? src }))],
      index,
      {
        label: t("common.delete"),
        danger: true,
        removeAfter: true,
        // Pratinjau tetap terbuka setelah hapus, jadi pakai nilai terbaru (ref), bukan closure saat dibuka.
        onAction: (item) => {
          const file = [...cache.current].find(([, u]) => u === item.src)?.[0];
          if (file) onFiles(filesRef.current.filter((x) => x !== file));
          else onUrls(urlsRef.current.filter((x) => x !== item.src));
        },
      },
    );

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
          {files.map((f, i) => (
            <div key={`f-${f.name}-${i}`} className="photo">
              <button type="button" aria-label={t("photo.view")} onClick={() => preview(i)} style={{ all: "unset", cursor: "zoom-in", display: "block", width: "100%", height: "100%" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previews[i]} alt={f.name} />
              </button>
              <div className="photo-actions">
                <button type="button" className="btn" onClick={() => onFiles(files.filter((_, j) => j !== i))}>
                  <Icon name="trash" /> {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
          {urls.map((u, n) => (
            <div key={`u-${u}`} className="photo">
              <button type="button" aria-label={t("photo.view")} onClick={() => preview(files.length + n)} style={{ all: "unset", cursor: "zoom-in", display: "block", width: "100%", height: "100%" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" loading="lazy" referrerPolicy="no-referrer" />
              </button>
              <div className="photo-actions">
                <button type="button" className="btn" onClick={() => onUrls(urls.filter((x) => x !== u))}>
                  <Icon name="trash" /> {t("common.delete")}
                </button>
              </div>
              <div style={{ position: "absolute", top: 6, left: 6, background: "rgb(15 23 42 / 0.6)", color: "#fff", fontSize: 11, padding: "2px 6px", borderRadius: 4 }}>
                <Icon name="link" fixedWidth={false} /> URL
              </div>
            </div>
          ))}
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
          items={camItems}
          max={max}
          // Pakai nilai terbaru (ref): beberapa jepretan dapat ditambahkan selama kamera terbuka.
          onCapture={(f) => {
            const msg = guard.check(f);
            if (msg) throw new Error(msg);
            onFiles([...filesRef.current, f]);
          }}
          onDelete={(key) => {
            const file = [...cache.current].find(([, u]) => u === key)?.[0];
            if (file) onFiles(filesRef.current.filter((x) => x !== file));
            else onUrls(urlsRef.current.filter((x) => x !== key));
          }}
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
    </div>
  );
}
