import { requireActiveUser } from "~/server/auth/guards";
import { ProfileView } from "./ProfileView";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  await requireActiveUser();
  return <ProfileView />;
}
