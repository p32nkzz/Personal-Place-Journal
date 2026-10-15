"use client";

import { Suspense, useState } from "react";

import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Pagination,
  SortHeader,
  Spinner,
  StatusButton,
  StatusChip,
  StatusConfirm,
  useErrorMessage,
  useToast, PasswordInput, SearchInput } from "~/components/ui";
import { useFormat, useT } from "~/lib/i18n";
import { useUrlState } from "~/lib/useUrlState";
import { Select } from "~/components/Select";
import { api, type RouterOutputs } from "~/trpc/react";
import { Avatar } from "~/components/Avatar";
import { Icon } from "~/components/Icon";

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

  const sortProps = {
    sort: s.sort || null,
    order: (s.order || null) as "asc" | "desc" | null,
    onSort: (sort: string | null, order: "asc" | "desc" | null) => set({ sort: sort ?? "", order: order ?? "", page: "1" }),
  };

  const open = (d: Dialog) => {
    setError(null);
    setDialog(d);
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.users")}</h1>
          <p>{t("user.hint")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => open({ kind: "create" })}><Icon name="plus" /> {t("user.new")}</button>
      </div>

      <div className="card card-flush">
        <div className="toolbar">
          <SearchInput style={{ flex: 1, minWidth: 220 }} placeholder={t("user.searchPlaceholder")} value={s.q} onChange={(q) => set({ q, page: "1" })} />
          <Select className="select" value={s.status} onChange={(e) => set({ status: e.target.value, page: "1" })} aria-label={t("common.status")}>
            <option value="ALL">{t("common.allStatus")}</option>
            <option value="ACTIVE">{t("common.active")}</option>
            <option value="INACTIVE">{t("common.inactive")}</option>
            <option value="DELETED">{t("user.deleted")}</option>
          </Select>
        </div>
        {isLoading ? <Spinner /> : !data?.rows.length ? <EmptyState title={t("user.empty")} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="col-no">{t("table.no")}</th>
                  <th><SortHeader label={t("common.name")} field="name" {...sortProps} /></th>
                  <th><SortHeader label="Username" field="username" {...sortProps} /></th>
                  <th><SortHeader label="Email" field="email" {...sortProps} /></th>
                  <th>{t("common.status")}</th>
                  <th><SortHeader label={t("common.createdAt")} field="createdAt" {...sortProps} /></th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((u, i) => (
                  <tr key={u.uid}>
                    <td className="col-no">{(page - 1) * limit + i + 1}</td>
                    <td><span className="row" style={{ gap: 8, flexWrap: "nowrap" }}><Avatar name={u.name} src={u.avatarUrl} /><b>{u.name}</b></span></td>
                    <td className="mono">{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <div className="row" style={{ gap: 4 }}>
                        {u.deletedAt ? <StatusChip tone="error">{t("user.deleted")}</StatusChip> : <StatusButton tone={u.isActive ? "success" : "neutral"} onClick={() => setStatusTarget(u)}>{u.isActive ? t("common.active") : t("common.inactive")}</StatusButton>}
                        {u.mustChangePassword && <StatusChip tone="warning">{t("user.mustChange")}</StatusChip>}
                      </div>
                    </td>
                    <td>{fmt.date(u.createdAt)}</td>
                    <td>
                      <div className="row" style={{ minWidth: 200 }}>
                        {u.deletedAt ? (
                          <button className="btn btn-secondary btn-sm" disabled={restore.isPending} onClick={() => restore.mutate({ uid: u.uid })}>{t("user.restore")}</button>
                        ) : (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => open({ kind: "edit", row: u })}><Icon name="pen" /> {t("common.edit")}</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => open({ kind: "email", row: u })}>Email</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => open({ kind: "reset", row: u })}>{t("user.resetPassword")}</button>
                            <button className="btn btn-danger-ghost btn-sm" onClick={() => open({ kind: "delete", row: u })}><Icon name="trash" /> {t("common.delete")}</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
