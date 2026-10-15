"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Alert, Spinner, useErrorMessage } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

function Confirm() {
  const { t } = useT();
  const errMsg = useErrorMessage();
  const token = useSearchParams().get("token") ?? "";
  const started = useRef(false);
  const [state, setState] = useState<"loading" | "ok" | string>("loading");
  const confirm = api.account.confirmEmail.useMutation({
    onSuccess: () => setState("ok"),
    onError: (e) => setState(errMsg(e)),
  });

  useEffect(() => {
    // Token sekali pakai: cegah pemanggilan ganda (React strict mode).
    if (started.current) return;
    started.current = true;
    if (!token) return setState(t("err.TOKEN_INVALID"));
    confirm.mutate({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth-wrap">
      <div className="card stack auth-card">
        <h1 className="t-subhead">{t("account.confirmEmailTitle")}</h1>
        {state === "loading" ? (
          <Spinner />
        ) : state === "ok" ? (
          <Alert kind="success">{t("account.emailConfirmed")}</Alert>
        ) : (
          <Alert kind="error">{state}</Alert>
        )}
        <Link href="/login" className="btn btn-primary">
          {t("nav.login")}
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Confirm />
    </Suspense>
  );
}
