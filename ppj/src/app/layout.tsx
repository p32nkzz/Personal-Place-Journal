import "@fortawesome/fontawesome-svg-core/styles.css";
import "select2/dist/css/select2.min.css";
import "~/styles/globals.css";

import { type Metadata } from "next";
import { Figtree, IBM_Plex_Mono, Open_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { SessionProvider } from "next-auth/react";

import { AppShell } from "~/components/AppShell";
import { ToastProvider } from "~/components/ui";
import { I18nProvider, LANG_COOKIE, type Lang } from "~/lib/i18n";
import { auth } from "~/server/auth";
import { getCurrentUser } from "~/server/auth/session";
import { getTimezone } from "~/server/lib/settings";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: {
    default: "Personal Place Journal",
    template: "%s · Personal Place Journal",
  },
  description: "Your Best Place Gallery",
  icons: [{ rel: "icon", url: "/logo.png" }],
};

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-figtree",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-open-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-plex-mono",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, user, cookieStore, timezone] = await Promise.all([
    auth(),
    getCurrentUser(),
    cookies(),
    getTimezone(),
  ]);
  const cookieLang = cookieStore.get(LANG_COOKIE)?.value === "EN" ? "EN" : "ID";
  const lang: Lang = user?.preferredLanguage ?? cookieLang;

  return (
    <html
      lang={lang === "ID" ? "id" : "en"}
      className={`${figtree.variable} ${openSans.variable} ${plexMono.variable}`}
    >
      <body>
        <SessionProvider session={user ? session : null}>
          <TRPCReactProvider>
            <I18nProvider initialLang={lang} timezone={timezone}>
              <ToastProvider>
                <AppShell
                  user={
                    user
                      ? {
                          name: user.name,
                          username: user.username,
                          role: user.role,
                          mode: user.mode,
                          mustChangePassword: user.mustChangePassword,
                        }
                      : null
                  }
                >
                  {children}
                </AppShell>
              </ToastProvider>
            </I18nProvider>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
