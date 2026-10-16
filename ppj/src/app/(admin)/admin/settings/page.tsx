"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { Icon, type IconName } from "~/components/Icon";
import { MAP_COLOR_DEFAULTS, MAP_COLOR_KEYS, readableOn, type MapColors } from "~/components/map/colors";
import { useMapColors } from "~/components/map/useMapColors";
import { Select } from "~/components/Select";
import { SettingRow, SettingsShell } from "~/components/SettingRow";
import { Alert, Spinner, useErrorMessage, useToast } from "~/components/ui";
import { tzOffsetMs, useFormat, useT } from "~/lib/i18n";
import { useUrlState } from "~/lib/useUrlState";
import { api } from "~/trpc/react";

type Tab = "general" | "photo" | "map";

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "general", label: "settings.tabGeneral", icon: "gear" },
  { id: "photo", label: "settings.tabPhoto", icon: "image" },
  { id: "map", label: "settings.tabMap", icon: "map" },
];

const PHOTO_KEYS = [
  { key: "photo.allowed_types", def: "jpg,png,webp", label: "settings.allowedTypes", hint: "settings.allowedTypesHint", type: "text" },
  { key: "photo.max_size_mb", def: "5", label: "settings.maxSize", hint: "settings.maxSizeHint", type: "number" },
  { key: "photo.max_per_visit", def: "10", label: "settings.maxPerVisit", hint: "settings.maxPerVisitHint", type: "number" },
  { key: "photo.max_per_my_place", def: "10", label: "settings.maxPerMyPlace", hint: "settings.maxPerMyPlaceHint", type: "number" },
  { key: "photo.max_per_master_place", def: "20", label: "settings.maxPerMaster", hint: "settings.maxPerMasterHint", type: "number" },
] as const;

const AVATAR_KEYS = [
  { key: "avatar.allowed_types", def: "jpg,png,webp", label: "settings.avatarTypes", hint: "settings.avatarTypesHint", type: "text" },
  { key: "avatar.max_size_mb", def: "5", label: "settings.avatarMaxSize", hint: "settings.avatarMaxSizeHint", type: "number" },
] as const;

function Settings() {
  const { t } = useT();
  const [s, set] = useUrlState({ tab: "general" });
  const tab: Tab = s.tab === "map" ? "map" : s.tab === "photo" ? "photo" : "general";

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.settings")}</h1>
          <p>{t("settings.hint")}</p>
        </div>
      </div>

      <SettingsShell tabs={TABS.map((x) => ({ ...x, label: t(x.label) }))} value={tab} onChange={(id) => set({ tab: id })} ariaLabel={t("nav.settings")}>
        {/* Catatan "berlaku untuk upload berikutnya" hanya relevan untuk aturan foto. */}
        {tab === "photo" && (
          <p className="settings-note">
            <Icon name="circle-info" fixedWidth={false} /> {t("settings.applyNote")}
          </p>
        )}
        {tab === "general" ? <GeneralSettings /> : tab === "photo" ? <PhotoSettings /> : <MapSettings />}
      </SettingsShell>
    </div>
  );
}

type KeyDef = { key: string; def: string; label: string; hint: string; type: "text" | "number" };

/** Field angka: tidak boleh negatif (blokir tombol minus/notasi eksponen dan bersihkan hasil tempel). */
const blockNegative = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") e.preventDefault();
};
const cleanNumber = (s: string) => s.replace(/[^0-9.]/g, "");

/** Baris-baris pengaturan numerik/teks sederhana (satu form per key). */
function KeyRows({ keys }: { keys: readonly KeyDef[] }) {
  const { t } = useT();
  const fmt = useFormat();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const { data, isLoading } = api.settings.list.useQuery();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (data) setValues(Object.fromEntries(data.map((d) => [d.key, d.value])));
  }, [data]);

  const update = api.settings.update.useMutation({
    onSuccess: (_r, v) => {
      setErrors((e) => ({ ...e, [v.key]: null }));
      void utils.settings.invalidate();
      toast.push(t("common.saved"), "success");
    },
    onError: (e, v) => setErrors((x) => ({ ...x, [v.key]: errMsg(e) })),
  });

  if (isLoading) return <Spinner />;

  const renderRow = (k: KeyDef) => {
        const row = data?.find((d) => d.key === k.key);
        if (!row) return null;
        const dirty = values[k.key] !== row.value;
        return (
          <form
            key={k.key}
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate({ key: k.key, value: values[k.key] ?? "" });
            }}
          >
            <SettingRow label={t(k.label)} hint={t(k.hint)} meta={`${k.key} · ${t("settings.lastUpdated")} ${fmt.dateTime(row.updatedAt)}`} dirty={dirty} error={errors[k.key]}>
              <input
                id={k.key}
                className="input"
                style={{ width: k.type === "text" ? 180 : 110 }}
                type={k.type}
                min={k.type === "number" ? 0 : undefined}
                step={k.type === "number" ? (k.key.endsWith("_mb") ? "any" : 1) : undefined}
                inputMode={k.type === "number" ? "decimal" : undefined}
                value={values[k.key] ?? ""}
                aria-label={t(k.label)}
                aria-invalid={!!errors[k.key]}
                onKeyDown={k.type === "number" ? blockNegative : undefined}
                onChange={(e) => setValues((v) => ({ ...v, [k.key]: k.type === "number" ? cleanNumber(e.target.value) : e.target.value }))}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                title={`${t("settings.resetDefault")}: ${k.def}`}
                disabled={(values[k.key] ?? "") === k.def}
                onClick={() => setValues((v) => ({ ...v, [k.key]: k.def }))}
              >
                {t("settings.resetColor")}
              </button>
              <button className="btn btn-primary btn-sm" disabled={update.isPending || !dirty}>
                <Icon name="save" /> {t("common.save")}
              </button>
            </SettingRow>
          </form>
        );
  };

  return <>{keys.map(renderRow)}</>;
}

function PhotoSettings() {
  const { t } = useT();
  return (
    <div>
      <h2 className="settings-title">{t("settings.groupPhoto")}</h2>
      <KeyRows keys={PHOTO_KEYS} />
      <h2 className="settings-title" style={{ marginTop: 8 }}>{t("settings.groupAvatar")}</h2>
      <KeyRows keys={AVATAR_KEYS} />
    </div>
  );
}

const COLOR_FIELDS = [
  { prop: "master", label: "settings.colorMaster", glyph: "M" },
  { prop: "mine", label: "settings.colorMine", glyph: "" },
  { prop: "favorite", label: "settings.colorFavorite", glyph: "★" },
  { prop: "newPin", label: "settings.colorNewPin", glyph: "+" },
] as const;

const CATEGORY_KEYS = [
  { key: "category.page_size", def: "4", label: "settings.categoryPageSize", hint: "settings.categoryPageSizeHint", type: "number" },
] as const;

const VISIT_KEYS = [
  { key: "visit.page_size", def: "5", label: "settings.visitPageSize", hint: "settings.visitPageSizeHint", type: "number" },
] as const;

const TAG_KEYS = [
  { key: "tag.page_size", def: "4", label: "settings.tagPageSize", hint: "settings.tagPageSizeHint", type: "number" },
] as const;

const HEX = /^#[0-9a-f]{6}$/i;

/** Pratinjau bentuk pin Google Maps dengan warna terpilih. */
function PinPreview({ color, glyph }: { color: string; glyph: string }) {
  return (
    <svg width="22" height="30" viewBox="0 0 30 40" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M15 1C7.3 1 1 7.2 1 14.9 1 25 15 39 15 39s14-14 14-24.1C29 7.2 22.7 1 15 1z" fill={color} stroke="#fff" strokeWidth="2" />
      {glyph ? (
        <text x="15" y="20" textAnchor="middle" fontSize="13" fontWeight="700" fill={readableOn(color)}>{glyph}</text>
      ) : (
        <circle cx="15" cy="15" r="4.5" fill={readableOn(color)} />
      )}
    </svg>
  );
}

function MapSettings() {
  const { t } = useT();
  const fmt = useFormat();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const current = useMapColors();
  const { data } = api.settings.list.useQuery();

  // --- jumlah data per muat ---
  const sizeRow = data?.find((d) => d.key === "map.recent_page_size");
  const [size, setSize] = useState("3");
  const [sizeError, setSizeError] = useState<string | null>(null);
  useEffect(() => {
    if (sizeRow) setSize(sizeRow.value);
  }, [sizeRow]);
  const updateSize = api.settings.update.useMutation({
    onSuccess: () => {
      setSizeError(null);
      void utils.settings.invalidate();
      toast.push(t("common.saved"), "success");
    },
    onError: (e) => setSizeError(errMsg(e)),
  });
  const sizeDirty = size !== (sizeRow?.value ?? "3");

  // --- warna pin ---
  const [draft, setDraft] = useState<MapColors>(current);
  const [colorError, setColorError] = useState<string | null>(null);
  const updateColor = api.settings.update.useMutation();
  useEffect(() => setDraft(current), [current]);
  const colorDirty = COLOR_FIELDS.some((f) => draft[f.prop].toUpperCase() !== current[f.prop].toUpperCase());
  const colorValid = COLOR_FIELDS.every((f) => HEX.test(draft[f.prop]));

  const saveColors = async () => {
    setColorError(null);
    try {
      for (const f of COLOR_FIELDS) {
        if (draft[f.prop].toUpperCase() !== current[f.prop].toUpperCase())
          await updateColor.mutateAsync({ key: MAP_COLOR_KEYS[f.prop], value: draft[f.prop] });
      }
      await utils.settings.invalidate();
      toast.push(t("common.saved"), "success");
    } catch (e) {
      setColorError(errMsg(e));
    }
  };

  return (
    <div>
      <h2 className="settings-title">{t("settings.groupSearch")}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateSize.mutate({ key: "map.recent_page_size", value: size });
        }}
      >
        <SettingRow
          label={t("settings.recentPageSize")}
          hint={t("settings.recentPageSizeHint")}
          meta={sizeRow ? `map.recent_page_size · ${t("settings.lastUpdated")} ${fmt.dateTime(sizeRow.updatedAt)}` : "map.recent_page_size"}
          dirty={sizeDirty}
          error={sizeError}
        >
          <input
            className="input"
            style={{ width: 90 }}
            type="number"
            min={1}
            max={50}
            step={1}
            value={size}
            aria-label={t("settings.recentPageSize")}
            aria-invalid={!!sizeError}
            onKeyDown={blockNegative}
            onChange={(e) => setSize(cleanNumber(e.target.value))}
          />
          <button type="button" className="btn btn-ghost btn-sm" title={`${t("settings.resetDefault")}: 3`} disabled={size === "3"} onClick={() => setSize("3")}>
            {t("settings.resetColor")}
          </button>
          <button className="btn btn-primary btn-sm" disabled={updateSize.isPending || !sizeDirty}>
            <Icon name="save" /> {t("common.save")}
          </button>
        </SettingRow>
      </form>

      <h2 className="settings-title">{t("settings.mapColors")}</h2>
      <p className="settings-sub">{t("settings.mapColorsHint")}</p>
      {colorError && (
        <div style={{ padding: "0 20px 12px" }}>
          <Alert kind="error">{colorError}</Alert>
        </div>
      )}
      {COLOR_FIELDS.map((f) => {
        const v = draft[f.prop];
        const ok = HEX.test(v);
        return (
          <SettingRow key={f.prop} label={t(f.label)} dirty={v.toUpperCase() !== current[f.prop].toUpperCase()}>
            <PinPreview color={ok ? v : "#999999"} glyph={f.glyph} />
            <input
              type="color"
              aria-label={t(f.label)}
              value={ok ? v : "#999999"}
              onChange={(e) => setDraft({ ...draft, [f.prop]: e.target.value.toUpperCase() })}
              className="color-swatch"
            />
            <input
              className="input mono"
              style={{ width: 106 }}
              maxLength={7}
              value={v}
              aria-label={`${t(f.label)} HEX`}
              aria-invalid={!ok}
              onChange={(e) => setDraft({ ...draft, [f.prop]: e.target.value.toUpperCase() })}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setDraft({ ...draft, [f.prop]: MAP_COLOR_DEFAULTS[f.prop] })}
              disabled={v.toUpperCase() === MAP_COLOR_DEFAULTS[f.prop]}
            >
              {t("settings.resetColor")}
            </button>
          </SettingRow>
        );
      })}
      <div className="settings-footer">
        <button className="btn btn-primary btn-sm" disabled={!colorDirty || !colorValid || updateColor.isPending} onClick={() => void saveColors()}>
          <Icon name="save" /> {t("common.save")}
        </button>
        <button className="btn btn-secondary btn-sm" disabled={!colorDirty} onClick={() => setDraft(current)}>
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}

/** Daftar seluruh zona waktu IANA dengan keterangan lengkap: offset UTC, ID zona, dan nama zona. */
function useTimezoneOptions(lang: string) {
  return useMemo(() => {
    const now = new Date();
    const locale = lang === "ID" ? "id-ID" : "en-GB";
    let ids: string[] = [];
    try {
      ids = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      ids = ["Asia/Jakarta", "UTC"];
    }
    if (!ids.includes("UTC")) ids = [...ids, "UTC"];
    const rows = ids.map((id) => {
      const off = tzOffsetMs(id, now.getTime()) / 60000;
      const sign = off < 0 ? "-" : "+";
      const abs = Math.abs(off);
      const hh = String(Math.floor(abs / 60)).padStart(2, "0");
      const mm = String(abs % 60).padStart(2, "0");
      let name = "";
      try {
        name =
          new Intl.DateTimeFormat(locale, { timeZone: id, timeZoneName: "longGeneric" })
            .formatToParts(now)
            .find((p) => p.type === "timeZoneName")?.value ?? "";
      } catch {
        name = "";
      }
      return { id, off, label: `(UTC${sign}${hh}:${mm}) ${id.replaceAll("_", " ")}${name ? ` — ${name}` : ""}` };
    });
    return rows.sort((a, b) => a.off - b.off || a.id.localeCompare(b.id));
  }, [lang]);
}

function GeneralSettings() {
  const { t, lang, timezone } = useT();
  const fmt = useFormat();
  const router = useRouter();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const { data } = api.settings.list.useQuery();
  const row = data?.find((d) => d.key === "app.timezone");
  const options = useTimezoneOptions(lang);
  const [value, setValue] = useState(timezone);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => setValue(timezone), [timezone]);
  useEffect(() => {
    const h = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(h);
  }, []);

  const update = api.settings.update.useMutation({
    onSuccess: () => {
      setError(null);
      void utils.settings.invalidate();
      toast.push(t("common.saved"), "success");
      // Muat ulang layout server agar seluruh halaman memakai zona waktu baru.
      router.refresh();
    },
    onError: (e) => setError(errMsg(e)),
  });

  const dirty = value !== timezone;
  const preview = (() => {
    try {
      return new Intl.DateTimeFormat(lang === "ID" ? "id-ID" : "en-GB", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: value,
      }).format(now);
    } catch {
      return "—";
    }
  })();

  return (
    <div>
      <h2 className="settings-title">{t("settings.groupRegional")}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({ key: "app.timezone", value });
        }}
      >
        <SettingRow
          label={t("settings.timezone")}
          hint={t("settings.timezoneHint")}
          meta={row ? `app.timezone · ${t("settings.lastUpdated")} ${fmt.dateTime(row.updatedAt)}` : "app.timezone"}
          dirty={dirty}
          error={error}
        >
          <div style={{ width: 380, maxWidth: "100%" }}>
            <Select value={value} onChange={(e) => setValue(e.target.value)} aria-label={t("settings.timezone")} searchFrom={0} width="100%">
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" disabled={value === "Asia/Jakarta"} onClick={() => setValue("Asia/Jakarta")}>
            {t("settings.resetColor")}
          </button>
          <button className="btn btn-primary btn-sm" disabled={update.isPending || !dirty}>
            <Icon name="save" /> {t("common.save")}
          </button>
        </SettingRow>
      </form>
      <div className="setting-row">
        <div className="setting-info">
          <div className="setting-label">{t("settings.timezoneNow")}</div>
          <div className="setting-hint">{value}</div>
        </div>
        <div className="setting-control">
          <strong style={{ fontSize: 14 }}>{preview}</strong>
        </div>
      </div>
      <h2 className="settings-title" style={{ marginTop: 8 }}>{t("settings.groupCategory")}</h2>
      <KeyRows keys={CATEGORY_KEYS} />
      <h2 className="settings-title" style={{ marginTop: 8 }}>{t("settings.groupTag")}</h2>
      <KeyRows keys={TAG_KEYS} />
      <h2 className="settings-title" style={{ marginTop: 8 }}>{t("settings.groupVisit")}</h2>
      <KeyRows keys={VISIT_KEYS} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Settings />
    </Suspense>
  );
}
