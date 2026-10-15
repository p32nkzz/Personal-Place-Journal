import { redirect } from "next/navigation";

import { ModeRequired } from "~/components/ModeRequired";
import { requireActiveUser } from "~/server/auth/guards";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireActiveUser();
  if (user.role !== "ADMIN") redirect("/");
  if (user.mode !== "ADMIN") return <ModeRequired required="ADMIN" />;
  return <>{children}</>;
}
