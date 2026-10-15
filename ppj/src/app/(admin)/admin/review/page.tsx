"use client";

import Link from "next/link";
import { useState } from "react";

import { ActiveChip } from "~/components/chips";
import { MasterForm } from "~/components/MasterForm";
import {
  Alert,
  EmptyState,
  Field,
  Modal,
  Spinner,
  useErrorMessage,
  useToast,
} from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { api, type RouterOutputs } from "~/trpc/react";
import { Icon } from "~/components/Icon";

type QueueItem = RouterOutputs["review"]["queue"][number];

export default function ReviewPage() {
  const { t } = useT();
  const fmt = useFormat();
  const { data, isLoading } = api.review.queue.useQuery();
  const [action, setAction] = useState<null | { kind: "new" | "existing" | "reject"; item: QueueItem }>(null);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.review")}</h1>
          <p>{t("review.hint")}</p>
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data?.length ? (
        <div className="card"><EmptyState title={t("review.empty")} /></div>
      ) : (
        <div className="stack">
          {data.map((q) => (
            <div key={q.uid} className="card stack-sm">
              <div className="row-between">
                <div>
                  <h2 className="t-subhead">{q.snapshot?.name ?? "—"}</h2>
                  <div className="t-small muted">
                    {t("review.submittedBy", { name: q.ownerName })} · {fmt.dateTime(q.submittedAt)}
                  </div>
                </div>
                <div className="row">
                  <ActiveChip active={q.isActive} />
                  <Link href={`/admin/curation/${q.uid}`} className="btn btn-ghost btn-sm">{t("review.viewPlace")}</Link>
                </div>
              </div>
              <div className="t-overline muted">{t("review.snapshot")}</div>
              <dl className="kv" style={{ margin: 0 }}>
                <dt>{t("common.address")}</dt><dd>{q.snapshot?.address ?? "—"}</dd>
                <dt>{t("common.description")}</dt><dd style={{ whiteSpace: "pre-wrap" }}>{q.snapshot?.description ?? "—"}</dd>
                <dt>{t("common.coordinates")}</dt><dd className="mono">{q.snapshot ? `${q.snapshot.latitude.toFixed(6)}, ${q.snapshot.longitude.toFixed(6)}` : "—"}</dd>
                <dt>{t("common.category")}</dt>
                <dd className="row">{q.snapshot?.category_codes.length ? q.snapshot.category_codes.map((c) => <span key={c} className="cat">{c}</span>) : "—"}</dd>
              </dl>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setAction({ kind: "new", item: q })}>{t("review.approveNew")}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setAction({ kind: "existing", item: q })}>{t("review.approveExisting")}</button>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => setAction({ kind: "reject", item: q })}>{t("review.reject")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {action?.kind === "new" && <ApproveNewModal item={action.item} onClose={() => setAction(null)} />}
      {action?.kind === "existing" && <ApproveExistingModal item={action.item} onClose={() => setAction(null)} />}
      {action?.kind === "reject" && <RejectModal item={action.item} onClose={() => setAction(null)} />}
    </div>
  );
}

function useDone(onClose: () => void) {
  const { t } = useT();
  const toast = useToast();
  const utils = api.useUtils();
  return () => {
    void utils.review.invalidate();
    void utils.master.invalidate();
    toast.push(t("common.saved"), "success");
    onClose();
  };
}

function ApproveNewModal({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const { t } = useT();
  const errMsg = useErrorMessage();
  const done = useDone(onClose);
  const [error, setError] = useState<string | null>(null);
  const draft = api.review.draft.useQuery({ placeUid: item.uid, source: "snapshot" });
  const approve = api.review.approveNew.useMutation({ onSuccess: done, onError: (e) => setError(errMsg(e)) });
  return (
    <Modal title={t("review.approveNew")} large onClose={onClose}>
      {draft.isLoading || !draft.data ? (
        <Spinner />
      ) : (
        <MasterForm
          initial={{
            name: draft.data.name,
            address: draft.data.address,
            description: draft.data.description ?? "",
            latitude: draft.data.latitude,
            longitude: draft.data.longitude,
            googlePlaceId: draft.data.googlePlaceId,
            categoryUids: draft.data.categoryUids,
          }}
          busy={approve.isPending}
          error={error}
          submitLabel={t("review.approveNewSubmit")}
          onCancel={onClose}
          onSubmit={(v) => {
            setError(null);
            approve.mutate({ placeUid: item.uid, googlePlaceId: v.googlePlaceId, name: v.name, address: v.address, description: v.description, latitude: v.latitude!, longitude: v.longitude!, categoryUids: v.categoryUids });
          }}
        >
          <Alert kind="info">{t("review.draftNote")}</Alert>
        </MasterForm>
      )}
    </Modal>
  );
}

function ApproveExistingModal({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const { t } = useT();
  const errMsg = useErrorMessage();
  const done = useDone(onClose);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const search = api.master.searchActive.useQuery({ q });
  const approve = api.review.approveExisting.useMutation({ onSuccess: done, onError: (e) => setError(errMsg(e)) });
  return (
    <Modal
      title={t("review.approveExisting")}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" disabled={!sel || approve.isPending} onClick={() => approve.mutate({ placeUid: item.uid, masterUid: sel })}>{t("review.approveExistingSubmit")}</button>
        </>
      }
    >
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <input className="input" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("common.search")} />
        <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
          {search.isLoading ? <Spinner /> : !search.data?.length ? <div className="empty" style={{ padding: 16 }}>{t("master.noActive")}</div> : search.data.map((m) => (
            <button key={m.uid} type="button" className="list-item" style={{ width: "100%", border: 0, borderBottom: "1px solid var(--color-border)", background: sel === m.uid ? "var(--color-tint-active)" : "transparent", textAlign: "left", cursor: "pointer", font: "inherit" }} onClick={() => setSel(m.uid)}>
              <span className="grow"><span className="title">{m.name}</span><span className="sub" style={{ display: "block" }}>{m.address}</span></span>
              {sel === m.uid && <Icon name="circle-check" />}
            </button>
          ))}
        </div>
        <p className="helper" style={{ margin: 0 }}>{t("review.onlyActiveNote")}</p>
      </div>
    </Modal>
  );
}

function RejectModal({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const { t } = useT();
  const errMsg = useErrorMessage();
  const done = useDone(onClose);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reject = api.review.reject.useMutation({ onSuccess: done, onError: (e) => setError(errMsg(e)) });
  return (
    <Modal
      title={t("review.reject")}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-danger" disabled={!reason.trim() || reject.isPending} onClick={() => reject.mutate({ placeUid: item.uid, reason })}>{t("review.reject")}</button>
        </>
      }
    >
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <Field label={t("review.reason")} required htmlFor="rj" helper={t("review.reasonHint")}>
          <textarea id="rj" className="textarea" maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
