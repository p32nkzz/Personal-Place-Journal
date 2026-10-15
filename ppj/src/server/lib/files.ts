import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { env } from "~/env";
import { fail } from "./errors";
import { type AvatarRules, type PhotoRules } from "./settings";

export type UploadKind = "visit" | "master" | "my" | "avatar";

export const uploadRoot = () => path.resolve(process.cwd(), env.UPLOAD_DIR);
export const backupRoot = () => path.resolve(process.cwd(), env.BACKUP_DIR);

/** Path relatif tersimpan di DB; selalu dipetakan ke dalam uploadRoot (cegah path traversal). */
export function absoluteUploadPath(rel: string) {
  const abs = path.resolve(uploadRoot(), rel);
  if (!abs.startsWith(uploadRoot() + path.sep)) throw new Error("Invalid path");
  return abs;
}

const FORMAT_TO_EXT: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  gif: "gif",
  avif: "avif",
};

/**
 * Validasi (tipe, ukuran) terhadap aturan aktif dan hapus metadata EXIF/GPS (K-49).
 * sharp tidak menyertakan metadata pada output kecuali diminta.
 */
export async function processImage(
  buffer: Buffer,
  rules: Pick<PhotoRules | AvatarRules, "allowedTypes" | "maxSizeMb">,
): Promise<{ data: Buffer; ext: string }> {
  if (buffer.length > rules.maxSizeMb * 1024 * 1024) fail("PHOTO_TOO_LARGE");
  let format: string | undefined;
  try {
    format = (await sharp(buffer).metadata()).format;
  } catch {
    fail("PHOTO_INVALID");
  }
  const ext = format ? FORMAT_TO_EXT[format] : undefined;
  if (!ext) fail("PHOTO_INVALID");
  const allowed = rules.allowedTypes.map((t) => (t === "jpeg" ? "jpg" : t));
  if (!allowed.includes(ext)) fail("PHOTO_TYPE_NOT_ALLOWED");
  const data = await sharp(buffer).rotate().toBuffer();
  return { data, ext };
}

export async function saveUpload(kind: UploadKind, data: Buffer, ext: string) {
  const rel = `${kind}/${randomUUID()}.${ext}`;
  const abs = absoluteUploadPath(rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data);
  return rel;
}

/** Salinan independen file (MASTER PHOTO dari VISIT PHOTO, DD-12). */
export async function copyUpload(kind: UploadKind, fromRel: string) {
  const ext = path.extname(fromRel).slice(1) || "jpg";
  const rel = `${kind}/${randomUUID()}.${ext}`;
  const abs = absoluteUploadPath(rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await copyFile(absoluteUploadPath(fromRel), abs);
  return rel;
}

export async function removeUpload(rel: string | null) {
  if (!rel) return;
  try {
    await rm(absoluteUploadPath(rel), { force: true });
  } catch {
    // file sudah tidak ada
  }
}

export async function readUpload(rel: string) {
  const abs = absoluteUploadPath(rel);
  await stat(abs);
  return readFile(abs);
}

export const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};
