"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { ModeSwitchOverlay } from "~/components/ModeSwitchOverlay";
import { useT } from "~/lib/i18n";

/** Fungsi Admin dan Explorer tidak pernah aktif bersamaan: arahkan user untuk switch mode (P-11). */
export function ModeRequired({ required }: { required: "ADMIN" | "EXPLORER" }) {
  const { t } = useT();
  const router = useRouter();
  const { update } = useSession();
  const [busy, setBusy] = useState(false);
  return (
    <div className="container page">
      {busy && <ModeSwitchOverlay to={required} />}
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
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await update({ mode: required });
                router.refresh(); // halaman ini diganti konten tujuan sehingga layar loading ikut hilang
              } catch {
                setBusy(false);
              }
            }}
          >
            {required === "ADMIN" ? t("mode.switchToAdmin") : t("mode.switchToExplorer")}
          </button>
        </div>
      </div>
    </div>
  );
}
