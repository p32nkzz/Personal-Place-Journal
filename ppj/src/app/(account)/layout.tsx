import { requireLogin } from "~/server/auth/guards";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireLogin();
  return <>{children}</>;
}
