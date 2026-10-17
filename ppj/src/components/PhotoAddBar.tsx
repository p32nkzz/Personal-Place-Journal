"use client";

import { Icon } from "~/components/Icon";
import { useT } from "~/lib/i18n";

/**
 * Bar aksi tambah foto yang ringkas (segmented): Unggah · Kamera · Link.
 * Dipakai di form tambah (foto tertunda) dan galeri foto (langsung diunggah).
 */
export function PhotoAddBar({
  onUpload,
  onCamera,
  onLink,
  linkActive,
  disabled,
  busy,
}: {
  onUpload?: () => void;
  onCamera?: () => void;
  onLink?: () => void;
  /** Panel/isian link sedang terbuka. */
  linkActive?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  const { t } = useT();
  return (
    <div className="ph-addrow">
      <div className="ph-addbar" role="group" aria-label={t("photo.addTitle")}>
        {onUpload && (
          <button type="button" className="ph-add" disabled={disabled} onClick={onUpload} title={t("photo.upload")}>
            <Icon name="upload" fixedWidth={false} />
            <span>{t("photo.modeUpload")}</span>
          </button>
        )}
        {onCamera && (
          <button type="button" className="ph-add" disabled={disabled} onClick={onCamera} title={t("photo.cameraHint")}>
            <Icon name="camera" fixedWidth={false} />
            <span>{t("photo.camera")}</span>
          </button>
        )}
        {onLink && (
          <button type="button" className="ph-add" disabled={disabled} aria-pressed={linkActive} onClick={onLink} title={t("photo.addUrl")}>
            <Icon name="link" fixedWidth={false} />
            <span>{t("photo.link")}</span>
          </button>
        )}
      </div>
      {busy && <Icon name="refresh" spin fixedWidth={false} className="ph-addbusy" />}
    </div>
  );
}
