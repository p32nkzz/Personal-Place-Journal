"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Icon, type IconName } from "~/components/Icon";
import { useT } from "~/lib/i18n";

export type MultiSelectItem = { uid: string; name: string };

/**
 * Dropdown pilihan ganda: pencarian, opsi "Semua", navigasi panah/Enter, dan muat bertahap
 * (`pageSize` data awal, bertambah saat daftar digulir ke dasar; sisa yang belum dimuat ditampilkan).
 */
export function MultiSelect<T extends MultiSelectItem>({
  items,
  value,
  onChange,
  ariaLabel,
  allLabel,
  selectedLabel,
  searchPlaceholder,
  remainingLabel,
  clearLabel,
  pageSize = 3,
  sort = true,
  searchable = true,
  compact = false,
  icon,
  renderOption,
  renderValue,
}: {
  items: T[];
  value: string[];
  onChange: (uids: string[]) => void;
  ariaLabel: string;
  allLabel: string;
  selectedLabel: (n: number) => string;
  searchPlaceholder?: string;
  remainingLabel?: (n: number) => string;
  clearLabel?: string;
  pageSize?: number;
  sort?: boolean;
  searchable?: boolean;
  /** Varian ringkas (tinggi 36px, tanpa bayangan) untuk bar filter tabel. */
  compact?: boolean;
  icon?: IconName;
  renderOption?: (item: T) => React.ReactNode;
  /** Isi tombol saat ada pilihan (bawaan: nama bila 1, "n dipilih" bila lebih). */
  renderValue?: (selected: T[]) => React.ReactNode;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [count, setCount] = useState(pageSize);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(
    () => (sort ? [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })) : items),
    [items, sort],
  );
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? sorted.filter((c) => c.name.toLowerCase().includes(n)) : sorted;
  }, [sorted, q]);
  const shown = filtered.slice(0, count);
  const remaining = filtered.length - shown.length;
  const selected = useMemo(() => items.filter((i) => value.includes(i.uid)), [items, value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    setCount(pageSize);
    setActive(-1);
  }, [q, open, pageSize]);

  const toggle = (uid: string) =>
    onChange(value.includes(uid) ? value.filter((v) => v !== uid) : [...value, uid]);
  const loadMore = () => setCount((c) => Math.min(c + pageSize, filtered.length));

  const label =
    selected.length === 0
      ? allLabel
      : renderValue
        ? renderValue(selected)
        : selected.length === 1
          ? selected[0]!.name
          : selectedLabel(selected.length);

  return (
    <div className={`cat-dd${compact ? " is-compact" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="cat-dd-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={ariaLabel}
        data-active={selected.length > 0 || undefined}
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => searchRef.current?.focus(), 0);
        }}
      >
        {icon && <Icon name={icon} fixedWidth={false} className="cat-dd-icon" />}
        <span className="cat-dd-label">{label}</span>
        {selected.length > 1 && !renderValue && <span className="cat-dd-badge">{selected.length}</span>}
        <Icon name="chevron-down" fixedWidth={false} style={{ fontSize: 10 }} />
      </button>

      {open && (
        <div className="cat-dd-panel" role="listbox" aria-multiselectable="true" aria-label={ariaLabel}>
          {searchable && (
            <div className="cat-dd-search">
              <input
                ref={searchRef}
                className="input"
                type="search"
                placeholder={searchPlaceholder ?? t("common.search")}
                aria-label={searchPlaceholder ?? t("common.search")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const n = active + 1;
                    if (n >= shown.length && remaining > 0) loadMore();
                    setActive(Math.min(n, filtered.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const c = shown[active];
                    if (c) toggle(c.uid);
                  }
                }}
              />
            </div>
          )}

          <label className="cat-dd-opt cat-dd-all">
            <input type="checkbox" checked={value.length === 0} onChange={() => onChange([])} />
            <span>{allLabel}</span>
          </label>

          <div
            className="cat-dd-list"
            tabIndex={-1}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (remaining > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 6) loadMore();
            }}
          >
            {shown.map((c, i) => (
              <label
                key={c.uid}
                className={`cat-dd-opt ${i === active ? "is-active" : ""}`}
                ref={(el) => {
                  if (el && i === active) el.scrollIntoView({ block: "nearest" });
                }}
              >
                <input type="checkbox" checked={value.includes(c.uid)} onChange={() => toggle(c.uid)} />
                <span className="cat-dd-opt-label">{renderOption ? renderOption(c) : c.name}</span>
              </label>
            ))}
            {filtered.length === 0 && <div className="cat-dd-empty">{t("select.noResults")}</div>}
            {remaining > 0 && (
              <button type="button" className="cat-dd-more" onClick={loadMore}>
                {remainingLabel ? remainingLabel(remaining) : t("place.remaining", { n: remaining })}
              </button>
            )}
          </div>

          {value.length > 0 && clearLabel && (
            <button type="button" className="cat-dd-clear" onClick={() => onChange([])}>
              <Icon name="xmark" fixedWidth={false} /> {clearLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
