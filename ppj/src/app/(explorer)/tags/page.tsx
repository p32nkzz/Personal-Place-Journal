"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Spinner,
  TagChip,
  tagColor,
  useErrorMessage,
  useToast,
} from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { Icon } from "~/components/Icon";

type Editing = { uid?: string; name: string; color: string };

export default function TagsPage() {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const tags = api.tag.list.useQuery();
  const colors = api.colors.listActive.useQuery();
  const [edit, setEdit] = useState<Editing | null>(null);
  const [del, setDel] = useState<{ uid: string; name: string; usage: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    void utils.tag.list.invalidate();
    setEdit(null);
    setDel(null);
    toast.push(t("common.saved"), "success");
  };
  const create = api.tag.create.useMutation({ onSuccess: done, onError: (e) => setError(errMsg(e)) });
  const update = api.tag.update.useMutation({ onSuccess: done, onError: (e) => setError(errMsg(e)) });
  const remove = api.tag.delete.useMutation({ onSuccess: done, onError: (e) => { setError(errMsg(e)); setDel(null); } });

  const open = (e: Editing) => {
    setError(null);
    setEdit(e);
  };

  // Daftar TAG milik sendiri relatif sedikit: pencarian & urutan dijalankan di sisi klien.
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "usage">("name");
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = (tags.data ?? []).filter((x) => !n || x.name.toLowerCase().includes(n) || x.color.toLowerCase().includes(n));
    return [...list].sort((x, y) =>
      sort === "usage" ? y.usage - x.usage || x.name.localeCompare(y.name) : x.name.localeCompare(y.name, undefined, { sensitivity: "base" }),
    );
  }, [tags.data, q, sort]);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.tags")}</h1>
          <p>{t("tag.hint")}</p>
        </div>
      </div>

      {error && !edit && <div style={{ marginBottom: 16 }}><Alert kind="error">{error}</Alert></div>}

      <div className="card card-flush">
        <div className="fl-bar">
          <div className="fl-row">
            <div className="fl-search">
              <Icon name="search" fixedWidth={false} />
              <input className="input" type="search" placeholder={t("tag.searchPlaceholder")} aria-label={t("tag.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="fl-btns">
              <button className="btn btn-primary" onClick={() => open({ name: "", color: "#64748B" })}><Icon name="plus" /> {t("tag.new")}</button>
            </div>
          </div>
          <div className="fl-row fl-filters">
            <div className="fl-seg fl-seg-sort" role="radiogroup" aria-label={t("common.sortBy")}>
              <span className="fl-seg-label"><Icon name="sort" fixedWidth={false} /></span>
              <button type="button" role="radio" aria-checked={sort === "name"} onClick={() => setSort("name")}>{t("common.name")}</button>
              <button type="button" role="radio" aria-checked={sort === "usage"} onClick={() => setSort("usage")}>{t("tag.mostUsed")}</button>
            </div>
            {tags.data && <span className="ct-count">{t("tag.count", { n: rows.length, total: tags.data.length })}</span>}
          </div>
        </div>
        {tags.isLoading ? (
          <Spinner />
        ) : !tags.data?.length ? (
          <EmptyState title={t("tag.empty")} text={t("tag.emptyHint")} />
        ) : !rows.length ? (
          <EmptyState title={t("select.noResults")} />
        ) : (
          <ul className="list">
            {rows.map((x) => (
              <li key={x.uid} className="pl-row ct-row tg-row">
                <div className="pl-thumb-cell">
                  <span className="ct-swatch tg-swatch" style={{ background: tagColor(x.color) }} title={x.color.toUpperCase()}>
                    <Icon name="tags" fixedWidth={false} />
                  </span>
                </div>
                <div className="list-item pl-main">
                  <div className="grow stack-sm" style={{ gap: 6 }}>
                    <span><TagChip name={x.name} color={x.color} /></span>
                    <div className="row" style={{ gap: 6 }}>
                      {/* Jumlah pemakaian; klik membuka daftar MY Place terfilter TAG ini */}
                      <Link href={`/places?tag=${x.uid}`} className={`ct-usage tg-usage${x.usage ? "" : " is-zero"}`} title={t("tag.viewPlaces")}>
                        <Icon name="map-pin" fixedWidth={false} /> {x.usage} {t("category.usedBy")}
                      </Link>
                      <button
                        type="button"
                        className="ct-slug ct-hex"
                        title={t("common.copy")}
                        aria-label={`${t("common.copy")}: ${x.color.toUpperCase()}`}
                        onClick={() => void navigator.clipboard?.writeText(x.color.toUpperCase()).then(() => toast.push(`${t("common.copied")}: ${x.color.toUpperCase()}`, "success"))}
                      >
                        {x.color.toUpperCase()} <Icon name="copy" fixedWidth={false} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pl-side">
                  <div className="pl-actions">
                    <button type="button" className="ph-btn ph-edit" title={t("common.edit")} aria-label={`${t("common.edit")}: ${x.name}`} onClick={() => open({ uid: x.uid, name: x.name, color: x.color })}>
                      <Icon name="pen" fixedWidth={false} />
                    </button>
                    <button type="button" className="ph-btn ph-del" title={t("common.delete")} aria-label={`${t("common.delete")}: ${x.name}`} onClick={() => setDel(x)}>
                      <Icon name="trash" fixedWidth={false} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {edit && (
        <Modal
          title={edit.uid ? t("tag.edit") : t("tag.new")}
          onClose={() => setEdit(null)}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => setEdit(null)}>{t("common.cancel")}</button>
              <button
                className="btn btn-primary"
                disabled={!edit.name.trim() || create.isPending || update.isPending}
                onClick={() => {
                  setError(null);
                  if (edit.uid) update.mutate({ uid: edit.uid, name: edit.name, color: edit.color });
                  else create.mutate({ name: edit.name, color: edit.color });
                }}
              >
                <Icon name="save" /> {t("common.save")}
              </button>
            </>
          }
        >
          <div className="stack">
            {error && <Alert kind="error">{error}</Alert>}
            <Field label={t("common.name")} required htmlFor="tag-name">
              <input id="tag-name" className="input" maxLength={255} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <div className="field">
              <span className="label">{t("tag.color")}</span>
              <div className="tg-palette">
                {colors.data?.map((c) => (
                  <button
                    key={c.hexCode}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={edit.color.toUpperCase() === c.hexCode}
                    onClick={() => setEdit({ ...edit, color: c.hexCode })}
                    className="tg-color"
                    style={{ background: c.hexCode }}
                  >
                    {edit.color.toUpperCase() === c.hexCode && <Icon name="circle-check" fixedWidth={false} />}
                  </button>
                ))}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <label className="t-small muted" htmlFor="tag-custom">{t("tag.custom")}</label>
                <input id="tag-custom" type="color" value={/^#[0-9a-f]{6}$/i.test(edit.color) ? edit.color : "#64748B"} onChange={(e) => setEdit({ ...edit, color: e.target.value.toUpperCase() })} style={{ width: 44, height: 36, border: 0, background: "none" }} />
                <span className="mono">{edit.color.toUpperCase()}</span>
              </div>
            </div>
            <div><TagChip name={edit.name || t("tag.preview")} color={edit.color} /></div>
          </div>
        </Modal>
      )}

      {del && (
        <ConfirmDialog
          title={t("tag.deleteTitle")}
          message={<p style={{ margin: 0 }}>{t("tag.deleteText", { name: del.name, n: del.usage })}</p>}
          danger
          confirmLabel={t("common.delete")}
          busy={remove.isPending}
          onClose={() => setDel(null)}
          onConfirm={() => remove.mutate({ uid: del.uid })}
        />
      )}
    </div>
  );
}
