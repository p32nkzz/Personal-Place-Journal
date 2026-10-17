"use client";

import { MultiSelect } from "~/components/MultiSelect";
import { useTagPageSize } from "~/components/useTagPageSize";
import { TagChip } from "~/components/ui";
import { useT } from "~/lib/i18n";

type Tag = { uid: string; name: string; color: string };

/**
 * Filter TAG: perilaku sama dengan filter kategori (pilihan ganda, pencarian, muat bertahap
 * dengan jumlah per muat dari Pengaturan). Opsi tampil sebagai badge sesuai warna TAG.
 */
export function TagMultiSelect({
  tags,
  value,
  onChange,
  compact,
}: {
  tags: Tag[];
  value: string[];
  onChange: (uids: string[]) => void;
  compact?: boolean;
}) {
  const { t } = useT();
  const pageSize = useTagPageSize();
  return (
    <MultiSelect
      items={tags}
      value={value}
      onChange={onChange}
      compact={compact}
      icon="tags"
      pageSize={pageSize}
      ariaLabel={t("nav.tags")}
      allLabel={t("place.allTags")}
      selectedLabel={(n) => t("place.tagsSelected", { n })}
      searchPlaceholder={t("place.searchTag")}
      remainingLabel={(n) => t("place.tagsRemaining", { n })}
      clearLabel={t("place.clearTags")}
      renderOption={(x) => <TagChip name={x.name} color={x.color} />}
      renderValue={(sel) => (
        <span className="fl-tagval">
          {sel.slice(0, 3).map((x) => (
            <span key={x.uid} className="tag-dot" style={{ background: x.color }} />
          ))}
          {sel.length === 1 ? sel[0]!.name : t("place.tagsSelected", { n: sel.length })}
        </span>
      )}
    />
  );
}
