import { ModeRequired } from "~/components/ModeRequired";
import { requireActiveUser } from "~/server/auth/guards";

export default async function ExplorerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireActiveUser();
  if (user.mode !== "EXPLORER") return <ModeRequired required="EXPLORER" />;
  return <>{children}</>;
}
