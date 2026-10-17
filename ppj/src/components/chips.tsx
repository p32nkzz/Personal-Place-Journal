"use client";

import { useT } from "~/lib/i18n";
import { Icon, type IconName } from "./Icon";
import { StatusChip, TagChip } from "./ui";

/*
 * Tiga keluarga badge dibedakan bentuk + warna + ikon agar tidak tertukar walau warnanya mirip:
 *  - Kategori        : label persegi, ungu, ikon lapisan            (.cat)
 *  - Relasi MASTER   : pil terisi, huruf kapital, ikon tautan/status (.rel)
 *  - Kunjungan       : pil bergaris tepi (outline), ikon kalender/pin (.vis)
 */

const RELATION_ICON: Record<string, IconName> = {
  UNREFERRED: "unlink",
  REVIEW: "history",
  REJECTED: "circle-xmark",
  REFERRED: "link",
};

export function RelationChip({ status }: { status: string }) {
  const { t } = useT();
  return (
    <span className={`rel rel-${status.toLowerCase()}`} title={t("place.relationStatus")}>
      <Icon name={RELATION_ICON[status] ?? "circle-regular"} fixedWidth={false} />
      {t(`relation.${status}`)}
    </span>
  );
}

export function VisitStatusChip({ status }: { status: string }) {
  const { t } = useT();
  const visited = status === "VISITED";
  return (
    <span className={`vis ${visited ? "vis-visited" : "vis-plan"}`} title={t("place.visitStatus")}>
      <Icon name={visited ? "map-pin" : "calendar"} fixedWidth={false} />
      {t(visited ? "place.visited" : "place.plan")}
    </span>
  );
}

/** Konteks sebuah kunjungan: sesuai rencana ITINERARY atau tidak terduga. */
export function VisitContextChip({ context, itineraryName }: { context: "PLANNED" | "UNEXPECTED"; itineraryName?: string | null }) {
  const { t } = useT();
  const planned = context === "PLANNED";
  return (
    <span className={`vis ${planned ? "vis-planned" : "vis-unexpected"}`}>
      <Icon name={planned ? "route" : "circle-dot"} fixedWidth={false} />
      {planned ? t("visit.planned") : t("visit.unexpected")}
      {itineraryName ? `: ${itineraryName}` : ""}
    </span>
  );
}

export function ActiveChip({ active, label }: { active: boolean; label?: string }) {
  const { t } = useT();
  return (
    <StatusChip tone={active ? "success" : "neutral"}>
      {label ?? (active ? t("common.active") : t("common.inactive"))}
    </StatusChip>
  );
}

export function MasterStatusChip({ status }: { status: string }) {
  const { t } = useT();
  return (
    <StatusChip tone={status === "ACTIVE" ? "success" : status === "INACTIVE" ? "neutral" : "error"}>
      {t(`masterStatus.${status}`)}
    </StatusChip>
  );
}

export function CategoryChip({ name }: { name: string }) {
  return (
    <span className="cat">
      <Icon name="layers" fixedWidth={false} />
      {name}
    </span>
  );
}

export function CategoryChips({ items }: { items: { uid: string; name: string }[] }) {
  if (!items.length) return <span className="muted">—</span>;
  return (
    <span className="row" style={{ gap: 6 }}>
      {items.map((c) => (
        <CategoryChip key={c.uid} name={c.name} />
      ))}
    </span>
  );
}

export function TagList({ items }: { items: { uid: string; name: string; color: string }[] }) {
  if (!items.length) return null;
  return (
    <span className="row" style={{ gap: 6 }}>
      {items.map((x) => (
        <TagChip key={x.uid} name={x.name} color={x.color} />
      ))}
    </span>
  );
}
