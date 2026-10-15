import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().default(465),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    APP_URL: z.string().url().default("http://localhost:3000"),
    UPLOAD_DIR: z.string().default("storage/uploads"),
    BACKUP_DIR: z.string().default("storage/backups"),
    SEED_ADMIN_NAME: z.string().default("Administrator"),
    SEED_ADMIN_USERNAME: z.string().default("admin"),
    SEED_ADMIN_EMAIL: z.string().default("admin@example.com"),
    SEED_ADMIN_PASSWORD: z.string().default("Admin#2026ppj"),
  },

  client: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  },

  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM,
    APP_URL: process.env.APP_URL,
    UPLOAD_DIR: process.env.UPLOAD_DIR,
    BACKUP_DIR: process.env.BACKUP_DIR,
    SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME,
    SEED_ADMIN_USERNAME: process.env.SEED_ADMIN_USERNAME,
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
