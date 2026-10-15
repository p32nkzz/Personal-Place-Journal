"use client";

import Link from "next/link";
import { Suspense, useState } from "react";

import { CategoryChips, MasterStatusChip } from "~/components/chips";
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Pagination,
  SortHeader,
  Spinner,
  StatusButton,
  StatusConfirm,
  Stars,
  useErrorMessage,
  useToast, SearchInput } from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { useUrlState } from "~/lib/useUrlState";
import { Select } from "~/components/Select";
import { api } from "~/trpc/react";
import { Icon } from "~/components/Icon";

function Masters() {
  const { t } = useT();
  const fmt = useFormat();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const [s, set] = useUrlState({ q: "", status: "ALL", sort: "", order: "", page: "1", limit: "10" });
  const [error, setError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ uid: string; name: string; status: string; referencedBy: number } | null>(null);
  const [del, setDel] = useState<{ uid: string; name: string; referencedBy: number } | null>(null);

  const page = Number(s.page) || 1;
  const limit = Number(s.limit) || 10;
  const { data, isLoading } = api.master.adminList.useQuery({
    q: s.q || undefined,
    status: s.status as "ALL" | "ACTIVE" | "INACTIVE" | "DELETED",
    sort: (s.sort || "createdAt") as "name" | "createdAt" | "updatedAt",
    order: (s.order || "desc") as "asc" | "desc",
    page,
    limit,
  });

  const done = (msg: string) => {
    void utils.master.adminList.invalidate();
    toast.push(msg, "success");
    setDel(null);
  };
  const setActive = api.master.setActive.useMutation({ onSuccess: () => { done(t("common.saved")); setStatusTarget(null); }, onError: (e) => setError(errMsg(e)) });
  const softDelete = api.master.softDelete.useMutation({ onSuccess: (r) => done(t("master.deleted", { n: r.unreferred })), onError: (e) => { setError(errMsg(e)); setDel(null); } });

  const sortProps = {
    sort: s.sort || null,
    order: (s.order || null) as "asc" | "desc" | null,
    onSort: (sort: string | null, order: "asc" | "desc" | null) => set({ sort: sort ?? "", order: order ?? "", page: "1" }),
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.masters")}</h1>
          <p>{t("master.listHint")}</p>
        </div>
        <Link href="/admin/masters/new" className="btn btn-primary"><Icon name="plus" /> {t("master.new")}</Link>
      </div>
      {error && <div style={{ marginBottom: 16 }}><Alert kind="error">{error}</Alert></div>}

      <div className="card card-flush">
        <div className="toolbar">
          <SearchInput style={{ flex: 1, minWidth: 220 }} placeholder={t("common.search")} value={s.q} onChange={(q) => set({ q, page: "1" })} />
          <Select className="select" value={s.status} onChange={(e) => set({ status: e.target.value, page: "1" })} aria-label={t("common.status")}>
            <option value="ALL">{t("common.allStatus")}</option>
            <option value="ACTIVE">{t("masterStatus.ACTIVE")}</option>
            <option value="INACTIVE">{t("masterStatus.INACTIVE")}</option>
            <option value="DELETED">{t("masterStatus.DELETED")}</option>
          </Select>
        </div>
        {isLoading ? (
          <Spinner />
        ) : !data?.rows.length ? (
          <EmptyState title={t("master.empty")} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="col-no">{t("table.no")}</th>
                  <th><SortHeader label={t("common.name")} field="name" {...sortProps} /></th>
                  <th>{t("common.category")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("master.rating")}</th>
                  <th>{t("master.referencedBy")}</th>
                  <th><SortHeader label={t("common.createdAt")} field="createdAt" {...sortProps} /></th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((m, i) => (
                  <tr key={m.uid}>
                    <td className="col-no">{(page - 1) * limit + i + 1}</td>
                    <td>
                      <Link href={`/admin/masters/${m.uid}`} style={{ color: "var(--color-primary)", fontWeight: 600 }}>{m.name}</Link>
                      <div className="t-caption muted">{m.address}</div>
                    </td>
                    <td><CategoryChips items={m.categories} /></td>
                    <td>
                      {m.status === "DELETED" ? (
                        <MasterStatusChip status={m.status} />
                      ) : (
                        <StatusButton tone={m.status === "ACTIVE" ? "success" : "neutral"} onClick={() => setStatusTarget(m)}>
                          {t(`masterStatus.${m.status}`)}
                        </StatusButton>
                      )}
                    </td>
                    <td><Stars value={m.rating.avg} count={m.rating.count} /></td>
                    <td className="mono">{m.referencedBy}</td>
                    <td>{fmt.date(m.createdAt)}</td>
                    <td>
                      <div className="row" style={{ minWidth: 200 }}>
                        <Link href={`/admin/masters/${m.uid}`} className="btn btn-secondary btn-sm"><Icon name="pen" /> {t("common.edit")}</Link>
                        {m.status !== "DELETED" && <button className="btn btn-danger-ghost btn-sm" onClick={() => setDel({ uid: m.uid, name: m.name, referencedBy: m.referencedBy })}><Icon name="trash" /> {t("common.delete")}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} limit={limit} total={data.total} onPage={(p) => set({ page: String(p) })} onLimit={(l) => set({ limit: String(l), page: "1" })} />}
      </div>

      {statusTarget && (
        <StatusConfirm
          name={statusTarget.name}
          toActive={statusTarget.status !== "ACTIVE"}
          busy={setActive.isPending}
          extra={statusTarget.status === "ACTIVE" ? <Alert kind="info">{t("master.deactivateText")}</Alert> : undefined}
          onClose={() => setStatusTarget(null)}
          onConfirm={() => setActive.mutate({ uid: statusTarget.uid, isActive: statusTarget.status !== "ACTIVE" })}
        />
      )}

      {del && (
        <ConfirmDialog
          title={t("master.deleteTitle")}
          message={
            <>
              <p style={{ margin: 0 }}>{t("master.deleteText", { name: del.name })}</p>
              {del.referencedBy > 0 && <Alert kind="warning">{t("master.deleteUnrefer", { n: del.referencedBy })}</Alert>}
              <p className="helper" style={{ margin: 0 }}>{t("master.deleteNoRestore")}</p>
            </>
          }
          danger
          confirmLabel={t("common.delete")}
          busy={softDelete.isPending}
          onClose={() => setDel(null)}
          onConfirm={() => softDelete.mutate({ uid: del.uid })}
        />
      )}
    </div>
  );
}

export default function MastersPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Masters />
    </Suspense>
  );
}
