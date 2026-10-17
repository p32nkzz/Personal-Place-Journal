"use client";

import Link from "next/link";
import { Suspense, useState } from "react";

import { CategoryMultiSelect } from "~/components/CategoryMultiSelect";
import { CategoryChips } from "~/components/chips";
import { Icon, type IconName } from "~/components/Icon";
import { DescQuote } from "~/components/PlaceInfo";
import { PlaceThumb } from "~/components/PlaceThumb";
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Pagination,
  SearchInput,
  Spinner,
  StatusConfirm,
  Stars,
  useErrorMessage,
  useToast,
} from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { useUrlState } from "~/lib/useUrlState";
import { api } from "~/trpc/react";

type Status = "ALL" | "ACTIVE" | "INACTIVE" | "DELETED";

function Masters() {
  const { t } = useT();
  const fmt = useFormat();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  // Filter, pencarian, dan paging disinkronkan ke URL dan dijalankan di server (pola sama dengan daftar MY Place).
  const [s, set] = useUrlState({ q: "", status: "ALL", cat: "", page: "1", limit: "10" });
  const [error, setError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ uid: string; name: string; status: string } | null>(null);
  const [del, setDel] = useState<{ uid: string; name: string; referencedBy: number } | null>(null);

  const page = Number(s.page) || 1;
  const limit = Number(s.limit) || 10;
  const cats = api.categories.listActive.useQuery();
  const { data, isLoading } = api.master.adminList.useQuery({
    q: s.q || undefined,
    status: s.status as Status,
    categoryUids: s.cat ? s.cat.split(",") : undefined,
    page,
    limit,
  });
  const activeFilters = [s.q, s.status !== "ALL" ? s.status : "", s.cat].filter(Boolean).length;

  const done = (msg: string) => {
    void utils.master.adminList.invalidate();
    toast.push(msg, "success");
    setDel(null);
  };
  const setActive = api.master.setActive.useMutation({ onSuccess: () => { done(t("common.saved")); setStatusTarget(null); }, onError: (e) => setError(errMsg(e)) });
  const softDelete = api.master.softDelete.useMutation({ onSuccess: (r) => done(t("master.deleted", { n: r.unreferred })), onError: (e) => { setError(errMsg(e)); setDel(null); } });

  const STATUSES: [Status, string, IconName | null][] = [
    ["ALL", t("common.all"), null],
    ["ACTIVE", t("masterStatus.ACTIVE"), "circle-check"],
    ["INACTIVE", t("masterStatus.INACTIVE"), "circle-regular"],
    ["DELETED", t("masterStatus.DELETED"), "trash"],
  ];

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.masters")}</h1>
          <p>{t("master.listHint")}</p>
        </div>
      </div>
      {error && <div style={{ marginBottom: 16 }}><Alert kind="error">{error}</Alert></div>}

      <div className="card card-flush">
        <div className="fl-bar">
          {/* Baris 1: pencarian */}
          <div className="fl-row">
            <div className="fl-search">
              <Icon name="search" fixedWidth={false} />
              <SearchInput className="input" placeholder={t("master.searchPlaceholder")} value={s.q} onChange={(q) => set({ q, page: "1" })} />
            </div>
            {/* Tombol tambah data sebaris dengan pencarian (tata letak sama dengan halaman Pengguna) */}
            <div className="fl-btns">
              <Link href="/" className="btn btn-map"><Icon name="map-pin" /> {t("master.addFromMap")}</Link>
              <Link href="/admin/masters/new?from=list" className="btn btn-primary"><Icon name="plus" /> {t("master.new")}</Link>
            </div>
          </div>
          {/* Baris 2: filter ringkas */}
          <div className="fl-row fl-filters">
            <div className="fl-seg" role="radiogroup" aria-label={t("common.status")}>
              {STATUSES.map(([val, lbl, ic]) => (
                <button key={val} type="button" role="radio" aria-checked={s.status === val} data-ms={val} onClick={() => set({ status: val, page: "1" })}>
                  {ic && <Icon name={ic} fixedWidth={false} />} {lbl}
                </button>
              ))}
            </div>
            <CategoryMultiSelect compact categories={cats.data ?? []} value={s.cat ? s.cat.split(",") : []} onChange={(v) => set({ cat: v.join(","), page: "1" })} />
            {activeFilters > 0 && (
              <button type="button" className="fl-reset" onClick={() => set({ q: "", status: "ALL", cat: "", page: "1" })}>
                <Icon name="xmark" fixedWidth={false} /> {t("place.resetFilters", { n: activeFilters })}
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : !data?.rows.length ? (
          <EmptyState title={t("master.empty")} />
        ) : (
          <ul className="list">
            {data.rows.map((m) => (
              <li key={m.uid} className={`pl-row${m.status === "INACTIVE" ? " is-inactive" : ""}`} title={m.status === "INACTIVE" ? t("masterStatus.INACTIVE") : undefined}>
                <div className="pl-thumb-cell">
                  <PlaceThumb href={`/admin/masters/${m.uid}`} name={m.name} lat={m.latitude} lng={m.longitude} photos={m.photos} />
                </div>
                <Link href={`/admin/masters/${m.uid}`} className="list-item pl-main">
                  <div className="grow stack-sm" style={{ gap: 6 }}>
                    {m.categories.length > 0 && (
                      <div className="pl-chips">
                        <CategoryChips items={m.categories} />
                      </div>
                    )}
                    <span className="title ms-title">{m.name}</span>
                    {m.address && <span className="sub">{m.address}</span>}
                    {m.description && <DescQuote text={m.description} inline />}
                    {/* Mobile: rating lalu jumlah MY Place terhubung di bawahnya */}
                    <div className="ms-rate ms-rate-m">
                      <span className="pl-rating-m" title={m.rating.avg != null ? `${m.rating.avg.toFixed(1)} / 5` : t("common.noRating")}>
                        <Icon name="star" fixedWidth={false} />
                        {m.rating.avg != null ? (
                          <>
                            <b>{m.rating.avg.toFixed(1)}</b>
                            <span>({m.rating.count})</span>
                          </>
                        ) : (
                          <span>{t("common.noRating")}</span>
                        )}
                      </span>
                      <span className={`vstat ms-ref${m.referencedBy ? "" : " is-zero"}`} title={t("master.referencedBy")}>
                        <span className="vstat-n">
                          <Icon name="link" fixedWidth={false} />
                          <b>{m.referencedBy}</b>&nbsp;{t("master.referencedShort")}
                        </span>
                      </span>
                    </div>
                  </div>
                  {/* Desktop: bintang rating, jumlah MY Place yang mereferensikan MASTER ini di bawahnya */}
                  <div className="hide-mobile">
                    <div className="ms-rate">
                      <Stars value={m.rating.avg} count={m.rating.count} />
                      <span className={`vstat ms-ref${m.referencedBy ? "" : " is-zero"}`} title={t("master.referencedBy")}>
                        <span className="vstat-n">
                          <Icon name="link" fixedWidth={false} />
                          <b>{m.referencedBy}</b>&nbsp;{t("master.referencedShort")}
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="pl-side">
                  <div className="place-meta" aria-label={`${t("common.createdAt")} / ${t("common.updatedAt")}`}>
                    <span title={`${t("common.createdAt")}: ${fmt.dateTime(m.createdAt)}`}>
                      <Icon name="plus" fixedWidth={false} /> {fmt.dateTime(m.createdAt)}
                    </span>
                    <span title={`${t("common.updatedAt")}: ${fmt.dateTime(m.updatedAt)}`}>
                      <Icon name="pen" fixedWidth={false} /> {fmt.dateTime(m.updatedAt)}
                    </span>
                  </div>
                  {/* Aksi baris: ubah (biru), aktif/nonaktif (kuning/hijau), hapus (merah). MASTER terhapus hanya bisa dilihat. */}
                  <div className="pl-actions">
                    <Link href={`/admin/masters/${m.uid}`} className="ph-btn ph-edit" title={m.status === "DELETED" ? t("common.detail") : t("common.edit")} aria-label={`${t("common.edit")}: ${m.name}`}>
                      <Icon name={m.status === "DELETED" ? "eye" : "pen"} fixedWidth={false} />
                    </Link>
                    {m.status !== "DELETED" && (
                      <>
                        <button
                          type="button"
                          className={`ph-btn ${m.status === "ACTIVE" ? "ph-off" : "ph-on"}`}
                          title={m.status === "ACTIVE" ? t("place.deactivate") : t("place.activate")}
                          aria-label={`${m.status === "ACTIVE" ? t("place.deactivate") : t("place.activate")}: ${m.name}`}
                          onClick={() => setStatusTarget({ uid: m.uid, name: m.name, status: m.status })}
                        >
                          <Icon name={m.status === "ACTIVE" ? "eye-slash" : "eye"} fixedWidth={false} />
                        </button>
                        <button
                          type="button"
                          className="ph-btn ph-del"
                          title={t("common.delete")}
                          aria-label={`${t("common.delete")}: ${m.name}`}
                          onClick={() => setDel({ uid: m.uid, name: m.name, referencedBy: m.referencedBy })}
                        >
                          <Icon name="trash" fixedWidth={false} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
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
