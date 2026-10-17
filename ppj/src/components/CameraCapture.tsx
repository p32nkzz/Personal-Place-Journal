"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";

type Facing = "environment" | "user";
type Status = "starting" | "live" | "denied" | "unavailable";

/** Foto yang dikelola dari dalam dialog kamera (foto lama maupun hasil jepretan). */
export type CamItem = { key: string; src: string; caption: string | null };

/** Sisi terpanjang hasil foto; cukup tajam untuk dokumentasi dan tetap di bawah batas ukuran unggah. */
const MAX_SIDE = 2560;

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/**
 * Ambil foto langsung dari kamera perangkat (getUserMedia); di ponsel dapat berganti kamera depan/belakang.
 * Setiap jepretan langsung ditambahkan dan tampil sebagai thumbnail. Thumbnail (foto lama maupun baru)
 * dapat dipratinjau, diberi keterangan, dan dihapus tanpa keluar dari dialog.
 * Bila kamera tidak dapat dibuka (izin ditolak, bukan HTTPS, tanpa kamera) tersedia cadangan:
 * kamera bawaan perangkat lewat input file `capture`.
 */
export function CameraCapture({
  items,
  max,
  onCapture,
  onDelete,
  onCaption,
  onClose,
}: {
  /** Foto yang sudah ada (urutan tampil). */
  items: CamItem[];
  /** Batas jumlah foto (null/undefined = tanpa batas). */
  max?: number | null;
  onCapture: (file: File) => Promise<unknown> | void;
  onDelete?: (key: string) => Promise<unknown> | void;
  onCaption?: (key: string, caption: string) => Promise<unknown> | void;
  onClose: () => void;
}) {
  const { t } = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [status, setStatus] = useState<Status>("starting");
  const [canSwitch, setCanSwitch] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Jepretan yang masih diproses/diunggah (tampil sebagai thumbnail dengan indikator).
  const [uploading, setUploading] = useState<{ key: string; src: string }[]>([]);
  // Pratinjau di dalam dialog.
  const [viewKey, setViewKey] = useState<string | null>(null);
  const [capText, setCapText] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState<"caption" | "delete" | null>(null);

  const total = items.length + uploading.length;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const left = max == null ? Infinity : Math.max(0, max - total);
  const viewIndex = viewKey ? items.findIndex((x) => x.key === viewKey) : -1;
  const viewing = viewIndex >= 0 ? items[viewIndex]! : null;

  const errText = (e: unknown) => {
    const code = (e as Error)?.message ?? "";
    const key = `err.${code}`;
    const tr = t(key);
    return tr !== key ? tr : t("err.GENERIC");
  };

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  // Nyalakan kamera sesuai arah yang dipilih; dijalankan ulang saat berganti depan/belakang.
  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      stop();
      setStatus("starting");
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStatus("live");
        // Daftar kamera baru lengkap setelah izin diberikan.
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) setCanSwitch(devices.filter((d) => d.kind === "videoinput").length > 1);
      } catch (e) {
        if (cancelled) return;
        const name = (e as DOMException)?.name;
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      }
    };
    void start();
    return () => {
      cancelled = true;
    };
  }, [facing, stop]);

  useEffect(() => () => stop(), [stop]);

  // Escape: tutup pratinjau dulu, baru dialog. Kunci gulir halaman selama kamera terbuka.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Fase capture + hentikan propagasi: dialog/modal di bawah kamera tidak ikut tertutup.
      e.stopPropagation();
      if (viewKey) setViewKey(null);
      else onClose();
    };
    document.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [onClose, viewKey]);

  // Thumbnail terbaru selalu terlihat (gulir strip ke kanan saat ada foto baru).
  useEffect(() => {
    const el = stripRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [total]);

  const add = async (file: File) => {
    const key = `up-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const src = URL.createObjectURL(file);
    setUploading((u) => [...u, { key, src }]);
    setError(null);
    const before = itemsRef.current.length;
    try {
      await onCapture(file);
      // Tunggu foto baru masuk ke daftar (mis. setelah data dimuat ulang) agar thumbnail tidak berkedip.
      for (let i = 0; i < 30 && itemsRef.current.length <= before; i++) await new Promise((r) => setTimeout(r, 100));
    } catch (e) {
      setError(errText(e));
    } finally {
      setUploading((u) => u.filter((x) => x.key !== key));
      // Beri waktu thumbnail asli tampil sebelum URL sementara dilepas.
      setTimeout(() => URL.revokeObjectURL(src), 4000);
    }
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || left <= 0) return;
    // Pratinjau memenuhi layar (object-fit: cover), jadi hasil dipotong mengikuti bingkai yang terlihat:
    // yang tersimpan sama persis dengan yang dilihat user.
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    const frame = v.clientWidth && v.clientHeight ? v.clientWidth / v.clientHeight : vw / vh;
    let sw = vw;
    let sh = vh;
    if (vw / vh > frame) sw = Math.round(vh * frame);
    else sh = Math.round(vw / frame);
    const sx = Math.round((vw - sw) / 2);
    const sy = Math.round((vh - sh) / 2);
    const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Kamera depan ditampilkan seperti cermin; hasil disimpan apa adanya (tidak terbalik).
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    canvas.toBlob(
      (blob) => {
        if (blob) void add(new File([blob], `kamera-${stamp()}.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
      },
      "image/jpeg",
      0.9,
    );
  };

  const openView = (key: string) => {
    const it = items.find((x) => x.key === key);
    if (!it) return;
    setViewKey(key);
    setCapText(it.caption ?? "");
    setConfirmDel(false);
    setError(null);
  };
  const step = (d: number) => {
    if (viewIndex < 0 || !items.length) return;
    const next = items[(viewIndex + d + items.length) % items.length]!;
    openView(next.key);
  };

  const saveCaption = async () => {
    if (!viewing || !onCaption) return;
    setBusy("caption");
    setError(null);
    try {
      await onCaption(viewing.key, capText.trim());
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!viewing || !onDelete) return;
    if (!confirmDel) {
      setConfirmDel(true);
      return;
    }
    setBusy("delete");
    setError(null);
    const idx = viewIndex;
    const rest = items.filter((x) => x.key !== viewing.key);
    try {
      await onDelete(viewing.key);
      // Lanjut ke foto berikutnya; kembali ke kamera bila sudah tidak ada foto.
      const next = rest[Math.min(idx, rest.length - 1)];
      if (next) openView(next.key);
      else setViewKey(null);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(null);
      setConfirmDel(false);
    }
  };

  const blocked = status === "denied" || status === "unavailable";
  const captionDirty = !!viewing && capText.trim() !== (viewing.caption ?? "");

  const strip = (items.length > 0 || uploading.length > 0) && (
    <div className="cam-strip" ref={stripRef} aria-label={t("photo.cameraGallery")}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className={`cam-thumb${it.key === viewKey ? " is-active" : ""}`}
          onClick={() => openView(it.key)}
          title={it.caption ?? t("photo.view")}
          aria-label={it.caption ?? t("photo.view")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.src} alt="" referrerPolicy="no-referrer" />
          {it.caption && <span className="cam-thumb-cap" aria-hidden><Icon name="pen" fixedWidth={false} /></span>}
        </button>
      ))}
      {uploading.map((u) => (
        <span key={u.key} className="cam-thumb is-busy" aria-label={t("common.processing")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u.src} alt="" />
          <Icon name="refresh" spin fixedWidth={false} />
        </span>
      ))}
    </div>
  );

  const ui = (
    <div className="cam" role="dialog" aria-modal="true" aria-label={t("photo.cameraTitle")}>
      <div className="cam-stage">
        <video
          ref={videoRef}
          className={`cam-video${facing === "user" ? " is-mirror" : ""}`}
          playsInline
          muted
          autoPlay
          hidden={!!viewing || blocked}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {viewing && <img className="cam-shot" src={viewing.src} alt={viewing.caption ?? ""} referrerPolicy="no-referrer" />}
        {viewing && items.length > 1 && (
          <>
            <button type="button" className="cam-nav is-prev" onClick={() => step(-1)} aria-label={t("table.prev")} title={t("table.prev")}>
              <Icon name="angle-left" fixedWidth={false} />
            </button>
            <button type="button" className="cam-nav is-next" onClick={() => step(1)} aria-label={t("table.next")} title={t("table.next")}>
              <Icon name="angle-right" fixedWidth={false} />
            </button>
          </>
        )}
        {!viewing && status === "starting" && (
          <div className="cam-msg">
            <Icon name="refresh" spin fixedWidth={false} /> {t("photo.cameraStarting")}
          </div>
        )}
        {!viewing && blocked && (
          <div className="cam-msg cam-msg-box">
            <Icon name="warning" fixedWidth={false} />
            <p>{status === "denied" ? t("photo.cameraDenied") : t("photo.cameraUnavailable")}</p>
            <input
              ref={fallbackRef}
              type="file"
              accept="image/*"
              capture={facing}
              hidden
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []).slice(0, left === Infinity ? undefined : left);
                e.target.value = "";
                for (const f of picked) void add(f);
              }}
            />
            <button type="button" className="btn btn-primary btn-sm" disabled={left <= 0} onClick={() => fallbackRef.current?.click()}>
              <Icon name="camera" /> {t("photo.cameraFallback")}
            </button>
          </div>
        )}
        {flash && <div className="cam-flash" aria-hidden />}
      </div>

      <div className="cam-top">
        {viewing ? (
          <button type="button" className="cam-icon" onClick={() => setViewKey(null)} aria-label={t("photo.cameraBack")} title={t("photo.cameraBack")}>
            <Icon name="arrow-left" fixedWidth={false} />
          </button>
        ) : (
          <button type="button" className="cam-icon" onClick={onClose} aria-label={t("common.close")} title={t("common.close")}>
            <Icon name="xmark" fixedWidth={false} />
          </button>
        )}
        <span className="cam-title">
          {viewing ? (
            <>
              <Icon name="image" fixedWidth={false} /> {viewIndex + 1}/{items.length}
            </>
          ) : (
            <>
              <Icon name="camera" fixedWidth={false} /> {t("photo.cameraTitle")}
              {total > 0 && <span className="cam-count">{max != null ? `${total}/${max}` : total}</span>}
            </>
          )}
        </span>
        {!viewing && canSwitch && !blocked ? (
          <button
            type="button"
            className="cam-icon"
            disabled={status !== "live"}
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            aria-label={t("photo.cameraSwitch")}
            title={t("photo.cameraSwitch")}
          >
            <Icon name="repeat" fixedWidth={false} />
          </button>
        ) : (
          <span className="cam-icon is-ghost" aria-hidden />
        )}
      </div>

      <div className="cam-bottom">
        {error && (
          <div className="cam-error" role="alert">
            <Icon name="warning" fixedWidth={false} /> {error}
          </div>
        )}
        {viewing ? (
          <div className="cam-edit">
            {onCaption && (
              <div className="cam-caption">
                <input
                  className="cam-input"
                  value={capText}
                  maxLength={2000}
                  placeholder={t("photo.caption")}
                  aria-label={t("photo.caption")}
                  onChange={(e) => setCapText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && captionDirty) void saveCaption();
                  }}
                />
                <button type="button" className="cam-pill is-primary" disabled={!captionDirty || busy !== null} onClick={() => void saveCaption()}>
                  <Icon name={busy === "caption" ? "refresh" : "save"} spin={busy === "caption"} fixedWidth={false} /> {t("common.save")}
                </button>
              </div>
            )}
            <div className="cam-edit-actions">
              {onDelete && (
                <button type="button" className={`cam-pill is-danger${confirmDel ? " is-confirm" : ""}`} disabled={busy !== null} onClick={() => void remove()}>
                  <Icon name={busy === "delete" ? "refresh" : "trash"} spin={busy === "delete"} fixedWidth={false} />{" "}
                  {confirmDel ? t("photo.cameraDeleteConfirm") : t("common.delete")}
                </button>
              )}
              <button type="button" className="cam-pill" onClick={() => setViewKey(null)}>
                <Icon name="camera" fixedWidth={false} /> {t("photo.cameraBack")}
              </button>
            </div>
            {strip}
          </div>
        ) : (
          <>
            {strip}
            {!blocked && (
              <div className="cam-controls">
                <span className="cam-side" />
                <button
                  type="button"
                  className="cam-shutter"
                  disabled={status !== "live" || left <= 0}
                  onClick={capture}
                  aria-label={t("photo.cameraCapture")}
                  title={left <= 0 ? t("photo.limitReached") : t("photo.cameraCapture")}
                >
                  <span />
                </button>
                <span className="cam-side">
                  {total > 0 && (
                    <button type="button" className="cam-pill" onClick={onClose}>
                      {t("photo.cameraDone")}
                    </button>
                  )}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(ui, document.body);
}
