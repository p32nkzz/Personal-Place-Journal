"use client";

import { useState } from "react";

import { Alert, Field, Modal } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { Icon } from "./Icon";

export function ItineraryForm({
  initial,
  busy,
  error,
  onSubmit,
  onClose,
  title,
}: {
  initial: { name: string; description: string; startDate: string; endDate: string };
  busy: boolean;
  error: string | null;
  onSubmit: (v: { name: string; description: string; startDate: string | null; endDate: string | null }) => void;
  onClose: () => void;
  title: string;
}) {
  const { t } = useT();
  const [v, setV] = useState(initial);
  const dateError = v.startDate && v.endDate && v.endDate < v.startDate ? t("err.DATE_ORDER") : null;
  return (
    <Modal
      title={title}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button
            className="btn btn-primary"
            disabled={busy || !v.name.trim() || !!dateError}
            onClick={() => onSubmit({ ...v, startDate: v.startDate || null, endDate: v.endDate || null })}
          >
            <Icon name="save" /> {busy ? t("common.processing") : t("common.save")}
          </button>
        </>
      }
    >
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <Field label={t("common.name")} required htmlFor="it-name">
          <input id="it-name" className="input" maxLength={255} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label={t("common.description")} htmlFor="it-desc" helper={t("common.max2000")}>
          <textarea id="it-desc" className="textarea" maxLength={2000} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
        <div className="form-grid cols-2">
          <Field label={t("itinerary.startDate")} htmlFor="it-s">
            <input id="it-s" className="input" type="date" value={v.startDate} onChange={(e) => setV({ ...v, startDate: e.target.value })} />
          </Field>
          <Field label={t("itinerary.endDate")} htmlFor="it-e" error={dateError} helper={t("itinerary.dateLabelHint")}>
            <input id="it-e" className="input" type="date" value={v.endDate} aria-invalid={!!dateError} onChange={(e) => setV({ ...v, endDate: e.target.value })} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
