"use client";

import Link from "next/link";
import { Suspense } from "react";

import { ActiveChip, CategoryChips, RelationChip, VisitStatusChip } from "~/components/chips";
import { EmptyState, Pagination, Spinner, SearchInput, SortHeader } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { useUrlState } from "~/lib/useUrlState";
import { Select } from "~/components/Select";
import { api } from "~/trpc/react";

function Curation() {
  const { t } = useT();
  const [s, set] = useUrlState({ q: "", relation: "", inactive: "", sort: "", order: "", page: "1", limit: "10" });
  const page = Number(s.page) || 1;
  const limit = Number(s.limit) || 10;
  const { data, isLoading } = api.review.curation.useQuery({
    q: s.q || undefined,
    relationStatus: (s.relation || undefined) as "UNREFERRED" | "REVIEW" | "REJECTED" | "REFERRED" | undefined,
    showInactive: s.inactive === "1",
    sort: (s.sort || "updatedAt") as "name" | "ownerName" | "updatedAt",
    order: (s.order || "desc") as "asc" | "desc",
    page,
    limit,
  });

  const sortProps = {
    sort: s.sort || null,
    order: (s.order || null) as "asc" | "desc" | null,
    onSort: (sort: string | null, order: "asc" | "desc" | null) => set({ sort: sort ?? "", order: order ?? "", page: "1" }),
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.curation")}</h1>
          <p>{t("curation.hint")}</p>
        </div>
      </div>
      <div className="card card-flush">
        <div className="toolbar">
          <SearchInput style={{ flex: 1, minWidth: 220 }} placeholder={t("curation.searchPlaceholder")} value={s.q} onChange={(q) => set({ q, page: "1" })} />
          <Select className="select" value={s.relation} onChange={(e) => set({ relation: e.target.value, page: "1" })} aria-label={t("place.relationStatus")}>
            <option value="">{t("place.allRelation")}</option>
            {(["UNREFERRED", "REVIEW", "REJECTED", "REFERRED"] as const).map((x) => <option key={x} value={x}>{t(`relation.${x}`)}</option>)}
          </Select>
          <label className="check" style={{ minHeight: 36, padding: 0 }}>
            <input type="checkbox" checked={s.inactive === "1"} onChange={(e) => set({ inactive: e.target.checked ? "1" : "", page: "1" })} />
            <span className="t-small">{t("curation.showInactive")}</span>
          </label>
        </div>
        {isLoading ? (
          <Spinner />
        ) : !data?.rows.length ? (
          <EmptyState title={t("place.empty")} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="col-no">{t("table.no")}</th>
                  <th><SortHeader label={t("common.name")} field="name" {...sortProps} /></th>
                  <th><SortHeader label={t("curation.owner")} field="ownerName" {...sortProps} /></th>
                  <th>{t("common.category")}</th>
                  <th>{t("place.visitStatus")}</th>
                  <th>{t("place.relationStatus")}</th>
                  <th>MASTER</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((p, i) => (
                  <tr key={p.uid}>
                    <td className="col-no">{(page - 1) * limit + i + 1}</td>
                    <td>
                      <Link href={`/admin/curation/${p.uid}`} style={{ color: "var(--color-primary)", fontWeight: 600 }}>{p.name}</Link>
                      <div className="t-caption muted">{p.address ?? "—"}</div>
                      {!p.isActive && <ActiveChip active={false} />}
                    </td>
                    <td>{p.ownerName}</td>
                    <td><CategoryChips items={p.categories} /></td>
                    <td><VisitStatusChip status={p.visitStatus} /></td>
                    <td><RelationChip status={p.masterRelationStatus} /></td>
                    <td>{p.masterName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} limit={limit} total={data.total} onPage={(p) => set({ page: String(p) })} onLimit={(l) => set({ limit: String(l), page: "1" })} />}
      </div>
    </div>
  );
}

export default function CurationPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Curation />
    </Suspense>
  );
}
