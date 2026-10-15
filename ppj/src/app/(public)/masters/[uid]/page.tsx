import { getCurrentUser } from "~/server/auth/session";
import { MasterPublicView } from "./MasterPublicView";

export const metadata = { title: "MASTER PLACE" };

export default async function MasterPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const user = await getCurrentUser();
  const viewer = !user ? "GUEST" : user.mode === "ADMIN" ? "ADMIN" : "EXPLORER";
  return <MasterPublicView uid={uid} viewer={viewer} />;
}
