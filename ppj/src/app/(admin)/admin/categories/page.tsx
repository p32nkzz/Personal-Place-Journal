"use client";

import { Suspense, useState } from "react";

import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Spinner,
  StatusButton,
  StatusConfirm,
  Tabs,
  useErrorMessage,
  useToast, Pagination, SearchInput, SortHeader } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { Select } from "~/components/Select";
import { useUrlState } from "~/lib/useUrlState";
import { api } from "~/trpc/react";
import { Icon } from "~/components/Icon";

export default function CategoriesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CategoriesInner />
    </Suspense>
  );
}

function CategoriesInner() {
  const { t } = useT();
  const [tabState, setTabState] = useUrlState({ tab: "cat" });
  const tab = tabState.tab === "color" ? "color" : "cat";
  const setTab = (v: "cat" | "color") => setTabState({ tab: v });
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.categories")}</h1>
          <p>{t("category.hint")}</p>
        </div>
      </div>
      <Tabs
        tabs={[
          { id: "cat", label: t("category.tab") },
          { id: "color", label: t("color.tab") },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "cat" ? <CategoryTab /> : <ColorTab />}
    </div>
  );
}

type CatEdit = { uid?: string; name: string; description: string; sortOrder: number };

function CategoryTab() {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const [s, setS] = useUrlState({ cq: "", cstatus: "ALL", csort: "", corder: "", cpage: "1", climit: "10" });
  const page = Number(s.cpage) || 1;
  const limit = Number(s.climit) || 10;
  const { data, isLoading } = api.categories.adminPage.useQuery({
    q: s.cq || undefined,
    status: s.cstatus as "ALL" | "ACTIVE" | "INACTIVE",
    sort: (s.csort || "sortOrder") as "sortOrder" | "name" | "createdAt",
    order: (s.corder || "asc") as "asc" | "desc",
    page,
    limit,
  });
  const sortProps = {
    sort: s.csort || null,
    order: (s.corder || null) as "asc" | "desc" | null,
    onSort: (sort: string | null, order: "asc" | "desc" | null) => setS({ csort: sort ?? "", corder: order ?? "", cpage: "1" }),
  };
  const [edit, setEdit] = useState<CatEdit | null>(null);
  const [del, setDel] = useState<{ uid: string; name: string } | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ uid: string; name: string; isActive: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    void utils.categories.invalidate();
    setEdit(null);
    setDel(null);
    toast.push(t("common.saved"), "success");
  };
  const create = api.categories.create.useMutation({ onSuccess: done, onError: (e) => setError(errMsg(e)) });
  const update = api.categories.update.useMutation({ onSuccess: done, onError: (e) => setError(errMsg(e)) });
  const setActive = api.categories.setActive.useMutation({ onSuccess: () => { done(); setStatusTarget(null); }, onError: (e) => setError(errMsg(e)) });
  const remove = api.categories.delete.useMutation({ onSuccess: done, onError: (e) => { setError(errMsg(e)); setDel(null); } });

  return (
    <>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <p className="muted" style={{ margin: 0 }}>{t("category.rule")}</p>
        <button className="btn btn-primary" onClick={() => { setError(null); setEdit({ name: "", description: "", sortOrder: (data?.total ?? 0) + 1 }); }}><Icon name="plus" /> {t("category.new")}</button>
      </div>
      {error && !edit && <div style={{ marginBottom: 12 }}><Alert kind="error">{error}</Alert></div>}
      <div className="card card-flush">
        <div className="toolbar">
          <SearchInput style={{ flex: 1, minWidth: 220 }} placeholder={t("common.search")} value={s.cq} onChange={(q) => setS({ cq: q, cpage: "1" })} />
          <Select className="select" value={s.cstatus} onChange={(e) => setS({ cstatus: e.target.value, cpage: "1" })} aria-label={t("common.status")}>
            <option value="ALL">{t("common.allStatus")}</option>
            <option value="ACTIVE">{t("common.active")}</option>
            <option value="INACTIVE">{t("common.inactive")}</option>
          </Select>
        </div>
        {isLoading ? <Spinner /> : !data?.rows.length ? <EmptyState title={t("category.empty")} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th className="col-no">{t("table.no")}</th><th><SortHeader label={t("common.name")} field="name" {...sortProps} /></th><th>Slug</th><th>{t("category.usage")}</th><th>{t("common.status")}</th><th>{t("common.actions")}</th></tr></thead>
              <tbody>
                {data.rows.map((c, i) => (
                  <tr key={c.uid}>
                    <td className="col-no">{(page - 1) * limit + i + 1}</td>
                    <td><b>{c.name}</b>{c.description && <div className="t-caption muted">{c.description}</div>}</td>
                    <td className="mono">{c.slug}</td>
                    <td className="mono">{c.usage}</td>
                    <td><StatusButton tone={c.isActive ? "success" : "neutral"} onClick={() => setStatusTarget({ uid: c.uid, name: c.name, isActive: c.isActive })}>{c.isActive ? t("common.active") : t("common.inactive")}</StatusButton></td>
                    <td>
                      <div className="row" style={{ minWidth: 200 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setError(null); setEdit({ uid: c.uid, name: c.name, description: c.description ?? "", sortOrder: c.sortOrder }); }}><Icon name="pen" /> {t("common.edit")}</button>
                        {c.usage === 0 && <button className="btn btn-danger-ghost btn-sm" onClick={() => setDel({ uid: c.uid, name: c.name })}><Icon name="trash" /> {t("common.delete")}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} limit={limit} total={data.total} onPage={(p) => setS({ cpage: String(p) })} onLimit={(l) => setS({ climit: String(l), cpage: "1" })} />}
      </div>

      {edit && (
        <Modal
          title={edit.uid ? t("category.edit") : t("category.new")}
          onClose={() => setEdit(null)}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => setEdit(null)}>{t("common.cancel")}</button>
              <button className="btn btn-primary" disabled={!edit.name.trim() || create.isPending || update.isPending} onClick={() => { setError(null); edit.uid ? update.mutate({ uid: edit.uid, name: edit.name, description: edit.description, sortOrder: edit.sortOrder }) : create.mutate({ name: edit.name, description: edit.description, sortOrder: edit.sortOrder }); }}><Icon name="save" /> {t("common.save")}</button>
            </>
          }
        >
          <div className="stack">
            {error && <Alert kind="error">{error}</Alert>}
            <Field label={t("common.name")} required htmlFor="c-name"><input id="c-name" className="input" maxLength={255} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label={t("common.description")} htmlFor="c-desc"><textarea id="c-desc" className="textarea" style={{ minHeight: 64 }} maxLength={2000} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label={t("category.sortOrder")} htmlFor="c-sort"><input id="c-sort" className="input" type="number" min={0} value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Math.max(0, Number(e.target.value) || 0) })} /></Field>
          </div>
        </Modal>
      )}

      {statusTarget && (
        <StatusConfirm
          name={statusTarget.name}
          toActive={!statusTarget.isActive}
          busy={setActive.isPending}
          onClose={() => setStatusTarget(null)}
          onConfirm={() => setActive.mutate({ uid: statusTarget.uid, isActive: !statusTarget.isActive })}
        />
      )}

      {del && (
        <ConfirmDialog title={t("category.deleteTitle")} message={<p style={{ margin: 0 }}>{t("category.deleteText", { name: del.name })}</p>} danger confirmLabel={t("common.delete")} busy={remove.isPending} onClose={() => setDel(null)} onConfirm={() => remove.mutate({ uid: del.uid })} />
      )}
    </>
  );
}

type ColorEdit = { id?: number; hexCode: string; name: string; sortOrder: number };

function ColorTab() {
  const { t } = useT();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const [s, setS] = useUrlState({ kq: "", kstatus: "ALL", ksort: "", korder: "", kpage: "1", klimit: "10" });
  const page = Number(s.kpage) || 1;
  const limit = Number(s.klimit) || 10;
  const { data, isLoading } = api.colors.adminList.useQuery({
    q: s.kq || undefined,
    status: s.kstatus as "ALL" | "ACTIVE" | "INACTIVE",
    sort: (s.ksort || "sortOrder") as "sortOrder" | "name" | "hexCode",
    order: (s.korder || "asc") as "asc" | "desc",
    page,
    limit,
  });
  const sortProps = {
    sort: s.ksort || null,
    order: (s.korder || null) as "asc" | "desc" | null,
    onSort: (sort: string | null, order: "asc" | "desc" | null) => setS({ ksort: sort ?? "", korder: order ?? "", kpage: "1" }),
  };
  const [edit, setEdit] = useState<ColorEdit | null>(null);
  const [del, setDel] = useState<{ id: number; name: string } | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ id: number; name: string; isActive: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    void utils.colors.invalidate();
    setEdit(null);
    setDel(null);
    toast.push(t("common.saved"), "success");
  };
  const create = api.colors.create.useMutation({ onSuccess: done, onError: (e) => setError(errMsg(e)) });
  const update = api.colors.update.useMutation({ onSuccess: done, onError: (e) => setError(errMsg(e)) });
  const setActive = api.colors.setActive.useMutation({ onSuccess: () => { done(); setStatusTarget(null); }, onError: (e) => setError(errMsg(e)) });
  const remove = api.colors.delete.useMutation({ onSuccess: done, onError: (e) => { setError(errMsg(e)); setDel(null); } });

  return (
    <>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <p className="muted" style={{ margin: 0 }}>{t("color.rule")}</p>
        <button className="btn btn-primary" onClick={() => { setError(null); setEdit({ hexCode: "#3B82F6", name: "", sortOrder: (data?.total ?? 0) + 1 }); }}><Icon name="plus" /> {t("color.new")}</button>
      </div>
      <div className="card card-flush">
        <div className="toolbar">
          <SearchInput style={{ flex: 1, minWidth: 220 }} placeholder={t("common.search")} value={s.kq} onChange={(q) => setS({ kq: q, kpage: "1" })} />
          <Select className="select" value={s.kstatus} onChange={(e) => setS({ kstatus: e.target.value, kpage: "1" })} aria-label={t("common.status")}>
            <option value="ALL">{t("common.allStatus")}</option>
            <option value="ACTIVE">{t("common.active")}</option>
            <option value="INACTIVE">{t("common.inactive")}</option>
          </Select>
        </div>
        {isLoading ? <Spinner /> : !data?.rows.length ? <EmptyState title={t("category.empty")} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th className="col-no">{t("table.no")}</th><th>{t("color.preview")}</th><th><SortHeader label={t("common.name")} field="name" {...sortProps} /></th><th><SortHeader label="HEX" field="hexCode" {...sortProps} /></th><th>{t("common.status")}</th><th>{t("common.actions")}</th></tr></thead>
              <tbody>
                {data.rows.map((c, i) => (
                  <tr key={c.id}>
                    <td className="col-no">{(page - 1) * limit + i + 1}</td>
                    <td><span className="tag-dot" style={{ background: c.hexCode, width: 24, height: 24, boxShadow: "0 0 0 1px var(--color-border-input)" }} /></td>
                    <td><b>{c.name}</b></td>
                    <td className="mono">{c.hexCode}</td>
                    <td><StatusButton tone={c.isActive ? "success" : "neutral"} onClick={() => setStatusTarget({ id: c.id, name: c.name, isActive: c.isActive })}>{c.isActive ? t("common.active") : t("common.inactive")}</StatusButton></td>
                    <td>
                      <div className="row" style={{ minWidth: 200 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setError(null); setEdit({ id: c.id, hexCode: c.hexCode, name: c.name, sortOrder: c.sortOrder }); }}><Icon name="pen" /> {t("common.edit")}</button>
                        <button className="btn btn-danger-ghost btn-sm" onClick={() => setDel({ id: c.id, name: c.name })}><Icon name="trash" /> {t("common.delete")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} limit={limit} total={data.total} onPage={(p) => setS({ kpage: String(p) })} onLimit={(l) => setS({ klimit: String(l), kpage: "1" })} />}
      </div>

      {edit && (
        <Modal
          title={edit.id ? t("color.edit") : t("color.new")}
          onClose={() => setEdit(null)}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => setEdit(null)}>{t("common.cancel")}</button>
              <button className="btn btn-primary" disabled={!edit.name.trim() || create.isPending || update.isPending} onClick={() => { setError(null); edit.id ? update.mutate({ id: edit.id, name: edit.name, sortOrder: edit.sortOrder }) : create.mutate({ hexCode: edit.hexCode, name: edit.name, sortOrder: edit.sortOrder }); }}><Icon name="save" /> {t("common.save")}</button>
            </>
          }
        >
          <div className="stack">
            {error && <Alert kind="error">{error}</Alert>}
            <Field label={t("common.name")} required htmlFor="col-name"><input id="col-name" className="input" maxLength={100} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            {!edit.id && (
              <Field label="HEX" required htmlFor="col-hex" helper={t("color.hexHint")}>
                <div className="row">
                  <input type="color" aria-label="HEX" value={edit.hexCode} onChange={(e) => setEdit({ ...edit, hexCode: e.target.value.toUpperCase() })} style={{ width: 44, height: 44, border: 0, background: "none" }} />
                  <input id="col-hex" className="input mono" style={{ width: 140 }} maxLength={7} value={edit.hexCode} onChange={(e) => setEdit({ ...edit, hexCode: e.target.value.toUpperCase() })} />
                </div>
              </Field>
            )}
            <Field label={t("category.sortOrder")} htmlFor="col-sort"><input id="col-sort" className="input" type="number" min={0} value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Math.max(0, Number(e.target.value) || 0) })} /></Field>
          </div>
        </Modal>
      )}

      {statusTarget && (
        <StatusConfirm
          name={statusTarget.name}
          toActive={!statusTarget.isActive}
          busy={setActive.isPending}
          onClose={() => setStatusTarget(null)}
          onConfirm={() => setActive.mutate({ id: statusTarget.id, isActive: !statusTarget.isActive })}
        />
      )}

      {del && (
        <ConfirmDialog title={t("color.deleteTitle")} message={<p style={{ margin: 0 }}>{t("color.deleteText", { name: del.name })}</p>} danger confirmLabel={t("common.delete")} busy={remove.isPending} onClose={() => setDel(null)} onConfirm={() => remove.mutate({ id: del.id })} />
      )}
    </>
  );
}
