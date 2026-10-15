import { redirect } from "next/navigation";

import { getCurrentUser } from "~/server/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Login" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mode === "ADMIN" ? "/admin" : "/places");
  return <LoginForm />;
}
