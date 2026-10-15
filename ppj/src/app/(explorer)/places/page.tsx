"use client";

import Link from "next/link";
import { Suspense, useState } from "react";

import { CategoryMultiSelect } from "~/components/CategoryMultiSelect";
import { ActiveChip, CategoryChips, RelationChip, TagList, VisitStatusChip } from "~/components/chips";
import { Icon } from "~/components/Icon";
import { Select } from "~/components/Select";
import { ConfirmDialog, EmptyState, Pagination, SearchInput, Spinner, Stars, useErrorMessage, useToast } from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { useUrlState } from "~/lib/useUrlState";
import { api } from "~/trpc/react";

function Places() {
  const { t } = useT();
  const fmt = useFormat();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const [toggle, setToggle] = useState<{ uid: string; name: string; to: boolean } | null>(null);
  // Filter, pencarian, dan paging disinkronkan ke URL dan dijalankan di server.
  const [s, set] = useUrlState({ q: "", cat: "", tag: "", visit: "", rel: "", fav: "", inactive: "", page: "1", limit: "10" });
  const page = Number(s.page) || 1;
  const limit = Number(s.limit) || 10;

  const cats = api.categories.listActive.useQuery();
  const tags = api.tag.list.useQuery();
  const { data, isLoading } = api.place.page.useQuery({
    q: s.q || undefined,
    categoryUids: s.cat ? s.cat.split(",") : undefined,
    tagUid: s.tag || undefined,
    visitStatus: (s.visit || undefined) as "PLAN" | "VISITED" | undefined,
    relationStatus: (s.rel || undefined) as "UNREFERRED" | "REVIEW" | "REJECTED" | "REFERRED" | undefined,
    favorite: s.fav === "1" ? true : undefined,
    showInactive: s.inactive === "1",
    page,
    limit,
  });

  const setActive = api.place.setActive.useMutation({
    onSuccess: () => {
      void utils.place.invalidate();
      toast.push(t("common.saved"), "success");
      setToggle(null);
    },
    onError: (e) => {
      toast.push(errMsg(e), "error");
      setToggle(null);
    },
  });

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.myPlaces")}</h1>
          <p>{t("place.listHint")}</p>
        </div>
        <div className="row">
          <Link href="/" className="btn btn-secondary">{t("place.addFromMap")}</Link>
          <Link href="/places/new" className="btn btn-primary"><Icon name="plus" /> {t("place.new")}</Link>
        </div>
      </div>

      <div className="card card-flush">
        <div className="toolbar">
          <SearchInput style={{ flex: 1, minWidth: 220 }} placeholder={t("place.searchPlaceholder")} value={s.q} onChange={(q) => set({ q, page: "1" })} />
          <CategoryMultiSelect categories={cats.data ?? []} value={s.cat ? s.cat.split(",") : []} onChange={(v) => set({ cat: v.join(","), page: "1" })} />
          <Select className="select" value={s.tag} onChange={(e) => set({ tag: e.target.value, page: "1" })} aria-label={t("nav.tags")}>
            <option value="">{t("place.allTags")}</option>
            {tags.data?.map((x) => <option key={x.uid} value={x.uid}>{x.name}</option>)}
          </Select>
          <Select className="select" value={s.visit} onChange={(e) => set({ visit: e.target.value, page: "1" })} aria-label={t("place.visitStatus")}>
            <option value="">{t("place.allVisitStatus")}</option>
            <option value="PLAN">{t("place.plan")}</option>
            <option value="VISITED">{t("place.visited")}</option>
          </Select>
          <Select className="select" value={s.rel} onChange={(e) => set({ rel: e.target.value, page: "1" })} aria-label={t("place.relationStatus")}>
            <option value="">{t("place.allRelation")}</option>
            {(["UNREFERRED", "REVIEW", "REJECTED", "REFERRED"] as const).map((x) => <option key={x} value={x}>{t(`relation.${x}`)}</option>)}
          </Select>
          <button className="chip" aria-pressed={s.fav === "1"} onClick={() => set({ fav: s.fav === "1" ? "" : "1", page: "1" })}><Icon name="star" /> {t("place.favorite")}</button>
          <label className="check" style={{ minHeight: 36, padding: 0 }}>
            <input type="checkbox" checked={s.inactive === "1"} onChange={(e) => set({ inactive: e.target.checked ? "1" : "", page: "1" })} />
            <span className="t-small">{t("place.showInactive")}</span>
          </label>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !data?.rows.length ? (
          <EmptyState
            title={t("place.empty")}
            text={t("place.emptyHint")}
            action={<Link href="/places/new" className="btn btn-primary"><Icon name="plus" /> {t("place.new")}</Link>}
          />
        ) : (
          <ul className="list">
            {data.rows.map((p) => (
              <li key={p.uid} style={{ display: "flex", alignItems: "flex-start" }}>
                <Link href={`/places/${p.uid}`} className="list-item" style={{ alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                  <div className="grow stack-sm" style={{ gap: 6 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="title">{p.isFavorite && <Icon name="star" style={{ color: "#f59e0b" }} />} {p.name}</span>
                      {!p.isActive && <ActiveChip active={false} />}
                    </div>
                    <span className="sub">{p.address ?? "—"}</span>
                    <div className="row">
                      <VisitStatusChip status={p.visitStatus} />
                      <RelationChip status={p.masterRelationStatus} />
                      <CategoryChips items={p.categories} />
                      <TagList items={p.tags} />
                    </div>
                  </div>
                  <div className="hide-mobile"><Stars value={p.rating.avg} count={p.rating.count} /></div>
                </Link>
                <div className="stack-sm" style={{ gap: 6, padding: "12px 16px", alignItems: "flex-end", flexShrink: 0 }}>
                  <div className="place-meta" aria-label={`${t("common.createdAt")} / ${t("common.updatedAt")}`}>
                    <span title={`${t("common.createdAt")}: ${fmt.dateTime(p.createdAt)}`}>
                      <Icon name="plus" fixedWidth={false} /> {fmt.dateTime(p.createdAt)}
                    </span>
                    <span title={`${t("common.updatedAt")}: ${fmt.dateTime(p.updatedAt)}`}>
                      <Icon name="pen" fixedWidth={false} /> {fmt.dateTime(p.updatedAt)}
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ minHeight: 30, padding: "0 10px" }} onClick={() => setToggle({ uid: p.uid, name: p.name, to: !p.isActive })}>
                    <Icon name={p.isActive ? "eye-slash" : "eye"} /> {p.isActive ? t("place.deactivate") : t("place.activate")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {toggle && (
          <ConfirmDialog
            title={toggle.to ? t("place.activate") : t("place.deactivateTitle")}
            message={<p style={{ margin: 0 }}>{toggle.to ? toggle.name : t("place.deactivateText")}</p>}
            busy={setActive.isPending}
            onClose={() => setToggle(null)}
            onConfirm={() => setActive.mutate({ uid: toggle.uid, isActive: toggle.to })}
          />
        )}
        {data && <Pagination page={page} limit={limit} total={data.total} onPage={(n) => set({ page: String(n) })} onLimit={(l) => set({ limit: String(l), page: "1" })} />}
      </div>
    </div>
  );
}

export default function PlacesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Places />
    </Suspense>
  );
}
