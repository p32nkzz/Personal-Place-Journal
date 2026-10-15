import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "./session";

/** Wajib login; user yang wajib ganti password diarahkan ke /change-password. */
export async function requireActiveUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

/** Wajib login saja (halaman ganti password boleh diakses saat must_change_password). */
export async function requireLogin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
