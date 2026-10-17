"use client";

import { Suspense, useState } from "react";

import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Pagination,
  Spinner,
  StatusChip,
  StatusConfirm,
  useErrorMessage,
  useToast, PasswordInput, SearchInput } from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { useUrlState } from "~/lib/useUrlState";
import { api, type RouterOutputs } from "~/trpc/react";
import { Avatar } from "~/components/Avatar";
import { Icon, type IconName } from "~/components/Icon";

type Row = RouterOutputs["users"]["list"]["rows"][number];
type Dialog =
  | { kind: "create" }
  | { kind: "edit"; row: Row }
  | { kind: "email"; row: Row }
  | { kind: "reset"; row: Row }
  | { kind: "delete"; row: Row }
  | { kind: "password"; password: string; name: string };

function Users() {
  const { t } = useT();
  const fmt = useFormat();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const [s, set] = useUrlState({ q: "", status: "ALL", sort: "", order: "", page: "1", limit: "10" });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<Row | null>(null);

  const page = Number(s.page) || 1;
  const limit = Number(s.limit) || 10;
  const { data, isLoading } = api.users.list.useQuery({
    q: s.q || undefined,
    status: s.status as "ALL" | "ACTIVE" | "INACTIVE" | "DELETED",
    sort: (s.sort || "createdAt") as "name" | "username" | "email" | "createdAt",
    order: (s.order || "desc") as "asc" | "desc",
    page,
    limit,
  });

  const done = (msg = t("common.saved")) => {
    void utils.users.list.invalidate();
    setDialog(null);
    toast.push(msg, "success");
  };
  const onError = (e: unknown) => setError(errMsg(e));
  const setActive = api.users.setActive.useMutation({ onSuccess: () => { done(); setStatusTarget(null); }, onError: (e) => toast.push(errMsg(e), "error") });
  const restore = api.users.restore.useMutation({ onSuccess: () => done(), onError: (e) => toast.push(errMsg(e), "error") });
  const del = api.users.softDelete.useMutation({ onSuccess: () => done(t("common.deleted")), onError });

  const open = (d: Dialog) => {
    setError(null);
    setDialog(d);
  };

  const sortVal = s.sort || "createdAt";
  const STATUSES: [string, string, IconName | null][] = [
    ["ALL", t("common.all"), null],
    ["ACTIVE", t("common.active"), "circle-check"],
    ["INACTIVE", t("common.inactive"), "circle-regular"],
    ["DELETED", t("user.deleted"), "trash"],
  ];
  const SORTS: [string, string][] = [
    ["createdAt", t("common.newest")],
    ["name", t("common.name")],
    ["username", "Username"],
  ];

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.users")}</h1>
          <p>{t("user.hint")}</p>
        </div>
      </div>

      <div className="card card-flush">
        <div className="fl-bar">
          <div className="fl-row">
            <div className="fl-search">
              <Icon name="search" fixedWidth={false} />
              <SearchInput className="input" placeholder={t("user.searchPlaceholder")} value={s.q} onChange={(q) => set({ q, page: "1" })} />
            </div>
            <button className="btn btn-primary" onClick={() => open({ kind: "create" })}><Icon name="plus" /> {t("user.new")}</button>
          </div>
          <div className="fl-row fl-filters">
            <div className="fl-seg" role="radiogroup" aria-label={t("common.status")}>
              {STATUSES.map(([v, l, ic]) => (
                <button key={v} type="button" role="radio" aria-checked={s.status === v} data-ms={v} onClick={() => set({ status: v, page: "1" })}>
                  {ic && <Icon name={ic} fixedWidth={false} />} {l}
                </button>
              ))}
            </div>
            <div className="fl-seg fl-seg-sort" role="radiogroup" aria-label={t("common.sortBy")}>
              <span className="fl-seg-label"><Icon name="sort" fixedWidth={false} /></span>
              {SORTS.map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={sortVal === v} onClick={() => set({ sort: v, order: v === "createdAt" ? "desc" : "asc", page: "1" })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        {isLoading ? <Spinner /> : !data?.rows.length ? <EmptyState title={t("user.empty")} /> : (
          <ul className="list">
            {data.rows.map((u) => (
              <li key={u.uid} className={`pl-row ct-row us-row${u.deletedAt ? " is-deleted" : ""}`}>
                <div className="pl-thumb-cell">
                  <Avatar name={u.name} src={u.avatarUrl} large />
                </div>
                <div className="list-item pl-main">
                  <div className="grow stack-sm" style={{ gap: 4 }}>
                    <span className="title">{u.name}</span>
                    <span className="us-ids">
                      <span className="mono">@{u.username}</span>
                      <span className="us-dot" aria-hidden>·</span>
                      <span className="us-mail">{u.email}</span>
                    </span>
                    {(u.deletedAt || u.mustChangePassword) && (
                      <div className="row" style={{ gap: 6 }}>
                        {u.deletedAt && <StatusChip tone="error">{t("user.deleted")}</StatusChip>}
                        {u.mustChangePassword && <StatusChip tone="warning">{t("user.mustChange")}</StatusChip>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pl-side">
                  <div className="place-meta" aria-label={t("common.createdAt")}>
                    <span title={`${t("common.createdAt")}: ${fmt.dateTime(u.createdAt)}`}>
                      <Icon name="plus" fixedWidth={false} /> {fmt.dateTime(u.createdAt)}
                    </span>
                  </div>
                  <div className="pl-actions">
                    {u.deletedAt ? (
                      <button type="button" className="ph-btn ph-on" disabled={restore.isPending} title={t("user.restore")} aria-label={`${t("user.restore")}: ${u.name}`} onClick={() => restore.mutate({ uid: u.uid })}>
                        <Icon name="restore" fixedWidth={false} />
                      </button>
                    ) : (
                      <>
                        <button type="button" className="ph-btn ph-edit" title={t("common.edit")} aria-label={`${t("common.edit")}: ${u.name}`} onClick={() => open({ kind: "edit", row: u })}>
                          <Icon name="pen" fixedWidth={false} />
                        </button>
                        <button type="button" className="ph-btn ph-mail" title={t("user.changeEmail")} aria-label={`${t("user.changeEmail")}: ${u.name}`} onClick={() => open({ kind: "email", row: u })}>
                          <Icon name="envelope" fixedWidth={false} />
                        </button>
                        <button type="button" className="ph-btn ph-key" title={t("user.resetPassword")} aria-label={`${t("user.resetPassword")}: ${u.name}`} onClick={() => open({ kind: "reset", row: u })}>
                          <Icon name="key" fixedWidth={false} />
                        </button>
                        <button type="button" className={`ph-btn ${u.isActive ? "ph-off" : "ph-on"}`} title={u.isActive ? t("place.deactivate") : t("place.activate")} aria-label={`${u.isActive ? t("place.deactivate") : t("place.activate")}: ${u.name}`} onClick={() => setStatusTarget(u)}>
                          <Icon name={u.isActive ? "eye-slash" : "eye"} fixedWidth={false} />
                        </button>
                        <button type="button" className="ph-btn ph-del" title={t("common.delete")} aria-label={`${t("common.delete")}: ${u.name}`} onClick={() => open({ kind: "delete", row: u })}>
                          <Icon name="trash" fixedWidth={false} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={page} limit={limit} total={data.total} onPage={(p) => set({ page: String(p) })} onLimit={(l) => set({ limit: String(l), page: "1" })} />}
      </div>

      {statusTarget && (
        <StatusConfirm
          name={statusTarget.name}
          toActive={!statusTarget.isActive}
          busy={setActive.isPending}
          onClose={() => setStatusTarget(null)}
          onConfirm={() => setActive.mutate({ uid: statusTarget.uid, isActive: !statusTarget.isActive })}
        />
      )}

      {dialog?.kind === "create" && (
        <CreateUser error={error} setError={setError} onClose={() => setDialog(null)} onCreated={(password, name) => { void utils.users.list.invalidate(); if (password) setDialog({ kind: "password", password, name }); else done(); }} />
      )}
      {dialog?.kind === "edit" && <EditUser row={dialog.row} error={error} setError={setError} onClose={() => setDialog(null)} onDone={() => done()} />}
      {dialog?.kind === "email" && <ChangeEmail row={dialog.row} error={error} setError={setError} onClose={() => setDialog(null)} onDone={() => done(t("account.emailRequested"))} />}
      {dialog?.kind === "reset" && (
        <ResetPassword row={dialog.row} error={error} setError={setError} onClose={() => setDialog(null)} onDone={(password) => { void utils.users.list.invalidate(); if (password) setDialog({ kind: "password", password, name: dialog.row.name }); else done(); }} />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title={t("user.deleteTitle")}
          message={<><p style={{ margin: 0 }}>{t("user.deleteText", { name: dialog.row.name })}</p>{error && <Alert kind="error">{error}</Alert>}</>}
          danger
          confirmLabel={t("common.delete")}
          busy={del.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() => del.mutate({ uid: dialog.row.uid })}
        />
      )}
      {dialog?.kind === "password" && <ShowPassword password={dialog.password} name={dialog.name} onClose={() => setDialog(null)} />}
    </div>
  );
}

function CreateUser({ error, setError, onClose, onCreated }: { error: string | null; setError: (e: string | null) => void; onClose: () => void; onCreated: (password: string | null, name: string) => void }) {
  const { t } = useT();
  const errMsg = useErrorMessage();
  const [v, setV] = useState({ name: "", username: "", email: "", generate: true, password: "" });
  const create = api.users.create.useMutation({ onSuccess: (r) => onCreated(r.password, v.name), onError: (e) => setError(errMsg(e)) });
  return (
    <Modal
      title={t("user.new")}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" disabled={create.isPending || !v.name.trim() || !v.username || !v.email || (!v.generate && !v.password)} onClick={() => { setError(null); create.mutate({ name: v.name, username: v.username, email: v.email, generate: v.generate, password: v.generate ? undefined : v.password }); }}><Icon name="save" /> {t("common.save")}</button>
        </>
      }
    >
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <Field label={t("common.name")} required htmlFor="u-name"><input id="u-name" className="input" maxLength={255} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="Username" required htmlFor="u-user" helper={t("account.usernameRule")}><input id="u-user" className="input mono" maxLength={20} autoCapitalize="none" value={v.username} onChange={(e) => setV({ ...v, username: e.target.value })} /></Field>
        <Field label="Email" required htmlFor="u-email"><input id="u-email" className="input" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
        <div className="field">
          <span className="label">{t("user.initialPassword")}</span>
          <label className="check"><input type="radio" name="pw" checked={v.generate} onChange={() => setV({ ...v, generate: true })} /><span>{t("user.generate")}</span></label>
          <label className="check"><input type="radio" name="pw" checked={!v.generate} onChange={() => setV({ ...v, generate: false })} /><span>{t("user.manual")}</span></label>
          {!v.generate && <Field label={t("account.newPassword")} htmlFor="u-pw" helper={t("account.passwordRule")}><PasswordInput id="u-pw" className="input" autoComplete="off" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></Field>}
        </div>
        <Alert kind="info">{t("user.mustChangeNote")}</Alert>
      </div>
    </Modal>
  );
}

function EditUser({ row, error, setError, onClose, onDone }: { row: Row; error: string | null; setError: (e: string | null) => void; onClose: () => void; onDone: () => void }) {
  const { t } = useT();
  const errMsg = useErrorMessage();
  const [name, setName] = useState(row.name);
  const update = api.users.update.useMutation({ onSuccess: onDone, onError: (e) => setError(errMsg(e)) });
  return (
    <Modal title={t("user.edit")} onClose={onClose} actions={<><button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn btn-primary" disabled={update.isPending || !name.trim()} onClick={() => { setError(null); update.mutate({ uid: row.uid, name }); }}><Icon name="save" /> {t("common.save")}</button></>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <Field label={t("common.name")} required htmlFor="e-name"><input id="e-name" className="input" maxLength={255} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Username" helper={t("user.usernameByOwner")}><input className="input mono" value={row.username} disabled /></Field>
      </div>
    </Modal>
  );
}

function ChangeEmail({ row, error, setError, onClose, onDone }: { row: Row; error: string | null; setError: (e: string | null) => void; onClose: () => void; onDone: () => void }) {
  const { t } = useT();
  const errMsg = useErrorMessage();
  const [email, setEmail] = useState("");
  const req = api.users.requestEmailChange.useMutation({ onSuccess: onDone, onError: (e) => setError(errMsg(e)) });
  return (
    <Modal title={t("user.changeEmail")} onClose={onClose} actions={<><button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn btn-primary" disabled={req.isPending || !email} onClick={() => { setError(null); req.mutate({ uid: row.uid, email }); }}>{t("account.sendConfirmation")}</button></>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <p style={{ margin: 0 }}>{t("account.emailCurrent")}: <b>{row.email}</b></p>
        <Field label={t("account.newEmail")} required htmlFor="ce-email" helper={t("account.emailHint")}><input id="ce-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function ResetPassword({ row, error, setError, onClose, onDone }: { row: Row; error: string | null; setError: (e: string | null) => void; onClose: () => void; onDone: (password: string | null) => void }) {
  const { t } = useT();
  const errMsg = useErrorMessage();
  const [generate, setGenerate] = useState(true);
  const [password, setPassword] = useState("");
  const reset = api.users.resetPassword.useMutation({ onSuccess: (r) => onDone(r.password), onError: (e) => setError(errMsg(e)) });
  return (
    <Modal title={t("user.resetPassword")} onClose={onClose} actions={<><button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button><button className="btn btn-primary" disabled={reset.isPending || (!generate && !password)} onClick={() => { setError(null); reset.mutate({ uid: row.uid, generate, password: generate ? undefined : password }); }}>{t("user.resetPassword")}</button></>}>
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        <p style={{ margin: 0 }}>{t("user.resetText", { name: row.name })}</p>
        <label className="check"><input type="radio" name="rp" checked={generate} onChange={() => setGenerate(true)} /><span>{t("user.generate")}</span></label>
        <label className="check"><input type="radio" name="rp" checked={!generate} onChange={() => setGenerate(false)} /><span>{t("user.manual")}</span></label>
        {!generate && <Field label={t("account.newPassword")} htmlFor="rp-pw" helper={t("account.passwordRule")}><PasswordInput id="rp-pw" className="input" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>}
        <Alert kind="warning">{t("user.resetNote")}</Alert>
      </div>
    </Modal>
  );
}

function ShowPassword({ password, name, onClose }: { password: string; name: string; onClose: () => void }) {
  const { t } = useT();
  const toast = useToast();
  return (
    <Modal title={t("user.passwordTitle")} onClose={onClose} actions={<button className="btn btn-primary" onClick={onClose}>{t("user.passwordDone")}</button>}>
      <div className="stack">
        <p style={{ margin: 0 }}>{t("user.passwordText", { name })}</p>
        <div className="card card-sm row-between" style={{ background: "var(--color-tint)" }}>
          <code style={{ fontSize: 20, letterSpacing: "0.05em" }}>{password}</code>
          <button className="btn btn-secondary btn-sm" onClick={() => { void navigator.clipboard?.writeText(password); toast.push(t("common.copied"), "success"); }}>{t("common.copy")}</button>
        </div>
        <Alert kind="warning">{t("user.passwordOnce")}</Alert>
      </div>
    </Modal>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Users />
    </Suspense>
  );
}
