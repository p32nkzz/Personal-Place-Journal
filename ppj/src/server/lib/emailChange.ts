import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";

import { env } from "~/env";
import { db } from "~/server/db";
import { emailChangeRequests, users } from "~/server/db/schema";
import { fail } from "./errors";
import { sendMail } from "./mail";

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** TX-11 — request perubahan email (oleh user sendiri atau Admin untuk Explorer). */
export async function requestEmailChange(opts: {
  userId: number;
  requestedBy: number;
  newEmail: string;
  userName: string;
  language: "ID" | "EN";
}) {
  const newEmail = opts.newEmail.trim().toLowerCase();
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, newEmail));
  if (taken) fail("EMAIL_TAKEN");

  const token = randomBytes(32).toString("hex");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(emailChangeRequests)
      .set({ cancelledAt: now })
      .where(
        and(
          eq(emailChangeRequests.userId, opts.userId),
          isNull(emailChangeRequests.confirmedAt),
          isNull(emailChangeRequests.cancelledAt),
        ),
      );
    await tx.insert(emailChangeRequests).values({
      userId: opts.userId,
      requestedBy: opts.requestedBy,
      newEmail,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + 24 * 3600 * 1000),
    });
  });

  const link = `${env.APP_URL}/confirm-email?token=${token}`;
  const id = opts.language === "ID";
  try {
    await sendMail({
      to: newEmail,
      subject: id
        ? "Konfirmasi perubahan email — Personal Place Journal"
        : "Confirm your email change — Personal Place Journal",
      text: `${id ? "Klik tautan berikut (berlaku 24 jam)" : "Click this link (valid for 24 hours)"}: ${link}`,
      html: `<p>${id ? `Halo ${opts.userName}, klik tautan berikut untuk mengonfirmasi email baru Anda (berlaku 24 jam):` : `Hi ${opts.userName}, click the link below to confirm your new email (valid for 24 hours):`}</p><p><a href="${link}">${link}</a></p>`,
    });
  } catch (e) {
    console.error("Gagal mengirim email konfirmasi", e);
    fail("MAIL_FAILED", "INTERNAL_SERVER_ERROR");
  }
}

/** TX-12 — konfirmasi perubahan email. */
export async function confirmEmailChange(token: string) {
  const hash = hashToken(token);
  await db.transaction(async (tx) => {
    const [req] = await tx
      .select()
      .from(emailChangeRequests)
      .where(eq(emailChangeRequests.tokenHash, hash))
      .for("update");
    if (!req) fail("TOKEN_INVALID");
    if (req.confirmedAt ?? req.cancelledAt) fail("TOKEN_USED");
    if (req.expiresAt.getTime() < Date.now()) fail("TOKEN_EXPIRED");
    const [taken] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, req.newEmail));
    if (taken) fail("EMAIL_TAKEN");
    await tx
      .update(users)
      .set({ email: req.newEmail })
      .where(eq(users.id, req.userId));
    await tx
      .update(emailChangeRequests)
      .set({ confirmedAt: new Date() })
      .where(eq(emailChangeRequests.id, req.id));
  });
}

/** 24.18 — request email terbuka milik user. */
export async function pendingEmailRequest(userId: number) {
  const [r] = await db
    .select({
      newEmail: emailChangeRequests.newEmail,
      expiresAt: emailChangeRequests.expiresAt,
    })
    .from(emailChangeRequests)
    .where(
      and(
        eq(emailChangeRequests.userId, userId),
        isNull(emailChangeRequests.confirmedAt),
        isNull(emailChangeRequests.cancelledAt),
        gt(emailChangeRequests.expiresAt, sql`now()`),
      ),
    );
  return r ?? null;
}
