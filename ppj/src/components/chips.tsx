"use client";

import { useT } from "~/lib/i18n";
import { StatusChip, TagChip } from "./ui";

export function RelationChip({ status }: { status: string }) {
  const { t } = useT();
  const tone =
    status === "REFERRED"
      ? "success"
      : status === "REVIEW"
        ? "warning"
        : status === "REJECTED"
          ? "error"
          : "neutral";
  return <StatusChip tone={tone}>{t(`relation.${status}`)}</StatusChip>;
}

export function VisitStatusChip({ status }: { status: string }) {
  const { t } = useT();
  return (
    <StatusChip tone={status === "VISITED" ? "success" : "info"}>
      {t(status === "VISITED" ? "place.visited" : "place.plan")}
    </StatusChip>
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

export function CategoryChips({ items }: { items: { uid: string; name: string }[] }) {
  if (!items.length) return <span className="muted">—</span>;
  return (
    <span className="row" style={{ gap: 6 }}>
      {items.map((c) => (
        <span key={c.uid} className="cat">
          {c.name}
        </span>
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
