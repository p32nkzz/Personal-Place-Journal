"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "~/components/Icon";
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
}: {
  files: File[];
  urls: string[];
  onFiles: (f: File[]) => void;
  onUrls: (u: string[]) => void;
}) {
  const { t } = useT();
  const rules = api.settings.photoRules.useQuery();
  const ref = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [text, setText] = useState("");
  const [skipped, setSkipped] = useState(0);
  const max = rules.data?.maxPerMyPlace;
  const total = files.length + urls.length;
  const room = max != null ? Math.max(0, max - total) : Infinity;
  const full = room === 0;
  // URL pratinjau di-cache per berkas agar slide yang masih terbuka di Fancybox tidak rusak
  // saat berkas lain dihapus; URL dilepas hanya untuk berkas yang sudah tidak ada.
  const cache = useRef(new Map<File, string>());
  const filesRef = useRef(files);
  const urlsRef = useRef(urls);
  filesRef.current = files;
  urlsRef.current = urls;
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

  // Pratinjau seluruh foto terpilih (berkas dulu, lalu link); dapat menghapus langsung dari pratinjau.
  const preview = (index: number) =>
    openPhotoPreview(
      [...previews.map((src, i) => ({ src, caption: files[i]!.name })), ...urls.map((src) => ({ src, caption: src }))],
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
      <div className="row" style={{ gap: 6 }}>
        <button type="button" className="chip" aria-pressed={mode === "upload"} onClick={() => setMode("upload")}>
          <Icon name="upload" /> {t("photo.modeUpload")}
        </button>
        <button type="button" className="chip" aria-pressed={mode === "url"} onClick={() => setMode("url")}>
          <Icon name="link" /> {t("photo.modeUrl")}
        </button>
      </div>

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

      {mode === "upload" ? (
        <div className="row">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              e.target.value = "";
              onFiles([...files, ...picked.slice(0, room === Infinity ? undefined : room)]);
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm" disabled={full} onClick={() => ref.current?.click()}>
            <Icon name="upload" /> {t("photo.upload")}
          </button>
        </div>
      ) : (
        <div className="stack-sm">
          <textarea
            className="textarea"
            style={{ minHeight: 76 }}
            placeholder={t("photo.urlsPlaceholder")}
            value={text}
            disabled={full}
            aria-label={t("photo.modeUrl")}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="row">
            <button type="button" className="btn btn-secondary btn-sm" disabled={full || !text.trim()} onClick={addUrls}>
              <Icon name="plus" /> {t("photo.addUrls")}
            </button>
            {skipped > 0 && <span className="helper helper-error" style={{ margin: 0 }}>{t("photo.urlSkipped", { n: skipped })}</span>}
          </div>
          <p className="helper" style={{ margin: 0 }}>{t("photo.urlHint")} {t("photo.urlsMultiHint")}</p>
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
