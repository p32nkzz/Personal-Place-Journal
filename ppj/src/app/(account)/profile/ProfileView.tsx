"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useRef, useState } from "react";

import { usePhotoGuard } from "~/components/usePhotoGuard";
import { Avatar } from "~/components/Avatar";
import { Icon } from "~/components/Icon";
import { Select } from "~/components/Select";
import { SettingRow, SettingsShell } from "~/components/SettingRow";
import { Alert, PasswordInput, Spinner, StatusChip, useErrorMessage, useToast } from "~/components/ui";
import { useFormat, useT, type Lang } from "~/lib/i18n";
import { useUrlState } from "~/lib/useUrlState";
import { api } from "~/trpc/react";

type Tab = "profile" | "account" | "security";

function Profile() {
  const { t, setLang } = useT();
  const fmt = useFormat();
  const router = useRouter();
  const { update } = useSession();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const { data: me, isLoading } = api.account.me.useQuery();
  const [s, set] = useUrlState({ tab: "profile" });
  const tab: Tab = s.tab === "account" ? "account" : s.tab === "security" ? "security" : "profile";

  const [name, setName] = useState("");
  const [language, setLanguage] = useState<Lang>("ID");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarGuard = usePhotoGuard("avatar");
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
      setErr("name", null);
      setErr("language", null);
      setLang(v.preferredLanguage);
      done(t("common.saved"));
    },
    onError: (e, v) => setErr(v.name !== me?.name ? "name" : "language", errMsg(e)),
  });
  const removeAvatar = api.account.removeAvatar.useMutation({
    onSuccess: () => {
      setErr("avatar", null);
      done(t("profile.avatarRemoved"));
    },
    onError: (e) => setErr("avatar", errMsg(e)),
  });
  const uploadAvatar = async (file: File) => {
    setAvatarBusy(true);
    setErr("avatar", null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        const key = `err.${json.error ?? "UPLOAD_FAILED"}`;
        setErr("avatar", t(key) !== key ? t(key) : t("err.UPLOAD_FAILED"));
      } else done(t("profile.avatarSaved"));
    } catch {
      setErr("avatar", t("err.UPLOAD_FAILED"));
    } finally {
      setAvatarBusy(false);
    }
  };
  const uname = api.account.changeUsername.useMutation({
    onSuccess: () => {
      setErr("username", null);
      done(t("account.usernameChanged"));
    },
    onError: (e) => setErr("username", errMsg(e)),
  });
  const mail = api.account.requestEmailChange.useMutation({
    onSuccess: () => {
      setErr("email", null);
      setEmail("");
      done(t("account.emailRequested"));
    },
    onError: (e) => setErr("email", errMsg(e)),
  });
  const pass = api.account.changePassword.useMutation({
    onSuccess: async () => {
      setErr("password", null);
      await update({ refresh: true });
      setCur("");
      setNext("");
      setConf("");
      done(t("account.passwordChanged"));
    },
    onError: (e) => setErr("password", errMsg(e)),
  });

  if (isLoading || !me) return <Spinner />;

  const nameDirty = name.trim() !== me.name;
  const langDirty = language !== me.preferredLanguage;
  const unameDirty = username.trim().toLowerCase() !== me.username;

  const tabs = [
    { id: "profile" as const, label: t("profile.tabProfile"), icon: "user" as const },
    { id: "account" as const, label: t("profile.tabAccount"), icon: "key" as const },
    { id: "security" as const, label: t("profile.tabSecurity"), icon: "shield" as const },
  ];

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{t("nav.profile")}</h1>
          <p>{t("profile.hint")}</p>
        </div>
      </div>

      <SettingsShell tabs={tabs} value={tab} onChange={(id) => set({ tab: id })} ariaLabel={t("nav.profile")}>
        {/* Ringkasan akun */}
        <div className="profile-head">
          <Avatar name={me.name} src={me.avatarUrl} large />
          <div style={{ minWidth: 0 }}>
            <div className="profile-name">{me.name}</div>
            <div className="t-caption muted">@{me.username} · {me.email}</div>
          </div>
          <StatusChip tone="info">{me.role}</StatusChip>
        </div>

        {tab === "profile" && (
          <div>
            <h2 className="settings-title">{t("profile.groupPersonal")}</h2>
            <SettingRow label={t("profile.avatar")} hint={t("profile.avatarHint")} error={errors.avatar}>
              <div className="avatar-edit">
                <Avatar name={me.name} src={me.avatarUrl} xl />
                <input
                  ref={fileRef}
                  type="file"
                  accept={avatarGuard.accept}
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    // Tolak di sisi klien: format/ukuran di luar aturan avatar di Pengaturan.
                    const msg = avatarGuard.check(f);
                    if (msg) {
                      setErr("avatar", msg);
                      toast.push(msg, "error");
                      return;
                    }
                    void uploadAvatar(f);
                  }}
                />
                <button type="button" className="btn btn-secondary btn-sm" disabled={avatarBusy || removeAvatar.isPending} onClick={() => fileRef.current?.click()}>
                  <Icon name="upload" /> {me.avatarUrl ? t("profile.avatarChange") : t("profile.avatarUpload")}
                </button>
                {me.avatarUrl && (
                  <button type="button" className="btn btn-danger-ghost btn-sm" disabled={avatarBusy || removeAvatar.isPending} onClick={() => removeAvatar.mutate()}>
                    <Icon name="trash" /> {t("profile.avatarRemove")}
                  </button>
                )}
              </div>
            </SettingRow>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                profile.mutate({ name, preferredLanguage: me.preferredLanguage });
              }}
            >
              <SettingRow label={t("account.name")} hint={t("profile.nameHint")} dirty={nameDirty} error={errors.name}>
                <input className="input" style={{ width: 260, maxWidth: "100%" }} maxLength={255} value={name} aria-label={t("account.name")} onChange={(e) => setName(e.target.value)} />
                <button className="btn btn-primary btn-sm" disabled={profile.isPending || !nameDirty || !name.trim()}>
                  <Icon name="save" /> {t("common.save")}
                </button>
              </SettingRow>
            </form>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                profile.mutate({ name: me.name, preferredLanguage: language });
              }}
            >
              <SettingRow label={t("common.language")} hint={t("account.languageHint")} dirty={langDirty} error={errors.language}>
                <div style={{ width: 220 }}>
                  <Select value={language} onChange={(e) => setLanguage(e.target.value as Lang)} aria-label={t("common.language")} width="100%">
                    <option value="ID">Bahasa Indonesia</option>
                    <option value="EN">English</option>
                  </Select>
                </div>
                <button className="btn btn-primary btn-sm" disabled={profile.isPending || !langDirty}>
                  <Icon name="save" /> {t("common.save")}
                </button>
              </SettingRow>
            </form>
          </div>
        )}

        {tab === "account" && (
          <div>
            <h2 className="settings-title">{t("profile.groupLogin")}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                uname.mutate({ username });
              }}
            >
              <SettingRow label={t("account.username")} hint={t("account.usernameRule")} dirty={unameDirty} error={errors.username}>
                <input className="input mono" style={{ width: 220, maxWidth: "100%" }} maxLength={20} autoCapitalize="none" value={username} aria-label={t("account.username")} onChange={(e) => setUsername(e.target.value)} />
                <button className="btn btn-primary btn-sm" disabled={uname.isPending || !unameDirty}>
                  <Icon name="save" /> {t("common.save")}
                </button>
              </SettingRow>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                mail.mutate({ email });
              }}
            >
              <SettingRow
                label={t("account.emailSection")}
                hint={t("account.emailHint")}
                meta={`${t("account.emailCurrent")}: ${me.email}`}
                dirty={!!email.trim()}
                error={errors.email}
              >
                <input className="input" type="email" style={{ width: 260, maxWidth: "100%" }} value={email} placeholder={t("account.newEmail")} aria-label={t("account.newEmail")} onChange={(e) => setEmail(e.target.value)} />
                <button className="btn btn-primary btn-sm" disabled={mail.isPending || !email.trim()}>
                  <Icon name="key" /> {t("account.sendConfirmation")}
                </button>
              </SettingRow>
            </form>
            {me.pendingEmail && (
              <div style={{ padding: "0 20px 16px" }}>
                <Alert kind="info">
                  {t("account.emailPending", { email: me.pendingEmail.newEmail, until: fmt.dateTime(me.pendingEmail.expiresAt) })}
                </Alert>
              </div>
            )}
          </div>
        )}

        {tab === "security" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setErr("password", null);
              if (next !== conf) return setErr("password", t("err.PASSWORD_MISMATCH"));
              pass.mutate({ current: cur, next });
            }}
          >
            <h2 className="settings-title">{t("account.changePassword")}</h2>
            <p className="settings-sub">{t("account.passwordRule")}</p>
            {errors.password && (
              <div style={{ padding: "0 20px 12px" }}>
                <Alert kind="error">{errors.password}</Alert>
              </div>
            )}
            <SettingRow label={t("account.currentPassword")} dirty={!!cur}>
              <div style={{ width: 280, maxWidth: "100%" }}>
                <PasswordInput className="input" autoComplete="current-password" value={cur} aria-label={t("account.currentPassword")} onChange={(e) => setCur(e.target.value)} />
              </div>
            </SettingRow>
            <SettingRow label={t("account.newPassword")} dirty={!!next}>
              <div style={{ width: 280, maxWidth: "100%" }}>
                <PasswordInput className="input" autoComplete="new-password" value={next} aria-label={t("account.newPassword")} onChange={(e) => setNext(e.target.value)} />
              </div>
            </SettingRow>
            <SettingRow label={t("account.confirmPassword")} dirty={!!conf}>
              <div style={{ width: 280, maxWidth: "100%" }}>
                <PasswordInput className="input" autoComplete="new-password" value={conf} aria-label={t("account.confirmPassword")} onChange={(e) => setConf(e.target.value)} />
              </div>
            </SettingRow>
            <div className="settings-footer">
              <button className="btn btn-primary btn-sm" disabled={pass.isPending || !cur || !next || !conf}>
                <Icon name="save" /> {t("common.save")}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={!cur && !next && !conf} onClick={() => { setCur(""); setNext(""); setConf(""); setErr("password", null); }}>
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}
      </SettingsShell>
    </div>
  );
}

export function ProfileView() {
  return (
    <Suspense fallback={<Spinner />}>
      <Profile />
    </Suspense>
  );
}
