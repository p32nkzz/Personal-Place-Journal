"use client";

import Link from "next/link";
import { useState } from "react";

import { MapTypeSwitch } from "~/components/map/MapTypeSwitch";
import { CategoryChip } from "~/components/chips";
import { MapView } from "~/components/map/MapView";
import { useMapColors } from "~/components/map/useMapColors";
import { Alert, EmptyState, Spinner, StatusChip, Stars } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { Icon } from "~/components/Icon";

export function MasterPublicView({
  uid,
  viewer,
}: {
  uid: string;
  viewer: "GUEST" | "EXPLORER" | "ADMIN";
}) {
  const { t } = useT();
  const { data: m, isLoading, error } = api.master.get.useQuery({ uid });
  const [active, setActive] = useState(0);
  const mapColors = useMapColors();

  if (isLoading) return <Spinner />;
  if (error || !m)
    return (
      <div className="container page">
        <EmptyState
          title={t("master.notFound")}
          action={<Link href="/" className="btn btn-primary">{t("nav.map")}</Link>}
        />
      </div>
    );

  const photo = m.photos[active];
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <p style={{ margin: 0 }}>
            <Link href="/" className="muted"><Icon name="arrow-left" /> {t("nav.map")}</Link>
          </p>
          <h1>{m.name}</h1>
          <p>{m.address}</p>
        </div>
        <div className="row">
          {m.status !== "ACTIVE" && <StatusChip tone="neutral">{t("master.inactive")}</StatusChip>}
          {viewer === "EXPLORER" && m.status === "ACTIVE" && (
            <Link className="btn btn-primary" href={`/places/new?master=${m.uid}`}>
              {t("map.saveAsMine")}
            </Link>
          )}
          {viewer === "ADMIN" && (
            <Link className="btn btn-secondary" href={`/admin/masters/${m.uid}`}>
              {t("common.manage")}
            </Link>
          )}
        </div>
      </div>

      {m.status !== "ACTIVE" && <Alert kind="warning">{t("master.inactiveNote")}</Alert>}

      <div className="split" style={{ marginTop: 16 }}>
        <div className="stack">
          <div className="card card-flush">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt={photo.caption ?? m.name} style={{ width: "100%", maxHeight: 460, objectFit: "cover", display: "block" }} />
            ) : (
              <EmptyState title={t("master.noPhotos")} />
            )}
            {m.photos.length > 1 && (
              <div className="photo-grid" style={{ padding: 12 }}>
                {m.photos.map((p, i) => (
                  <button
                    key={p.uid}
                    className="photo"
                    style={{ padding: 0, cursor: "pointer", outline: i === active ? "3px solid var(--color-primary)" : undefined }}
                    onClick={() => setActive(i)}
                    aria-label={p.caption ?? `${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" />
                  </button>
                ))}
              </div>
            )}
            {photo?.caption && <p className="helper" style={{ padding: "0 16px 12px", margin: 0 }}>{photo.caption}</p>}
          </div>

          {m.description && (
            <div className="card">
              <h2 className="card-title">{t("common.description")}</h2>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.description}</p>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card stack-sm">
            <h2 className="card-title">{t("master.info")}</h2>
            <dl className="kv" style={{ margin: 0 }}>
              <dt>{t("master.rating")}</dt>
              <dd><Stars value={m.rating.avg} count={m.rating.count} /></dd>
              <dt>{t("common.category")}</dt>
              <dd className="row">
                {m.categories.length ? m.categories.map((c) => <CategoryChip key={c.uid} name={c.name} />) : "—"}
              </dd>
              <dt>{t("common.coordinates")}</dt>
              <dd className="mono">{m.latitude.toFixed(6)}, {m.longitude.toFixed(6)}</dd>
            </dl>
          </div>
          <MapTypeSwitch />
          <div className="map-box-md">
            <MapView
              markers={[{ id: "m", lat: m.latitude, lng: m.longitude, color: mapColors.master, glyph: "M", title: m.name }]}
              fit
            />
          </div>
        </div>
      </div>
    </div>
  );
}
