import { Icon, type IconName } from "~/components/Icon";

import { readableOn } from "./colors";

/** Ukuran dasar pin (px) pada skala 1; kepala bulat berpusat di (14, 13), ujung lancip di dasar. */
const W = 28;
const H = 38;
const PATH =
  "M14 .75C7.1.75 1.5 6.2 1.5 13c0 4.9 2.8 8.4 6.5 12.1 2.6 2.6 4.6 5.4 5.4 9.6.1.5.3.8.6.8s.5-.3.6-.8c.8-4.2 2.8-7 5.4-9.6 3.7-3.7 6.5-7.2 6.5-12.1C26.5 6.2 20.9.75 14 .75z";

/**
 * Pin peta bergaya tetesan (senada pin Google Maps) dengan ikon putih di kepala pin.
 * Warna dari konfigurasi aplikasi; isi kepala pin berupa ikon (`icon`) atau teks pendek (`glyph`, mis. "+" atau nomor urut).
 */
export function PinShape({
  color,
  icon,
  glyph,
  glyphColor,
  scale = 1,
}: {
  color: string;
  icon?: IconName;
  glyph?: string;
  glyphColor?: string;
  scale?: number;
}) {
  const w = W * scale;
  const h = H * scale;
  const fg = glyphColor ?? readableOn(color);
  return (
    <span className="pin-shape" style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <path d={PATH} fill={color} stroke={`color-mix(in srgb, ${color} 62%, #000)`} strokeWidth="1" />
      </svg>
      {(icon ?? glyph) && (
        <span className="pin-shape-glyph" style={{ top: 13 * scale, fontSize: (icon ? 11.5 : 12.5) * scale, color: fg }}>
          {icon ? <Icon name={icon} fixedWidth={false} /> : glyph}
        </span>
      )}
    </span>
  );
}
