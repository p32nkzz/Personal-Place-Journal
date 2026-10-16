# Personal Place Journal

*Your Best Place Gallery* — aplikasi web berbasis peta untuk mencatat tempat, kunjungan, dan rencana
perjalanan, dengan MASTER PLACE yang dikurasi Admin. Dibangun dari dokumen BRD-PPJ-001 v1.2.0 dan
ERD-PPJ-001 v1.2.0; tema mengikuti `DESIGN.md`.

Stack: Next.js 15 (App Router) · tRPC · Drizzle ORM (MySQL) · Auth.js (credentials) · Google Maps/Places · sharp.

## Menjalankan

```bash
npm install
cp .env.example .env        # lalu isi nilainya (lihat di bawah)
npm run db:migrate          # membuat 21 tabel sesuai ERD
npm run db:seed             # reference data, kategori awal, aturan foto, akun Admin awal
npm run dev                 # http://localhost:3000
```

Akun Admin awal dibuat dari `SEED_ADMIN_*` di `.env` (default: username `admin`). Admin **wajib mengganti
password** saat login pertama.

### Variabel lingkungan

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | Koneksi MySQL |
| `AUTH_SECRET` | Rahasia sesi (`npx auth secret`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Peta + Places (aktifkan *Maps JavaScript API* dan *Places API (New)*) |
| `SMTP_*`, `APP_URL` | Email konfirmasi perubahan email (link berlaku 24 jam) |
| `UPLOAD_DIR`, `BACKUP_DIR` | Lokasi file foto dan file backup (default `storage/…`, di luar `public/`) |
| `SEED_ADMIN_*` | Kredensial Admin awal |

## Skrip

| Perintah | Keterangan |
|---|---|
| `npm run db:migrate` / `db:seed` | Migrasi (file di `drizzle/`) dan seed |
| `npm run db:reset -- --yes` | **Menghapus seluruh data** lalu migrasi + seed ulang (hanya dev) |
| `npm run smoke` | Smoke test end-to-end terhadap server yang berjalan (mengubah data & password Admin — jalankan di DB dev, lalu `db:reset`) |
| `npm run i18n:check` | Memastikan semua kunci terjemahan ID/EN tersedia |
| `npm run check` | Lint + type-check |

> Database di lingkungan ini MySQL 5.7: `drizzle-kit push` tidak didukung, gunakan `db:migrate`.
> CHECK, partial unique, dan functional index tidak ditegakkan engine 5.7, sehingga aturan tersebut
> ditegakkan di service layer (lihat komentar di `src/server/db/schema.ts`).

## Struktur

```
src/server/db/schema.ts        skema 21 tabel (ERD)
src/server/api/routers/        tRPC: account, users, master, place, review, tag, visit, itinerary, ...
src/server/lib/                aturan bisnis: master (refer/history/snapshot), photos, backup, queries (rating, effective category)
src/server/auth/               Auth.js + validasi sesi (user aktif, mode, sidik jari password)
src/app/(public)               peta, login, detail MASTER, konfirmasi email
src/app/(explorer)             MY PLACE, TAG, ITINERARY
src/app/(admin)/admin          dashboard, MASTER, review, kurasi, kategori & warna, pengguna, pengaturan, backup
src/app/api/                   upload foto, penyajian file, unduh backup
src/lib/i18n/                  kamus Indonesia / English
```

## Catatan aturan bisnis yang diterapkan

- **Role & mode**: Guest, Explorer, Admin. Akun Admin login selalu di mode Admin dan dapat *switch* ke mode
  Explorer (memiliki data personal sendiri). Mode divalidasi di server dari token sesi bertanda tangan.
- **MASTER vs MY PLACE** terpisah; pengajuan memakai snapshot (tidak berubah walau MY PLACE diedit saat
  REVIEW); semua aksi relasi (`SUBMITTED`, `REJECTED`, `REFERRED`, `RE-REFER`, `UNREFERRED`) tercatat di
  history append-only. Soft delete MASTER otomatis meng-UNREFER MY PLACE terkait dalam satu transaksi.
- **Hapus MY PLACE** yang punya history/ITINERARY PLACE memerlukan DELETE CONSENT.
- **Rating** dan **effective category** dihitung saat dibaca (tidak disimpan).
- **Foto**: aturan (tipe, ukuran, jumlah) dibaca dari `app_settings` saat upload; metadata EXIF/GPS dihapus.
- **Foto pantauan MY PLACE** (`my_place_photos`, maks `photo.max_per_my_place`) diunggah saat buat/ubah MY PLACE; Admin dapat menyalinnya menjadi MASTER PHOTO (origin `MY_PLACE`). **Avatar profil** (`users.avatar_*`, aturan `avatar.*`) diunggah/diganti/dihapus pemilik akun di halaman Profil.
- **Akun**: login dengan email atau username; password wajib diganti setelah dibuat/di-reset; reset password
  mengakhiri sesi lama; perubahan email lewat link konfirmasi (24 jam, sekali pakai).
- **Backup manual** (SQL dump + file foto → zip) oleh Admin; restore dilakukan di luar aplikasi.
- Antarmuka bilingual (ID default, EN); waktu ditampilkan dalam WIB.
