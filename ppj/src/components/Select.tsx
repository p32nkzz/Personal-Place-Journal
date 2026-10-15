"use client";

import { useEffect, useId, useRef } from "react";

import { useT } from "~/lib/i18n";

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & {
  value: string;
  /** Kompatibel dengan pola `onChange={(e) => set(e.target.value)}`. */
  onChange: (e: { target: { value: string } }) => void;
  /** Lebar kontainer select2 (default: mengikuti style/CSS elemen). */
  width?: string;
  /** Tampilkan kotak pencarian bila jumlah opsi ≥ nilai ini (default 6). */
  searchFrom?: number;
};

/**
 * Combobox berbasis plugin Select2 (jQuery) yang membungkus <select> native.
 * React tetap memegang nilai dan daftar <option>; Select2 hanya mengganti tampilan.
 */
export function Select({
  value,
  onChange,
  children,
  className = "select",
  style,
  width,
  searchFrom = 6,
  disabled,
  id,
  ...rest
}: Props) {
  const { t } = useT();
  const ref = useRef<HTMLSelectElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const uid = useId();
  const selectId = id ?? `sel-${uid.replace(/:/g, "")}`;

  // Inisialisasi sekali (dimuat dinamis agar aman dari SSR).
  useEffect(() => {
    let destroyed = false;
    let $el: JQuery<HTMLSelectElement> | null = null;
    void (async () => {
      const $ = (await import("jquery")).default;
      (window as unknown as { jQuery: unknown; $: unknown }).jQuery = $;
      (window as unknown as { jQuery: unknown; $: unknown }).$ = $;
      // select2 (CommonJS) mengekspor fungsi yang harus dipanggil dengan instance jQuery.
      const mod = (await import("select2")) as unknown as { default?: unknown };
      const attach = (mod.default ?? mod) as (root: Window, jq: typeof $) => unknown;
      if (typeof attach === "function" && !$.fn.select2) attach(window, $);
      if (destroyed || !ref.current) return;
      $el = $(ref.current);
      $el.select2({
        width: width ?? "100%",
        minimumResultsForSearch: searchFrom,
        dropdownAutoWidth: false,
        language: {
          noResults: () => t("select.noResults"),
          searching: () => t("select.searching"),
        },
      });
      $el.val(value).trigger("change.select2");
      $el.on("change.ppj", () => onChangeRef.current({ target: { value: String($el?.val() ?? "") } }));
    })();
    return () => {
      destroyed = true;
      if ($el) {
        $el.off("change.ppj");
        if ($el.data("select2")) $el.select2("destroy");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkronisasi nilai/opsi/disabled dari React ke Select2.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    void import("jquery").then(({ default: $ }) => {
      const $el = $(el);
      if ($el.data("select2")) {
        $el.prop("disabled", !!disabled);
        if ($el.val() !== value) $el.val(value);
        $el.trigger("change.select2");
      }
    });
  });

  return (
    <select
      ref={ref}
      id={selectId}
      className={className}
      style={style}
      value={value}
      disabled={disabled}
      onChange={() => {
        // Perubahan datang dari Select2 (handler jQuery); handler native hanya mencegah warning React.
      }}
      {...rest}
    >
      {children}
    </select>
  );
}
