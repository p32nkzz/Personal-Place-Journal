"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { useT } from "~/lib/i18n";

/** Fungsi Admin dan Explorer tidak pernah aktif bersamaan: arahkan user untuk switch mode (P-11). */
export function ModeRequired({ required }: { required: "ADMIN" | "EXPLORER" }) {
  const { t } = useT();
  const router = useRouter();
  const { update } = useSession();
  return (
    <div className="container page">
      <div className="card stack" style={{ maxWidth: 560, margin: "40px auto" }}>
        <h1 className="t-subhead">
          {required === "ADMIN" ? t("mode.needAdminTitle") : t("mode.needExplorerTitle")}
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          {required === "ADMIN" ? t("mode.needAdminText") : t("mode.needExplorerText")}
        </p>
        <div>
          <button
            className="btn btn-primary"
            onClick={async () => {
              await update({ mode: required });
              router.refresh();
            }}
          >
            {required === "ADMIN" ? t("mode.switchToAdmin") : t("mode.switchToExplorer")}
          </button>
        </div>
      </div>
    </div>
  );
}
