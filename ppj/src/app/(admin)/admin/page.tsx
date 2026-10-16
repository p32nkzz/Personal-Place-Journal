"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";

import { Avatar } from "~/components/Avatar";
import { Icon, type IconName } from "~/components/Icon";
import { Spinner } from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { api, type RouterOutputs } from "~/trpc/react";

type Dash = RouterOutputs["review"]["dashboard"];
type Days = 7 | 30 | 90;
type SeriesKey = "visits" | "places" | "masters";

/** Warna aksen per kartu/seri: [warna utama, latar lembut]. */
const ACC = {
  primary: ["#0077b6", "#e0efff"],
  teal: ["#0f766e", "#ccfbf1"],
  violet: ["#7c3aed", "#ede9fe"],
  indigo: ["#4f46e5", "#e0e7ff"],
  amber: ["#d97706", "#fef3c7"],
  slate: ["#475569", "#f1f5f9"],
  cyan: ["#0891b2", "#cffafe"],
} as const;
type Acc = keyof typeof ACC;
const accStyle = (a: Acc) => ({ "--acc": ACC[a][0], "--acc-soft": ACC[a][1] }) as CSSProperties;

const SERIES: { key: SeriesKey; acc: Acc; label: string }[] = [
  { key: "visits", acc: "teal", label: "dash.sVisits" },
  { key: "places", acc: "primary", label: "dash.sPlaces" },
  { key: "masters", acc: "violet", label: "dash.sMasters" },
];

const RELATIONS: { key: string; color: string }[] = [
  { key: "REFERRED", color: "#059669" },
  { key: "REVIEW", color: "#f59e0b" },
  { key: "REJECTED", color: "#ef4444" },
  { key: "UNREFERRED", color: "#94a3b8" },
];

export default function AdminDashboard() {
  const { t } = useT();
  const [days, setDays] = useState<Days>(30);
  // Data lama tetap tampil saat rentang diganti agar tata letak tidak berkedip.
  const { data, isLoading, isFetching } = api.review.dashboard.useQuery({ days }, { placeholderData: (prev) => prev });

  return (
    <div className="container page">
      <div className="page-head db-head">
        <div>
          <h1>{t("nav.dashboard")}</h1>
          <p>{t("admin.dashboardHint")}</p>
        </div>
        <div className="fl-seg" role="radiogroup" aria-label={t("dash.range")}>
          {([7, 30, 90] as const).map((d) => (
            <button key={d} type="button" role="radio" aria-checked={days === d} onClick={() => setDays(d)}>
              {t("dash.days", { n: d })}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className={`db-body${isFetching ? " is-fetching" : ""}`}>
          <Kpis data={data} />
          <div className="db-grid">
            <ActivityCard data={data} days={days} />
            <CompositionCard data={data} />
          </div>
          <div className="db-grid db-grid-3">
            <TopCategories data={data} />
            <QueuePreview data={data} />
            <TopExplorers data={data} />
          </div>
        </div>
      )}

      <Shortcuts data={data} />
    </div>
  );
}

/** Persentase tren periode ini vs periode sebelumnya. */
function Trend({ cur, prev }: { cur: number; prev: number }) {
  const { t } = useT();
  const tip = t("dash.vsPrev", { n: prev });
  if (!cur && !prev) return <span className="db-trend is-flat" title={tip}>—</span>;
  // Tanpa pembanding (periode sebelumnya kosong) persentase tidak bermakna.
  if (!prev) return null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  const dir = pct > 0 ? "is-up" : pct < 0 ? "is-down" : "is-flat";
  return (
    <span className={`db-trend ${dir}`} title={tip}>
      {pct !== 0 && <Icon name={pct > 0 ? "sort-up" : "sort-down"} fixedWidth={false} />} {Math.abs(pct)}%
    </span>
  );
}

function Kpis({ data }: { data: Dash }) {
  const { t } = useT();
  const fmt = useFormat();
  const { totals: s, period: p } = data;
  const items: { icon: IconName; acc: Acc; label: string; value: number; href: string; sub?: string; period?: { cur: number; prev: number }; alert?: boolean }[] = [
    { icon: "layers", acc: "primary", label: t("admin.statMasterActive"), value: s.masterActive, href: "/admin/masters?status=ACTIVE", sub: t("dash.inactiveN", { n: s.masterInactive }), period: p.masters },
    { icon: "pin", acc: "indigo", label: t("admin.statPlaces"), value: s.places, href: "/admin/curation", period: p.places },
    { icon: "map-pin", acc: "teal", label: t("admin.statVisits"), value: s.visitCount, href: "/admin/curation", period: p.visits },
    { icon: "users", acc: "cyan", label: t("admin.statExplorers"), value: s.explorers, href: "/admin/users?status=ACTIVE", sub: t("dash.inactiveN", { n: s.explorersInactive }), period: p.explorers },
    { icon: "clipboard", acc: "amber", label: t("admin.statQueue"), value: s.queue, href: "/admin/review", sub: s.queue ? t("dash.queueWaiting") : t("dash.queueClear"), alert: s.queue > 0 },
  ];
  return (
    <div className="db-kpis">
      {items.map((k) => (
        <Link key={k.label} href={k.href} className={`db-kpi${k.alert ? " is-alert" : ""}`} style={accStyle(k.acc)}>
          <span className="db-kpi-top">
            <span className="db-ico"><Icon name={k.icon} fixedWidth={false} /></span>
            <span className="db-kpi-label">{k.label}</span>
            <Icon name="arrow-right" fixedWidth={false} className="db-go" />
          </span>
          <b className="db-kpi-val">{fmt.number(k.value, 0)}</b>
          <span className="db-kpi-foot">
            {k.period && (
              <>
                <span className="db-new" title={t("dash.vsPrev", { n: k.period.prev })}>{t("dash.newInPeriod", { n: k.period.cur })}</span>
                <Trend cur={k.period.cur} prev={k.period.prev} />
              </>
            )}
            {k.sub && <span className="db-sub">{k.sub}</span>}
          </span>
        </Link>
      ))}
    </div>
  );
}

function ActivityCard({ data, days }: { data: Dash; days: Days }) {
  const { t, lang } = useT();
  const fmt = useFormat();
  const [on, setOn] = useState<Record<SeriesKey, boolean>>({ visits: true, places: true, masters: true });
  const [active, setActive] = useState<number | null>(null);
  const shown = SERIES.filter((s) => on[s.key]);
  // Skala genap agar garis tengah tetap bilangan bulat.
  const peak = Math.max(0, ...data.series.map((d) => shown.reduce((a, s) => a + d[s.key], 0)));
  const max = Math.max(2, Math.ceil(peak / 2) * 2);
  const totals = useMemo(
    () => Object.fromEntries(SERIES.map((s) => [s.key, data.series.reduce((a, d) => a + d[s.key], 0)])) as Record<SeriesKey, number>,
    [data.series],
  );
  const short = useMemo(() => new Intl.DateTimeFormat(lang === "ID" ? "id-ID" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), [lang]);
  const label = (d: string) => short.format(new Date(`${d}T00:00:00Z`));
  const day = active != null ? data.series[active] : null;
  const empty = SERIES.every((s) => !totals[s.key]);
  const ticks = [0, Math.floor((data.series.length - 1) / 2), data.series.length - 1];

  return (
    <section className="card db-card db-activity">
      <header className="db-card-h">
        <div>
          <h2>{t("dash.activity")}</h2>
          <span className="db-hint">{t("dash.activityHint", { tz: data.timezone })}</span>
        </div>
        <div className="db-toggles" role="group" aria-label={t("dash.activity")}>
          {SERIES.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={on[s.key]}
              style={accStyle(s.acc)}
              // Minimal satu seri tetap aktif.
              onClick={() => setOn((o) => (o[s.key] && shown.length === 1 ? o : { ...o, [s.key]: !o[s.key] }))}
            >
              <i /> {t(s.label)}
            </button>
          ))}
        </div>
      </header>

      <div className="db-detail" aria-live="polite">
        <span className="db-detail-title">{day ? fmt.date(day.d) : t("dash.periodTotal", { n: days })}</span>
        {SERIES.map((s) => (
          <span key={s.key} className={`db-detail-item${on[s.key] ? "" : " is-off"}`} style={accStyle(s.acc)}>
            <i /> {t(s.label)} <b>{day ? day[s.key] : totals[s.key]}</b>
          </span>
        ))}
      </div>

      <div className="db-chart-wrap">
        <div className="db-y" aria-hidden>
          <span>{max}</span>
          <span>{max / 2}</span>
          <span>0</span>
        </div>
        <div className={`db-chart db-chart-${days}`} onMouseLeave={() => setActive(null)}>
          {empty && <span className="db-chart-empty">{t("dash.noActivity")}</span>}
          {data.series.map((d, i) => {
            const sum = shown.reduce((a, s) => a + d[s.key], 0);
            return (
              <button
                key={d.d}
                type="button"
                className={`db-col${active === i ? " is-active" : ""}`}
                aria-label={`${fmt.date(d.d)}: ${shown.map((s) => `${t(s.label)} ${d[s.key]}`).join(", ")}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <span className="db-stack-col" style={{ height: `${(sum / max) * 100}%` }}>
                  {shown.map((s) =>
                    d[s.key] ? <span key={s.key} className="db-seg" style={{ ...accStyle(s.acc), flexGrow: d[s.key] }} /> : null,
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="db-x" aria-hidden>
        {ticks.map((i, n) => (
          <span key={n}>{data.series[i] ? label(data.series[i].d) : ""}</span>
        ))}
      </div>
    </section>
  );
}

function CompositionCard({ data }: { data: Dash }) {
  const { t } = useT();
  const relTotal = RELATIONS.reduce((a, r) => a + (data.relation[r.key] ?? 0), 0);
  const plan = data.visitStatus.PLAN ?? 0;
  const visited = data.visitStatus.VISITED ?? 0;
  const visTotal = plan + visited;
  const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
  const visRows = [
    { key: "VISITED", label: t("place.visited"), n: visited, color: "#0f766e" },
    { key: "PLAN", label: t("place.plan"), n: plan, color: "#38bdf8" },
  ];

  return (
    <section className="card db-card">
      <header className="db-card-h">
        <div>
          <h2>{t("dash.composition")}</h2>
          <span className="db-hint">{t("dash.placesN", { n: relTotal })}</span>
        </div>
      </header>

      <h3 className="db-sub-h">{t("dash.relation")}</h3>
      <div className="db-bar-stack" role="img" aria-label={t("dash.relation")}>
        {RELATIONS.map((r) =>
          data.relation[r.key] ? (
            <span key={r.key} style={{ flexGrow: data.relation[r.key], background: r.color }} title={`${t(`relation.${r.key}`)}: ${data.relation[r.key]}`} />
          ) : null,
        )}
      </div>
      <ul className="db-legend">
        {RELATIONS.map((r) => (
          <li key={r.key}>
            <Link href={`/admin/curation?relation=${r.key}`}>
              <i style={{ background: r.color }} />
              <span>{t(`relation.${r.key}`)}</span>
              <b>{data.relation[r.key] ?? 0}</b>
              <em>{pct(data.relation[r.key] ?? 0, relTotal)}%</em>
            </Link>
          </li>
        ))}
      </ul>

      <h3 className="db-sub-h">{t("dash.visitStatus")}</h3>
      <div className="db-bar-stack" role="img" aria-label={t("dash.visitStatus")}>
        {visRows.map((r) => (r.n ? <span key={r.key} style={{ flexGrow: r.n, background: r.color }} title={`${r.label}: ${r.n}`} /> : null))}
      </div>
      <ul className="db-legend db-legend-2">
        {visRows.map((r) => (
          <li key={r.key}>
            <span className="db-legend-row">
              <i style={{ background: r.color }} />
              <span>{r.label}</span>
              <b>{r.n}</b>
              <em>{pct(r.n, visTotal)}%</em>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CardHead({ title, hint, href }: { title: string; hint?: string; href?: string }) {
  const { t } = useT();
  return (
    <header className="db-card-h">
      <div>
        <h2>{title}</h2>
        {hint && <span className="db-hint">{hint}</span>}
      </div>
      {href && (
        <Link href={href} className="db-more">
          {t("dash.viewAll")} <Icon name="arrow-right" fixedWidth={false} />
        </Link>
      )}
    </header>
  );
}

function Empty({ icon, text }: { icon: IconName; text: string }) {
  return (
    <div className="db-empty">
      <Icon name={icon} fixedWidth={false} /> {text}
    </div>
  );
}

function TopCategories({ data }: { data: Dash }) {
  const { t } = useT();
  const max = Math.max(1, ...data.topCategories.map((c) => c.n));
  return (
    <section className="card db-card">
      <CardHead title={t("dash.topCategories")} hint={t("dash.topCategoriesHint")} href="/admin/categories" />
      {!data.topCategories.length ? (
        <Empty icon="layers" text={t("dash.empty")} />
      ) : (
        <ul className="db-list">
          {data.topCategories.map((c, i) => (
            <li key={c.uid}>
              <Link href={`/admin/masters?cat=${c.uid}`} className="db-cat">
                <span className="db-rank">{i + 1}</span>
                <span className="db-cat-main">
                  <span className="db-cat-row">
                    <span className="db-name">{c.name}</span>
                    <b>{t("dash.mastersN", { n: c.n })}</b>
                  </span>
                  <span className="db-track"><span style={{ width: `${(c.n / max) * 100}%` }} /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function QueuePreview({ data }: { data: Dash }) {
  const { t } = useT();
  const fmt = useFormat();
  return (
    <section className="card db-card">
      <CardHead title={t("dash.queuePreview")} hint={t("dash.queueOldest")} href="/admin/review" />
      {!data.queuePreview.length ? (
        <Empty icon="circle-check" text={t("dash.queueClear")} />
      ) : (
        <ul className="db-list">
          {data.queuePreview.map((q) => (
            <li key={q.uid}>
              <Link href="/admin/review" className="db-item">
                <span className="db-item-ico" style={accStyle("amber")}><Icon name="history" fixedWidth={false} /></span>
                <span className="db-item-main">
                  <span className="db-name">{q.name}</span>
                  <span className="db-meta">{q.ownerName}</span>
                </span>
                <span className="db-time" title={fmt.dateTime(q.at)}>{fmt.relative(q.at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TopExplorers({ data }: { data: Dash }) {
  const { t } = useT();
  return (
    <section className="card db-card">
      <CardHead title={t("dash.topExplorers")} href="/admin/users" />
      {!data.topExplorers.length ? (
        <Empty icon="users" text={t("dash.empty")} />
      ) : (
        <ul className="db-list">
          {data.topExplorers.map((u) => (
            <li key={u.uid}>
              <Link href={`/admin/users?q=${encodeURIComponent(u.username)}`} className="db-item">
                <Avatar name={u.name} src={u.avatarUrl} />
                <span className="db-item-main">
                  <span className="db-name">{u.name}</span>
                  <span className="db-meta mono">@{u.username}</span>
                </span>
                <span className="db-pills">
                  <span title={t("admin.statPlaces")}><Icon name="pin" fixedWidth={false} /> {u.n}</span>
                  <span title={t("admin.statVisits")}><Icon name="map-pin" fixedWidth={false} /> {u.visits}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Shortcuts({ data }: { data?: Dash }) {
  const { t } = useT();
  const fmt = useFormat();
  const s = data?.totals;
  const b = data?.lastBackup;
  const links: { href: string; icon: IconName; acc: Acc; title: string; text: string; badge?: string; tone?: "warn" | "error" }[] = [
    { href: "/admin/review", icon: "clipboard", acc: "amber", title: t("nav.review"), text: t("admin.reviewText"), badge: s?.queue ? t("dash.badgeWaiting", { n: s.queue }) : undefined, tone: "warn" },
    { href: "/admin/masters", icon: "layers", acc: "primary", title: t("nav.masters"), text: t("admin.mastersText"), badge: s ? t("dash.badgeActive", { n: s.masterActive }) : undefined },
    { href: "/admin/curation", icon: "eye", acc: "teal", title: t("nav.curation"), text: t("admin.curationText"), badge: s ? t("dash.placesN", { n: s.places }) : undefined },
    { href: "/admin/categories", icon: "palette", acc: "violet", title: t("nav.categories"), text: t("admin.categoriesText"), badge: s ? t("dash.badgeActive", { n: s.categoryCount }) : undefined },
    { href: "/admin/users", icon: "users", acc: "indigo", title: t("nav.users"), text: t("admin.usersText"), badge: s ? t("dash.badgeActive", { n: s.explorers }) : undefined },
    { href: "/admin/settings", icon: "gear", acc: "slate", title: t("nav.settings"), text: t("admin.settingsText") },
    {
      href: "/admin/backup",
      icon: "database",
      acc: "cyan",
      title: t("nav.backup"),
      text: t("admin.backupText"),
      badge: data ? (b ? (b.status === "FAILED" ? t("dash.backupFailed") : fmt.relative(b.at)) : t("dash.backupNever")) : undefined,
      tone: b?.status === "FAILED" ? "error" : !b && data ? "warn" : undefined,
    },
  ];
  return (
    <section className="db-shortcuts">
      <h2 className="db-section-h">{t("admin.shortcuts")}</h2>
      <div className="db-sc">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="db-tile" style={accStyle(l.acc)}>
            <span className="db-tile-ico"><Icon name={l.icon} fixedWidth={false} /></span>
            <span className="db-tile-main">
              <span className="db-tile-title">
                {l.title}
                {l.badge && <span className={`db-badge${l.tone ? ` is-${l.tone}` : ""}`}>{l.badge}</span>}
              </span>
              <span className="db-tile-text">{l.text}</span>
            </span>
            <Icon name="arrow-right" fixedWidth={false} className="db-go" />
          </Link>
        ))}
      </div>
    </section>
  );
}
