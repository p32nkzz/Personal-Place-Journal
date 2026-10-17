"use client";

import { useT } from "~/lib/i18n";

/** Batas error umum: pesan ramah alih-alih halaman error mentah. */
export default function GlobalRouteError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useT();
  return (
    <div className="container page">
      <div className="card stack" style={{ maxWidth: 560, margin: "40px auto" }}>
        <h1 className="t-subhead">{t("err.pageTitle")}</h1>
        <p className="muted" style={{ margin: 0 }}>{t("err.pageText")}</p>
        <div>
          <button className="btn btn-primary" onClick={() => reset()}>{t("err.retry")}</button>
        </div>
      </div>
    </div>
  );
}
