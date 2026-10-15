"use client";

import Link from "next/link";

import { Icon, type IconName } from "~/components/Icon";
import { Spinner } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

export default function AdminDashboard() {
  const { t } = useT();
  const { data, isLoading } = api.review.stats.useQuery();

  const stats: { icon: IconName; label: string; value: number; href: string }[] = data
    ? [
        { icon: "layers", label: t("admin.statMasterActive"), value: data.masterActive, href: "/admin/masters" },
        { icon: "circle-xmark", label: t("admin.statMasterInactive"), value: data.masterInactive, href: "/admin/masters" },
        { icon: "clipboard", label: t("admin.statQueue"), value: data.queue, href: "/admin/review" },
        { icon: "users", label: t("admin.statExplorers"), value: data.explorers, href: "/admin/users" },
        { icon: "pin", label: t("admin.statPlaces"), value: data.places, href: "/admin/curation" },
        { icon: "history", label: t("admin.statVisits"), value: data.visitCount, href: "/admin/curation" },
      ]
    : [];

  const links: { href: string; icon: IconName; title: string; text: string }[] = [
    { href: "/admin/review", icon: "clipboard", title: t("nav.review"), text: t("admin.reviewText") },
    { href: "/admin/masters", icon: "layers", title: t("nav.masters"), text: t("admin.mastersText") },
    { href: "/admin/curation", icon: "eye", title: t("nav.curation"), text: t("admin.curationText") },
    { href: "/admin/categories", icon: "palette", title: t("nav.categories"), text: t("admin.categoriesText") },
    { href: "/admin/users", icon: "users", title: t("nav.users"), text: t("admin.usersText") },
    { href: "/admin/settings", icon: "gear", title: t("nav.settings"), text: t("admin.settingsText") },
    { href: "/admin/backup", icon: "database", title: t("nav.backup"), text: t("admin.backupText") },
  ];

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.dashboard")}</h1>
          <p>{t("admin.dashboardHint")}</p>
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-3" style={{ marginBottom: 32 }}>
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="card card-hover stat">
              <b>{s.value}</b>
              <span className="muted t-small"><Icon name={s.icon} /> {s.label}</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="t-subhead" style={{ marginBottom: 12 }}>{t("admin.shortcuts")}</h2>
      <div className="grid grid-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="card card-hover stack-sm">
            <h3 className="t-subhead" style={{ color: "var(--color-primary)" }}><Icon name={l.icon} /> {l.title}</h3>
            <p className="muted t-small" style={{ margin: 0 }}>{l.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
