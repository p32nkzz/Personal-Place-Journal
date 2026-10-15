"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import {
  Alert,
  Field,
  Spinner,
  useErrorMessage,
  useToast, PasswordInput } from "~/components/ui";
import { useFormat, useT, type Lang } from "~/lib/i18n";
import { Select } from "~/components/Select";
import { api } from "~/trpc/react";
import { Icon } from "~/components/Icon";

export function ProfileView() {
  const { t, setLang } = useT();
  const fmt = useFormat();
  const router = useRouter();
  const { update } = useSession();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const { data: me, isLoading } = api.account.me.useQuery();

  const [name, setName] = useState("");
  const [language, setLanguage] = useState<Lang>("ID");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (me) {
      setName(me.name);
      setLanguage(me.preferredLanguage);
      setUsername(me.username);
    }
  }, [me]);

  const setErr = (k: string, v: string | null) => setErrors((e) => ({ ...e, [k]: v }));
  const done = (msg: string) => {
    toast.push(msg, "success");
    void utils.account.me.invalidate();
    router.refresh();
  };

  const profile = api.account.updateProfile.useMutation({
    onSuccess: (_d, v) => {
      setLang(v.preferredLanguage);
      done(t("common.saved"));
    },
    onError: (e) => setErr("profile", errMsg(e)),
  });
  const uname = api.account.changeUsername.useMutation({
    onSuccess: () => done(t("account.usernameChanged")),
    onError: (e) => setErr("username", errMsg(e)),
  });
  const mail = api.account.requestEmailChange.useMutation({
    onSuccess: () => {
      setEmail("");
      done(t("account.emailRequested"));
    },
    onError: (e) => setErr("email", errMsg(e)),
  });
  const pass = api.account.changePassword.useMutation({
    onSuccess: async () => {
      await update({ refresh: true });
      setCur("");
      setNext("");
      setConf("");
      done(t("account.passwordChanged"));
    },
    onError: (e) => setErr("password", errMsg(e)),
  });

  if (isLoading || !me) return <Spinner />;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.profile")}</h1>
          <p>
            @{me.username} · {me.email} · {me.role}
          </p>
        </div>
      </div>

      <div className="grid grid-2">
        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            setErr("profile", null);
            profile.mutate({ name, preferredLanguage: language });
          }}
        >
          <h2 className="card-title">{t("account.profileSection")}</h2>
          {errors.profile && <Alert kind="error">{errors.profile}</Alert>}
          <Field label={t("account.name")} required htmlFor="name">
            <input id="name" className="input" value={name} maxLength={255} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t("common.language")} htmlFor="lang" helper={t("account.languageHint")}>
            <Select id="lang" className="select" value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
              <option value="ID">Bahasa Indonesia</option>
              <option value="EN">English</option>
            </Select>
          </Field>
          <div>
            <button className="btn btn-primary" disabled={profile.isPending || !name.trim()}>
              <Icon name="save" /> {t("common.save")}
            </button>
          </div>
        </form>

        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            setErr("username", null);
            uname.mutate({ username });
          }}
        >
          <h2 className="card-title">{t("account.usernameSection")}</h2>
          {errors.username && <Alert kind="error">{errors.username}</Alert>}
          <Field label={t("account.username")} required htmlFor="username" helper={t("account.usernameRule")}>
            <input id="username" className="input mono" value={username} maxLength={20} autoCapitalize="none" onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <div>
            <button className="btn btn-primary" disabled={uname.isPending || username.trim().toLowerCase() === me.username}>
              <Icon name="save" /> {t("common.save")}
            </button>
          </div>
        </form>

        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            setErr("email", null);
            mail.mutate({ email });
          }}
        >
          <h2 className="card-title">{t("account.emailSection")}</h2>
          <p className="helper" style={{ margin: 0 }}>
            {t("account.emailCurrent")}: <b>{me.email}</b>
          </p>
          {me.pendingEmail && (
            <Alert kind="info">
              {t("account.emailPending", {
                email: me.pendingEmail.newEmail,
                until: fmt.dateTime(me.pendingEmail.expiresAt),
              })}
            </Alert>
          )}
          {errors.email && <Alert kind="error">{errors.email}</Alert>}
          <Field label={t("account.newEmail")} required htmlFor="email" helper={t("account.emailHint")}>
            <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div>
            <button className="btn btn-primary" disabled={mail.isPending || !email.trim()}>
              {t("account.sendConfirmation")}
            </button>
          </div>
        </form>

        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            setErr("password", null);
            if (next !== conf) return setErr("password", t("err.PASSWORD_MISMATCH"));
            pass.mutate({ current: cur, next });
          }}
        >
          <h2 className="card-title">{t("account.changePassword")}</h2>
          {errors.password && <Alert kind="error">{errors.password}</Alert>}
          <Field label={t("account.currentPassword")} required htmlFor="p1">
            <PasswordInput id="p1" className="input" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
          </Field>
          <Field label={t("account.newPassword")} required htmlFor="p2" helper={t("account.passwordRule")}>
            <PasswordInput id="p2" className="input" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label={t("account.confirmPassword")} required htmlFor="p3">
            <PasswordInput id="p3" className="input" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} />
          </Field>
          <div>
            <button className="btn btn-primary" disabled={pass.isPending || !cur || !next || !conf}>
              <Icon name="save" /> {t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
