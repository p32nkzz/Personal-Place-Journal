"use client";

import Link from "next/link";
import { Suspense, useState } from "react";

import { CategoryMultiSelect } from "~/components/CategoryMultiSelect";
import { MultiSelect } from "~/components/MultiSelect";
import { TagMultiSelect } from "~/components/TagMultiSelect";
import { PlaceDeleteDialog } from "~/components/PlaceDeleteDialog";
import { PlaceThumb } from "~/components/PlaceThumb";
import { ActiveChip, CategoryChips, RelationChip, TagList, VisitStatusChip } from "~/components/chips";
import { Icon } from "~/components/Icon";
import { ConfirmDialog, EmptyState, Pagination, SearchInput, Spinner, Stars, useErrorMessage, useToast } from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { useUrlState } from "~/lib/useUrlState";
import { api } from "~/trpc/react";

type Relation = "UNREFERRED" | "REVIEW" | "REJECTED" | "REFERRED";
const RELATIONS: Relation[] = ["UNREFERRED", "REVIEW", "REJECTED", "REFERRED"];

function Places() {
  const { t } = useT();
  const fmt = useFormat();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const [toggle, setToggle] = useState<{ uid: string; name: string; to: boolean } | null>(null);
  const [delTarget, setDelTarget] = useState<{ uid: string; isActive: boolean } | null>(null);
  // Filter, pencarian, dan paging disinkronkan ke URL dan dijalankan di server.
  const [s, set] = useUrlState({ q: "", cat: "", tag: "", visit: "", rel: "", fav: "", inactive: "", page: "1", limit: "10" });
  const page = Number(s.page) || 1;
  const limit = Number(s.limit) || 10;

  const cats = api.categories.listActive.useQuery();
  const tags = api.tag.list.useQuery();
  const { data, isLoading } = api.place.page.useQuery({
    q: s.q || undefined,
    categoryUids: s.cat ? s.cat.split(",") : undefined,
    tagUids: s.tag ? s.tag.split(",") : undefined,
    visitStatus: (s.visit || undefined) as "PLAN" | "VISITED" | undefined,
    relationStatuses: s.rel ? (s.rel.split(",") as Relation[]) : undefined,
    favorite: s.fav === "1" ? true : undefined,
    showInactive: s.inactive === "1",
    page,
    limit,
  });

  const activeFilters = [s.q, s.cat, s.tag, s.visit, s.rel, s.fav, s.inactive].filter(Boolean).length;

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
          <Link href="/" className="btn btn-map"><Icon name="map-pin" /> {t("place.addFromMap")}</Link>
          <Link href="/places/new" className="btn btn-primary"><Icon name="plus" /> {t("place.new")}</Link>
        </div>
      </div>

      <div className="card card-flush">
        <div className="fl-bar">
          {/* Baris 1: pencarian (lebih lebar) + toggle cepat */}
          <div className="fl-row">
            <div className="fl-search">
              <Icon name="search" fixedWidth={false} />
              <SearchInput className="input" placeholder={t("place.searchPlaceholder")} value={s.q} onChange={(q) => set({ q, page: "1" })} />
            </div>
            <button type="button" className="fl-fav" aria-pressed={s.fav === "1"} title={t("place.favorite")} onClick={() => set({ fav: s.fav === "1" ? "" : "1", page: "1" })}>
              <Icon name={s.fav === "1" ? "star" : "star-regular"} fixedWidth={false} /> {t("place.favorite")}
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={s.inactive === "1"}
              className="fl-switch"
              onClick={() => set({ inactive: s.inactive === "1" ? "" : "1", page: "1" })}
            >
              <span className="fl-switch-track" aria-hidden><span className="fl-switch-thumb" /></span>
              {t("place.showInactive")}
            </button>
          </div>

          {/* Baris 2: filter ringkas */}
          <div className="fl-row fl-filters">
            <div className="fl-seg" role="radiogroup" aria-label={t("place.visitStatus")}>
              {([["", t("common.all"), null], ["PLAN", t("place.plan"), "calendar"], ["VISITED", t("place.visited"), "map-pin"]] as const).map(([val, lbl, ic]) => (
                <button key={val || "all"} type="button" role="radio" aria-checked={s.visit === val} data-v={val || undefined} onClick={() => set({ visit: val, page: "1" })}>
                  {ic && <Icon name={ic} fixedWidth={false} />} {lbl}
                </button>
              ))}
            </div>
            <CategoryMultiSelect compact categories={cats.data ?? []} value={s.cat ? s.cat.split(",") : []} onChange={(v) => set({ cat: v.join(","), page: "1" })} />
            <TagMultiSelect compact tags={tags.data ?? []} value={s.tag ? s.tag.split(",") : []} onChange={(v) => set({ tag: v.join(","), page: "1" })} />
            <MultiSelect
              compact
              icon="link"
              sort={false}
              pageSize={RELATIONS.length}
              items={RELATIONS.map((r) => ({ uid: r, name: t(`relation.${r}`) }))}
              value={s.rel ? s.rel.split(",") : []}
              onChange={(v) => set({ rel: v.join(","), page: "1" })}
              ariaLabel={t("place.relationStatus")}
              allLabel={t("place.allRelation")}
              selectedLabel={(n) => t("place.relationsSelected", { n })}
              searchPlaceholder={t("place.searchRelation")}
              clearLabel={t("place.clearRelations")}
              renderOption={(x) => <RelationChip status={x.uid} />}
            />
            {activeFilters > 0 && (
              <button type="button" className="fl-reset" onClick={() => set({ q: "", cat: "", tag: "", visit: "", rel: "", fav: "", inactive: "", page: "1" })}>
                <Icon name="xmark" fixedWidth={false} /> {t("place.resetFilters", { n: activeFilters })}
              </button>
            )}
          </div>
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
              <li key={p.uid} className="pl-row">
                <div className="pl-thumb-cell">
                  <PlaceThumb href={`/places/${p.uid}`} name={p.name} lat={p.latitude} lng={p.longitude} photos={p.photos} />
                </div>
                <Link href={`/places/${p.uid}`} className="list-item pl-main">
                  <div className="grow stack-sm" style={{ gap: 6 }}>
                    {(p.categories.length > 0 || p.tags.length > 0) && (
                      <div className="pl-chips">
                        {p.categories.length > 0 && <CategoryChips items={p.categories} />}
                        {p.tags.length > 0 && <TagList items={p.tags} />}
                      </div>
                    )}
                    <div className="row" style={{ gap: 8 }}>
                      <span className="title">{p.isFavorite && <Icon name="star" style={{ color: "#f59e0b" }} />} {p.name}</span>
                      {!p.isActive && <ActiveChip active={false} />}
                    </div>
                    <span className="sub">{p.address ?? "—"}</span>
                    <div className="row">
                      <VisitStatusChip status={p.visitStatus} />
                      {/* Ringkasan kunjungan: jumlah + kapan terakhir dalam satu pil dua bagian. */}
                      <span
                        className={`vstat${p.visitCount ? "" : " is-zero"}`}
                        title={p.lastVisitedAt ? `${t("place.lastVisit")}: ${fmt.dateTime(p.lastVisitedAt)}` : t("visit.empty")}
                      >
                        <span className="vstat-n">
                          <Icon name="map-pin" fixedWidth={false} />
                          <b>{p.visitCount}</b>&nbsp;{t("place.visitsShort")}
                        </span>
                        {p.lastVisitedAt && (
                          <span className="vstat-last">
                            <Icon name="history" fixedWidth={false} /> {fmt.relative(p.lastVisitedAt)}
                          </span>
                        )}
                      </span>
                      <RelationChip status={p.masterRelationStatus} />
                      {/* Layar sempit: rating ringkas ikut di baris status (kolom rating desktop disembunyikan). */}
                      <span className="pl-rating-m" title={p.rating.avg != null ? `${p.rating.avg.toFixed(1)} / 5` : t("common.noRating")}>
                        <Icon name="star" fixedWidth={false} />
                        {p.rating.avg != null ? (
                          <>
                            <b>{p.rating.avg.toFixed(1)}</b>
                            <span>({p.rating.count})</span>
                          </>
                        ) : (
                          <span>{t("common.noRating")}</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="hide-mobile"><Stars value={p.rating.avg} count={p.rating.count} /></div>
                </Link>
                <div className="pl-side">
                  <div className="place-meta" aria-label={`${t("common.createdAt")} / ${t("common.updatedAt")}`}>
                    <span title={`${t("common.createdAt")}: ${fmt.dateTime(p.createdAt)}`}>
                      <Icon name="plus" fixedWidth={false} /> {fmt.dateTime(p.createdAt)}
                    </span>
                    <span title={`${t("common.updatedAt")}: ${fmt.dateTime(p.updatedAt)}`}>
                      <Icon name="pen" fixedWidth={false} /> {fmt.dateTime(p.updatedAt)}
                    </span>
                  </div>
                  {/* Aksi baris: ubah (biru), aktif/nonaktif (kuning/hijau), hapus (merah) */}
                  <div className="pl-actions">
                    <Link href={`/places/${p.uid}/edit`} className="ph-btn ph-edit" title={t("common.edit")} aria-label={`${t("common.edit")}: ${p.name}`}>
                      <Icon name="pen" fixedWidth={false} />
                    </Link>
                    <button
                      type="button"
                      className={`ph-btn ${p.isActive ? "ph-off" : "ph-on"}`}
                      title={p.isActive ? t("place.deactivate") : t("place.activate")}
                      aria-label={`${p.isActive ? t("place.deactivate") : t("place.activate")}: ${p.name}`}
                      onClick={() => setToggle({ uid: p.uid, name: p.name, to: !p.isActive })}
                    >
                      <Icon name={p.isActive ? "eye-slash" : "eye"} fixedWidth={false} />
                    </button>
                    <button
                      type="button"
                      className="ph-btn ph-del"
                      title={t("common.delete")}
                      aria-label={`${t("common.delete")}: ${p.name}`}
                      onClick={() => setDelTarget({ uid: p.uid, isActive: p.isActive })}
                    >
                      <Icon name="trash" fixedWidth={false} />
                    </button>
                  </div>
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
        {delTarget && (
          <PlaceDeleteDialog
            uid={delTarget.uid}
            isActive={delTarget.isActive}
            onClose={() => setDelTarget(null)}
            onDeleted={() => setDelTarget(null)}
            onSuggestDeactivate={() => {
              const row = data?.rows.find((r) => r.uid === delTarget.uid);
              setDelTarget(null);
              if (row) setToggle({ uid: row.uid, name: row.name, to: false });
            }}
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
