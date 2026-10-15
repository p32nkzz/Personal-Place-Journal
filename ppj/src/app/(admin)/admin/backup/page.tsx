"use client";

import { Suspense, useState } from "react";

import { Icon } from "~/components/Icon";
import { Select } from "~/components/Select";
import {
  Alert,
  EmptyState,
  Pagination,
  SortHeader,
  Spinner,
  StatusChip,
  useErrorMessage,
  useToast,
} from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { useUrlState } from "~/lib/useUrlState";
import { api } from "~/trpc/react";

function size(n: number | null) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function Backup() {
  const { t } = useT();
  const fmt = useFormat();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const [error, setError] = useState<string | null>(null);
  const [s, set] = useUrlState({ status: "ALL", sort: "", order: "", page: "1", limit: "10" });
  const page = Number(s.page) || 1;
  const limit = Number(s.limit) || 10;

  const runningQ = api.backup.running.useQuery(undefined, {
    refetchInterval: (q) => (q.state.data ? 3000 : false),
  });
  const { data, isLoading } = api.backup.list.useQuery(
    {
      status: s.status as "ALL" | "RUNNING" | "SUCCESS" | "FAILED",
      sort: (s.sort || "startedAt") as "startedAt" | "finishedAt" | "fileSizeBytes",
      order: (s.order || "desc") as "asc" | "desc",
      page,
      limit,
    },
    { refetchInterval: runningQ.data ? 3000 : false },
  );
  const refresh = () => {
    void utils.backup.list.invalidate();
    void utils.backup.running.invalidate();
  };
  const run = api.backup.run.useMutation({
    onSuccess: () => {
      refresh();
      toast.push(t("backup.done"), "success");
    },
    onError: (e) => {
      setError(errMsg(e));
      refresh();
    },
  });
  const running = run.isPending || !!runningQ.data;

  const sortProps = {
    sort: s.sort || null,
    order: (s.order || null) as "asc" | "desc" | null,
    onSort: (sort: string | null, order: "asc" | "desc" | null) => set({ sort: sort ?? "", order: order ?? "", page: "1" }),
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.backup")}</h1>
          <p>{t("backup.hint")}</p>
        </div>
        <button className="btn btn-primary" disabled={running} onClick={() => { setError(null); run.mutate(); }}>
          {running ? t("backup.running") : t("backup.run")}
        </button>
      </div>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <Alert kind="info">{t("backup.restoreNote")}</Alert>
        <div className="card card-flush">
          <div className="toolbar">
            <Select className="select" value={s.status} onChange={(e) => set({ status: e.target.value, page: "1" })} aria-label={t("common.status")}>
              <option value="ALL">{t("common.allStatus")}</option>
              <option value="SUCCESS">{t("backup.success")}</option>
              <option value="RUNNING">{t("backup.runningChip")}</option>
              <option value="FAILED">{t("backup.failed")}</option>
            </Select>
          </div>
          {isLoading ? <Spinner /> : !data?.rows.length ? <EmptyState title={t("backup.empty")} /> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="col-no">{t("table.no")}</th>
                    <th><SortHeader label={t("backup.startedAt")} field="startedAt" {...sortProps} /></th>
                    <th><SortHeader label={t("backup.finishedAt")} field="finishedAt" {...sortProps} /></th>
                    <th>{t("common.status")}</th>
                    <th>{t("backup.by")}</th>
                    <th><SortHeader label={t("backup.size")} field="fileSizeBytes" {...sortProps} /></th>
                    <th>{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((b, i) => (
                    <tr key={b.uid}>
                      <td className="col-no">{(page - 1) * limit + i + 1}</td>
                      <td>{fmt.dateTime(b.startedAt)}</td>
                      <td>{b.finishedAt ? fmt.dateTime(b.finishedAt) : "—"}</td>
                      <td>
                        {b.status === "SUCCESS" && <StatusChip tone="success">{t("backup.success")}</StatusChip>}
                        {b.status === "RUNNING" && <StatusChip tone="warning">{t("backup.runningChip")}</StatusChip>}
                        {b.status === "FAILED" && <StatusChip tone="error">{t("backup.failed")}</StatusChip>}
                        {b.errorMessage && <div className="t-caption" style={{ color: "var(--color-error)" }}>{b.errorMessage}</div>}
                      </td>
                      <td>{b.triggeredByName ?? "—"}</td>
                      <td className="mono">{size(b.fileSizeBytes)}</td>
                      <td>{b.status === "SUCCESS" && <a className="btn btn-secondary btn-sm" href={`/api/backup/${b.uid}`}><Icon name="download" /> {t("backup.download")}</a>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && <Pagination page={page} limit={limit} total={data.total} onPage={(p) => set({ page: String(p) })} onLimit={(l) => set({ limit: String(l), page: "1" })} />}
        </div>
      </div>
    </div>
  );
}

export default function BackupPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Backup />
    </Suspense>
  );
}
