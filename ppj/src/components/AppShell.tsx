"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

type ShellUser = {
  name: string;
  username: string;
  role: string;
  mode: "ADMIN" | "EXPLORER";
  mustChangePassword: boolean;
} | null;

type NavLeaf = { href: string; label: string; exact?: boolean };
type NavItem = NavLeaf | { group: string; label: string; children: NavLeaf[] };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const { t, lang, setLang } = useT();
  const pathname = usePathname();
  const router = useRouter();
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [utilOpen, setUtilOpen] = useState(false);
  const utilRef = useRef<HTMLDivElement>(null);
  const setLanguage = api.account.setLanguage.useMutation();

  useEffect(() => {
    setOpen(false);
    setMenu(false);
    setUtilOpen(false);
  }, [pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
      if (utilRef.current && !utilRef.current.contains(e.target as Node)) setUtilOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const adminMode = user?.role === "ADMIN" && user.mode === "ADMIN";
  const nav: NavItem[] = [];
  if (user && !user.mustChangePassword) {
    nav.push({ href: "/", label: t("nav.map"), exact: true });
    if (adminMode) {
      nav.push(
        { href: "/admin", label: t("nav.dashboard"), exact: true },
        { href: "/admin/masters", label: t("nav.masters") },
        { href: "/admin/review", label: t("nav.review") },
        { href: "/admin/curation", label: t("nav.curation") },
        { href: "/admin/categories", label: t("nav.categories") },
        {
          group: "utilities",
          label: t("nav.utilities"),
          children: [
            { href: "/admin/users", label: t("nav.users") },
            { href: "/admin/settings", label: t("nav.settings") },
            { href: "/admin/backup", label: t("nav.backup") },
          ],
        },
      );
    } else {
      nav.push(
        { href: "/places", label: t("nav.myPlaces") },
        { href: "/itineraries", label: t("nav.itineraries") },
        { href: "/tags", label: t("nav.tags") },
      );
    }
  } else if (!user) {
    nav.push({ href: "/", label: t("nav.map"), exact: true });
  }

  const isActive = (n: NavLeaf) =>
    n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/");

  const switchMode = async () => {
    const to = adminMode ? "EXPLORER" : "ADMIN";
    await update({ mode: to });
    router.push(to === "ADMIN" ? "/admin" : "/places");
    router.refresh();
  };

  const toggleLang = () => {
    const next = lang === "ID" ? "EN" : "ID";
    setLang(next);
    if (user) setLanguage.mutate({ preferredLanguage: next });
  };

  return (
    <div className="shell">
      <header className="site-header">
        <div className="container site-header-inner">
          <Link href="/" className="brand" aria-label="Personal Place Journal">
            <Image src="/logo.png" alt="" width={40} height={40} priority />
            <span>
              <span className="brand-name">Personal Place Journal</span>
              <br />
              <span className="brand-tag hide-mobile">Your Best Place Gallery</span>
            </span>
          </Link>

          <nav className="nav" aria-label="Main">
            {nav.map((n) =>
              "children" in n ? (
                <div key={n.group} className="nav-group" ref={utilRef}>
                  <button
                    type="button"
                    className="nav-group-btn"
                    aria-haspopup="menu"
                    aria-expanded={utilOpen}
                    aria-current={n.children.some(isActive) ? "page" : undefined}
                    onClick={() => setUtilOpen((o) => !o)}
                  >
                    {n.label} <Icon name="chevron-down" fixedWidth={false} style={{ fontSize: 10 }} />
                  </button>
                  {utilOpen && (
                    <div className="nav-submenu" role="menu">
                      {n.children.map((c) => (
                        <Link key={c.href} href={c.href} role="menuitem" aria-current={isActive(c) ? "page" : undefined}>
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link key={n.href} href={n.href} aria-current={isActive(n) ? "page" : undefined}>
                  {n.label}
                </Link>
              ),
            )}
          </nav>

          <div className="header-actions">
            <button
              className="lang-btn"
              onClick={toggleLang}
              aria-label={`${t("common.language")}: ${lang === "ID" ? "Bahasa Indonesia → English" : "English → Bahasa Indonesia"}`}
              title={lang === "ID" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
            >
              <Icon name="language" fixedWidth={false} />
              <b>{lang}</b>
            </button>
            {user ? (
              <div className="dropdown" ref={menuRef}>
                <button
                  className="avatar-btn"
                  data-mode={user.role === "ADMIN" ? (adminMode ? "admin" : "explorer") : undefined}
                  aria-haspopup="menu"
                  aria-expanded={menu}
                  aria-label={user.name}
                  title={`${user.name}${user.role === "ADMIN" ? ` — ${adminMode ? t("mode.admin") : t("mode.explorer")}` : ""}`}
                  onClick={() => setMenu((m) => !m)}
                >
                  <span className="avatar">{initials(user.name)}</span>
                  {user.role === "ADMIN" && !user.mustChangePassword && (
                    <span className="avatar-mode" aria-hidden>
                      <Icon name={adminMode ? "shield" : "user"} fixedWidth={false} />
                    </span>
                  )}
                </button>
                {menu && (
                  <div className="dropdown-menu" role="menu">
                    <div className="menu-head">
                      <span className="avatar avatar-lg">{initials(user.name)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div className="t-caption muted">@{user.username}</div>
                        {user.role === "ADMIN" && !user.mustChangePassword && (
                          <span className="mode-badge" style={{ marginTop: 6 }}>
                            <Icon name={adminMode ? "shield" : "user"} fixedWidth={false} />&nbsp;
                            {adminMode ? t("mode.admin") : t("mode.explorer")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="dropdown-sep" />
                    {!user.mustChangePassword && (
                      <Link href="/profile" role="menuitem">
                        {t("nav.profile")}
                      </Link>
                    )}
                    {user.role === "ADMIN" && !user.mustChangePassword && (
                      <button role="menuitem" onClick={switchMode}>
                        {adminMode ? t("mode.switchToExplorer") : t("mode.switchToAdmin")}
                      </button>
                    )}
                    <div className="dropdown-sep" />
                    <button role="menuitem" onClick={() => signOut({ callbackUrl: "/login" })}>
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm">
                <Icon name="key" /> {t("nav.login")}
              </Link>
            )}
            <button
              className="btn btn-ghost btn-sm btn-icon menu-toggle"
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <Icon name={open ? "xmark" : "bars"} />
            </button>
          </div>
        </div>
        {open && (
          <nav className="nav-mobile" aria-label="Mobile">
            {nav.map((n) =>
              "children" in n ? (
                <div key={n.group} className="nav-mobile-group">
                  <div className="nav-mobile-title">{n.label}</div>
                  {n.children.map((c) => (
                    <Link key={c.href} href={c.href} aria-current={isActive(c) ? "page" : undefined}>
                      {c.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link key={n.href} href={n.href} aria-current={isActive(n) ? "page" : undefined}>
                  {n.label}
                </Link>
              ),
            )}
          </nav>
        )}
      </header>

      <main className="shell-main">{children}</main>

      {pathname !== "/" && (
        <footer className="site-footer">
          <div className="container row-between">
            <span>© {new Date().getFullYear()} Personal Place Journal — Your Best Place Gallery</span>
            <span>{t("common.timezoneNote")}</span>
          </div>
        </footer>
      )}
    </div>
  );
}
