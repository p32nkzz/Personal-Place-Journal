"use client";

import { Icon, type IconName } from "~/components/Icon";
import { useT } from "~/lib/i18n";

/** Satu baris pengaturan: label + keterangan di kiri, kontrol di kanan (gaya halaman Pengaturan). */
export function SettingRow({
  label,
  hint,
  meta,
  dirty,
  error,
  children,
}: {
  label: string;
  hint?: string;
  meta?: string;
  dirty?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <div className={`setting-row ${dirty ? "is-dirty" : ""}`}>
      <div className="setting-info">
        <div className="setting-label">
          {label}
          {dirty && <span className="setting-dirty">{t("settings.unsaved")}</span>}
        </div>
        {hint && <div className="setting-hint">{hint}</div>}
        {meta && <div className="setting-meta">{meta}</div>}
        {error && (
          <div className="helper helper-error" role="alert" style={{ marginTop: 4 }}>
            <Icon name="warning" fixedWidth={false} /> {error}
          </div>
        )}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

/** Kerangka dua kolom: left nav tab + panel kartu (dipakai Pengaturan dan Profil). */
export function SettingsShell<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  children,
}: {
  tabs: { id: T; label: string; icon: IconName }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="settings-layout">
      <nav className="settings-nav" aria-label={ariaLabel}>
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            className="settings-nav-item"
            aria-current={value === x.id ? "page" : undefined}
            onClick={() => onChange(x.id)}
          >
            <Icon name={x.icon} /> {x.label}
          </button>
        ))}
      </nav>
      <section className="settings-panel card card-flush">{children}</section>
    </div>
  );
}
