"use client";

import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";
import { setSatellite, useSatellite } from "./mapType";

/** Pengganti tampilan peta (Peta | Satelit) yang diletakkan DI LUAR kotak peta. */
export function MapTypeSwitch({ className = "" }: { className?: string }) {
  const { t } = useT();
  const sat = useSatellite();
  return (
    <div className={`mt-switch ${className}`} role="radiogroup" aria-label={t("map.typeLabel")}>
      <button type="button" role="radio" aria-checked={!sat} onClick={() => setSatellite(false)}>
        <Icon name="map" fixedWidth={false} /> {t("map.typeRoadmap")}
      </button>
      <button type="button" role="radio" aria-checked={sat} onClick={() => setSatellite(true)}>
        <Icon name="image" fixedWidth={false} /> {t("map.typeSatellite")}
      </button>
    </div>
  );
}
