import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const keys = new Set();
const dyn = new Set();
function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|ts)$/.test(f) && !p.includes("messages.ts")) {
      const s = readFileSync(p, "utf8");
      for (const m of s.matchAll(/\bt\(\s*"([^"]+)"/g)) keys.add(m[1]);
      for (const m of s.matchAll(/\bt\(\s*`([^`]+)`/g)) dyn.add(m[1]);
      for (const m of s.matchAll(/\bt\(k\.(label|hint)\)/g)) {}
      for (const m of s.matchAll(/(label|hint): "(settings\.[A-Za-z]+)"/g)) keys.add(m[2]);
    }
  }
}
walk("src");
console.log([...keys].sort().join("\n"));
console.log("---DYN---");
console.log([...dyn].sort().join("\n"));
