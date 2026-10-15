import { getCurrentUser } from "~/server/auth/session";
import { redirect } from "next/navigation";
import { HomeMap } from "./HomeMap";

export const metadata = { title: "Map" };

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user?.mustChangePassword) redirect("/change-password");
  const viewer = !user ? "GUEST" : user.mode === "ADMIN" ? "ADMIN" : "EXPLORER";
  return <HomeMap viewer={viewer} />;
}
