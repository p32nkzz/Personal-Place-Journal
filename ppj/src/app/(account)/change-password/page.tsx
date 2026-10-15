"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { Alert, Field, useErrorMessage, useToast, PasswordInput } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { Icon } from "~/components/Icon";

export default function ChangePasswordPage() {
  const { t } = useT();
  const router = useRouter();
  const { update } = useSession();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const { data: me } = api.account.me.useQuery();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = api.account.changePassword.useMutation({
    onSuccess: async () => {
      // Perbarui sidik jari password pada token agar sesi saat ini tetap valid.
      await update({ refresh: true });
      toast.push(t("account.passwordChanged"), "success");
      router.push(me?.role === "ADMIN" ? "/admin" : "/places");
      router.refresh();
    },
    onError: (e) => setError(errMsg(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) return setError(t("err.PASSWORD_MISMATCH"));
    mutation.mutate({ current, next });
  };

  return (
    <div className="auth-wrap">
      <form className="card stack auth-card" onSubmit={submit} noValidate>
        <h1 className="t-subhead">{t("account.changePassword")}</h1>
        {me?.mustChangePassword && <Alert kind="warning">{t("account.mustChange")}</Alert>}
        {error && <Alert kind="error">{error}</Alert>}
        <Field label={t("account.currentPassword")} required htmlFor="cur">
          <PasswordInput id="cur" className="input" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label={t("account.newPassword")} required htmlFor="new" helper={t("account.passwordRule")}>
          <PasswordInput id="new" className="input" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label={t("account.confirmPassword")} required htmlFor="conf">
          <PasswordInput id="conf" className="input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <button className="btn btn-primary" disabled={mutation.isPending || !current || !next || !confirm}>
          <Icon name="save" /> {mutation.isPending ? t("common.processing") : t("common.save")}
        </button>
      </form>
    </div>
  );
}
