import { Fancybox } from "@fancyapps/ui";
import { icon as faIcon } from "@fortawesome/fontawesome-svg-core";
import { faThumbtack } from "@fortawesome/free-solid-svg-icons";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

export type PreviewItem = { src: string; caption?: string | null };

/** Tombol bawaan Fancybox di sisi kanan toolbar (zoom, slideshow, layar penuh, thumbnail, tutup). */
const defaultRight = (thumbs: boolean) => ["iterateZoom", "slideshow", "fullscreen", ...(thumbs ? ["thumbs"] : []), "close"];

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Pratinjau foto dengan Fancybox plus satu tombol aksi di toolbar (mis. Hapus / Pilih).
 * `isDone` menandai item yang aksinya sudah dilakukan (tombol dinonaktifkan, label berganti).
 */
export function openPhotoPreview(
  items: PreviewItem[],
  startIndex: number,
  action?: {
    label: string;
    doneLabel?: string;
    danger?: boolean;
    closeAfter?: boolean;
    /** Setelah aksi, item dibuang dari pratinjau: pindah ke foto lain, atau tutup bila habis. */
    removeAfter?: boolean;
    isDone?: (item: PreviewItem, index: number) => boolean;
    onAction: (item: PreviewItem, index: number) => void;
  },
  /** Aksi tambahan di toolbar (mis. Ubah / Hapus). Pratinjau ditutup setelah aksi dijalankan. */
  extras?: {
    label: string;
    danger?: boolean;
    /** Warna tombol teks: "edit" = biru muda seperti tombol ubah pada daftar foto. */
    tone?: "edit";
    /** Tombol ikon bulat berwarna (tanpa teks); `label` menjadi tooltip. Saat ini hanya ikon "thumbtack" (foto utama). */
    iconOnly?: "primary";
    /** Aksi yang tidak menutup pratinjau (mis. "Jadikan utama"). */
    keepOpen?: boolean;
    /** Menandai slide yang aksinya sudah berlaku: tombol dinonaktifkan dan labelnya berganti. */
    isDone?: (item: PreviewItem, index: number) => boolean;
    doneLabel?: string;
    onAction: (item: PreviewItem, index: number) => void;
  }[],
) {
  const refresh = (fb: Fancybox) => {
    if (!action) return;
    const idx = fb.getSlide()?.index ?? 0;
    const btn = fb.container?.querySelector<HTMLButtonElement>(".ppj-fb-act");
    if (!btn) return;
    const done = !!action.isDone?.(items[idx]!, idx);
    btn.disabled = done;
    btn.textContent = done && action.doneLabel ? action.doneLabel : action.label;
  };

  // Status tombol aksi tambahan per slide (mis. "Foto utama" dinonaktifkan pada foto yang sudah utama).
  const refreshExtras = (fb: Fancybox) => {
    if (!extras?.length || action) return;
    const idx = fb.getSlide()?.index ?? 0;
    extras.forEach((ex, i) => {
      if (!ex.isDone) return;
      const btn = fb.container?.querySelectorAll<HTMLButtonElement>(".fancybox__toolbar__column.is-left .ppj-fb-act, .fancybox__toolbar__column.is-left .ppj-fb-ico")[i];
      if (!btn) return;
      const done = ex.isDone(items[idx]!, idx);
      btn.disabled = done;
      const text = done && ex.doneLabel ? ex.doneLabel : ex.label;
      if (ex.iconOnly) {
        btn.title = text;
        btn.setAttribute("aria-label", text);
        btn.classList.toggle("is-done", done);
      } else btn.textContent = text;
    });
  };

  const fb = Fancybox.show(
    items.map((i) => ({
      src: i.src,
      type: "image" as const,
      caption: i.caption ? escapeHtml(i.caption) : undefined,
    })),
    {
      startIndex,
      Hash: false,
      // Strip thumbnail tidak ikut diperbarui saat slide dihapus, jadi dimatikan pada mode hapus.
      ...(action?.removeAfter ? { Thumbs: false as const } : {}),
      ...(extras?.length && !action
        ? {
            Toolbar: {
              // Aksi tambahan di kiri (sebelah info jumlah foto); tombol bawaan Fancybox tetap di kanan.
              display: { left: ["infobar", ...extras.map((_, i) => `ex${i}`)], middle: [], right: defaultRight(true) },
              items: Object.fromEntries(
                extras.map((ex, i) => [
                  `ex${i}`,
                  {
                    tpl: ex.iconOnly
                      ? `<button type="button" class="ppj-fb-ico is-primary" title="${escapeHtml(ex.label)}" aria-label="${escapeHtml(ex.label)}">${faIcon(faThumbtack).html[0] ?? ""}</button>`
                      : `<button type="button" class="ppj-fb-act${ex.danger ? " is-danger" : ""}${ex.tone === "edit" ? " is-edit" : ""}">${escapeHtml(ex.label)}</button>`,
                    click: () => {
                      const fb = Fancybox.getInstance();
                      if (!fb) return;
                      const idx = fb.getSlide()?.index ?? 0;
                      if (ex.keepOpen) {
                        ex.onAction(items[idx]!, idx);
                        refreshExtras(fb);
                        return;
                      }
                      fb.close();
                      ex.onAction(items[idx]!, idx);
                    },
                  },
                ]),
              ),
            },
          }
        : {}),
      ...(action
        ? {
            Toolbar: {
              display: { left: ["infobar", "act"], middle: [], right: defaultRight(!action.removeAfter) },
              items: {
                act: {
                  tpl: `<button type="button" class="ppj-fb-act${action.danger ? " is-danger" : ""}">${escapeHtml(action.label)}</button>`,
                  click: () => {
                    const fb = Fancybox.getInstance();
                    if (!fb) return;
                    const idx = fb.getSlide()?.index ?? 0;
                    action.onAction(items[idx]!, idx);
                    if (action.closeAfter) fb.close();
                    else if (action.removeAfter) {
                      items.splice(idx, 1);
                      if (!items.length) fb.close();
                      else {
                        fb.carousel?.removeSlide(idx);
                        fb.jumpTo(Math.min(idx, items.length - 1), { friction: 0 });
                        refresh(fb);
                      }
                    } else refresh(fb);
                  },
                },
              },
            },
          }
        : {}),
    },
  );
  // Segarkan status tombol saat slide siap dan setiap berganti slide.
  fb.on(["ready", "Carousel.change"], () => {
    refresh(fb);
    refreshExtras(fb);
  });
}
