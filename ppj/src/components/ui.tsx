"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useT } from "~/lib/i18n";
import { Icon, type IconName } from "./Icon";
import { Select } from "./Select";

/* ------------------------------ Errors -------------------------------- */

/** Menerjemahkan error tRPC (kode pesan) menjadi teks antarmuka. */
export function useErrorMessage() {
  const { t } = useT();
  return useCallback(
    (e: unknown): string => {
      const err = e as {
        message?: string;
        data?: {
          zodError?: {
            fieldErrors?: Record<string, string[]>;
            formErrors?: string[];
          } | null;
        };
      };
      const zod = err?.data?.zodError;
      const all = [
        ...(zod?.formErrors ?? []),
        ...Object.values(zod?.fieldErrors ?? {}).flat(),
      ];
      if (all.length) {
        const first = all[0] ?? "";
        const key = `err.${first}`;
        const tr = t(key);
        return tr !== key ? tr : t("err.VALIDATION");
      }
      const msg = err?.message ?? "";
      if (/^[A-Z][A-Z0-9_]+$/.test(msg)) {
        const key = `err.${msg}`;
        const tr = t(key);
        if (tr !== key) return tr;
      }
      if (err?.data && "zodError" in err.data) return t("err.VALIDATION");
      return t("err.GENERIC");
    },
    [t],
  );
}

/* ------------------------------- Toast -------------------------------- */

type ToastItem = { id: number; kind: "info" | "success" | "error"; text: string };
const ToastCtx = createContext<{
  push: (text: string, kind?: ToastItem["kind"]) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const push = useCallback((text: string, kind: ToastItem["kind"] = "info") => {
    const id = ++idRef.current;
    setItems((x) => [...x, { id, kind, text }]);
    // Pesan error dan peringatan penting tidak hilang otomatis (DESIGN.md: jangan auto-dismiss alert penting).
    if (kind !== "error") setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4500);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`toast toast-${i.kind}`}>
            <span style={{ flex: 1 }}>{i.text}</span>
            <button
              aria-label="Close"
              onClick={() => setItems((x) => x.filter((y) => y.id !== i.id))}
            >
              <Icon name="xmark" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx;
}

/* ------------------------------ Modal --------------------------------- */

export function Modal({
  title,
  children,
  onClose,
  large,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  large?: boolean;
  actions?: React.ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`modal ${large ? "modal-lg" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
  children,
  disabled,
}: {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <Modal
      title={title}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy || disabled}
          >
            {busy ? t("common.processing") : (confirmLabel ?? t("common.confirm"))}
          </button>
        </>
      }
    >
      {message && <div className="stack-sm">{message}</div>}
      {children}
    </Modal>
  );
}


/** Badge status yang dapat diklik untuk mengubah status (selalu diikuti dialog konfirmasi). */
export function StatusButton({
  tone,
  children,
  onClick,
  disabled,
}: {
  tone: "success" | "warning" | "info" | "error" | "neutral";
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const { t } = useT();
  const icon = { success: "circle-check", warning: "warning", info: "circle-info", error: "circle-xmark", neutral: "circle-regular" }[tone] as IconName;
  return (
    <button
      type="button"
      className={`status status-${tone} status-btn`}
      onClick={onClick}
      disabled={disabled}
      title={t("status.clickToChange")}
      aria-label={`${typeof children === "string" ? children : ""} — ${t("status.clickToChange")}`}
    >
      <Icon name={icon} fixedWidth={false} />
      {children}
      <Icon name="repeat" fixedWidth={false} className="status-btn-ico" />
    </button>
  );
}

/** Dialog konfirmasi perubahan status Aktif ⇄ Tidak aktif. */
export function StatusConfirm({
  name,
  toActive,
  busy,
  extra,
  onConfirm,
  onClose,
}: {
  name: string;
  toActive: boolean;
  busy?: boolean;
  extra?: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const to = toActive ? t("common.active") : t("common.inactive");
  const from = toActive ? t("common.inactive") : t("common.active");
  return (
    <ConfirmDialog
      title={t("status.confirmTitle")}
      message={
        <>
          <p style={{ margin: 0 }}>{t("status.confirmText", { name, from, to })}</p>
          {extra}
        </>
      }
      confirmLabel={t("status.confirmButton", { to })}
      busy={busy}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}

/* ------------------------------ Display ------------------------------- */

export function Spinner({ label }: { label?: string }) {
  const { t } = useT();
  return (
    <div className="loading" role="status">
      <Icon name="refresh" spin fixedWidth={false} style={{ color: "var(--color-primary)" }} />
      <span>{label ?? t("common.loading")}</span>
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {text && <p style={{ margin: "0 0 12px" }}>{text}</p>}
      {action}
    </div>
  );
}

export function Alert({
  kind = "info",
  children,
}: {
  kind?: "info" | "warning" | "error" | "success";
  children: React.ReactNode;
}) {
  const icon = { info: "circle-info", warning: "warning", error: "warning", success: "circle-check" }[kind] as IconName;
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : undefined}>
      <Icon name={icon} style={{ marginTop: 3 }} />
      <div>{children}</div>
    </div>
  );
}

/** Status selalu berupa ikon + teks, tidak hanya warna (DESIGN.md Do #3). */
export function StatusChip({
  tone,
  children,
}: {
  tone: "success" | "warning" | "info" | "error" | "neutral";
  children: React.ReactNode;
}) {
  const icon = { success: "circle-check", warning: "warning", info: "circle-info", error: "circle-xmark", neutral: "circle-regular" }[tone] as IconName;
  return (
    <span className={`status status-${tone}`}>
      <Icon name={icon} fixedWidth={false} />
      {children}
    </span>
  );
}

export function TagChip({ name, color }: { name: string; color: string }) {
  // Teks selalu putih; warna latar digelapkan bila terlalu terang agar kontras terpenuhi.
  return (
    <span className="tag" style={{ background: darken(color) }}>
      {name}
    </span>
  );
}

function darken(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#475569";
  const n = parseInt(m[1]!, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum > 0.5) {
    const f = 0.62;
    r = Math.round(r * f);
    g = Math.round(g * f);
    b = Math.round(b * f);
  }
  return `rgb(${r} ${g} ${b})`;
}

export function Stars({ value, count }: { value: number | null; count?: number }) {
  const { t } = useT();
  if (value == null) return <span className="muted t-small">{t("common.noRating")}</span>;
  const full = Math.round(value);
  return (
    <span className="row" style={{ gap: 6 }} title={`${value.toFixed(1)} / 5`}>
      <span className="stars" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Icon key={i} name="star" fixedWidth={false} style={i < full ? undefined : { color: "#cbd5e1" }} />
        ))}
      </span>
      <span className="t-small">
        <b>{value.toFixed(1)}</b>
        {count != null && <span className="muted"> ({count})</span>}
      </span>
    </span>
  );
}

export function StarInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const { t } = useT();
  return (
    <div className="row" style={{ gap: 0 }} role="radiogroup" aria-label={t("visit.rating")}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}`}
          className={`star-btn ${value != null && n <= value ? "is-on" : ""}`}
          onClick={() => onChange(value === n ? null : n)}
        >
          <Icon name="star" fixedWidth={false} />
        </button>
      ))}
      {value != null && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>
          {t("common.clear")}
        </button>
      )}
    </div>
  );
}

/* ------------------------------- Form --------------------------------- */

export function Field({
  label,
  required,
  helper,
  error,
  children,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string | null;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required && <span className="req" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <div className="helper helper-error" role="alert">
          <Icon name="warning" fixedWidth={false} /> {error}
        </div>
      ) : (
        helper && <div className="helper">{helper}</div>
      )}
    </div>
  );
}


/** Input password dengan tombol tampil/sembunyi (ikon mata) di ujung kanan field. */
export function PasswordInput({
  className = "input",
  style,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const { t } = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input
        {...props}
        className={className}
        style={{ ...style, paddingRight: 48 }}
        type={show ? "text" : "password"}
      />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t("common.hidePassword") : t("common.showPassword")}
        aria-pressed={show}
        title={show ? t("common.hidePassword") : t("common.showPassword")}
      >
        <Icon name={show ? "eye-slash" : "eye"} />
      </button>
    </div>
  );
}


/** Kolom pencarian dengan jeda ketik (debounce) agar query server tidak dikirim di setiap huruf. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  delay = 350,
  className = "input",
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { t } = useT();
  const [v, setV] = useState(value);
  // Sinkronkan bila nilai berubah dari luar (mis. URL / reset filter).
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (v === value) return;
    const h = setTimeout(() => onChange(v), delay);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return (
    <input
      className={className}
      style={style}
      type="search"
      value={v}
      placeholder={placeholder}
      aria-label={placeholder ?? t("common.search")}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onChange(v);
      }}
    />
  );
}

/* ----------------------------- DataTable ------------------------------ */

export function SortHeader({
  label,
  field,
  sort,
  order,
  onSort,
}: {
  label: string;
  field: string;
  sort: string | null;
  order: "asc" | "desc" | null;
  onSort: (sort: string | null, order: "asc" | "desc" | null) => void;
}) {
  const active = sort === field;
  const icon: IconName = !active ? "sort" : order === "asc" ? "sort-up" : "sort-down";
  // Siklus 3 arah: ASC → DESC → default (DESIGN.md Data Tables).
  const next = () => {
    if (!active) onSort(field, "asc");
    else if (order === "asc") onSort(field, "desc");
    else onSort(null, null);
  };
  return (
    <button className={`sort-btn ${active ? "is-active" : ""}`} onClick={next}>
      {label}
      <span className="ico">
        <Icon name={icon} fixedWidth={false} />
      </span>
    </button>
  );
}

export function Pagination({
  page,
  limit,
  total,
  onPage,
  onLimit,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (p: number) => void;
  onLimit: (l: number) => void;
}) {
  const { t } = useT();
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  const nums: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  return (
    <div className="pager">
      <span>{t("table.showing", { from, to, total })}</span>
      <div className="row" style={{ gap: 12 }}>
        <label className="row t-small" style={{ gap: 6 }}>
          {t("table.rows")}
          <Select
            className="select"
            width="84px"
            value={String(limit)}
            onChange={(e) => onLimit(Number(e.target.value))}
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </label>
        <div className="pager-nav">
          <button className="pager-btn" disabled={page <= 1} onClick={() => onPage(1)} aria-label={t("table.first")}>
            <Icon name="angles-left" />
          </button>
          <button className="pager-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("table.prev")}>
            <Icon name="angle-left" />
          </button>
          {nums.map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} style={{ padding: "0 4px" }}>
                …
              </span>
            ) : (
              <button
                key={n}
                className={`pager-btn ${n === page ? "is-current" : ""}`}
                aria-current={n === page ? "page" : undefined}
                onClick={() => onPage(n)}
              >
                {n}
              </button>
            ),
          )}
          <button className="pager-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={t("table.next")}>
            <Icon name="angle-right" />
          </button>
          <button className="pager-btn" disabled={page >= pages} onClick={() => onPage(pages)} aria-label={t("table.last")}>
            <Icon name="angles-right" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          className="tab"
          aria-selected={tab.id === value}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
