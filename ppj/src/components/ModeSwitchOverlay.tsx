"use client";

import Image from "next/image";

import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";

/** Layar loading penuh saat akun ADMIN berpindah mode Admin ⇄ Explorer (P-11). */
export function ModeSwitchOverlay({ to }: { to: "ADMIN" | "EXPLORER" }) {
  const { t } = useT();
  const label = to === "ADMIN" ? t("mode.admin") : t("mode.explorer");
  return (
    <div className="switch-overlay" role="status" aria-live="assertive" aria-busy="true">
      <div className="switch-card">
        <div className="switch-logo">
          <Image src="/logo.png" alt="" width={72} height={72} priority />
          <span className="switch-ring" aria-hidden />
        </div>
        <div className="switch-title">{t("mode.switching", { mode: label })}</div>
        <div className="switch-sub">
          <Icon name="refresh" spin fixedWidth={false} /> {t("mode.switchingWait")}
        </div>
        <div className="switch-bar" aria-hidden>
          <span />
        </div>
      </div>
    </div>
  );
}
