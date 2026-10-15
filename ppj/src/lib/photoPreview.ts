import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

export type PreviewItem = { src: string; caption?: string | null };

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
      ...(action
        ? {
            Toolbar: {
              display: { left: ["infobar"], middle: [], right: ["act", "close"] },
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
  fb.on(["ready", "Carousel.change"], () => refresh(fb));
}
