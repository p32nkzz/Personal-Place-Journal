"use client";

import { Suspense, useState } from "react";

import { Icon, type IconName } from "~/components/Icon";
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Pagination,
  SearchInput,
  Spinner,
  StatusConfirm,
  tagColor,
  useErrorMessage,
  useToast,
} from "~/components/ui";
import { useT } from "~/lib/i18n";
import { useUrlState } from "~/lib/useUrlState";
import { api } from "~/trpc/react";

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
  // Jumlah untuk tab chip (ringan: hanya total halaman pertama).
  const catTotal = api.categories.adminPage.useQuery({ status: "ALL", sort: "sortOrder", order: "asc", page: 1, limit: 1 }).data?.total;
  const colorTotal = api.colors.adminList.useQuery({ status: "ALL", sort: "sortOrder", order: "asc", page: 1, limit: 1 }).data?.total;
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.categories")}</h1>
          <p>{t("category.hint")}</p>
        </div>
      </div>
      <div className="mini-tabs pd-tabs" role="tablist" aria-label={t("nav.categories")}>
        <button type="button" role="tab" aria-selected={tab === "cat"} className="mini-tab" onClick={() => setTab("cat")}>
          <Icon name="layers" fixedWidth={false} /> {t("category.tab")}
          {catTotal != null && <span className="mini-tab-n">{catTotal}</span>}
        </button>
        <button type="button" role="tab" aria-selected={tab === "color"} className="mini-tab" onClick={() => setTab("color")}>
          <Icon name="palette" fixedWidth={false} /> {t("color.tab")}
          {colorTotal != null && <span className="mini-tab-n">{colorTotal}</span>}
        </button>
      </div>
      {tab === "cat" ? <CategoryTab /> : <ColorTab />}
    </div>
  );
}

/** Segmen status (Semua | Aktif | Tidak aktif) dan urutan, dipakai kedua tab. */
function StatusSeg({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useT();
  const opts: [string, string, IconName | null][] = [
    ["ALL", t("common.all"), null],
    ["ACTIVE", t("common.active"), "circle-check"],
    ["INACTIVE", t("common.inactive"), "circle-regular"],
  ];
  return (
    <div className="fl-seg" role="radiogroup" aria-label={t("common.status")}>
      {opts.map(([v, l, ic]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} data-ms={v} onClick={() => onChange(v)}>
          {ic && <Icon name={ic} fixedWidth={false} />} {l}
        </button>
      ))}
    </div>
  );
}

function SortSeg({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  const { t } = useT();
  return (
    <div className="fl-seg fl-seg-sort" role="radiogroup" aria-label={t("common.sortBy")}>
      <span className="fl-seg-label"><Icon name="sort" fixedWidth={false} /></span>
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
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

  const sortVal = s.csort || "sortOrder";

  return (
    <>
      {error && !edit && <div style={{ marginBottom: 12 }}><Alert kind="error">{error}</Alert></div>}
      <div className="card card-flush">
        <div className="fl-bar">
          <div className="fl-row">
            <div className="fl-search">
              <Icon name="search" fixedWidth={false} />
              <SearchInput className="input" placeholder={t("category.searchPlaceholder")} value={s.cq} onChange={(q) => setS({ cq: q, cpage: "1" })} />
            </div>
            <button className="btn btn-primary" onClick={() => { setError(null); setEdit({ name: "", description: "", sortOrder: (data?.total ?? 0) + 1 }); }}><Icon name="plus" /> {t("category.new")}</button>
          </div>
          <div className="fl-row fl-filters">
            <StatusSeg value={s.cstatus} onChange={(v) => setS({ cstatus: v, cpage: "1" })} />
            <SortSeg
              value={sortVal}
              options={[["sortOrder", t("category.sortOrder")], ["name", t("common.name")], ["createdAt", t("common.newest")]]}
              onChange={(v) => setS({ csort: v, corder: v === "createdAt" ? "desc" : "asc", cpage: "1" })}
            />
          </div>
          <p className="ct-rule"><Icon name="circle-info" fixedWidth={false} /> {t("category.rule")}</p>
        </div>
        {isLoading ? <Spinner /> : !data?.rows.length ? <EmptyState title={t("category.empty")} /> : (
          <ul className="list">
            {data.rows.map((c) => (
              <li key={c.uid} className="pl-row ct-row">
                <div className="pl-thumb-cell">
                  <span className={`ct-ico${c.isActive ? "" : " is-off"}`} title={`${t("category.sortOrder")}: ${c.sortOrder}`}>
                    <Icon name="layers" fixedWidth={false} />
                    <b>{c.sortOrder}</b>
                  </span>
                </div>
                <div className="list-item pl-main">
                  <div className="grow stack-sm" style={{ gap: 5 }}>
                    <span className="ct-name">
                      <span className="title">{c.name}</span>
                    </span>
                    <span className="ct-meta">
                      <span className={`ct-usage${c.usage ? "" : " is-zero"}`} title={t("category.usage")}>
                        <Icon name="map-pin" fixedWidth={false} /> {c.usage} {t("category.usedBy")}
                      </span>
                      <code className="ct-slug" title="Slug">{c.slug}</code>
                    </span>
                    {c.description && <span className="sub">{c.description}</span>}
                  </div>
                </div>
                <div className="pl-side">
                  <div className="pl-actions">
                    <button type="button" className="ph-btn ph-edit" title={t("common.edit")} aria-label={`${t("common.edit")}: ${c.name}`} onClick={() => { setError(null); setEdit({ uid: c.uid, name: c.name, description: c.description ?? "", sortOrder: c.sortOrder }); }}>
                      <Icon name="pen" fixedWidth={false} />
                    </button>
                    <button type="button" className={`ph-btn ${c.isActive ? "ph-off" : "ph-on"}`} title={c.isActive ? t("place.deactivate") : t("place.activate")} aria-label={`${c.isActive ? t("place.deactivate") : t("place.activate")}: ${c.name}`} onClick={() => setStatusTarget({ uid: c.uid, name: c.name, isActive: c.isActive })}>
                      <Icon name={c.isActive ? "eye-slash" : "eye"} fixedWidth={false} />
                    </button>
                    {/* Kategori yang sudah dipakai hanya dapat dinonaktifkan. */}
                    <button type="button" className="ph-btn ph-del" disabled={c.usage > 0} title={c.usage > 0 ? t("category.cannotDelete") : t("common.delete")} aria-label={`${t("common.delete")}: ${c.name}`} onClick={() => setDel({ uid: c.uid, name: c.name })}>
                      <Icon name="trash" fixedWidth={false} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
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

  const sortVal = s.ksort || "sortOrder";

  return (
    <>
      {error && !edit && <div style={{ marginBottom: 12 }}><Alert kind="error">{error}</Alert></div>}
      <div className="card card-flush">
        <div className="fl-bar">
          <div className="fl-row">
            <div className="fl-search">
              <Icon name="search" fixedWidth={false} />
              <SearchInput className="input" placeholder={t("color.searchPlaceholder")} value={s.kq} onChange={(q) => setS({ kq: q, kpage: "1" })} />
            </div>
            <button className="btn btn-primary" onClick={() => { setError(null); setEdit({ hexCode: "#3B82F6", name: "", sortOrder: (data?.total ?? 0) + 1 }); }}><Icon name="plus" /> {t("color.new")}</button>
          </div>
          <div className="fl-row fl-filters">
            <StatusSeg value={s.kstatus} onChange={(v) => setS({ kstatus: v, kpage: "1" })} />
            <SortSeg
              value={sortVal}
              options={[["sortOrder", t("category.sortOrder")], ["name", t("common.name")], ["hexCode", "HEX"]]}
              onChange={(v) => setS({ ksort: v, korder: "asc", kpage: "1" })}
            />
          </div>
          <p className="ct-rule"><Icon name="circle-info" fixedWidth={false} /> {t("color.rule")}</p>
        </div>
        {isLoading ? <Spinner /> : !data?.rows.length ? <EmptyState title={t("category.empty")} /> : (
          <ul className="list">
            {data.rows.map((c) => (
              <li key={c.id} className="pl-row ct-row">
                <div className="pl-thumb-cell">
                  <span className={`ct-swatch${c.isActive ? "" : " is-off"}`} style={{ background: c.hexCode }} title={c.hexCode}>
                    <b className="ct-order" title={`${t("category.sortOrder")}: ${c.sortOrder}`}>{c.sortOrder}</b>
                  </span>
                </div>
                <div className="list-item pl-main">
                  <div className="grow stack-sm" style={{ gap: 5 }}>
                    <span className="ct-name">
                      <span className="title">{c.name}</span>
                    </span>
                    <span className="ct-meta">
                      <span className="tag ct-sample" style={{ background: tagColor(c.hexCode) }}>{t("color.sample")}</span>
                      <button
                        type="button"
                        className="ct-slug ct-hex"
                        title={t("common.copy")}
                        aria-label={`${t("common.copy")}: ${c.hexCode}`}
                        onClick={() => void navigator.clipboard?.writeText(c.hexCode).then(() => toast.push(`${t("common.copied")}: ${c.hexCode}`, "success"))}
                      >
                        {c.hexCode} <Icon name="copy" fixedWidth={false} />
                      </button>
                    </span>
                  </div>
                </div>
                <div className="pl-side">
                  <div className="pl-actions">
                    <button type="button" className="ph-btn ph-edit" title={t("common.edit")} aria-label={`${t("common.edit")}: ${c.name}`} onClick={() => { setError(null); setEdit({ id: c.id, hexCode: c.hexCode, name: c.name, sortOrder: c.sortOrder }); }}>
                      <Icon name="pen" fixedWidth={false} />
                    </button>
                    <button type="button" className={`ph-btn ${c.isActive ? "ph-off" : "ph-on"}`} title={c.isActive ? t("place.deactivate") : t("place.activate")} aria-label={`${c.isActive ? t("place.deactivate") : t("place.activate")}: ${c.name}`} onClick={() => setStatusTarget({ id: c.id, name: c.name, isActive: c.isActive })}>
                      <Icon name={c.isActive ? "eye-slash" : "eye"} fixedWidth={false} />
                    </button>
                    <button type="button" className="ph-btn ph-del" title={t("common.delete")} aria-label={`${t("common.delete")}: ${c.name}`} onClick={() => setDel({ id: c.id, name: c.name })}>
                      <Icon name="trash" fixedWidth={false} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
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
