"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ItineraryForm } from "~/components/ItineraryForm";
import { EmptyState, Spinner, useErrorMessage } from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { Icon } from "~/components/Icon";

export default function ItinerariesPage() {
  const { t } = useT();
  const fmt = useFormat();
  const router = useRouter();
  const errMsg = useErrorMessage();
  const { data, isLoading } = api.itinerary.list.useQuery();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = api.itinerary.create.useMutation({
    onSuccess: (r) => router.push(`/itineraries/${r.uid}`),
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.itineraries")}</h1>
          <p>{t("itinerary.hint")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(null); setOpen(true); }}><Icon name="plus" /> {t("itinerary.new")}</button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data?.length ? (
        <div className="card"><EmptyState title={t("itinerary.empty")} text={t("itinerary.emptyHint")} /></div>
      ) : (
        <div className="grid grid-3">
          {data.map((i) => (
            <Link key={i.uid} href={`/itineraries/${i.uid}`} className="card card-hover stack-sm">
              <h2 className="t-subhead">{i.name}</h2>
              <div className="t-small muted">
                {i.startDate || i.endDate ? `${fmt.date(i.startDate)} – ${fmt.date(i.endDate)}` : t("itinerary.noDates")}
              </div>
              {i.description && <p className="t-small" style={{ margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{i.description}</p>}
              <div className="row" style={{ marginTop: 4 }}>
                <span className="cat">{t("itinerary.stops", { n: i.places })}</span>
                <span className="cat">{t("itinerary.visitCount", { n: i.visits })}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && (
        <ItineraryForm
          title={t("itinerary.new")}
          initial={{ name: "", description: "", startDate: "", endDate: "" }}
          busy={create.isPending}
          error={error}
          onClose={() => setOpen(false)}
          onSubmit={(v) => { setError(null); create.mutate(v); }}
        />
      )}
    </div>
  );
}
