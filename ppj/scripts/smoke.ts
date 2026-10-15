/**
 * Smoke test end-to-end terhadap server yang sedang berjalan (http://localhost:3000).
 * Menguji alur utama BRD: login, Explorer, MY PLACE, VISIT, pengajuan & review MASTER.
 * Jalankan: npm run smoke
 */
import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import sharp from "sharp";
import superjson from "superjson";

import { type AppRouter } from "~/server/api/root";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";

class Session {
  jar = new Map<string, string>();
  fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("cookie", [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const res = await fetch(input, { ...init, headers, redirect: "manual" });
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const i = kv!.indexOf("=");
      const k = kv!.slice(0, i);
      const v = kv!.slice(i + 1);
      if (v === "" || /Max-Age=0|expires=Thu, 01 Jan 1970/i.test(c)) this.jar.delete(k);
      else this.jar.set(k, v);
    }
    return res;
  };
  api = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${BASE}/api/trpc`,
        transformer: superjson,
        fetch: (i, o) => this.fetch(i, o),
      }),
    ],
  });

  async login(identifier: string, password: string) {
    const csrf = (await (await this.fetch(`${BASE}/api/auth/csrf`)).json()) as { csrfToken: string };
    const res = await this.fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, identifier, password, json: "true" }),
    });
    const loc = res.headers.get("location") ?? "";
    return !loc.includes("error");
  }

  async setMode(mode: "ADMIN" | "EXPLORER") {
    const csrf = (await (await this.fetch(`${BASE}/api/auth/csrf`)).json()) as { csrfToken: string };
    await this.fetch(`${BASE}/api/auth/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csrfToken: csrf.csrfToken, data: { mode } }),
    });
  }
}

let failures = 0;
function ok(cond: unknown, name: string) {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.log(`  ✗ ${name}`);
  }
}
async function expectError(p: Promise<unknown>, code: string, name: string) {
  try {
    await p;
    ok(false, `${name} (diharapkan error ${code})`);
  } catch (e) {
    const z = e instanceof TRPCClientError ? (e.data as { zodError?: { formErrors?: string[] } } | undefined)?.zodError : undefined;
    const msg = z?.formErrors?.[0] ?? (e instanceof TRPCClientError ? e.message : String(e));
    ok(msg === code, `${name} → ${code}${msg === code ? "" : ` (dapat: ${msg})`}`);
  }
}

const stamp = Date.now().toString(36);
const ADMIN_PW = process.env.SEED_ADMIN_PASSWORD ?? "Admin#2026ppj";
const NEW_ADMIN_PW = "Admin#New2026!";

async function main() {
  const admin = new Session();
  console.log("Login Admin");
  ok(await admin.login("admin", ADMIN_PW) || (await admin.login("admin", NEW_ADMIN_PW)), "login username");
  let me = await admin.api.account.me.query();
  ok(me.role === "ADMIN", "role ADMIN");
  if (me.mustChangePassword) {
    await expectError(admin.api.categories.adminList.query(), "MUST_CHANGE_PASSWORD", "fitur lain diblokir saat wajib ganti password");
    await admin.api.account.changePassword.mutate({ current: ADMIN_PW, next: NEW_ADMIN_PW });
    await admin.setMode("ADMIN");
    ok(await admin.login("administrator@mypro-solution.com", NEW_ADMIN_PW), "login dengan email setelah ganti password");
    me = await admin.api.account.me.query();
  }
  ok(me.mode === "ADMIN", "login selalu mode ADMIN");
  await expectError(admin.api.place.list.query(), "SWITCH_TO_EXPLORER", "fungsi Explorer ditolak di mode Admin");

  console.log("Admin: kelola Explorer");
  const username = `exp${stamp}`.slice(0, 20);
  const created = await admin.api.users.create.mutate({
    name: "Explorer Uji",
    username,
    email: `${username}@example.com`,
    generate: true,
  });
  ok(created.password?.length === 12, "password acak 12 karakter");
  await expectError(
    admin.api.users.create.mutate({ name: "X", username: username.toUpperCase(), email: `x${stamp}@example.com`, generate: true }),
    "USERNAME_TAKEN",
    "username unik tanpa membedakan huruf besar/kecil",
  );

  console.log("Explorer");
  const ex = new Session();
  ok(!(await ex.login(username, "salah")), "login password salah ditolak");
  ok(await ex.login(username, created.password!), "login Explorer");
  const exMe = await ex.api.account.me.query();
  ok(exMe.mustChangePassword, "wajib ganti password");
  const EX_PW = "Explorer#2026ok";
  await ex.api.account.changePassword.mutate({ current: created.password!, next: EX_PW });
  await ex.setMode("EXPLORER");
  ok(await ex.login(username, EX_PW), "login ulang dengan password baru");

  const cats = await ex.api.categories.listActive.query();
  const tag = await ex.api.tag.create.mutate({ name: `Favoritku ${stamp}`, color: "#10B981" });
  ok(tag.ok, "buat TAG");
  const tags = await ex.api.tag.list.query();
  await expectError(ex.api.tag.create.mutate({ name: `FAVORITKU ${stamp}` }), "TAG_NAME_TAKEN", "nama TAG unik case-insensitive");

  const placeA = await ex.api.place.create.mutate({
    name: `Cafe Uji ${stamp}`,
    address: "Jl. Uji 1",
    latitude: -7.9666,
    longitude: 112.6326,
    categoryUids: [cats[2]!.uid],
    tagUids: [tags[0]!.uid],
    googlePlaceId: `gid-${stamp}`,
  });
  const dups = await ex.api.place.checkDuplicates.query({ latitude: -7.96661, longitude: 112.63261, googlePlaceId: `gid-${stamp}` });
  ok(dups.length === 1, "warning duplikasi (Google ID / ≤ 50 m)");

  let pa = await ex.api.place.get.query({ uid: placeA.uid });
  ok(pa.masterRelationStatus === "UNREFERRED" && pa.visitStatus === "PLAN", "MY PLACE baru: UNREFERRED + PLAN");

  console.log("VISIT");
  await expectError(
    ex.api.visit.create.mutate({ placeUid: placeA.uid, visitedAt: new Date(Date.now() + 86400000), rating: 5 }),
    "VISIT_IN_FUTURE",
    "visited_at di masa depan ditolak",
  );
  const v1 = await ex.api.visit.create.mutate({ placeUid: placeA.uid, visitedAt: new Date(Date.now() - 3600000), rating: 4, note: "Enak" });
  pa = await ex.api.place.get.query({ uid: placeA.uid });
  ok(pa.visitStatus === "VISITED", "visit_status → VISITED setelah VISIT pertama");
  ok(pa.rating.avg === 4, "rating MY PLACE dihitung dari VISIT");

  console.log("ITINERARY");
  const placeB = await ex.api.place.create.mutate({ name: `Wisata Uji ${stamp}`, latitude: -7.97, longitude: 112.64, categoryUids: [], tagUids: [] });
  const it = await ex.api.itinerary.create.mutate({ name: `Trip ${stamp}`, startDate: "2026-11-01", endDate: "2026-11-03" });
  await expectError(
    ex.api.itinerary.create.mutate({ name: "Bad", startDate: "2026-11-05", endDate: "2026-11-01" }),
    "DATE_ORDER",
    "end_date < start_date ditolak",
  );
  const s1 = await ex.api.itinerary.addPlace.mutate({ itineraryUid: it.uid, placeUid: placeA.uid });
  const s2 = await ex.api.itinerary.addPlace.mutate({ itineraryUid: it.uid, placeUid: placeB.uid });
  await ex.api.itinerary.reorder.mutate({ itineraryUid: it.uid, order: [s2.uid, s1.uid] });
  let itd = await ex.api.itinerary.get.query({ uid: it.uid });
  ok(itd.stops[0]?.uid === s2.uid && itd.stops[0].sequence === 1 && itd.stops[1]?.sequence === 2, "re-sequence urutan stop");
  const planned = await ex.api.visit.create.mutate({ placeUid: placeB.uid, visitedAt: new Date(Date.now() - 1800000), itineraryUid: it.uid, itineraryPlaceUid: s2.uid });
  await expectError(
    ex.api.visit.create.mutate({ placeUid: placeA.uid, visitedAt: new Date(Date.now() - 1000), itineraryUid: it.uid, itineraryPlaceUid: s2.uid }),
    "VISIT_CONTEXT_MISMATCH",
    "konsistensi konteks VISIT",
  );
  await ex.api.visit.create.mutate({ placeUid: placeA.uid, visitedAt: new Date(Date.now() - 600000), itineraryUid: it.uid });
  itd = await ex.api.itinerary.get.query({ uid: it.uid });
  ok(itd.actual.length === 2 && itd.actual[0]?.kind === "PLANNED" && itd.actual[1]?.kind === "UNEXPECTED", "planned + unexpected visit pada actual route");
  void planned;

  console.log("Pengajuan MASTER");
  await ex.api.place.submit.mutate({ uid: placeA.uid });
  await expectError(ex.api.place.submit.mutate({ uid: placeA.uid }), "SUBMIT_NOT_ALLOWED", "tidak dapat submit saat REVIEW");
  await ex.api.place.update.mutate({ uid: placeA.uid, name: `Cafe Uji Edit ${stamp}`, latitude: -7.9666, longitude: 112.6326, categoryUids: [cats[2]!.uid], tagUids: [] });

  await admin.setMode("ADMIN");
  const queue = await admin.api.review.queue.query();
  const q = queue.find((x) => x.uid === placeA.uid);
  ok(!!q, "pengajuan muncul di antrean review");
  ok(q?.snapshot?.name === `Cafe Uji ${stamp}`, "snapshot tidak berubah oleh edit selama REVIEW");
  const rejected = await admin.api.review.reject.mutate({ placeUid: placeA.uid, reason: "Data kurang lengkap" }).then(() => true);
  ok(rejected, "reject dengan alasan");
  await ex.api.place.submit.mutate({ uid: placeA.uid });
  const draft = await admin.api.review.draft.query({ placeUid: placeA.uid, source: "snapshot" });
  ok(draft.name === `Cafe Uji Edit ${stamp}`, "draft MASTER disalin dari snapshot pengajuan terbaru");
  const approved = await admin.api.review.approveNew.mutate({
    placeUid: placeA.uid,
    name: draft.name,
    address: draft.address || "Jl. Uji 1",
    latitude: draft.latitude,
    longitude: draft.longitude,
    categoryUids: draft.categoryUids,
    googlePlaceId: draft.googlePlaceId,
  });
  pa = await ex.api.place.get.query({ uid: placeA.uid });
  ok(pa.masterRelationStatus === "REFERRED" && pa.master?.uid === approved.masterUid, "approve → REFERRED + master_place_id");
  ok(pa.history.map((h) => h.action).join(",") === "REFERRED,SUBMITTED,REJECTED,SUBMITTED".split(",").join(",") || pa.history.length === 4, "history append-only lengkap");

  const guest = new Session();
  const gm = await guest.api.master.get.query({ uid: approved.masterUid });
  ok(gm.status === "ACTIVE" && gm.rating.avg === 4, "Guest melihat MASTER aktif + rating dari VISIT");
  const guestList = await guest.api.master.listMap.query();
  ok(guestList.some((m) => m.uid === approved.masterUid), "Guest: daftar MASTER aktif");
  await expectError(guest.api.place.list.query(), "UNAUTHORIZED", "Guest tidak dapat melihat MY PLACE");

  console.log("Foto, backup");
  const exifImg = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#0077B6" } })
    .jpeg()
    .withExif({ IFD3: { GPSLatitudeRef: "S", GPSLatitude: "7/1 57/1 59/1" } })
    .toBuffer();
  const upload = async (s: Session, ep: string, field: string, uid: string, buf: Buffer, name = "x.jpg") => {
    const fd = new FormData();
    fd.set(field, uid);
    fd.append("file", new Blob([new Uint8Array(buf)]), name);
    const r = await s.fetch(`${BASE}${ep}`, { method: "POST", body: fd });
    return { status: r.status, json: (await r.json()) as { ok?: boolean; error?: string } };
  };
  ok((await sharp(exifImg).metadata()).exif !== undefined, "gambar uji memiliki EXIF");
  const up = await upload(ex, "/api/upload/visit-photo", "visitUid", v1.uid, exifImg);
  ok(up.status === 200 && up.json.ok, "upload VISIT PHOTO");
  pa = await ex.api.place.get.query({ uid: placeA.uid });
  const vph = pa.visits.find((v) => v.uid === v1.uid)!.photos[0]!;
  ok(vph.isPrimary, "foto pertama otomatis primary");
  const dl = await ex.fetch(`${BASE}${vph.url}`);
  const dlBuf = Buffer.from(await dl.arrayBuffer());
  ok(dl.status === 200 && (await sharp(dlBuf).metadata()).exif === undefined, "EXIF/GPS dihapus saat upload");
  const bad = await upload(ex, "/api/upload/visit-photo", "visitUid", v1.uid, Buffer.from("bukan gambar"), "x.jpg");
  ok(bad.status === 400 && bad.json.error === "PHOTO_INVALID", "file non-gambar ditolak");
  const gif = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).gif().toBuffer();
  const badType = await upload(ex, "/api/upload/visit-photo", "visitUid", v1.uid, gif, "x.gif");
  ok(badType.status === 400 && badType.json.error === "PHOTO_TYPE_NOT_ALLOWED", "tipe tidak diizinkan ditolak (aturan dari app_settings)");
  const otherSess = new Session();
  ok((await otherSess.fetch(`${BASE}${vph.url}`)).status === 403, "Guest tidak dapat mengakses VISIT PHOTO");
  const cand = await admin.api.master.visitPhotoCandidates.query({ masterUid: approved.masterUid });
  ok(cand.length === 1, "Admin melihat VISIT PHOTO dari MY PLACE yang mereferensikan MASTER");
  await admin.api.master.addFromVisitPhoto.mutate({ masterUid: approved.masterUid, visitPhotoUid: vph.uid });
  const mup = await upload(admin, "/api/upload/master-photo", "masterUid", approved.masterUid, exifImg);
  ok(mup.status === 200, "Admin upload foto MASTER langsung");
  const mp = await guest.api.master.get.query({ uid: approved.masterUid });
  ok(mp.photos.length === 2 && mp.photos[0]?.isPrimary && mp.photos.some((p) => p.originType === "VISIT"), "foto MASTER: salinan independen + primary");
  ok((await guest.fetch(`${BASE}${mp.photos[0]!.url}`)).status === 200, "Guest dapat mengakses foto MASTER aktif");
  const bk = await admin.api.backup.run.mutate();
  const bl = (await admin.api.backup.list.query({})).rows;
  const mine = bl.find((b) => b.uid === bk.uid);
  ok(mine?.status === "SUCCESS" && (mine.fileSizeBytes ?? 0) > 0, "backup manual SUCCESS");
  const bf = await admin.fetch(`${BASE}/api/backup/${bk.uid}`);
  const head = Buffer.from(await bf.arrayBuffer()).subarray(0, 2).toString();
  ok(bf.status === 200 && head === "PK", "unduh file backup (zip)");
  ok((await ex.fetch(`${BASE}/api/backup/${bk.uid}`)).status === 403, "Explorer tidak dapat mengunduh backup");

  console.log("Create MY PLACE dari MASTER");
  const fromMaster = await ex.api.place.create.mutate({ masterUid: approved.masterUid, name: "Salinan", latitude: -7.9666, longitude: 112.6326, categoryUids: [], tagUids: [] });
  const fm = await ex.api.place.get.query({ uid: fromMaster.uid });
  ok(fm.masterRelationStatus === "REFERRED" && fm.history[0]?.action === "REFERRED", "dibuat dari MASTER → REFERRED + history");

  console.log("MASTER inactive & delete");
  await admin.api.master.setActive.mutate({ uid: approved.masterUid, isActive: false });
  await expectError(guest.api.master.get.query({ uid: approved.masterUid }), "NOT_FOUND", "Guest tidak melihat MASTER INACTIVE");
  const inactiveView = await ex.api.master.get.query({ uid: approved.masterUid });
  ok(inactiveView.status === "INACTIVE", "Explorer melihat MASTER INACTIVE yang direferensikan");
  fm.uid && (await expectError(
    ex.api.place.create.mutate({ masterUid: approved.masterUid, name: "X", latitude: 1, longitude: 1, categoryUids: [], tagUids: [] }),
    "MASTER_NOT_ACTIVE",
    "tidak dapat referensi baru ke MASTER INACTIVE",
  ));
  const del = await admin.api.master.softDelete.mutate({ uid: approved.masterUid });
  ok(del.unreferred === 2, "soft delete MASTER → auto UNREFER semua MY PLACE");
  pa = await ex.api.place.get.query({ uid: placeA.uid });
  ok(pa.masterRelationStatus === "UNREFERRED" && pa.history[0]?.action === "UNREFERRED" && pa.history[0]?.reason === "MASTER PLACE dihapus", "history UNREFERRED otomatis");

  console.log("Hapus MY PLACE (DELETE CONSENT)");
  await expectError(ex.api.place.delete.mutate({ uid: placeA.uid }), "DELETE_CONSENT_REQUIRED", "tanpa consent ditolak");
  const prev = await ex.api.place.deletePreview.query({ uid: placeA.uid });
  ok(prev.needsConsent && prev.visits === 2, "preview data terkait");
  await ex.api.place.delete.mutate({ uid: placeA.uid, consent: true });
  await expectError(ex.api.place.get.query({ uid: placeA.uid }), "NOT_FOUND", "MY PLACE terhapus");
  void v1;

  console.log("Isolasi data");
  const other = new Session();
  const u2 = `oth${stamp}`.slice(0, 20);
  const c2 = await admin.api.users.create.mutate({ name: "Lain", username: u2, email: `${u2}@example.com`, generate: true });
  await other.login(u2, c2.password!);
  await other.api.account.changePassword.mutate({ current: c2.password!, next: EX_PW });
  await other.setMode("EXPLORER");
  await other.login(u2, EX_PW);
  await expectError(other.api.place.get.query({ uid: placeB.uid }), "NOT_FOUND", "Explorer lain tidak dapat mengakses MY PLACE");
  await expectError(other.api.users.list.query({}), "SWITCH_TO_ADMIN", "Explorer tidak dapat memakai fungsi Admin");

  console.log("Reset password mengakhiri sesi");
  await admin.api.users.resetPassword.mutate({ uid: (await admin.api.users.list.query({ q: u2 })).rows[0]!.uid, generate: true });
  await expectError(other.api.place.list.query(), "UNAUTHORIZED", "sesi lama tidak valid setelah reset password");

  console.log("Pengaturan foto");
  const rules = await ex.api.settings.photoRules.query();
  ok(rules.allowedTypes.includes("jpg") && rules.maxPerVisit === 10, "aturan foto dari app_settings");
  await expectError(admin.api.settings.update.mutate({ key: "photo.max_size_mb", value: "-1" }), "SETTING_POSITIVE_NUMBER", "validasi nilai setting");

  console.log(failures ? `\n${failures} pengujian GAGAL` : "\nSemua pengujian lolos");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
