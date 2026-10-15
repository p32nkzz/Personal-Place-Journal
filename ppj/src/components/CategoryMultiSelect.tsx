"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";

type Cat = { uid: string; name: string };

const PAGE = 3;

/**
 * Filter kategori pada peta: pilihan ganda, urut nama A–Z, pencarian, dan infinite load
 * (3 data awal, +3 setiap daftar digulir ke dasar). Dasar daftar menampilkan jumlah yang belum dimuat.
 */
export function CategoryMultiSelect({
  categories,
  value,
  onChange,
}: {
  categories: Cat[];
  value: string[];
  onChange: (uids: string[]) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [count, setCount] = useState(PAGE);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [categories],
  );
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? sorted.filter((c) => c.name.toLowerCase().includes(n)) : sorted;
  }, [sorted, q]);
  const shown = filtered.slice(0, count);
  const remaining = filtered.length - shown.length;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    setCount(PAGE);
    setActive(-1);
  }, [q, open]);

  const toggle = (uid: string) =>
    onChange(value.includes(uid) ? value.filter((v) => v !== uid) : [...value, uid]);

  const label =
    value.length === 0
      ? t("map.allCategories")
      : value.length === 1
        ? (categories.find((c) => c.uid === value[0])?.name ?? t("map.allCategories"))
        : t("map.categoriesSelected", { n: value.length });

  const loadMore = () => setCount((c) => Math.min(c + PAGE, filtered.length));

  return (
    <div className="cat-dd" ref={rootRef}>
      <button
        type="button"
        className="cat-dd-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("common.category")}
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => searchRef.current?.focus(), 0);
        }}
      >
        <span className="cat-dd-label">{label}</span>
        {value.length > 1 && <span className="cat-dd-badge">{value.length}</span>}
        <Icon name="chevron-down" fixedWidth={false} style={{ fontSize: 11 }} />
      </button>

      {open && (
        <div className="cat-dd-panel" role="listbox" aria-multiselectable="true">
          <div className="cat-dd-search">
            <input
              ref={searchRef}
              className="input"
              type="search"
              placeholder={t("map.searchCategory")}
              aria-label={t("map.searchCategory")}
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

          <label className="cat-dd-opt cat-dd-all">
            <input type="checkbox" checked={value.length === 0} onChange={() => onChange([])} />
            <span>{t("map.allCategories")}</span>
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
                <span>{c.name}</span>
              </label>
            ))}
            {filtered.length === 0 && <div className="cat-dd-empty">{t("select.noResults")}</div>}
            {remaining > 0 && (
              <button type="button" className="cat-dd-more" onClick={loadMore}>
                {t("map.categoriesRemaining", { n: remaining })}
              </button>
            )}
          </div>

          {value.length > 0 && (
            <button type="button" className="cat-dd-clear" onClick={() => onChange([])}>
              <Icon name="xmark" fixedWidth={false} /> {t("map.clearCategories")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
