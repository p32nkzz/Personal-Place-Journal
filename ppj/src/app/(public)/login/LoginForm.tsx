"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Icon } from "~/components/Icon";
import { Alert, Field, PasswordInput } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

export function LoginForm() {
  const { t } = useT();
  const router = useRouter();
  const utils = api.useUtils();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });
    if (!res || res.error) {
      // Gagal karena database tidak terjangkau? Beri tahu, jangan salahkan kredensial.
      const down = await fetch("/api/health", { cache: "no-store" }).then((r) => !r.ok).catch(() => true);
      // Pesan generik — tidak mengungkap bagian mana yang salah (P-15).
      setError(down ? t("err.DB_UNAVAILABLE") : t("auth.invalid"));
      setBusy(false);
      return;
    }
    try {
      const me = await utils.account.me.fetch();
      router.push(
        me.mustChangePassword
          ? "/change-password"
          : me.role === "ADMIN"
            ? "/admin"
            : "/places",
      );
      router.refresh();
    } catch {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <Image src="/logo.png" alt="" width={96} height={96} priority />
          <h1 className="t-headline" style={{ marginTop: 8 }}>
            Personal Place Journal
          </h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Your Best Place Gallery
          </p>
        </div>
        <form className="card stack" onSubmit={submit} noValidate>
          <h2 className="t-subhead">{t("auth.loginTitle")}</h2>
          {error && <Alert kind="error">{error}</Alert>}
          <Field label={t("auth.identifier")} required htmlFor="identifier">
            <input
              id="identifier"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              aria-invalid={!!error}
              required
            />
          </Field>
          <Field label={t("auth.password")} required htmlFor="password">
            <PasswordInput
              id="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              required
            />
          </Field>
          <button className="btn btn-primary btn-block" disabled={busy || !identifier || !password}>
            <Icon name={busy ? "refresh" : "key"} spin={busy} /> {busy ? t("common.processing") : t("auth.loginButton")}
          </button>
          <p className="helper" style={{ margin: 0 }}>
            {t("auth.noAccountHint")}
          </p>
        </form>
      </div>
    </div>
  );
}
