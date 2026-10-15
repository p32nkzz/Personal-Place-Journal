"use client";

import { useEffect, useMemo, useRef } from "react";

import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

/** Pilih foto tinjauan sebelum MY PLACE tersimpan; diunggah setelah record dibuat. */
export function PendingPhotoPicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (f: File[]) => void;
}) {
  const { t } = useT();
  const rules = api.settings.photoRules.useQuery();
  const ref = useRef<HTMLInputElement>(null);
  const max = rules.data?.maxPerMyPlace;
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const full = max != null && files.length >= max;

  return (
    <div className="stack-sm">
      {files.length === 0 ? (
        <p className="muted t-small" style={{ margin: 0 }}>{t("photo.none")}</p>
      ) : (
        <div className="photo-grid">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[i]} alt={f.name} />
              <div className="photo-actions">
                <button type="button" className="btn" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                  <Icon name="trash" /> {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const next = [...files, ...Array.from(e.target.files ?? [])];
          e.target.value = "";
          onChange(max != null ? next.slice(0, max) : next);
        }}
      />
      <div className="row">
        <button type="button" className="btn btn-secondary btn-sm" disabled={full} onClick={() => ref.current?.click()}>
          <Icon name="upload" /> {t("photo.upload")}
        </button>
      </div>
      {rules.data && (
        <p className="helper" style={{ margin: 0 }}>
          {t("photo.rulesHint", { types: rules.data.allowedTypes.join(", ").toUpperCase(), size: rules.data.maxSizeMb, max: max ?? "—" })}
          {full && ` ${t("photo.limitReached")}`}
        </p>
      )}
    </div>
  );
}
