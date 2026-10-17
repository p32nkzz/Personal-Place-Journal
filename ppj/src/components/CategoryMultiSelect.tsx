"use client";

import { MultiSelect } from "~/components/MultiSelect";
import { useCategoryPageSize } from "~/components/useCategoryPageSize";
import { useT } from "~/lib/i18n";

type Cat = { uid: string; name: string };

/**
 * Filter kategori: pilihan ganda, urut nama A–Z, pencarian, dan infinite load
 * (3 data awal, +3 setiap daftar digulir ke dasar). Dasar daftar menampilkan jumlah yang belum dimuat.
 */
export function CategoryMultiSelect({
  categories,
  value,
  onChange,
  compact,
}: {
  categories: Cat[];
  value: string[];
  onChange: (uids: string[]) => void;
  compact?: boolean;
}) {
  const { t } = useT();
  const pageSize = useCategoryPageSize();
  return (
    <MultiSelect
      items={categories}
      value={value}
      onChange={onChange}
      compact={compact}
      pageSize={pageSize}
      icon={compact ? "layers" : undefined}
      ariaLabel={t("common.category")}
      allLabel={t("map.allCategories")}
      selectedLabel={(n) => t("map.categoriesSelected", { n })}
      searchPlaceholder={t("map.searchCategory")}
      remainingLabel={(n) => t("map.categoriesRemaining", { n })}
      clearLabel={t("map.clearCategories")}
    />
  );
}
