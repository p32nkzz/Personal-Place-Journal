import nodemailer from "nodemailer";

import { env } from "~/env";

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    throw new Error("SMTP belum dikonfigurasi");
  }
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  await transporter.sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER,
    ...opts,
  });
}
