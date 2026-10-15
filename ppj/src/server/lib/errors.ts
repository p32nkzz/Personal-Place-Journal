import { TRPCError } from "@trpc/server";

type Code = ConstructorParameters<typeof TRPCError>[0]["code"];

/** Melempar error dengan kode pesan yang diterjemahkan di klien (key `err.<MESSAGE>`). */
export function fail(message: string, code: Code = "BAD_REQUEST"): never {
  throw new TRPCError({ code, message });
}

export function notFound(message = "NOT_FOUND"): never {
  return fail(message, "NOT_FOUND");
}

export function isDuplicateError(e: unknown): boolean {
  const err = e as { code?: string; errno?: number; cause?: { code?: string } };
  return (
    err?.code === "ER_DUP_ENTRY" ||
    err?.errno === 1062 ||
    err?.cause?.code === "ER_DUP_ENTRY"
  );
}
