"use client";

import { useState } from "react";

import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Spinner,
  TagChip,
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

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.tags")}</h1>
          <p>{t("tag.hint")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => open({ name: "", color: "#64748B" })}><Icon name="plus" /> {t("tag.new")}</button>
      </div>

      {error && !edit && <div style={{ marginBottom: 16 }}><Alert kind="error">{error}</Alert></div>}

      <div className="card card-flush">
        {tags.isLoading ? (
          <Spinner />
        ) : !tags.data?.length ? (
          <EmptyState title={t("tag.empty")} text={t("tag.emptyHint")} />
        ) : (
          <ul className="list">
            {tags.data.map((x) => (
              <li key={x.uid} className="list-item">
                <TagChip name={x.name} color={x.color} />
                <span className="grow muted t-small">{t("tag.usage", { n: x.usage })}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => open({ uid: x.uid, name: x.name, color: x.color })}><Icon name="pen" /> {t("common.edit")}</button>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => setDel(x)}><Icon name="trash" /> {t("common.delete")}</button>
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
              <div className="row">
                {colors.data?.map((c) => (
                  <button
                    key={c.hexCode}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={edit.color.toUpperCase() === c.hexCode}
                    onClick={() => setEdit({ ...edit, color: c.hexCode })}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: c.hexCode,
                      border: edit.color.toUpperCase() === c.hexCode ? "3px solid var(--color-text)" : "2px solid #fff",
                      boxShadow: "0 0 0 1px var(--color-border-input)",
                      cursor: "pointer",
                    }}
                  />
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
