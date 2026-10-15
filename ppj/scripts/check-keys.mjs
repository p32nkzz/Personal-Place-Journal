import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const out = execSync("node scripts/keys.mjs", { encoding: "utf8" });
const keys = out.split("---DYN---")[0].trim().split("\n").filter(Boolean);
const src = readFileSync("src/lib/i18n/messages.ts", "utf8");
const [idPart, enPart] = src.split("const en:");
const has = (part, k) => part.includes(`"${k}":`);
const missing = [];
for (const k of keys) {
  if (!has(idPart, k)) missing.push("ID  " + k);
  if (!has(enPart, k)) missing.push("EN  " + k);
}
console.log(missing.length ? missing.join("\n") : "all static keys present");
