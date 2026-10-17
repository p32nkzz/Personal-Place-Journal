# BRD — Personal Place Journal

## 1. Document Information

| Field | Nilai |
|---|---|
| Document ID | BRD-PPJ-001 |
| Document | Business Requirement Document (BRD) |
| Application | Personal Place Journal |
| Version | 1.3.0 |
| Status | IN_REVIEW |
| Document Owner | Verry Prima |
| Author | Verry Prima |
| Primary Users | Explorer, Admin, Guest |
| Audience | Product Owner, Business Analyst, Developer, QA, AI coding agent |
| Created / Last Updated | 2026-08-25 / 2026-10-15 |
| Related Documents | SPEC-PPJ (kebutuhan awal), ERD-PPJ-001 v1.3.0 (`result/v1.3.0/ERD_PPJ_v1.3.0.md`), SRS-PPJ-001 (`TBD`), UI-Mockup (`TBD`) |
| Purpose | Mendokumentasikan kebutuhan bisnis dan aturan utama aplikasi pencatatan tempat, rencana perjalanan, kunjungan, serta pengelolaan MASTER PLACE. |

Aturan versi: `MAJOR.MINOR.PATCH` — MAJOR = perubahan konsep inti/business rule, MINOR = penambahan requirement, PATCH = koreksi redaksi.

---

## 2. Revision History

| Versi | Tanggal | Penulis | Ringkasan Perubahan | Section Terdampak |
|---|---|---|---|---|
| 0.1.0 | 2026-08-25 | Verry Prima | Kebutuhan awal (SPEC-PPJ) | Semua |
| 0.2.0 | 2026-08-25 | Verry Prima | BRD v2 — upload foto dapat dari external link | Foto |
| 0.3.0 | 2026-08-25 | Verry Prima | BRD v3 — reset konsep MASTER PLACE vs MY PLACE | Semua |
| 0.4.0 | 2026-08-25 | Verry Prima | BRD v4 — penyederhanaan | Semua |
| 0.9.0 | 2026-08-25 | Verry Prima | BRD final, diselaraskan dengan ERD final | Semua |
| 0.9.1 | 2026-10-09 | Verry Prima | Penambahan UID publik pada ERD (tidak mengubah business rule) | 23 |
| 1.0.0 | 2026-10-13 | Verry Prima | Restrukturisasi sesuai `standard/BRD_standard.md` v1.0; penambahan role Guest, lifecycle MASTER PLACE (ACTIVE/INACTIVE/DELETED), user management & reset password, aturan edit MY PLACE selama REVIEW, permission matrix, deletion matrix, NFR, Open Issues, RTM; penghapusan MY PLACE dengan persetujuan, MY PLACE ACTIVE/INACTIVE, mode Admin/Explorer untuk akun ADMIN, lokasi perangkat sebagai titik tengah peta | Semua |
| 1.1.0 | 2026-10-13 | Verry Prima | Pembahasan ulang Assumptions, Constraints, Dependencies, Risks, dan Open Issues: bilingual ID/EN, ubah profil/password/email (konfirmasi link), wajib ganti password setelah reset, restore user, backup manual oleh Admin, konfigurasi aturan foto, kriteria duplikasi, aturan field wajib & panjang, validasi VISIT/ITINERARY, target NFR, EXIF & UU PDP, risiko baru RK-10..14 | 2, 4, 7, 10, 12, 13, 14, 15, 16, 17, 19–31 |
| 1.2.0 | 2026-10-14 | Verry Prima | Penambahan **username** unik pada USER: dapat dipakai sebagai kredensial login selain email, panjang 4–20 karakter, diisi Admin saat membuat Explorer, dan dapat diganti user sendiri setelah login; proses P-15 & P-16, FR-USR-001 diperbarui, FR-USR-023..024, BR/DR/validasi/AC/RTM, NFR-SEC-013, RK-15; ERD diselaraskan ke ERD-PPJ-001 v1.2.0 | 1, 2, 4, 7, 10, 12, 13, 15, 17, 19, 22, 23, 25–32 |
| 1.3.0 | 2026-10-15 | Verry Prima | Fitur **foto profil (avatar)** user yang dikelola sendiri setelah login, dengan konfigurasi `avatar.allowed_types` & `avatar.max_size_mb`; fitur **foto tinjauan MY PLACE (MY PLACE PHOTO)** opsional, banyak foto per MY PLACE, storage UPLOAD/EXTERNAL/S3, batas `photo.max_per_my_place`, dan dapat dijadikan MASTER PLACE PHOTO oleh Admin; proses P-17 & P-18, P-01/P-08/P-10/P-14 diperbarui, modul baru 13.19 (`MPP`), FR-USR-025..026, FR-MYP-015, FR-MPH-004, FR-CFG diperbarui, RK-16; ERD diselaraskan ke ERD-PPJ-001 v1.3.0 | 1, 2, 4, 7, 9, 10, 11, 12, 13, 15, 17, 19, 22–25, 27–32 |

### 2.1 Keputusan Klarifikasi pada Versi 1.0.0

| No | Keputusan | Section |
|---:|---|---|
| K-01 | Guest (tanpa login) termasuk role Fase 1, read-only terhadap MASTER PLACE aktif. | 10, 13.16 |
| K-02 | MY PLACE dan ITINERARY PLACE **tidak wajib** berelasi dengan MASTER PLACE. Ketentuan SPEC "semua tempat itinerary terdaftar di master" tidak berlaku. Tempat pada ITINERARY dapat berupa MY PLACE existing atau MY PLACE baru (status `PLAN`). | 12, 13.12 |
| K-03 | Self-registration dijadwalkan pada Fase 2. | 7.3 |
| K-04 | Penghapusan USER menggunakan soft delete; data milik user tidak dihapus. | 13.1, 17 |
| K-05 | MASTER PLACE memiliki lifecycle `ACTIVE` / `INACTIVE` / `DELETED`. MY PLACE yang mereferensikan MASTER INACTIVE tetap `REFERRED`; perubahan referensi dilakukan atas inisiatif Admin. | 13.2, 14.4 |
| K-06 | Explorer hanya memilih CATEGORY aktif; tidak dapat membuat CATEGORY. | 13.3 |
| K-07 | Admin mengubah **draft MASTER** hasil salinan, bukan data MY PLACE. Admin hanya read-only terhadap MY PLACE. | 13.2, 13.5 |
| K-08 | MY PLACE `REFERRED` tidak dapat diajukan. Pengajuan `REVIEW` tidak dapat dibatalkan. Selama `REVIEW`, Explorer tetap dapat mengedit MY PLACE tanpa mengubah data yang sudah diajukan (snapshot). | 13.5, 14.1 |
| K-09 | History `REJECTED` mencatat snapshot pengajuan yang ditolak (bukan target MASTER). | 18 |
| K-10 | Admin dapat mereferensikan MY PLACE atas inisiatif dari state apa pun selain `REFERRED` (untuk `REFERRED` digunakan RE-REFER). | 13.5, 14.1 |
| K-11 | Kriteria warning duplikasi MY PLACE: `TBD`. *(Diperbarui oleh K-37.)* | 28 |
| K-12 | Admin dapat mereset password Explorer: generate random password (huruf kecil, huruf besar, angka, simbol) atau mengubah password secara manual. | 13.1 |
| K-13 | Notifikasi (eksternal maupun in-app) Out-of-Scope Fase 1. | 7.2, 20 |
| K-14 | MY PLACE yang memiliki MASTER RELATION HISTORY atau ITINERARY PLACE hanya dapat dihapus jika owner mencentang persetujuan menghapus seluruh data terkait (VISIT, VISIT PHOTO, history relasi, ITINERARY PLACE). Tanpa persetujuan, penghapusan dibatalkan dan sistem menyarankan menonaktifkan MY PLACE. (OI-19) | 12.10, 13.4, 17 |
| K-15 | MY PLACE memiliki status `ACTIVE` / `INACTIVE`. INACTIVE: disembunyikan dari list/peta default, tidak dapat dipakai untuk ITINERARY PLACE baru, VISIT baru, atau pengajuan; referensi MASTER dan history tidak berubah; VISIT-nya tidak dihitung pada rating MASTER. | 13.4, 14.8, 16 |
| K-16 | VISIT PHOTO yang dijadikan MASTER PLACE PHOTO tidak memerlukan persetujuan/pemberitahuan Explorer; Admin dipercaya sebagai pengelola data yang kredibel. (OI-27) | 13.11, 25 |
| K-17 | MY PLACE yang dibuat dari MASTER langsung berstatus `REFERRED` dan mencatat history `REFERRED`. (OI-07) | 12.1, 14.1 |
| K-18 | Saat Admin membuat MASTER dari MY PLACE, form menyediakan checkbox "Referensikan MY PLACE sumber". Dicentang → MY PLACE sumber direferensikan + history (`REFERRED`, atau `RE-REFER` jika sudah `REFERRED`). Tidak dicentang → MY PLACE sumber tidak berubah dan tidak ada history. (OI-08) | 12.4 |
| K-19 | Nama action `RE-REFER` dipertahankan. (OI-21) | 18 |
| K-20 | Penggunaan lokasi perangkat sebagai titik tengah peta berprioritas Must; Explorer tetap bebas menentukan pin di lokasi mana pun. | 13.14 |
| K-21 | Akun ADMIN dapat berpindah (switch) ke mode Explorer dan memiliki data personal sendiri dengan skema yang sama persis seperti Explorer. Fungsi Admin hanya dapat digunakan dalam mode Admin. | 10.4, 13.1, 14.9 |
| K-22 | Admin boleh me-review pengajuan MY PLACE miliknya sendiri. | 13.5 |
| K-23 | Setelah login, akun ADMIN selalu masuk mode Admin. | 10.4, 13.1 |
| K-24 | Jika izin lokasi perangkat ditolak/tidak tersedia, penanda (pin) lokasi perangkat tidak ditampilkan; peta tetap dapat digunakan melalui pencarian dan pin manual. (OI-29) | 13.14 |
| K-25 | ERD diperbarui: `my_places.is_active`, history relasi & ITINERARY PLACE ikut terhapus bersama MY PLACE (CASCADE, hanya melalui DELETE CONSENT). (OI-30) | 13.4, 17, 23 |
| K-26 | Daftar kurasi Admin secara default hanya menampilkan MY PLACE `ACTIVE`, dengan pilihan tambahan "tampilkan MY PLACE tidak aktif". (OI-31) | 13.4 |

### 2.2 Keputusan Klarifikasi pada Versi 1.1.0

| No | Keputusan | Section |
|---|---|---|
| K-27 | Antarmuka **bilingual**: Bahasa Indonesia (default) dan English. Hanya teks antarmuka yang diterjemahkan; data yang diinput user tidak diterjemahkan. Preferensi bahasa disimpan di profil user. | 10, 13.1, 24 |
| K-28 | Aplikasi berupa web responsive ditetapkan sebagai constraint (CO-05), bukan asumsi. | 26 |
| K-29 | Asumsi dikonfirmasi menjadi aturan: (a) Explorer tidak dapat melepas/memindahkan referensi MASTER sendiri; (b) switch mode tanpa login ulang, dan pada Fase 1 hanya akun ADMIN yang dapat switch; (c) business action relasi Admin tetap berlaku pada MY PLACE `INACTIVE`; (d) lokasi perangkat tidak disimpan; (e) Explorer dapat melihat history relasi MY PLACE miliknya; (f) sesi user diakhiri saat dinonaktifkan/dihapus; (g) nama TAG unik tanpa membedakan huruf besar/kecil; (h) address MASTER PLACE wajib. | 10, 13, 25, 26 |
| K-30 | **Backup manual** database + file foto dijalankan Admin dan tercatat di riwayat; file backup dapat diunduh Admin; restore dilakukan tim teknis di luar aplikasi. Backup terjadwal (scheduler) pada Fase 2. | 12.13, 13.18 |
| K-31 | Risiko baru: ToS Google Maps Platform (RK-10), password diketahui Admin saat reset (RK-11), Admin menjadi bottleneck review (RK-12), kehilangan data (RK-13). Tidak ada constraint budget/jadwal/tim yang dicatat. | 26, 27 |
| K-32 | User dapat mengubah nama dan password sendiri. Perubahan **email** (oleh user sendiri maupun oleh Admin untuk Explorer) wajib dikonfirmasi melalui link ke email baru, berlaku 24 jam; email lama tetap dipakai sampai link diklik. User **wajib mengganti password** setelah akun dibuat atau password di-reset. | 12.12, 13.1 |
| K-33 | Password minimal 8 karakter; password hasil generate 12 karakter. | 13.1, 25 |
| K-34 | Field wajib: MY PLACE — name & koordinat (address & CATEGORY opsional); MASTER PLACE — name, address & koordinat (CATEGORY opsional). Semua field nama maks 255 karakter; deskripsi/catatan maks 2.000 karakter. | 13 |
| K-35 | VISIT PHOTO yang dapat dijadikan MASTER PLACE PHOTO hanya dari MY PLACE yang saat ini mereferensikan MASTER tersebut; Admin juga dapat mengunggah foto MASTER secara langsung. | 12.8, 13.11 |
| K-36 | Aturan foto (tipe file, ukuran maksimum, jumlah maksimum per VISIT & per MASTER) disimpan sebagai **konfigurasi aplikasi** yang hanya dapat dikelola Admin. Default: JPG/PNG/WebP, ≤ 5 MB, 10 per VISIT, 20 per MASTER. | 12.14, 13.17 |
| K-37 | Warning duplikasi MY PLACE muncul bila, pada MY PLACE milik user yang sama, `google_place_id` sama, **atau** MASTER sama, **atau** jarak koordinat ≤ 50 m. | 12.1, 13.4 |
| K-38 | Explorer dapat melihat (read-only) MASTER `INACTIVE` yang direferensikan MY PLACE miliknya, dengan label "Tidak aktif". | 10, 13.2 |
| K-39 | CATEGORY hanya dapat dihapus permanen bila belum pernah dipakai; selain itu hanya dinonaktifkan. | 13.3, 17 |
| K-40 | Preset warna TAG dikelola melalui UI Admin (FR-CLR-002 menjadi Must). | 13.8 |
| K-41 | Konsistensi konteks VISIT (`itinerary_place_id` ↔ `my_place_id` ↔ `itinerary_id`) wajib. | 13.9 |
| K-42 | `visited_at` tidak boleh di masa depan. | 13.9 |
| K-43 | ITINERARY: `end_date ≥ start_date` divalidasi; `sequence` unik per ITINERARY dan diurutkan ulang otomatis. | 13.12 |
| K-44 | Rating MASTER: VISIT milik user `INACTIVE` tetap dihitung; milik user `DELETED` tidak dihitung. | 16 |
| K-45 | Admin dapat me-restore user `DELETED`. Penghapusan permanen/anonimisasi data pribadi atas permintaan user dijadwalkan Fase 2. | 13.1, 14.5, 17 |
| K-46 | Data soft-deleted disimpan permanen pada Fase 1; kebijakan purge pada Fase 2. | 17 |
| K-47 | CATEGORY awal dikonfirmasi: Tempat Makan, Wisata, Cafe, Fasilitas Umum, Playground. | 22 |
| K-48 | Target NFR: list ≤ 2 detik untuk 1.000 record, uptime ≥ 99%/bulan, 2 versi terakhir Chrome/Edge/Safari/Firefox, lebar layar ≥ 360px, zona waktu tampilan WIB (Asia/Jakarta). | 24 |
| K-49 | Metadata lokasi GPS (EXIF) dihapus saat upload foto; aplikasi mengikuti UU PDP No. 27/2022. | 13.17, 25 |
| K-50 | Target KPI ditetapkan 3 bulan setelah rilis Fase 1 berdasarkan data baseline; jadwal rilis menyusul (DEFERRED). | 6, 7.3 |
| K-51 | Asumsi AS-10..AS-15 dikonfirmasi menjadi aturan: ubah password sendiri memerlukan password saat ini; request perubahan email baru membatalkan request sebelumnya; pilihan bahasa Guest disimpan per perangkat/browser; hanya satu backup `RUNNING` pada satu waktu; riwayat perubahan konfigurasi foto tidak disimpan; request perubahan email yang kedaluwarsa tidak dihapus aktif. | 12.13, 13.1, 13.17, 13.18, 17 |
| K-52 | AS-09 dikonfirmasi: `master_relation_status = REFERRED` ⇔ `master_place_id` terisi (DR-015). ERD diselaraskan ke ERD-PPJ-001 v1.1.0 (OI-35). | 15.2, 23 |

### 2.3 Keputusan Klarifikasi pada Versi 1.2.0

| No | Keputusan | Section |
|---|---|---|
| K-53 | Setiap USER memiliki **username** yang unik. Login dapat menggunakan **email atau username** bersama password. | 4, 10, 12.15, 13.1 |
| K-54 | Aturan username: panjang **4–20 karakter**; hanya huruf, angka, titik (`.`), dan garis bawah (`_`); tidak boleh mengandung `@` agar tidak tertukar dengan email; unik tanpa membedakan huruf besar/kecil (disimpan huruf kecil), termasuk username milik user soft-deleted. | 13.1, 15.4 |
| K-55 | Username wajib diisi Admin saat membuat akun Explorer (Admin awal: melalui seed). Setelah login, user dapat mengganti username miliknya sendiri; perubahan berlaku langsung tanpa konfirmasi, dan username lama dapat dipakai akun lain. Admin tidak mengubah username Explorer. | 10, 12.9, 12.16, 13.1 |

### 2.4 Keputusan Klarifikasi pada Versi 1.3.0

| No | Keputusan | Section |
|---|---|---|
| K-56 | Setiap user (Explorer & Admin) dapat memiliki **satu foto profil (avatar)** yang opsional. Setelah login, user mengunggah, mengganti, dan menghapus avatar miliknya sendiri; Admin tidak mengubah avatar user lain. Avatar hanya melalui **upload file** (tanpa external link); avatar lama dihapus saat diganti dan riwayatnya tidak disimpan. | 10, 12.17, 13.1 |
| K-57 | Aturan avatar disimpan sebagai konfigurasi tersendiri di `app_settings`: `avatar.allowed_types` (default `jpg, png, webp`) dan `avatar.max_size_mb` (default `5`), sama dengan nilai default `photo.*` saat ini. | 13.17 |
| K-58 | **Foto tinjauan MY PLACE (MY PLACE PHOTO)** bersifat opsional, dapat ditambahkan saat membuat atau mengubah MY PLACE, dan satu MY PLACE dapat memiliki banyak foto. Aturan penyimpanan sama dengan VISIT PHOTO (UPLOAD / EXTERNAL / S3, caption, urutan, maksimal satu primary). Tipe & ukuran mengikuti `photo.allowed_types` / `photo.max_size_mb`; jumlah maksimum per MY PLACE diatur `photo.max_per_my_place` (default `10`, sama dengan batas per VISIT). | 12.1, 13.17, 13.19 |
| K-59 | Admin dapat menjadikan MY PLACE PHOTO sebagai **MASTER PLACE PHOTO** (salinan independen dengan referensi sumber), dengan aturan yang sama seperti VISIT PHOTO: hanya dari MY PLACE yang saat ini mereferensikan MASTER tersebut dan tanpa persetujuan/pemberitahuan Explorer (K-16, K-35). | 12.8, 13.11, 25 |

---

## 3. Approval / Sign-off

| Nama | Peran | Keputusan | Tanggal | Catatan |
|---|---|---|---|---|
| Verry Prima | Product Owner | PENDING | — | — |
| `TBD` | Tech Lead | PENDING | — | — |
| `TBD` | QA Lead | PENDING | — | — |

---

## 4. Glossary & Definitions

| Istilah | Definisi | Bukan / Jangan Disamakan Dengan |
|---|---|---|
| EXPLORER | Role user terdaftar yang mencatat tempat, kunjungan, dan rencana perjalanan pribadinya. | ADMIN, GUEST |
| ADMIN | Role user yang mengendalikan MASTER PLACE, CATEGORY, reference data, dan akun Explorer. Dapat berpindah ke mode Explorer. | Pemilik data personal Explorer lain |
| ACTIVE MODE (Mode Aktif) | Mode kerja akun ADMIN dalam satu sesi: `ADMIN` (fungsi Admin) atau `EXPLORER` (fungsi Explorer atas data personal miliknya). Kedua mode saling eksklusif. | Role akun (`users.role`) |
| GUEST | Pengunjung aplikasi tanpa login; hanya dapat melihat MASTER PLACE aktif. | EXPLORER |
| MASTER PLACE | Data tempat bersama/terstandarisasi yang dikendalikan Admin. | MY PLACE |
| MY PLACE | Data tempat personal milik satu Explorer (atau Admin dalam mode Explorer); independen dari perubahan MASTER PLACE. | MASTER PLACE |
| MY PLACE INACTIVE | MY PLACE yang dinonaktifkan owner: disembunyikan dan tidak dapat dipakai untuk aktivitas baru, tetapi datanya tetap utuh. | MY PLACE yang dihapus |
| CATEGORY | Klasifikasi domain tempat (mis. Tempat Makan, Wisata Alam) yang dikelola Admin. | TAG, FAVORITE |
| TAG | Grouping/penandaan personal buatan Explorer. | CATEGORY, FAVORITE |
| FAVORITE | Flag boolean personal ON/OFF pada MY PLACE. | CATEGORY, TAG, VISIT STATUS |
| TAG COLOR REFERENCE | Daftar preset warna bersama untuk TAG; bukan foreign key. | `tags.color` (nilai aktual) |
| VISIT | Catatan kunjungan aktual ke MY PLACE; sumber rating. | ITINERARY PLACE |
| VISIT PHOTO | Foto dokumentasi sebuah VISIT; data personal. | MY PLACE PHOTO, MASTER PLACE PHOTO |
| MY PLACE PHOTO (Foto Tinjauan) | Foto opsional pada MY PLACE sebagai informasi/penanda tempat, diisi Explorer saat membuat atau mengubah MY PLACE; data personal. | VISIT PHOTO (dokumentasi kunjungan), MASTER PLACE PHOTO |
| MASTER PLACE PHOTO | Foto MASTER PLACE yang dikelola Admin; shared data, record independen. | VISIT PHOTO, MY PLACE PHOTO |
| AVATAR (Foto Profil) | Satu foto profil opsional milik user, diunggah dan diganti sendiri oleh user setelah login. | Foto tempat |
| ITINERARY | Rencana perjalanan milik Explorer (planning context). | VISIT |
| ITINERARY PLACE | Satu planned stop (occurrence) dalam ITINERARY yang menunjuk ke MY PLACE. | VISIT, MY PLACE |
| PLANNED PLACE VISIT | VISIT yang mereferensikan ITINERARY PLACE. | UNEXPECTED VISIT |
| UNEXPECTED VISIT | VISIT dengan konteks ITINERARY tetapi tanpa ITINERARY PLACE. | Visit di luar itinerary |
| MASTER RELATION STATUS | State hubungan MY PLACE ↔ MASTER PLACE: `UNREFERRED`, `REVIEW`, `REJECTED`, `REFERRED`. | VISIT STATUS |
| VISIT STATUS | State MY PLACE berdasarkan keberadaan VISIT: `PLAN`, `VISITED`. | MASTER RELATION STATUS |
| SUBMISSION (Pengajuan) | Permintaan Explorer agar MY PLACE dijadikan/direferensikan ke MASTER PLACE. | Approval otomatis |
| SNAPSHOT | Salinan data MY PLACE saat diajukan, disimpan di history; tidak berubah walau MY PLACE diedit. | Data MY PLACE saat ini |
| DRAFT MASTER | Data calon MASTER PLACE yang disalin dari snapshot/MY PLACE dan dapat diubah Admin sebelum disimpan. | MY PLACE |
| REFER / RE-REFER / UNREFER | Action Admin: mengaitkan, memindahkan, atau melepas referensi MY PLACE ke MASTER PLACE. RE-REFER adalah action, bukan state. | State |
| EFFECTIVE CATEGORY | CATEGORY yang ditampilkan untuk MY PLACE (lihat 16). | Stored MY PLACE category |
| MASTER RELATION HISTORY | Catatan append-only lifecycle hubungan MY PLACE ↔ MASTER PLACE; hanya ikut terhapus bila owner menghapus MY PLACE dengan persetujuan eksplisit. | General audit log |
| DELETE CONSENT | Persetujuan eksplisit (checkbox) owner untuk menghapus MY PLACE beserta seluruh data terkait. | Konfirmasi hapus biasa |
| APP SETTING (Konfigurasi Aplikasi) | Nilai aturan aplikasi yang dapat diubah Admin tanpa perubahan kode, mis. aturan foto dan avatar. | Konstanta hard-coded |
| BACKUP | Salinan database dan file foto yang dibuat atas perintah Admin, tercatat di riwayat backup. | Restore |
| USERNAME | Nama login unik milik user (4–20 karakter, huruf/angka/`.`/`_`, tanpa membedakan huruf besar/kecil); dapat dipakai untuk login selain email dan dapat diganti user sendiri. | Nama tampilan (`name`), email |
| EMAIL CHANGE CONFIRMATION | Link sekali pakai (berlaku 24 jam) yang dikirim ke email baru; email berubah hanya setelah link diklik. | Perubahan email langsung |
| LANGUAGE PREFERENCE | Pilihan bahasa antarmuka user (`ID` / `EN`), default `ID`. | Terjemahan data |
| SOFT DELETE | Data ditandai terhapus (`deleted_at`) tanpa dihapus fisik. | INACTIVE |
| INACTIVE | Data tidak tersedia untuk penggunaan baru, tetapi belum dihapus dan dapat diaktifkan kembali. | SOFT DELETE |

---

## 5. Background & Problem Statement

**Kondisi saat ini:** Explorer mencatat tempat yang pernah, sedang, atau akan dikunjungi (warung makan, cafe, tempat wisata, fasilitas umum, playground) secara terpisah — di catatan pribadi, galeri foto, atau bookmark peta — tanpa riwayat kunjungan dan rencana perjalanan yang terhubung.

**Masalah:**
1. Data tempat tersebar dan tidak terstandar; tempat yang sama dicatat dengan nama/alamat berbeda oleh user berbeda.
2. Tidak ada riwayat kunjungan (tanggal, rating, catatan, foto) per tempat.
3. Rencana perjalanan tidak dapat dibandingkan dengan kunjungan aktual.
4. Tidak ada sumber data tempat bersama yang terkurasi dan dapat dilihat publik.
5. Jika data bersama dapat diubah langsung oleh setiap user, catatan pribadi user lain dapat rusak.

**Dampak:** Waktu pencarian ulang tempat tinggi, kualitas data referensi rendah, dan pengalaman kunjungan tidak terdokumentasi.

**Alasan solusi dibutuhkan:** Diperlukan aplikasi berbasis peta yang memisahkan data tempat bersama (dikurasi Admin) dari catatan personal Explorer, sehingga Explorer bebas mengelola datanya tanpa mengubah data bersama.

---

## 6. Business Objectives & Success Metrics

> Seluruh KPI masih usulan (AS-06). Target ditetapkan 3 bulan setelah rilis Fase 1 berdasarkan data baseline (OI-01, DEFERRED).

| ID | Objective | KPI / Metric | Target | Cara Ukur |
|---|---|---|---|---|
| BO-01 | Menyediakan journal tempat personal berbasis peta | Jumlah MY PLACE aktif per Explorer | `TBD` | Query bulanan `my_places` |
| BO-02 | Mendokumentasikan kunjungan aktual | Jumlah VISIT per Explorer per bulan | `TBD` | Query bulanan `visits` |
| BO-03 | Menstandarkan data tempat bersama | % MY PLACE berstatus `REFERRED` | `TBD` | Query `my_places.master_relation_status` |
| BO-04 | Mempercepat kurasi MASTER PLACE | Rata-rata waktu SUBMITTED → REFERRED/REJECTED | `TBD` | Selisih `performed_at` pada history |
| BO-05 | Menghubungkan rencana dan kunjungan aktual | % ITINERARY yang memiliki ≥ 1 VISIT dalam konteksnya | `TBD` | Query `visits.itinerary_id` |
| BO-06 | Menyediakan informasi tempat publik | Jumlah MASTER PLACE `ACTIVE` | `TBD` | Query `master_places` |

---

## 7. Scope

### 7.1 In-Scope (Fase 1)

- FR-USR: Login dengan email atau username, manajemen akun Explorer oleh Admin (termasuk restore), reset password, ubah profil/username/password/email/avatar sendiri, preferensi bahasa, switch mode Admin/Explorer.
- FR-CFG: Konfigurasi aturan foto dan avatar oleh Admin.
- FR-BKP: Backup manual database & file foto oleh Admin.
- FR-MAP: Pencarian & pin tempat pada peta (Google Maps/Places), lokasi perangkat sebagai titik tengah peta, tampilan MASTER PLACE pada peta.
- FR-GST: Akses Guest read-only ke MASTER PLACE aktif.
- FR-MST: Pengelolaan MASTER PLACE oleh Admin (CRUD, inactive, soft delete).
- FR-CAT: Pengelolaan CATEGORY oleh Admin; pemilihan CATEGORY oleh Explorer.
- FR-MYP: CRUD MY PLACE oleh Explorer, aktivasi/nonaktivasi, dan penghapusan dengan persetujuan.
- FR-REL: Pengajuan, review, refer, re-refer, unrefer MY PLACE ↔ MASTER PLACE beserta history.
- FR-FAV: FAVORITE pada MY PLACE.
- FR-TAG / FR-CLR: TAG personal dan TAG COLOR REFERENCE.
- FR-VST / FR-VPH: VISIT, rating, dan VISIT PHOTO.
- FR-MPP: MY PLACE PHOTO (foto tinjauan MY PLACE, opsional).
- FR-MPH: MASTER PLACE PHOTO (upload Admin, dari VISIT PHOTO, atau dari MY PLACE PHOTO).
- FR-ITN: ITINERARY dan ITINERARY PLACE.
- FR-RTE: Visualisasi planned route dan actual visit.
- FR-FLT: Filter/pencarian MY PLACE.

### 7.2 Out-of-Scope

- PWA, offline-first, dan offline conflict resolution.
- Aplikasi mobile native.
- Navigasi turn-by-turn.
- GPS tracking perjalanan real-time dan penyimpanan polyline actual route.
- Sistem rekomendasi tempat.
- Social sharing, sharing TAG antar Explorer, collaborative itinerary.
- Komentar antar user dan rating publik oleh Guest.
- Notifikasi eksternal maupun in-app, **kecuali** email transaksional konfirmasi perubahan email (FR-NTF-001).
- Backup terjadwal otomatis (Fase 2) dan restore backup melalui aplikasi.
- Penerjemahan data yang diinput user (nama tempat, kategori, catatan).
- Permission granular di luar ADMIN / EXPLORER / GUEST.
- Pembuatan akun Admin melalui aplikasi.
- General-purpose audit log di luar MASTER RELATION HISTORY.
- Restore MASTER PLACE yang sudah soft-deleted.
- Detail UI/UX pixel-level.

### 7.3 Phasing

| Fase | Cakupan | Target |
|---|---|---|
| Fase 1 | Seluruh In-Scope pada 7.1 | `TBD` (OI-02, DEFERRED) |
| Fase 2 | Self-registration Explorer melalui halaman Guest; backup terjadwal (scheduler); penghapusan permanen/anonimisasi data pribadi atas permintaan; kebijakan purge data soft-deleted; item lain dievaluasi dari Out-of-Scope/Open Issues | `TBD` |

---

## 8. Stakeholders

| Stakeholder | Peran | Kepentingan | Keterlibatan (RACI) |
|---|---|---|---|
| Verry Prima | Product Owner | Prioritas fitur, keputusan business rule | A |
| Verry Prima | Business Analyst | Penyusunan BRD | R |
| `TBD` | Tech Lead | Kelayakan teknis, SRS | C |
| `TBD` | QA Lead | Testability | C |
| AI coding agent | Implementer | Kepatuhan pada business rule | I |
| End User | Explorer | Kemudahan mencatat tempat & kunjungan | I |
| End User | Admin | Kurasi MASTER PLACE | I |
| Publik | Guest | Melihat informasi tempat | I |

---

## 9. Product Overview

Personal Place Journal adalah aplikasi web berbasis peta untuk mencatat tempat yang pernah, sedang, atau akan dikunjungi. Explorer menyimpan tempat sebagai MY PLACE (data personal), mencatat kunjungan aktual (VISIT) beserta rating dan foto, serta menyusun rencana perjalanan (ITINERARY). Admin mengkurasi MASTER PLACE sebagai referensi tempat bersama yang dapat dilihat oleh siapa pun, termasuk Guest.

### 9.1 Kemampuan Utama

1. Mencari tempat melalui peta (Google Maps/Places) atau melakukan pin manual.
2. Menyimpan tempat sebagai `MY PLACE`, opsional dengan foto tinjauan.
3. Menggunakan `MASTER PLACE` sebagai referensi tempat terstandarisasi (opsional).
4. Mengklasifikasikan tempat dengan CATEGORY.
5. Mengelompokkan MY PLACE dengan TAG personal.
6. Menandai MY PLACE sebagai FAVORITE.
7. Membuat rencana perjalanan melalui `ITINERARY`.
8. Mencatat kunjungan aktual melalui `VISIT`, dengan rating 1–5 dan foto.
9. Mengajukan MY PLACE menjadi MASTER PLACE.
10. Memvisualisasikan planned route dan actual visit.
11. Menampilkan MASTER PLACE kepada Guest.

### 9.2 Konsep Inti

```text
MASTER PLACE        = shared reference / standardized place (dikendalikan Admin)
MY PLACE            = personal place record milik Explorer
CATEGORY            = klasifikasi domain tempat
TAG                 = grouping/penandaan personal Explorer
FAVORITE            = flag personal ON/OFF pada MY PLACE
VISIT               = actual visit record
VISIT PHOTO         = dokumentasi personal VISIT
MY PLACE PHOTO      = foto tinjauan personal MY PLACE (opsional)
MASTER PLACE PHOTO  = foto shared MASTER PLACE
AVATAR              = foto profil user (opsional)
ITINERARY           = planned journey
ITINERARY PLACE     = planned stop dalam ITINERARY
TAG COLOR REFERENCE = preset warna bersama (tanpa FK)
```

### 9.3 Diagram Konsep

```text
MASTER PLACE ─────────────┐
 ├── CATEGORY             │ optional reference (0..1)
 └── MASTER PLACE PHOTO   ▼
                       MY PLACE
                          ├── CATEGORY
                          ├── TAG
                          ├── FAVORITE (flag)
                          ├── MY PLACE PHOTO ──(dipilih Admin)──▶ MASTER PLACE PHOTO (salinan independen)
                          └── VISIT
                                └── VISIT PHOTO ──(dipilih Admin)──▶ MASTER PLACE PHOTO (salinan independen)

ITINERARY
 └── ITINERARY PLACE ──▶ MY PLACE

TAG COLOR REFERENCE ──(preset, tanpa FK)──▶ TAG.color
```

### 9.4 Core Principle

> **MASTER PLACE adalah sumber referensi tempat bersama yang dikendalikan Admin. MY PLACE adalah representasi personal Explorer yang independen dan dapat memiliki snapshot data sendiri. CATEGORY adalah klasifikasi domain. TAG adalah grouping personal milik Explorer. FAVORITE adalah penanda personal ON/OFF pada MY PLACE. VISIT adalah factual record kunjungan terhadap MY PLACE dan menjadi sumber rating. ITINERARY adalah planning context yang menggunakan MY PLACE dan tidak wajib berelasi dengan MASTER PLACE. VISIT PHOTO, MY PLACE PHOTO, dan MASTER PLACE PHOTO memiliki lifecycle independen. TAG COLOR adalah shared reference/preset yang nilainya disimpan langsung pada TAG tanpa foreign key. MASTER RELATION HISTORY adalah historical record append-only yang hanya ikut terhapus ketika owner menghapus MY PLACE dengan persetujuan eksplisit. Akun ADMIN dapat bekerja sebagai Explorer atas data personalnya sendiri, tetapi fungsi Admin dan fungsi Explorer tidak pernah aktif bersamaan.**

Perubahan terhadap konsep inti di atas harus dibahas dan disepakati sebelum diterapkan pada desain database, API, UI, atau kode aplikasi.

---

## 10. User Roles

### 10.1 Explorer

**Dibuat oleh:** Admin (Fase 1). Self-registration pada Fase 2.

Seluruh kemampuan dan larangan Explorer pada section ini juga berlaku untuk **akun ADMIN dalam mode Explorer** (10.4).

Explorer **dapat**:
- login menggunakan email atau username dan mengelola data personal miliknya;
- mengubah nama, username, password, email (dengan konfirmasi link), foto profil (avatar), dan preferensi bahasa miliknya;
- mencari tempat melalui Google Maps/Places; peta berpusat pada lokasi perangkat, dan Explorer bebas menentukan pin di lokasi mana pun;
- melihat MASTER PLACE `ACTIVE`, serta MASTER `INACTIVE` yang direferensikan MY PLACE miliknya (read-only, berlabel "Tidak aktif");
- membuat MY PLACE dari hasil Google, dari MASTER PLACE, atau input baru;
- mengubah data prefill sebelum menyimpan MY PLACE;
- menambahkan, menghapus, mengurutkan, dan menetapkan primary foto tinjauan (MY PLACE PHOTO) saat membuat atau mengubah MY PLACE;
- menonaktifkan dan mengaktifkan kembali MY PLACE;
- menghapus MY PLACE; jika MY PLACE memiliki history relasi atau ITINERARY PLACE, penghapusan memerlukan persetujuan eksplisit (12.10);
- memilih CATEGORY aktif untuk MY PLACE;
- membuat, mengubah, dan menghapus TAG personal; memilih preset atau custom color;
- memberikan satu atau banyak TAG pada MY PLACE miliknya;
- mengaktifkan/menonaktifkan FAVORITE;
- mengajukan MY PLACE menjadi MASTER PLACE, melihat status pengajuan, dan mengajukan kembali yang ditolak;
- membuat dan mengelola ITINERARY dan ITINERARY PLACE;
- mencatat VISIT (planned place visit, unexpected visit, atau di luar itinerary), memberi rating 1–5;
- mengelola VISIT PHOTO;
- memfilter MY PLACE berdasarkan CATEGORY, TAG, FAVORITE, VISIT STATUS, dan MASTER RELATION STATUS.

Explorer **tidak dapat**:
- mengakses atau mengelola data personal Explorer lain;
- membuat atau mengubah MASTER PLACE, MASTER PLACE PHOTO, CATEGORY, atau TAG COLOR REFERENCE;
- membuat CATEGORY baru;
- membatalkan pengajuan berstatus `REVIEW`;
- mengajukan MY PLACE berstatus `REFERRED` atau `REVIEW`;
- melepas/memindahkan referensi MASTER PLACE sendiri (seluruh kendali relasi berada pada Admin);
- berpindah ke mode Admin (switch mode hanya untuk akun ADMIN pada Fase 1).

### 10.2 Admin

**Dibuat oleh:** inisialisasi sistem (seed) — tidak melalui aplikasi pada Fase 1.

Kemampuan di bawah ini hanya tersedia dalam **mode Admin** (10.4). Dalam mode Explorer, akun ADMIN mengikuti 10.1.

Admin **dapat**:
- CRUD MASTER PLACE (manual, dari MY PLACE, dari pengajuan); menonaktifkan/mengaktifkan kembali; soft delete;
- melihat daftar pengajuan dan snapshot-nya;
- menolak pengajuan dengan alasan; menerima dengan membuat MASTER baru atau mereferensikan MASTER existing;
- mereferensikan MY PLACE atas inisiatif, memindahkan referensi (RE-REFER), dan melepas referensi (UNREFER);
- melihat (read-only) MY PLACE, MY PLACE PHOTO, dan VISIT PHOTO Explorer untuk keperluan kurasi;
- mengelola MASTER PLACE PHOTO, termasuk mengambil VISIT PHOTO atau MY PLACE PHOTO sebagai sumber;
- mengelola CATEGORY dan TAG COLOR REFERENCE;
- membuat (termasuk menetapkan username awal), mengubah, menonaktifkan, mengaktifkan kembali, dan soft-delete akun Explorer;
- mereset password Explorer (generate random atau set manual);
- mengubah email Explorer melalui konfirmasi link ke email baru;
- me-restore akun Explorer yang `DELETED`;
- mengelola konfigurasi aturan foto dan avatar;
- menjalankan backup manual dan mengunduh file backup;
- me-review pengajuan MY PLACE, termasuk pengajuan miliknya sendiri yang dibuat dalam mode Explorer;
- berpindah ke mode Explorer.

Admin **tidak dapat**:
- membuat akun Admin baru (Fase 1);
- mengubah username Explorer setelah akun dibuat (username hanya diganti oleh pemilik akun);
- mengubah data MY PLACE, MY PLACE PHOTO, VISIT, VISIT PHOTO, TAG, FAVORITE, atau ITINERARY milik Explorer lain;
- mengubah atau menghapus avatar user lain;
- memiliki TAG personal Explorer lain;
- menggunakan fungsi Explorer saat berada dalam mode Admin.

### 10.3 Guest

**Dibuat oleh:** tidak perlu akun.

Guest **dapat**: melihat peta berisi MASTER PLACE `ACTIVE` beserta detailnya (nama, alamat, deskripsi, koordinat, CATEGORY, rating MASTER, MASTER PLACE PHOTO).

Guest **tidak dapat**: melihat MY PLACE, MY PLACE PHOTO, VISIT, VISIT PHOTO, TAG, ITINERARY, atau data user (termasuk avatar); melakukan perubahan data apa pun.

### 10.4 Mode Admin / Explorer pada Akun ADMIN

| Aspek | Aturan |
|---|---|
| Mode tersedia | `ADMIN` dan `EXPLORER` (hanya untuk akun dengan role ADMIN). Akun EXPLORER selalu berada pada fungsi Explorer dan tidak dapat switch. |
| Mode awal | Setelah login, akun ADMIN selalu berada pada mode `ADMIN`. |
| Switch | Admin dapat berpindah mode kapan saja melalui aksi "Switch Mode" tanpa login ulang. Pada Fase 1 hanya akun ADMIN yang dapat switch. |
| Eksklusivitas | Pada satu waktu hanya satu mode aktif. Fungsi Admin hanya dapat dipakai dalam mode `ADMIN`; fungsi Explorer hanya dalam mode `EXPLORER`. |
| Data personal | Dalam mode `EXPLORER`, akun ADMIN memiliki MY PLACE, MY PLACE PHOTO, TAG, VISIT, VISIT PHOTO, dan ITINERARY sendiri dengan skema dan aturan yang sama persis seperti Explorer; owner = `user_id` akun ADMIN tersebut. |
| Isolasi | Data personal akun ADMIN terisolasi dari Explorer lain sama seperti antar Explorer. Dalam mode `ADMIN`, data personal tersebut diperlakukan seperti data Explorer lain (read-only untuk kurasi). |
| Self-review | Diizinkan: Admin dapat me-review pengajuan MY PLACE miliknya sendiri setelah switch ke mode `ADMIN`. |
| Perhitungan | VISIT milik akun ADMIN ikut dihitung pada rating MASTER seperti VISIT Explorer. |

### 10.5 Permission Matrix

Legenda: ✅ diizinkan · ❌ dilarang · 👁 read-only · (own) hanya data milik sendiri.
Kolom **Explorer** juga berlaku untuk akun ADMIN dalam mode Explorer. Kolom **Admin** berarti akun ADMIN dalam mode Admin.

| Aksi / Resource | Guest | Explorer | Admin |
|---|:---:|:---:|:---:|
| Login (email atau username) | ❌ | ✅ | ✅ |
| Switch mode Admin ⇄ Explorer | ❌ | ✅ (hanya akun ADMIN) | ✅ |
| Read MASTER PLACE `ACTIVE` | ✅ | ✅ | ✅ |
| Read MASTER PLACE `INACTIVE` | ❌ | 👁 (hanya yang direferensikan MY PLACE miliknya) | ✅ |
| Create / Update MASTER PLACE | ❌ | ❌ | ✅ |
| Inactivate / Activate / Soft delete MASTER PLACE | ❌ | ❌ | ✅ |
| Read MASTER PLACE PHOTO | ✅ | ✅ | ✅ |
| Kelola MASTER PLACE PHOTO | ❌ | ❌ | ✅ |
| Read CATEGORY aktif | ✅ | ✅ | ✅ |
| CRUD CATEGORY | ❌ | ❌ | ✅ |
| CRUD MY PLACE | ❌ | ✅ (own) | ❌ |
| Inactivate / Activate MY PLACE | ❌ | ✅ (own) | ❌ |
| Delete MY PLACE dengan data terkait (consent) | ❌ | ✅ (own) | ❌ |
| Read MY PLACE Explorer lain | ❌ | ❌ | 👁 |
| Submit / Resubmit pengajuan MASTER | ❌ | ✅ (own) | ❌ |
| Cancel pengajuan `REVIEW` | ❌ | ❌ | ❌ |
| Review pengajuan (approve / reject), termasuk milik sendiri | ❌ | ❌ | ✅ |
| Refer inisiatif / RE-REFER / UNREFER | ❌ | ❌ | ✅ |
| Read MASTER RELATION HISTORY | ❌ | 👁 (own MY PLACE) | 👁 |
| Toggle FAVORITE | ❌ | ✅ (own) | ❌ |
| CRUD TAG & assign TAG | ❌ | ✅ (own) | ❌ |
| Read TAG COLOR REFERENCE aktif | ❌ | ✅ | ✅ |
| CRUD TAG COLOR REFERENCE | ❌ | ❌ | ✅ |
| CRUD VISIT | ❌ | ✅ (own) | ❌ |
| CRUD VISIT PHOTO | ❌ | ✅ (own) | ❌ |
| Read VISIT PHOTO Explorer lain | ❌ | ❌ | 👁 |
| Gunakan VISIT PHOTO sebagai MASTER PLACE PHOTO | ❌ | ❌ | ✅ |
| CRUD MY PLACE PHOTO (foto tinjauan) | ❌ | ✅ (own) | ❌ |
| Read MY PLACE PHOTO Explorer lain | ❌ | ❌ | 👁 |
| Gunakan MY PLACE PHOTO sebagai MASTER PLACE PHOTO | ❌ | ❌ | ✅ |
| CRUD ITINERARY & ITINERARY PLACE | ❌ | ✅ (own) | ❌ |
| Create / Update akun Explorer | ❌ | ❌ | ✅ |
| Inactivate / Activate / Soft delete Explorer | ❌ | ❌ | ✅ |
| Reset password Explorer | ❌ | ❌ | ✅ |
| Create akun Admin | ❌ | ❌ | ❌ |
| Ubah nama & password sendiri | ❌ | ✅ | ✅ |
| Ubah username sendiri | ❌ | ✅ | ✅ |
| Ubah username Explorer | ❌ | ❌ | ❌ |
| Upload / ganti / hapus avatar sendiri | ❌ | ✅ | ✅ |
| Read avatar user lain | ❌ | ❌ | 👁 |
| Ubah / hapus avatar user lain | ❌ | ❌ | ❌ |
| Ubah email sendiri (konfirmasi link) | ❌ | ✅ | ✅ |
| Ubah email Explorer (konfirmasi link ke email baru) | ❌ | ❌ | ✅ |
| Restore akun Explorer `DELETED` | ❌ | ❌ | ✅ |
| Pilih bahasa antarmuka | ✅ (per perangkat) | ✅ (tersimpan di profil) | ✅ (tersimpan di profil) |
| Kelola konfigurasi aturan foto & avatar | ❌ | ❌ | ✅ |
| Backup manual & unduh file backup | ❌ | ❌ | ✅ |

---

## 11. Core Domain Model

### 11.1 Pohon Entitas

```text
USER
 ├── AVATAR (atribut, opsional)
 ├── MY PLACE
 │    ├── MY PLACE PHOTO
 │    ├── CATEGORY (via my_place_categories)
 │    ├── TAG (via my_place_tags)
 │    ├── FAVORITE (flag)
 │    ├── VISIT
 │    │    └── VISIT PHOTO
 │    └── MY PLACE MASTER HISTORY
 ├── TAG
 └── ITINERARY
      └── ITINERARY PLACE ──▶ MY PLACE

MASTER PLACE
 ├── CATEGORY (via master_place_categories)
 ├── MASTER PLACE PHOTO
 └── direferensikan oleh banyak MY PLACE

TAG COLOR REFERENCE
 └── preset bersama untuk TAG (tanpa FK)
```

### 11.2 Kardinalitas

```text
USER          1 ───── N MY PLACE
USER          1 ───── N TAG
USER          1 ───── N ITINERARY
MASTER PLACE  0..1 ── N MY PLACE              (optional reference)
MASTER PLACE  N ───── N CATEGORY              (master_place_categories)
MY PLACE      N ───── N CATEGORY              (my_place_categories)
MY PLACE      N ───── N TAG                   (my_place_tags, owner sama)
MY PLACE      1 ───── N VISIT
VISIT         1 ───── N VISIT PHOTO
MASTER PLACE  1 ───── N MASTER PLACE PHOTO
VISIT PHOTO   0..1 ── N MASTER PLACE PHOTO    (source, optional)
MY PLACE      1 ───── N MY PLACE PHOTO
MY PLACE PHOTO 0..1 ─ N MASTER PLACE PHOTO    (source, optional)
USER          1 ───── 0..1 AVATAR             (atribut USER)
ITINERARY     1 ───── N ITINERARY PLACE
MY PLACE      1 ───── N ITINERARY PLACE       (boleh muncul berkali-kali)
ITINERARY     0..1 ── N VISIT                 (itinerary context, optional)
ITINERARY PLACE 0..1 ─ N VISIT                (planned place visit, optional)
MY PLACE      1 ───── N MY PLACE MASTER HISTORY
```

### 11.3 Ownership

| Entitas | Jenis Data | Owner | Dikelola Oleh |
|---|---|---|---|
| USER | Account | Sistem | Admin (Explorer); seed (Admin) |
| MASTER PLACE | Shared / reference | Sistem | Admin |
| MASTER PLACE PHOTO | Shared | Sistem | Admin |
| CATEGORY | Shared / master | Sistem | Admin |
| TAG COLOR REFERENCE | Reference / preset | Sistem | Admin |
| MY PLACE | Personal | Explorer | Explorer pemilik |
| TAG | Personal | Explorer | Explorer pemilik |
| VISIT | Personal | Explorer (via MY PLACE) | Explorer pemilik |
| VISIT PHOTO | Personal | Explorer (via VISIT) | Explorer pemilik |
| MY PLACE PHOTO | Personal | Explorer (via MY PLACE) | Explorer pemilik |
| AVATAR | Account | User ybs | User ybs |
| ITINERARY / ITINERARY PLACE | Personal | Explorer | Explorer pemilik |
| APP SETTING | Konfigurasi | Sistem | Admin |
| BACKUP LOG & file backup | Operasional | Sistem | Admin |
| EMAIL CHANGE REQUEST | Account | User ybs | Sistem (dibuat atas request user/Admin) |
| MY PLACE MASTER HISTORY | Audit (append-only) | Sistem | Sistem (dibuat oleh business action); hanya terhapus bersama MY PLACE atas persetujuan owner |

"Explorer" sebagai owner mencakup akun ADMIN yang membuat data dalam mode Explorer.

### 11.4 Pembedaan Konsep yang Mirip

| Konsep A | Konsep B | Perbedaan |
|---|---|---|
| MASTER PLACE | MY PLACE | Shared & dikurasi Admin vs personal & independen |
| CATEGORY | TAG | Klasifikasi domain shared (Admin) vs grouping personal (Explorer) |
| FAVORITE | TAG / CATEGORY | Boolean flag pada MY PLACE, bukan entitas |
| MASTER RELATION STATUS | VISIT STATUS | Dua state machine berbeda; tidak boleh dicampur |
| ITINERARY PLACE | VISIT | Rencana (`sequence`) vs fakta (`visited_at`) |
| VISIT PHOTO | MASTER PLACE PHOTO | Personal vs shared; record independen |
| MY PLACE PHOTO | VISIT PHOTO | Foto tinjauan/penanda tempat (melekat ke MY PLACE) vs dokumentasi kunjungan (melekat ke VISIT); keduanya personal dan dapat menjadi sumber MASTER PLACE PHOTO |
| INACTIVE | SOFT DELETE | Dapat diaktifkan kembali vs terhapus (tanpa restore Fase 1) |
| State | Action | `REFERRED` adalah state; `RE-REFER` adalah action history |

---

## 12. Business Process

### 12.1 P-01 — Membuat MY PLACE

**Aktor:** Explorer · **Trigger:** Explorer memilih tempat di peta / menekan "Tambah Tempat"
**Pre-condition:** Explorer login dan aktif.

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 0 | Sistem | Membuka peta dengan titik tengah lokasi perangkat (jika izin lokasi diberikan) | Peta berpusat di lokasi Explorer |
| 1 | Explorer | Mencari tempat (Google Places / MASTER PLACE) atau pin manual di lokasi mana pun pada peta | Lokasi terpilih |
| 2a | Sistem | Jika dari Google: prefill name, address, latitude, longitude, `google_place_id` | Form terisi |
| 2b | Sistem | Jika dari MASTER PLACE `ACTIVE`: prefill dari MASTER; `master_place_id` diisi | Form terisi |
| 2c | Explorer | Jika input baru: mengisi data manual | Form terisi |
| 3 | Sistem | Menampilkan warning jika, pada MY PLACE milik user yang sama, `google_place_id` sama, **atau** MASTER sama, **atau** jarak koordinat ≤ 50 m | Warning (tidak memblokir) |
| 4 | Explorer | Mengubah data prefill, memilih CATEGORY aktif, TAG, FAVORITE, dan (opsional) menambahkan foto tinjauan | — |
| 5 | Explorer | Menyimpan | MY PLACE tersimpan |

**Post-condition:**
- `visit_status = PLAN`, `is_favorite = FALSE` (kecuali diubah), MY PLACE `ACTIVE`.
- Jika dari MASTER: `master_relation_status = REFERRED` + history `REFERRED` (performed_by = Explorer pembuat); selain itu `UNREFERRED`.

**Exception:**
- Google Places tidak tersedia → Explorer tetap dapat pin manual / input manual.
- Izin lokasi perangkat ditolak/tidak tersedia → pin lokasi perangkat tidak ditampilkan; Explorer menentukan lokasi melalui pencarian atau pin manual.

### 12.2 P-02 — Pengajuan MY PLACE menjadi MASTER PLACE

**Aktor:** Explorer, Admin · **Trigger:** Explorer menekan "Ajukan sebagai Master"
**Pre-condition:** MY PLACE milik Explorer dan `ACTIVE`; `master_relation_status` = `UNREFERRED` atau `REJECTED`. MY PLACE berstatus `PLAN` maupun `VISITED` boleh diajukan. Admin yang mengajukan dalam mode Explorer boleh me-review pengajuannya sendiri dalam mode Admin.

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 1 | Explorer | Mengajukan MY PLACE | Status → `REVIEW`; history `SUBMITTED` + snapshot |
| 2 | Explorer | (Opsional) Mengedit MY PLACE selama `REVIEW` | MY PLACE berubah; snapshot pengajuan **tidak** berubah |
| 3 | Admin | Meninjau snapshot pengajuan | — |
| 4a | Admin | Menerima dengan membuat MASTER baru: draft MASTER disalin dari snapshot, diubah bila perlu, lalu disimpan | MASTER `ACTIVE` dibuat; status → `REFERRED`; history `REFERRED` |
| 4b | Admin | Menerima dengan mereferensikan MASTER `ACTIVE` existing | Status → `REFERRED`; history `REFERRED` |
| 4c | Admin | Menolak dengan alasan | Status → `REJECTED`; history `REJECTED` (reason + snapshot) |
| 5 | Explorer | (Jika ditolak) Mengajukan kembali | Status → `REVIEW`; history `SUBMITTED` baru + snapshot baru |

**Post-condition:** Status relasi dan history tercatat. Data MY PLACE tidak diubah oleh proses review.
**Exception:**
- Explorer tidak dapat membatalkan pengajuan `REVIEW`.
- MASTER target `INACTIVE`/`DELETED` tidak dapat dipilih pada 4b.

### 12.3 P-03 — Refer Inisiatif, RE-REFER, dan UNREFER oleh Admin

**Aktor:** Admin

| Proses | Pre-condition | Hasil |
|---|---|---|
| Refer inisiatif | MY PLACE `UNREFERRED` / `REVIEW` / `REJECTED`; MASTER target `ACTIVE` | Status → `REFERRED`; history `REFERRED`. Jika dari `REVIEW`, pengajuan dianggap selesai. |
| RE-REFER | MY PLACE `REFERRED`; MASTER target `ACTIVE` dan berbeda dari MASTER saat ini | Tetap `REFERRED`; `master_place_id` berganti; satu history `RE-REFER` |
| UNREFER manual | MY PLACE `REFERRED` | Status → `UNREFERRED`; `master_place_id = NULL`; history `UNREFERRED` |

Explorer tidak perlu memberikan persetujuan atas tindakan di atas.

### 12.4 P-04 — Admin Membuat MASTER PLACE dari MY PLACE (tanpa pengajuan)

**Aktor:** Admin

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 1 | Admin | Memilih MY PLACE Explorer (read-only) | — |
| 2 | Sistem | Menyalin data MY PLACE ke draft MASTER | Draft MASTER |
| 3 | Admin | Mengubah draft MASTER bila perlu dan menentukan checkbox **"Referensikan MY PLACE sumber ke MASTER ini"** | — |
| 4 | Admin | Menyimpan | MASTER `ACTIVE` dibuat; data MY PLACE tidak berubah |
| 5a | Sistem | Jika checkbox dicentang dan MY PLACE sumber `UNREFERRED`/`REVIEW`/`REJECTED` | MY PLACE → `REFERRED` ke MASTER baru; history `REFERRED` |
| 5b | Sistem | Jika checkbox dicentang dan MY PLACE sumber sudah `REFERRED` ke MASTER lain | `master_place_id` → MASTER baru; history `RE-REFER` |
| 5c | Sistem | Jika checkbox tidak dicentang | MY PLACE sumber tetap (referensi tidak berubah); tidak ada history |

### 12.5 P-05 — Menonaktifkan dan Menghapus MASTER PLACE

| Proses | Aktor | Hasil |
|---|---|---|
| Inactivate | Admin | MASTER `INACTIVE`: tidak tersedia untuk referensi baru dan tidak tampil ke Guest. MY PLACE yang mereferensikannya **tetap `REFERRED`**; Admin dapat melakukan RE-REFER/UNREFER atas inisiatif sendiri. Tidak ada history otomatis. |
| Activate | Admin | MASTER kembali `ACTIVE`. |
| Soft delete | Admin | MASTER `DELETED`. Setiap MY PLACE yang mereferensikannya otomatis → `UNREFERRED` dengan history `UNREFERRED` (reason "MASTER PLACE dihapus", performed_by = Admin yang menghapus). Data MY PLACE, CATEGORY MY PLACE, VISIT, TAG, FAVORITE, ITINERARY tetap ada. Tidak ada restore pada Fase 1. |

### 12.6 P-06 — Mencatat VISIT

**Aktor:** Explorer · **Pre-condition:** MY PLACE milik Explorer dan berstatus `ACTIVE`.

| Bentuk | Langkah | Data Konteks |
|---|---|---|
| Visit di luar itinerary | MY PLACE → Add VISIT | `itinerary_id = NULL`, `itinerary_place_id = NULL` |
| Planned place visit | ITINERARY → ITINERARY PLACE → Add VISIT | `itinerary_id` = ITINERARY, `itinerary_place_id` = ITINERARY PLACE |
| Unexpected visit | ITINERARY → pilih/buat MY PLACE yang bukan ITINERARY PLACE → Add VISIT | `itinerary_id` = ITINERARY, `itinerary_place_id = NULL` |

**Post-condition:** VISIT tersimpan; `visit_status` MY PLACE → `VISITED`; rating MY PLACE dan MASTER dihitung ulang.

### 12.7 P-07 — Menyusun ITINERARY

**Aktor:** Explorer

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 1 | Explorer | Membuat ITINERARY (name, description, start/end date opsional) | ITINERARY tersimpan |
| 2a | Explorer | Menambah ITINERARY PLACE dari MY PLACE `ACTIVE` miliknya | ITINERARY PLACE dibuat |
| 2b | Explorer | Menambah tempat baru yang belum pernah diinput: sistem membuat MY PLACE baru (P-01) lalu ITINERARY PLACE | MY PLACE baru (`PLAN`, tanpa MASTER wajib) + ITINERARY PLACE |
| 3 | Explorer | Mengatur `sequence`, `planned_date`, `planned_time` | Urutan rencana tersimpan |

ITINERARY PLACE tidak wajib berelasi dengan MASTER PLACE dan tidak wajib menghasilkan VISIT.

### 12.8 P-08 — MASTER PLACE PHOTO dari VISIT PHOTO atau MY PLACE PHOTO

**Aktor:** Admin

1. Admin melihat VISIT PHOTO dan MY PLACE PHOTO (read-only) **hanya** dari MY PLACE yang saat ini mereferensikan MASTER tersebut.
2. Admin memilih foto → sistem membuat MASTER PLACE PHOTO sebagai record independen dengan referensi sumber `source_visit_photo_id` atau `source_my_place_photo_id`.
3. VISIT PHOTO dan MY PLACE PHOTO tetap data personal Explorer.
4. Selain itu, Admin dapat mengunggah foto MASTER secara langsung tanpa mengambil dari foto Explorer.

### 12.9 P-09 — Manajemen Akun & Reset Password

**Aktor:** Admin

| Proses | Hasil |
|---|---|
| Create Explorer | Akun `EXPLORER` aktif dibuat (name, username, email, password awal); user wajib mengganti password saat login pertama. |
| Update Explorer | Nama diperbarui langsung; perubahan email mengikuti konfirmasi link (P-12); username tidak diubah Admin (hanya oleh pemilik akun, P-16). |
| Inactivate / Activate | `is_active` berubah; user inactive tidak dapat login. |
| Soft delete | User tidak dapat login; data miliknya tetap tersimpan namun tidak dapat diakses melalui aplikasi. |
| Restore | User `DELETED` dikembalikan menjadi `ACTIVE`; data miliknya kembali dapat diakses. |
| Reset password — generate | Sistem membuat random password yang memuat minimal 1 huruf kecil, 1 huruf besar, 1 angka, dan 1 simbol; panjang 12 karakter; ditampilkan sekali kepada Admin untuk diserahkan ke Explorer. |
| Reset password — manual | Admin mengisi password baru yang memenuhi aturan komposisi yang sama. |

Password minimal 8 karakter. Setelah akun dibuat dan setelah reset (generate maupun manual), user **wajib mengganti password** pada login berikutnya sebelum dapat menggunakan fitur lain.

### 12.10 P-10 — Menghapus atau Menonaktifkan MY PLACE

**Aktor:** Explorer (owner) · **Trigger:** Explorer menekan "Hapus" pada MY PLACE

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 1 | Sistem | Memeriksa data terkait MY PLACE | — |
| 2a | Sistem | Jika **tidak** memiliki MASTER RELATION HISTORY dan **tidak** menjadi ITINERARY PLACE: menampilkan konfirmasi hapus biasa beserta jumlah VISIT, VISIT PHOTO, & MY PLACE PHOTO yang ikut terhapus | Dialog konfirmasi |
| 2b | Sistem | Jika memiliki MASTER RELATION HISTORY **dan/atau** ITINERARY PLACE: menampilkan dialog yang menjelaskan alasan dan merinci data terkait yang akan ikut terhapus — jumlah VISIT, VISIT PHOTO, MY PLACE PHOTO, record history relasi MASTER, serta ITINERARY PLACE (beserta nama ITINERARY-nya) — dan checkbox persetujuan **"Saya setuju menghapus seluruh data yang terhubung dengan MY PLACE ini"** | Dialog consent |
| 3a | Explorer | Mencentang persetujuan dan mengonfirmasi | MY PLACE dan seluruh data terkait terhapus permanen |
| 3b | Explorer | Tidak mencentang persetujuan | Penghapusan tidak dapat dilanjutkan; sistem menampilkan pesan bahwa MY PLACE tidak dapat dihapus tanpa persetujuan karena memiliki data terkait, dan menyarankan **menonaktifkan** MY PLACE |
| 4 | Explorer | (Opsional) Menonaktifkan MY PLACE | MY PLACE `INACTIVE`; seluruh data tetap utuh |

**Post-condition (3a):** VISIT, VISIT PHOTO, MY PLACE PHOTO, MASTER RELATION HISTORY, ITINERARY PLACE yang menunjuk MY PLACE ini, serta association TAG & CATEGORY terhapus. ITINERARY dan stop lain di dalamnya tetap ada. MASTER PLACE PHOTO yang bersumber dari VISIT PHOTO atau MY PLACE PHOTO tetap ada. Jika MY PLACE berstatus `REVIEW`, pengajuannya hilang dari antrean review. Rating MASTER dihitung ulang.
**Exception:** Penghapusan tidak menghasilkan history `UNREFERRED`.

### 12.11 P-11 — Switch Mode Akun ADMIN

**Aktor:** Admin

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 1 | Admin | Login | Mode aktif = `ADMIN` |
| 2 | Admin | Memilih "Switch ke Explorer" | Mode aktif = `EXPLORER`; menu & data yang tampil = fungsi Explorer atas data personal milik akun tersebut |
| 3 | Admin | Memilih "Switch ke Admin" | Mode aktif = `ADMIN`; fungsi Explorer tidak tersedia |

**Exception:** Akses fungsi Admin saat mode `EXPLORER` (atau sebaliknya) ditolak dan pengguna diarahkan untuk switch mode terlebih dahulu.

### 12.12 P-12 — Perubahan Email dengan Konfirmasi

**Aktor:** User (email sendiri) atau Admin (email Explorer) · **Trigger:** Pengajuan email baru

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 1 | User / Admin | Mengisi email baru | — |
| 2 | Sistem | Memeriksa format dan keunikan (tanpa membedakan huruf besar/kecil, termasuk email user soft-deleted) | Ditolak bila tidak valid/sudah dipakai |
| 3 | Sistem | Membuat request dan mengirim link konfirmasi sekali pakai ke **email baru**, berlaku 24 jam; request sebelumnya yang belum dikonfirmasi dibatalkan | Email lama tetap dipakai untuk login |
| 4 | Pemilik email baru | Mengklik link dalam 24 jam | Sistem memeriksa ulang keunikan, lalu email akun berubah |
| 5 | Sistem | Link tidak diklik dalam 24 jam | Request kedaluwarsa; email tidak berubah |

**Exception:** Email baru telah dipakai akun lain saat konfirmasi → perubahan gagal; link yang sudah dipakai/kedaluwarsa tidak dapat digunakan lagi.

### 12.13 P-13 — Backup Manual

**Aktor:** Admin (mode Admin)

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 1 | Admin | Menekan "Backup Sekarang" | Backup dimulai (status `RUNNING`) |
| 2 | Sistem | Membackup database dan file foto | Status `SUCCESS` atau `FAILED` tercatat di riwayat backup |
| 3 | Admin | Mengunduh file backup berstatus `SUCCESS` | File backup terunduh |

**Exception:** Backup tidak dapat dimulai bila backup lain masih `RUNNING`. Restore dilakukan tim teknis di luar aplikasi.

### 12.14 P-14 — Konfigurasi Aturan Foto & Avatar

**Aktor:** Admin (mode Admin)

1. Admin mengubah nilai aturan foto (tipe file, ukuran maksimum, jumlah maksimum per VISIT / per MY PLACE / per MASTER) atau aturan avatar (tipe file, ukuran maksimum).
2. Nilai baru berlaku untuk upload berikutnya; foto dan avatar yang sudah ada tidak terpengaruh.
3. Jika jumlah foto existing melebihi batas baru, foto tetap ada, tetapi upload baru ditolak sampai jumlah di bawah batas.

### 12.15 P-15 — Login dengan Email atau Username

**Aktor:** Explorer, Admin · **Trigger:** User membuka halaman login

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 1 | User | Mengisi **email atau username** dan password | — |
| 2 | Sistem | Mengenali identifier: mengandung `@` → dicocokkan dengan email; selain itu → dicocokkan dengan username (keduanya tanpa membedakan huruf besar/kecil) | Akun ditemukan / tidak |
| 3 | Sistem | Memeriksa password dan status akun (`ACTIVE`) | Login berhasil; akun ADMIN masuk mode `ADMIN` (P-11) |
| 4 | Sistem | Jika `must_change_password = TRUE` | User diarahkan mengganti password sebelum memakai fitur lain |

**Exception:** Identifier tidak ditemukan atau password salah → pesan generik "Email/username atau password salah" (tidak mengungkap bagian mana yang salah). User `INACTIVE`/`DELETED` ditolak (FR-USR-009). Selama perubahan email menunggu konfirmasi, login memakai email lama atau username.

### 12.16 P-16 — Perubahan Username oleh User

**Aktor:** Explorer, Admin (username miliknya sendiri) · **Pre-condition:** User login dan tidak sedang wajib mengganti password

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 1 | User | Mengisi username baru pada profil | — |
| 2 | Sistem | Memvalidasi panjang 4–20, karakter yang diizinkan, dan keunikan tanpa membedakan huruf besar/kecil (termasuk username user soft-deleted) | Ditolak bila tidak valid/sudah dipakai |
| 3 | Sistem | Menyimpan username baru (huruf kecil) | Berlaku langsung untuk login berikutnya; sesi aktif tetap berjalan |

**Exception:** Username baru sama dengan username saat ini (tanpa membedakan huruf besar/kecil) → tidak ada perubahan. Username lama tidak dicadangkan dan dapat dipakai akun lain. Perubahan username tidak menghasilkan history.

### 12.17 P-17 — Foto Profil (Avatar)

**Aktor:** Explorer, Admin (avatar miliknya sendiri) · **Pre-condition:** User login dan tidak sedang wajib mengganti password

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 1 | User | Memilih file foto pada profil | — |
| 2 | Sistem | Memvalidasi tipe file dan ukuran terhadap `avatar.allowed_types` dan `avatar.max_size_mb` yang berlaku saat upload | Ditolak bila tidak sesuai |
| 3 | Sistem | Menghapus metadata lokasi GPS (EXIF), menyimpan file, dan menetapkannya sebagai avatar user | Avatar tampil di profil |
| 4 | Sistem | Jika user sudah memiliki avatar | File avatar lama dihapus dari penyimpanan |
| 5 | User | (Opsional) Menghapus avatar | Avatar kosong; aplikasi menampilkan avatar default |

**Exception:** Avatar tidak dapat diisi melalui external link. Admin tidak dapat mengubah atau menghapus avatar user lain.

### 12.18 P-18 — Foto Tinjauan MY PLACE

**Aktor:** Explorer (owner) · **Trigger:** Membuat (P-01) atau mengubah MY PLACE

| Langkah | Aktor | Aksi | Hasil |
|---:|---|---|---|
| 1 | Explorer | (Opsional) Menambahkan satu atau banyak foto tinjauan: upload file atau external link | — |
| 2 | Sistem | Memvalidasi tipe & ukuran (`photo.allowed_types`, `photo.max_size_mb`) dan jumlah (`photo.max_per_my_place`) | Ditolak bila melebihi batas |
| 3 | Sistem | Menghapus metadata GPS (EXIF) dari file upload; menyimpan MY PLACE PHOTO | Foto tersimpan pada MY PLACE |
| 4 | Explorer | Mengisi caption, mengurutkan, menetapkan maksimal satu primary, atau menghapus foto | Galeri MY PLACE diperbarui |

**Exception:** MY PLACE tetap dapat disimpan tanpa foto. Perubahan foto tinjauan selama `REVIEW` tidak mengubah snapshot pengajuan. Foto tinjauan ikut terhapus bila MY PLACE dihapus; MASTER PLACE PHOTO yang bersumber darinya tetap ada.

---

## 13. Functional Requirements

Prioritas menggunakan MoSCoW: `Must`, `Should`, `Could`, `Won't (this phase)`.
Atribut data pada setiap sub-section merupakan **baseline konseptual**; tipe data, UID, index, dan constraint fisik ditentukan pada ERD/SRS.

### 13.1 USER & AUTH (`USR`)

#### Business Purpose
Mengelola akun yang dapat mengakses fitur Explorer dan Admin.

#### Data (Conceptual)
```text
users
-----
id
name
username            (unik, 4–20 karakter, case-insensitive; identifier login selain email)
email
password_hash       (hash; tidak menyimpan plain text)
role                (ADMIN / EXPLORER — reference value; mode aktif adalah state sesi, bukan atribut tersimpan)
preferred_language  (ID / EN, default ID)
must_change_password (default FALSE; TRUE setelah akun dibuat / password di-reset)
avatar NULL         (referensi file foto profil; opsional, hanya upload)
is_active
deleted_at NULL
deleted_by NULL
created_at
updated_at
```

```text
email_change_requests
---------------------
id
user_id
new_email
token               (hash, sekali pakai)
requested_by        (user ybs atau Admin)
expires_at          (waktu request + 24 jam)
confirmed_at NULL
cancelled_at NULL
created_at
```

#### Source
1. Admin awal: seed sistem.
2. Explorer: dibuat oleh Admin (Fase 1); self-registration (Fase 2).

#### Ownership
Akun dikelola Admin. Data personal milik Explorer tetap milik Explorer tersebut.

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-USR-001 | Sistem HARUS menyediakan login menggunakan **email atau username** beserta password untuk Explorer dan Admin. | Must | Explorer, Admin |
| FR-USR-002 | Admin HARUS dapat membuat akun Explorer. | Must | Admin |
| FR-USR-003 | Sistem TIDAK BOLEH mengizinkan pembuatan akun Admin melalui aplikasi pada Fase 1. | Must | Sistem |
| FR-USR-004 | Admin HARUS dapat mengubah data akun Explorer: name secara langsung, email melalui konfirmasi link ke email baru (FR-USR-019). | Must | Admin |
| FR-USR-005 | Admin HARUS dapat menonaktifkan dan mengaktifkan kembali akun Explorer. | Must | Admin |
| FR-USR-006 | Admin HARUS dapat melakukan soft delete akun Explorer. | Must | Admin |
| FR-USR-007 | Admin HARUS dapat mereset password Explorer dengan generate random password yang memuat huruf kecil, huruf besar, angka, dan simbol. | Must | Admin |
| FR-USR-008 | Admin HARUS dapat mengubah password Explorer secara manual. | Must | Admin |
| FR-USR-009 | Sistem TIDAK BOLEH mengizinkan login untuk user `INACTIVE` atau `DELETED`. | Must | Sistem |
| FR-USR-010 | Explorer DAPAT mendaftar sendiri melalui halaman Guest. | Won't (Fase 2) | Guest |
| FR-USR-011 | User HARUS dapat mengubah nama dan password sendiri; ubah password memerlukan password saat ini. | Must | Explorer, Admin |
| FR-USR-012 | Akun ADMIN HARUS dapat berpindah antara mode `ADMIN` dan mode `EXPLORER`. | Must | Admin |
| FR-USR-013 | Sistem HARUS menempatkan akun ADMIN pada mode `ADMIN` setiap kali login. | Must | Sistem |
| FR-USR-014 | Sistem HARUS hanya mengizinkan fungsi Admin pada mode `ADMIN` dan fungsi Explorer pada mode `EXPLORER`. | Must | Sistem |
| FR-USR-015 | Dalam mode `EXPLORER`, akun ADMIN HARUS dapat menggunakan seluruh FR Explorer atas data personal miliknya dengan skema yang sama seperti Explorer. | Must | Admin |
| FR-USR-016 | Sistem HARUS menampilkan indikator mode aktif kepada akun ADMIN. | Should | Sistem |
| FR-USR-017 | Sistem HARUS mewajibkan user mengganti password pada login berikutnya setelah akun dibuat atau password di-reset. | Must | Sistem |
| FR-USR-018 | User HARUS dapat mengajukan perubahan email miliknya sendiri. | Must | Explorer, Admin |
| FR-USR-019 | Sistem HARUS mengirim link konfirmasi sekali pakai ke email baru (berlaku 24 jam) dan hanya mengubah email setelah link diklik; email lama tetap dipakai sampai konfirmasi. Berlaku untuk perubahan oleh user maupun oleh Admin. | Must | Sistem |
| FR-USR-020 | Admin HARUS dapat me-restore akun Explorer `DELETED` menjadi `ACTIVE`. | Must | Admin |
| FR-USR-021 | User HARUS dapat memilih bahasa antarmuka (Bahasa Indonesia / English); default Bahasa Indonesia; tersimpan di profil. | Must | Explorer, Admin |
| FR-USR-022 | Guest DAPAT memilih bahasa antarmuka; pilihan disimpan per perangkat/browser. | Should | Guest |
| FR-USR-023 | Admin HARUS mengisi username saat membuat akun Explorer; username wajib unik. | Must | Admin |
| FR-USR-024 | User HARUS dapat mengganti username miliknya sendiri setelah login; perubahan berlaku langsung tanpa konfirmasi. | Must | Explorer, Admin |
| FR-USR-025 | User HARUS dapat mengunggah, mengganti, dan menghapus foto profil (avatar) miliknya sendiri setelah login. | Must | Explorer, Admin |
| FR-USR-026 | Sistem HARUS memvalidasi upload avatar terhadap `avatar.allowed_types` dan `avatar.max_size_mb` yang berlaku saat upload. | Must | Sistem |

#### Business Rules
- BR-USR-001: Email unik di seluruh user.
- BR-USR-002: Soft delete user TIDAK BOLEH menghapus data miliknya (MY PLACE, TAG, ITINERARY, VISIT, VISIT PHOTO, history).
- BR-USR-003: Data milik user soft-deleted TIDAK BOLEH dapat diakses melalui aplikasi.
- BR-USR-004: Soft delete user TIDAK BOLEH menghasilkan MASTER RELATION HISTORY massal.
- BR-USR-005: User soft-deleted selalu `is_active = FALSE`.
- BR-USR-006: Akun EXPLORER tidak memiliki mode `ADMIN` dan tidak dapat switch.
- BR-USR-007: Data personal akun ADMIN (dibuat dalam mode Explorer) tunduk pada seluruh aturan data personal Explorer.
- BR-USR-008: Email unik tanpa membedakan huruf besar/kecil, termasuk email milik user soft-deleted (tidak dapat dipakai ulang).
- BR-USR-009: Keunikan email baru diperiksa saat request dan saat konfirmasi.
- BR-USR-010: Request perubahan email baru membatalkan request sebelumnya yang belum dikonfirmasi.
- BR-USR-011: Restore user mengembalikan akses ke seluruh data miliknya dan tidak menghasilkan MASTER RELATION HISTORY.
- BR-USR-012: Bahasa hanya memengaruhi teks antarmuka; data yang diinput user tidak diterjemahkan.
- BR-USR-013: Sesi aktif user diakhiri saat user dinonaktifkan atau dihapus.
- BR-USR-014: Username unik tanpa membedakan huruf besar/kecil di seluruh user, termasuk username milik user soft-deleted (tidak dapat dipakai akun lain selama masih melekat pada akun tersebut).
- BR-USR-015: Username panjang 4–20 karakter, hanya huruf, angka, titik (`.`), dan garis bawah (`_`); disimpan dalam huruf kecil; tidak boleh mengandung `@`.
- BR-USR-016: Login menerima email atau username sebagai identifier; identifier yang mengandung `@` diperlakukan sebagai email.
- BR-USR-017: Username hanya dapat diganti oleh pemilik akun; Admin hanya menetapkan username saat membuat akun Explorer.
- BR-USR-018: Username lama yang telah diganti tidak dicadangkan dan dapat dipakai akun lain; perubahan username tidak menghasilkan history.
- BR-USR-019: Avatar opsional; satu user maksimal memiliki satu avatar.
- BR-USR-020: Avatar hanya dapat diunggah, diganti, atau dihapus oleh pemilik akun; Admin hanya dapat melihat avatar user dalam pengelolaan akun.
- BR-USR-021: Avatar hanya melalui upload file (tanpa external link); file avatar lama dihapus saat diganti/dihapus dan riwayatnya tidak disimpan.
- BR-USR-022: Metadata lokasi GPS (EXIF) dihapus dari file avatar saat upload.

#### Validation Rules
| Field | Aturan | Pesan Error (contoh) |
|---|---|---|
| name | Wajib; maks 255 karakter | "Nama wajib diisi" |
| username | Wajib; 4–20 karakter; hanya huruf, angka, `.`, `_`; unik tanpa membedakan huruf besar/kecil (termasuk soft-deleted) | "Username harus 4–20 karakter" / "Username hanya boleh berisi huruf, angka, titik, dan garis bawah" / "Username sudah digunakan" |
| email | Wajib, format email valid, unik | "Email sudah digunakan" |
| password | Wajib; minimal 8 karakter; memuat huruf kecil, huruf besar, angka, simbol | "Password tidak memenuhi ketentuan" |
| new_email | Format email valid; belum dipakai user lain (termasuk soft-deleted) | "Email sudah digunakan" |
| preferred_language | `ID` atau `EN` | — |
| avatar | Opsional; tipe file ∈ `avatar.allowed_types`; ukuran ≤ `avatar.max_size_mb` | "Format foto profil tidak didukung" / "Ukuran foto profil melebihi batas" |
| identifier login | Wajib; email atau username | "Email/username atau password salah" (generik) |

#### Deletion Behavior
Soft delete — lihat Section 17.

---

### 13.2 MASTER PLACE (`MST`)

#### Business Purpose
Menyediakan data tempat bersama yang terstandarisasi dan dikendalikan Admin.

#### Data (Conceptual)
```text
master_places
-------------
id
name
address
description NULL
latitude
longitude
google_place_id NULL
is_active
deleted_at NULL
deleted_by NULL
created_by
updated_by
created_at
updated_at
```

#### Source
1. CRUD manual oleh Admin.
2. Pengajuan MY PLACE oleh Explorer (P-02).
3. Admin menyalin data MY PLACE existing (P-04).
4. Penerimaan pengajuan dengan mereferensikan MASTER existing (tidak membuat MASTER baru).

Data sumber tidak disalin mentah: Admin mengubah **draft MASTER** sebelum disimpan, tanpa mengubah MY PLACE sumber.

#### Ownership
Bukan milik Explorer tertentu; shared reference data yang dikelola Admin.

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-MST-001 | Admin HARUS dapat membuat MASTER PLACE secara manual. | Must | Admin |
| FR-MST-002 | Admin HARUS dapat membuat MASTER PLACE dari data MY PLACE melalui draft MASTER yang dapat diubah. | Must | Admin |
| FR-MST-003 | Admin HARUS dapat mengubah data MASTER PLACE. | Must | Admin |
| FR-MST-004 | Admin HARUS dapat menetapkan satu atau banyak CATEGORY aktif pada MASTER PLACE. | Must | Admin |
| FR-MST-005 | Admin HARUS dapat menonaktifkan dan mengaktifkan kembali MASTER PLACE. | Must | Admin |
| FR-MST-006 | Admin HARUS dapat melakukan soft delete MASTER PLACE. | Must | Admin |
| FR-MST-007 | Sistem HARUS melakukan automatic UNREFER terhadap seluruh MY PLACE yang mereferensikan MASTER yang di-soft-delete. | Must | Sistem |
| FR-MST-008 | Explorer HARUS dapat melihat dan mencari MASTER PLACE `ACTIVE`. | Must | Explorer |
| FR-MST-009 | Sistem HARUS menampilkan rating MASTER PLACE sebagai calculated value (Section 16). | Must | Sistem |
| FR-MST-010 | Restore MASTER PLACE yang sudah soft-deleted. | Won't (Fase 1) | Admin |
| FR-MST-011 | Explorer HARUS dapat melihat (read-only) detail MASTER `INACTIVE` yang direferensikan MY PLACE miliknya, dengan label "Tidak aktif". | Must | Explorer |

#### Business Rules
- BR-MST-001: Perubahan MASTER PLACE TIDAK BOLEH mengubah data MY PLACE (tidak ada cascading business update).
- BR-MST-002: MASTER `INACTIVE` atau `DELETED` TIDAK BOLEH dipilih untuk referensi baru.
- BR-MST-003: Menonaktifkan MASTER TIDAK mengubah status MY PLACE yang mereferensikannya (tetap `REFERRED`) dan tidak menghasilkan history.
- BR-MST-004: Soft delete MASTER TIDAK BOLEH menghapus MY PLACE, CATEGORY MY PLACE, VISIT, TAG, FAVORITE, atau ITINERARY.
- BR-MST-005: Setiap automatic UNREFER menghasilkan satu history `UNREFERRED` per MY PLACE dengan reason "MASTER PLACE dihapus" dan performed_by = Admin yang menghapus.
- BR-MST-006: Perubahan biasa data MASTER TIDAK dicatat pada MASTER RELATION HISTORY.

#### Validation Rules
| Field | Aturan | Pesan Error (contoh) |
|---|---|---|
| name | Wajib; maks 255 karakter | "Nama tempat wajib diisi" |
| address | Wajib | "Alamat wajib diisi" |
| description | Opsional; maks 2.000 karakter | — |
| latitude | Wajib, -90..90 | "Latitude tidak valid" |
| longitude | Wajib, -180..180 | "Longitude tidak valid" |
| category | Opsional; jika diisi hanya CATEGORY aktif | — |

#### Deletion Behavior
Soft delete — lihat Section 17.

---

### 13.3 CATEGORY (`CAT`)

#### Business Purpose
Klasifikasi domain tempat yang konsisten antar user.

#### Data (Conceptual)
```text
categories
----------
id
name
slug
description NULL
is_active
sort_order
created_at
updated_at

master_place_categories (master_place_id, category_id)
my_place_categories     (my_place_id, category_id)
```

#### Source
Dibuat dan dikelola Admin. Seed awal: lihat Section 22.

#### Ownership
Shared domain data; dikelola Admin. Explorer hanya memilih.

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-CAT-001 | Admin HARUS dapat membuat, mengubah, dan mengurutkan (`sort_order`) CATEGORY. | Must | Admin |
| FR-CAT-002 | Admin HARUS dapat menonaktifkan dan mengaktifkan kembali CATEGORY. | Must | Admin |
| FR-CAT-003 | Sistem HARUS membuat `slug` dari name. | Must | Sistem |
| FR-CAT-004 | Explorer HARUS dapat memilih satu atau banyak CATEGORY aktif untuk MY PLACE miliknya. | Must | Explorer |
| FR-CAT-005 | Explorer TIDAK BOLEH membuat CATEGORY baru. | Must | Sistem |
| FR-CAT-006 | Sistem HARUS menampilkan effective category pada MY PLACE (Section 16). | Must | Sistem |
| FR-CAT-007 | Admin DAPAT menghapus permanen CATEGORY yang belum pernah dipakai (tanpa association MASTER maupun MY PLACE); CATEGORY yang sudah dipakai hanya dapat dinonaktifkan. | Should | Admin |

#### Business Rules
- BR-CAT-001: `slug` unik.
- BR-CAT-002: CATEGORY inactive tidak tersedia untuk pemilihan pada data baru; association existing tetap dipertahankan.
- BR-CAT-003: Penonaktifan CATEGORY TIDAK BOLEH merusak data existing.
- BR-CAT-004: CATEGORY MY PLACE tetap tersimpan ketika MY PLACE mereferensikan MASTER, dan TIDAK BOLEH di-update/dihapus secara destruktif oleh perubahan CATEGORY MASTER.
- BR-CAT-005: Sistem HARUS membedakan stored MY PLACE category, MASTER PLACE category, dan effective/display category.
- BR-CAT-006: CATEGORY bersifat opsional pada MY PLACE maupun MASTER PLACE.

#### Validation Rules
| Field | Aturan | Pesan Error (contoh) |
|---|---|---|
| name | Wajib; maks 255 karakter | "Nama kategori wajib diisi" |
| slug | Otomatis, `kebab-case`, unik | "Kategori sudah ada" |

Contoh slug: `Wisata Alam → wisata-alam`, `Tempat Makan → tempat-makan`.

#### Deletion Behavior
Lihat Section 17.

---

### 13.4 MY PLACE (`MYP`)

#### Business Purpose
Catatan tempat personal milik Explorer yang tetap independen dari MASTER PLACE.

#### Data (Conceptual)
```text
my_places
---------
id
user_id
master_place_id NULL
google_place_id NULL
name
address
description NULL
latitude
longitude
master_relation_status   (UNREFERRED / REVIEW / REJECTED / REFERRED)
visit_status             (PLAN / VISITED)
is_favorite              (default FALSE)
is_active                (default TRUE)
created_at
updated_at
```

#### Source
1. Hasil pencarian Google Maps/Google Places.
2. MASTER PLACE `ACTIVE` yang dipilih Explorer.
3. Input baru / pin manual Explorer.
4. Tempat baru yang ditambahkan dari ITINERARY (P-07).

#### Ownership
Setiap MY PLACE dimiliki tepat satu user (Explorer, atau akun ADMIN dalam mode Explorer). Admin dalam mode Admin read-only.

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-MYP-001 | Explorer HARUS dapat membuat MY PLACE dari hasil Google Places dengan prefill data. | Must | Explorer |
| FR-MYP-002 | Explorer HARUS dapat membuat MY PLACE dari MASTER PLACE `ACTIVE` dengan prefill data. | Must | Explorer |
| FR-MYP-003 | Explorer HARUS dapat membuat MY PLACE tanpa MASTER PLACE melalui input/pin manual. | Must | Explorer |
| FR-MYP-004 | Explorer HARUS dapat mengubah data prefill sebelum menyimpan. | Must | Explorer |
| FR-MYP-005 | Explorer HARUS dapat melihat dan mengubah MY PLACE miliknya. | Must | Explorer |
| FR-MYP-006 | Explorer HARUS dapat mengubah MY PLACE berstatus `REVIEW` tanpa mengubah snapshot pengajuan. | Must | Explorer |
| FR-MYP-007 | Sistem SEBAIKNYA memberikan warning jika MY PLACE terindikasi duplikat dengan MY PLACE milik user yang sama: `google_place_id` sama, MASTER sama, atau jarak koordinat ≤ 50 m. | Should | Sistem |
| FR-MYP-008 | Sistem HARUS menampilkan rating MY PLACE sebagai calculated value. | Must | Sistem |
| FR-MYP-009 | Admin HARUS dapat melihat MY PLACE Explorer secara read-only; secara default hanya MY PLACE `ACTIVE` yang tampil, dengan pilihan "tampilkan MY PLACE tidak aktif". | Must | Admin |
| FR-MYP-010 | Explorer HARUS dapat menghapus MY PLACE tanpa history relasi dan tanpa ITINERARY PLACE melalui konfirmasi hapus biasa. | Must | Explorer |
| FR-MYP-011 | Untuk MY PLACE yang memiliki history relasi dan/atau ITINERARY PLACE, sistem HARUS menampilkan dialog yang menjelaskan alasan dan merinci seluruh data terkait, serta mewajibkan checkbox persetujuan sebelum penghapusan. | Must | Sistem |
| FR-MYP-012 | Sistem TIDAK BOLEH menghapus MY PLACE sebagaimana FR-MYP-011 tanpa persetujuan; sistem HARUS menampilkan pesan yang jelas mengapa penghapusan tidak dapat dilakukan dan menyarankan menonaktifkan MY PLACE. | Must | Sistem |
| FR-MYP-013 | Explorer HARUS dapat menonaktifkan dan mengaktifkan kembali MY PLACE miliknya. | Must | Explorer |
| FR-MYP-014 | Sistem HARUS menyembunyikan MY PLACE `INACTIVE` dari list dan peta default, dan menampilkannya bila Explorer memilih filter status nonaktif. | Must | Sistem |
| FR-MYP-015 | Explorer HARUS dapat menambahkan foto tinjauan (opsional) saat membuat atau mengubah MY PLACE (13.19). | Must | Explorer |

#### Business Rules
- BR-MYP-001: Satu MY PLACE maksimal memiliki satu MASTER PLACE aktif pada satu waktu.
- BR-MYP-002: Satu MASTER PLACE dapat direferensikan banyak MY PLACE, termasuk beberapa MY PLACE milik Explorer yang sama.
- BR-MYP-003: Duplikasi MY PLACE tidak dilarang; sistem hanya memberi warning.
- BR-MYP-004: Perubahan MASTER PLACE TIDAK BOLEH mengubah MY PLACE.
- BR-MYP-005: Perubahan MY PLACE TIDAK BOLEH mengubah MASTER PLACE maupun snapshot pengajuan.
- BR-MYP-006: `master_relation_status`, `visit_status`, dan status aktif (`is_active`) adalah tiga state terpisah.
- BR-MYP-007: MY PLACE `INACTIVE` TIDAK BOLEH ditambahkan sebagai ITINERARY PLACE baru, dicatat VISIT baru, atau diajukan menjadi MASTER.
- BR-MYP-008: Menonaktifkan MY PLACE TIDAK mengubah MASTER reference, `master_relation_status`, history, VISIT, ITINERARY PLACE existing, TAG, CATEGORY, maupun FAVORITE.
- BR-MYP-009: VISIT dari MY PLACE `INACTIVE` TIDAK dihitung pada rating MASTER PLACE.
- BR-MYP-010: Penghapusan MY PLACE dengan persetujuan menghapus permanen VISIT, VISIT PHOTO, MY PLACE PHOTO, MASTER RELATION HISTORY, ITINERARY PLACE terkait, serta association TAG & CATEGORY; ITINERARY dan MASTER PLACE PHOTO tetap ada.
- BR-MYP-011: Business action relasi oleh Admin (RE-REFER, UNREFER, automatic UNREFER) tetap berlaku terhadap MY PLACE `INACTIVE`.
- BR-MYP-012: Foto tinjauan tidak wajib; MY PLACE dapat disimpan tanpa foto. Foto tinjauan tidak termasuk snapshot pengajuan.

#### Validation Rules
| Field | Aturan | Pesan Error (contoh) |
|---|---|---|
| name | Wajib; maks 255 karakter | "Nama tempat wajib diisi" |
| latitude | Wajib, -90..90 | "Latitude tidak valid" |
| longitude | Wajib, -180..180 | "Longitude tidak valid" |
| address | Opsional | — |
| description | Opsional; maks 2.000 karakter | — |
| category | Opsional; hanya CATEGORY aktif | — |
| master_place_id | NULL atau MASTER `ACTIVE` | "Master place tidak tersedia" |

#### Deletion Behavior
Hard delete — lihat Section 17.

---

### 13.5 MASTER RELATION & SUBMISSION (`REL`)

#### Business Purpose
Mengelola proses standardisasi MY PLACE ke MASTER PLACE secara terkendali dan dapat ditelusuri.

#### Data (Conceptual)
Menggunakan `my_places.master_place_id`, `my_places.master_relation_status`, dan `my_place_master_histories` (Section 18).

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-REL-001 | Explorer HARUS dapat mengajukan MY PLACE berstatus `UNREFERRED` menjadi MASTER PLACE. | Must | Explorer |
| FR-REL-002 | Explorer HARUS dapat mengajukan kembali MY PLACE berstatus `REJECTED`. | Must | Explorer |
| FR-REL-003 | Sistem TIDAK BOLEH mengizinkan pengajuan untuk MY PLACE berstatus `REVIEW`, `REFERRED`, atau `INACTIVE`. | Must | Sistem |
| FR-REL-004 | Sistem TIDAK BOLEH menyediakan pembatalan pengajuan `REVIEW`. | Must | Sistem |
| FR-REL-005 | Sistem HARUS menyimpan snapshot data MY PLACE pada setiap pengajuan. | Must | Sistem |
| FR-REL-006 | Explorer HARUS dapat melihat status pengajuan dan alasan penolakan. | Must | Explorer |
| FR-REL-007 | Admin HARUS dapat melihat daftar pengajuan `REVIEW` beserta snapshot-nya. | Must | Admin |
| FR-REL-008 | Admin HARUS dapat menerima pengajuan dengan membuat MASTER baru dari draft snapshot. | Must | Admin |
| FR-REL-009 | Admin HARUS dapat menerima pengajuan dengan mereferensikan MASTER `ACTIVE` existing. | Must | Admin |
| FR-REL-010 | Admin HARUS dapat menolak pengajuan dengan alasan wajib. | Must | Admin |
| FR-REL-011 | Admin HARUS dapat mereferensikan MY PLACE `UNREFERRED`/`REVIEW`/`REJECTED` ke MASTER `ACTIVE` atas inisiatif. | Must | Admin |
| FR-REL-012 | Admin HARUS dapat memindahkan referensi MY PLACE `REFERRED` ke MASTER `ACTIVE` lain (RE-REFER). | Must | Admin |
| FR-REL-013 | Admin HARUS dapat melepas referensi MY PLACE `REFERRED` (UNREFER). | Must | Admin |
| FR-REL-014 | Sistem HARUS mencatat history untuk setiap business action relasi. | Must | Sistem |

#### Business Rules
- BR-REL-001: MY PLACE berstatus `PLAN` maupun `VISITED` dapat diajukan.
- BR-REL-002: Admin mereview **snapshot pengajuan**, bukan data MY PLACE terkini.
- BR-REL-003: Proses review TIDAK BOLEH mengubah data MY PLACE.
- BR-REL-004: Satu perpindahan MASTER A → B adalah satu business event dan menghasilkan satu history `RE-REFER`.
- BR-REL-005: Tindakan Admin pada relasi tidak memerlukan persetujuan Explorer.
- BR-REL-006: Workflow MASTER relation TIDAK mengubah `visit_status`.
- BR-REL-007: Admin boleh me-review pengajuan MY PLACE miliknya sendiri (dibuat dalam mode Explorer).
- BR-REL-008: MY PLACE yang dibuat dari MASTER `ACTIVE` langsung berstatus `REFERRED` dan menghasilkan history `REFERRED` dengan performed_by = pembuat MY PLACE.
- BR-REL-009: Saat Admin membuat MASTER dari MY PLACE, referensi MY PLACE sumber hanya berubah jika Admin mencentang "Referensikan MY PLACE sumber" (P-04).

---

### 13.6 FAVORITE (`FAV`)

#### Business Purpose
Penanda personal bahwa MY PLACE merupakan tempat favorit.

#### Data (Conceptual)
```text
my_places.is_favorite   BOOLEAN, NOT NULL, default FALSE
```
Tidak ada tabel FAVORITE terpisah.

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-FAV-001 | Explorer HARUS dapat mengaktifkan/menonaktifkan FAVORITE pada MY PLACE miliknya. | Must | Explorer |
| FR-FAV-002 | Explorer HARUS dapat memfilter MY PLACE berdasarkan FAVORITE. | Must | Explorer |

#### Business Rules
- BR-FAV-001: Default FAVORITE = OFF.
- BR-FAV-002: FAVORITE tidak memengaruhi MASTER PLACE, Explorer lain, CATEGORY, TAG, VISIT, atau ITINERARY, dan tidak dipengaruhi oleh perubahan MASTER relation.
- BR-FAV-003: FAVORITE bukan CATEGORY, TAG, maupun VISIT STATUS.
- BR-FAV-004: Perubahan FAVORITE tidak membutuhkan history.

---

### 13.7 TAG (`TAG`)

#### Business Purpose
Grouping personal yang dibuat bebas oleh Explorer di luar CATEGORY (mis. "Wajib Coba", "Dengan Keluarga", "Work From Cafe", "Hidden Gem").

#### Data (Conceptual)
```text
tags
----
id
user_id
name
slug
color          (#RRGGBB, nilai aktual)
created_at
updated_at

my_place_tags (my_place_id, tag_id)
```

#### Ownership
Sepenuhnya milik Explorer pembuat (`USER 1 ── N TAG`).

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-TAG-001 | Explorer HARUS dapat membuat, mengubah, dan menghapus TAG miliknya. | Must | Explorer |
| FR-TAG-002 | Explorer HARUS dapat memilih warna TAG dari preset aktif atau custom color. | Must | Explorer |
| FR-TAG-003 | Explorer HARUS dapat memberikan satu atau banyak TAG pada MY PLACE miliknya. | Must | Explorer |
| FR-TAG-004 | Sistem HARUS membuat `slug` TAG dari name. | Must | Sistem |
| FR-TAG-005 | Explorer HARUS dapat memfilter MY PLACE berdasarkan TAG. | Must | Explorer |

#### Business Rules
- BR-TAG-001: TAG milik User A TIDAK BOLEH digunakan pada MY PLACE milik User B.
- BR-TAG-002: Satu TAG dapat digunakan pada banyak MY PLACE milik owner TAG.
- BR-TAG-003: `name` dan `slug` unik dalam scope Explorer.
- BR-TAG-004: TAG tidak bersifat global dan bukan CATEGORY.
- BR-TAG-005: TAG hanya memiliki lifecycle CRUD; tidak ada workflow/history.

#### Validation Rules
| Field | Aturan | Pesan Error (contoh) |
|---|---|---|
| name | Wajib; maks 255 karakter; unik per Explorer tanpa membedakan huruf besar/kecil | "Tag sudah ada" |
| slug | Otomatis, `kebab-case`, unik per Explorer | — |
| color | Wajib, format `#RRGGBB` | "Format warna tidak valid" |

#### Deletion Behavior
Hard delete — lihat Section 17.

---

### 13.8 TAG COLOR REFERENCE (`CLR`)

#### Business Purpose
Menyediakan daftar preset warna bersama untuk TAG.

#### Data (Conceptual)
```text
ref_tag_colors
--------------
id
name
hex_code
sort_order
is_active
```

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-CLR-001 | Sistem HARUS menyediakan daftar preset warna aktif untuk pemilihan warna TAG. | Must | Sistem |
| FR-CLR-002 | Admin HARUS dapat menambah, mengubah, mengurutkan, dan menonaktifkan preset warna melalui UI Admin. | Must | Admin |

Pengelolaan dilakukan melalui UI Admin (mode Admin).

#### Business Rules
- BR-CLR-001: TAG TIDAK memiliki `color_id`/FK ke `ref_tag_colors`; TAG menyimpan nilai warna aktual.
- BR-CLR-002: Preset inactive tidak tersedia untuk penggunaan baru; TAG existing tetap mempertahankan warnanya.
- BR-CLR-003: Perubahan/penonaktifan preset TIDAK BOLEH mengubah atau menghapus `tags.color` existing.
- BR-CLR-004: Penambahan warna dilakukan melalui data reference tanpa perubahan struktur database.
- BR-CLR-005: Preset adalah seed data, bukan enum/hard-coded business constraint.

```text
ref_tag_colors ──(reference / preset)──▶ TAG.color        ✔
tags.color_id ──FK──▶ ref_tag_colors.id                     ✘ (dilarang)
```

---

### 13.9 VISIT (`VST`)

#### Business Purpose
Mencatat kejadian kunjungan aktual ke MY PLACE dan menjadi sumber rating.

#### Data (Conceptual)
```text
visits
------
id
my_place_id
itinerary_id NULL
itinerary_place_id NULL
visited_at
rating NULL          (1..5)
note NULL
created_at
updated_at
```

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-VST-001 | Explorer HARUS dapat mencatat VISIT pada MY PLACE miliknya tanpa ITINERARY. | Must | Explorer |
| FR-VST-002 | Explorer HARUS dapat mencatat VISIT sebagai planned place visit (mereferensikan ITINERARY PLACE). | Must | Explorer |
| FR-VST-003 | Explorer HARUS dapat mencatat unexpected visit dalam konteks ITINERARY tanpa ITINERARY PLACE. | Must | Explorer |
| FR-VST-004 | Explorer HARUS dapat memberi rating 1–5 atau mengosongkan rating. | Must | Explorer |
| FR-VST-005 | Explorer HARUS dapat mengubah dan menghapus VISIT miliknya. | Must | Explorer |
| FR-VST-006 | Sistem HARUS memperbarui `visit_status` MY PLACE berdasarkan keberadaan VISIT. | Must | Sistem |

#### Business Rules
- BR-VST-001: VISIT selalu terkait satu MY PLACE dan TIDAK BOLEH dipindahkan ke MY PLACE lain.
- BR-VST-002: Satu MY PLACE dapat memiliki banyak VISIT.
- BR-VST-003: Urutan actual menggunakan `visited_at`; VISIT TIDAK memiliki `sequence`.
- BR-VST-004: Rating hanya melekat pada VISIT; MY PLACE dan MASTER PLACE tidak menerima rating langsung.
- BR-VST-005: `visited_at` TIDAK dibatasi oleh `start_date`/`end_date` ITINERARY.
- BR-VST-006: Jika `itinerary_place_id` diisi, ITINERARY PLACE tersebut HARUS menunjuk MY PLACE yang sama dan `itinerary_id` HARUS sesuai.
- BR-VST-007: ITINERARY pada konteks VISIT HARUS milik owner MY PLACE yang sama.
- BR-VST-008: Tidak ada tabel khusus untuk unexpected visit.
- BR-VST-009: VISIT baru TIDAK BOLEH dibuat untuk MY PLACE `INACTIVE`; VISIT existing tetap dapat dilihat.

#### Validation Rules
| Field | Aturan | Pesan Error (contoh) |
|---|---|---|
| visited_at | Wajib; TIDAK BOLEH melebihi waktu saat ini | "Tanggal kunjungan tidak boleh di masa depan" |
| rating | NULL atau bilangan bulat 1..5 | "Rating harus 1–5" |
| note | Opsional; maks 2.000 karakter | — |

#### Deletion Behavior
Hard delete — lihat Section 17.

---

### 13.10 VISIT PHOTO (`VPH`)

#### Business Purpose
Dokumentasi foto kejadian kunjungan.

#### Data (Conceptual)
```text
visit_photos
------------
id
visit_id
file_reference       (mekanisme storage ditentukan SRS)
sort_order
is_primary
created_at
updated_at
```

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-VPH-001 | Explorer HARUS dapat menambahkan satu atau banyak foto pada VISIT miliknya. | Must | Explorer |
| FR-VPH-002 | Explorer HARUS dapat menghapus dan mengurutkan VISIT PHOTO. | Must | Explorer |
| FR-VPH-003 | Explorer DAPAT menandai maksimal satu VISIT PHOTO sebagai primary. | Should | Explorer |

#### Business Rules
- BR-VPH-001: VISIT tidak wajib memiliki foto.
- BR-VPH-002: Maksimal satu primary photo per VISIT; primary opsional.
- BR-VPH-003: VISIT PHOTO tetap data personal walaupun dijadikan sumber MASTER PLACE PHOTO.
- BR-VPH-004: Menghapus VISIT PHOTO TIDAK BOLEH menghapus MASTER PLACE PHOTO yang bersumber darinya.

#### Validation Rules
Tipe file, ukuran maksimum, dan jumlah maksimum foto per VISIT mengikuti konfigurasi aplikasi (13.17). Metadata lokasi GPS (EXIF) dihapus saat upload.

---

### 13.11 MASTER PLACE PHOTO (`MPH`)

#### Business Purpose
Foto bersama untuk MASTER PLACE.

#### Data (Conceptual)
```text
master_place_photos
-------------------
id
master_place_id
source_visit_photo_id NULL
source_my_place_photo_id NULL
file_reference
sort_order
is_primary
created_by
created_at
updated_at
```

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-MPH-001 | Admin HARUS dapat mengunggah satu atau banyak foto MASTER PLACE secara langsung (tanpa mengambil dari VISIT PHOTO atau MY PLACE PHOTO). | Must | Admin |
| FR-MPH-002 | Admin HARUS dapat menjadikan VISIT PHOTO sebagai MASTER PLACE PHOTO (record independen). | Must | Admin |
| FR-MPH-003 | Admin HARUS dapat menghapus, mengurutkan, dan menetapkan primary MASTER PLACE PHOTO. | Must | Admin |
| FR-MPH-004 | Admin HARUS dapat menjadikan MY PLACE PHOTO (foto tinjauan) sebagai MASTER PLACE PHOTO (record independen). | Must | Admin |

#### Business Rules
- BR-MPH-001: Maksimal satu primary photo per MASTER PLACE; primary opsional.
- BR-MPH-002: Explorer TIDAK BOLEH membuat MASTER PLACE PHOTO secara langsung.
- BR-MPH-003: MASTER PLACE PHOTO bukan alias VISIT PHOTO maupun MY PLACE PHOTO; lifecycle dan storage reference independen.
- BR-MPH-004: Menghapus VISIT PHOTO, MY PLACE PHOTO, VISIT, MY PLACE, atau user TIDAK BOLEH menghapus MASTER PLACE PHOTO.
- BR-MPH-005: VISIT PHOTO dan MY PLACE PHOTO yang dapat dijadikan MASTER PLACE PHOTO hanya berasal dari MY PLACE yang saat ini mereferensikan MASTER tersebut.
- BR-MPH-006: Tipe, ukuran, dan jumlah MASTER PLACE PHOTO mengikuti konfigurasi aplikasi (13.17).
- BR-MPH-007: Satu MASTER PLACE PHOTO memiliki paling banyak satu sumber (VISIT PHOTO **atau** MY PLACE PHOTO).

---

### 13.12 ITINERARY & ITINERARY PLACE (`ITN`)

#### Business Purpose
Rencana perjalanan milik Explorer beserta daftar planned stop.

#### Data (Conceptual)
```text
itineraries
-----------
id
user_id
name
description NULL
start_date NULL
end_date NULL
created_at
updated_at

itinerary_places
----------------
id
itinerary_id
my_place_id
sequence
planned_date NULL
planned_time NULL
created_at
updated_at
```

#### Source
ITINERARY PLACE berasal dari MY PLACE existing milik Explorer atau MY PLACE baru yang dibuat saat menyusun ITINERARY (status `PLAN`).

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-ITN-001 | Explorer HARUS dapat membuat, mengubah, dan menghapus ITINERARY miliknya. | Must | Explorer |
| FR-ITN-002 | Explorer HARUS dapat menambahkan MY PLACE existing miliknya sebagai ITINERARY PLACE. | Must | Explorer |
| FR-ITN-003 | Explorer HARUS dapat menambahkan tempat baru ke ITINERARY; sistem membuat MY PLACE baru berstatus `PLAN`. | Must | Explorer |
| FR-ITN-004 | Explorer HARUS dapat mengatur `sequence`, `planned_date`, dan `planned_time` ITINERARY PLACE. | Must | Explorer |
| FR-ITN-005 | Explorer HARUS dapat menghapus ITINERARY PLACE. | Must | Explorer |

#### Business Rules
- BR-ITN-001: ITINERARY hanya dapat menggunakan MY PLACE milik owner ITINERARY; ITINERARY PLACE baru hanya untuk MY PLACE `ACTIVE`.
- BR-ITN-002: ITINERARY dan ITINERARY PLACE tidak mereferensikan MASTER PLACE secara langsung dan tidak wajib berelasi dengan MASTER.
- BR-ITN-003: Satu MY PLACE boleh muncul lebih dari satu kali dalam satu ITINERARY; setiap occurrence memiliki `sequence` sendiri.
- BR-ITN-004: `start_date`, `end_date`, `planned_date`, `planned_time` hanya informasi perencanaan.
- BR-ITN-005: ITINERARY tidak memiliki lifecycle status pada Fase 1.
- BR-ITN-006: ITINERARY PLACE tidak memiliki factual/visit note; informasi aktual dicatat pada VISIT.
- BR-ITN-007: ITINERARY PLACE tidak wajib menghasilkan VISIT.

#### Validation Rules
| Field | Aturan | Pesan Error (contoh) |
|---|---|---|
| name | Wajib; maks 255 karakter | "Nama itinerary wajib diisi" |
| start_date / end_date | Opsional; jika keduanya diisi, `end_date ≥ start_date` | "Tanggal selesai tidak boleh sebelum tanggal mulai" |
| sequence | Wajib, bilangan bulat positif, unik dalam satu ITINERARY; diurutkan ulang otomatis saat stop ditambah/dihapus/dipindah | — |
| my_place_id | MY PLACE milik owner ITINERARY | "Tempat tidak valid" |

#### Deletion Behavior
Hard delete — lihat Section 17.

---

### 13.13 ROUTE VISUALIZATION (`RTE`)

| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-RTE-001 | Sistem HARUS menampilkan planned route ITINERARY berdasarkan urutan `sequence` ITINERARY PLACE. | Must | Explorer |
| FR-RTE-002 | Sistem HARUS menampilkan actual visit ITINERARY berdasarkan urutan `visited_at` VISIT yang memiliki itinerary context. | Must | Explorer |
| FR-RTE-003 | Unexpected visit HARUS ditampilkan sebagai bagian dari actual visit ITINERARY. | Must | Sistem |
| FR-RTE-004 | Planned route dan actual visit HARUS dapat dibedakan secara visual. | Must | Sistem |

- BR-RTE-001: Tidak ada real-time GPS tracking dan penyimpanan polyline actual route pada Fase 1.

### 13.14 MAP & SEARCH (`MAP`)

| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-MAP-001 | Explorer HARUS dapat mencari tempat melalui Google Maps/Google Places. | Must | Explorer |
| FR-MAP-002 | Explorer HARUS dapat menentukan lokasi dengan pin manual pada peta. | Must | Explorer |
| FR-MAP-003 | Sistem HARUS menampilkan MASTER PLACE `ACTIVE` pada hasil pencarian/peta. | Must | Sistem |
| FR-MAP-004 | Sistem HARUS menampilkan MY PLACE milik Explorer pada peta. | Must | Explorer |
| FR-MAP-005 | Sistem HARUS menggunakan lokasi perangkat saat ini sebagai titik tengah peta ketika peta dibuka (dengan izin lokasi dari pengguna). | Must | Sistem |
| FR-MAP-006 | Explorer HARUS tetap dapat menempatkan pin secara bebas di lokasi mana pun pada peta, tidak terbatas pada lokasi perangkat. | Must | Explorer |
| FR-MAP-007 | Jika izin lokasi ditolak/tidak tersedia, sistem TIDAK BOLEH menampilkan pin lokasi perangkat; peta HARUS tetap dapat digunakan untuk pencarian dan pin manual. | Must | Sistem |

- BR-MAP-001: Lokasi perangkat hanya digunakan sebagai titik tengah peta dan tidak disimpan, kecuali Explorer memilihnya sebagai pin MY PLACE.
- BR-MAP-002: Tanpa izin lokasi, tidak ada pin lokasi perangkat yang ditampilkan.

### 13.15 FILTER (`FLT`)

| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-FLT-001 | Explorer HARUS dapat memfilter MY PLACE berdasarkan effective CATEGORY, TAG, FAVORITE, VISIT STATUS, MASTER RELATION STATUS, dan status aktif/nonaktif (default: hanya `ACTIVE`). | Must | Explorer |
| FR-FLT-002 | Explorer HARUS dapat mencari MY PLACE berdasarkan nama. | Should | Explorer |

### 13.16 GUEST ACCESS (`GST`)

| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-GST-001 | Guest HARUS dapat melihat peta berisi MASTER PLACE `ACTIVE` tanpa login. | Must | Guest |
| FR-GST-002 | Guest HARUS dapat melihat detail MASTER PLACE: name, address, description, koordinat, CATEGORY aktif, rating MASTER, MASTER PLACE PHOTO. | Must | Guest |
| FR-GST-003 | Sistem TIDAK BOLEH menampilkan MY PLACE, MY PLACE PHOTO, VISIT, VISIT PHOTO, TAG, ITINERARY, atau data user (termasuk avatar) kepada Guest. | Must | Sistem |

### 13.17 APP CONFIGURATION — Aturan Foto & Avatar (`CFG`)

#### Business Purpose
Menyimpan aturan foto dan avatar sebagai konfigurasi yang dapat diubah Admin tanpa perubahan kode.

#### Data (Conceptual)
```text
app_settings
------------
id
key
value
description NULL
updated_by
updated_at
```

| key | Nilai Default | Keterangan |
|---|---|---|
| `photo.allowed_types` | `jpg, png, webp` | Tipe file gambar yang diizinkan |
| `photo.max_size_mb` | `5` | Ukuran maksimum per file (MB) |
| `photo.max_per_visit` | `10` | Jumlah maksimum VISIT PHOTO per VISIT |
| `photo.max_per_master_place` | `20` | Jumlah maksimum MASTER PLACE PHOTO per MASTER |
| `photo.max_per_my_place` | `10` | Jumlah maksimum MY PLACE PHOTO (foto tinjauan) per MY PLACE |
| `avatar.allowed_types` | `jpg, png, webp` | Tipe file foto profil yang diizinkan |
| `avatar.max_size_mb` | `5` | Ukuran maksimum file foto profil (MB) |

Tipe file dan ukuran maksimum MY PLACE PHOTO mengikuti `photo.allowed_types` dan `photo.max_size_mb`. Default `avatar.*` disamakan dengan nilai `photo.*` saat ini, tetapi dikelola terpisah.

#### Ownership
Shared configuration; hanya Admin (mode Admin) yang dapat mengubah.

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-CFG-001 | Admin HARUS dapat melihat dan mengubah konfigurasi aturan foto dan avatar. | Must | Admin |
| FR-CFG-002 | Sistem HARUS memvalidasi setiap upload VISIT PHOTO, MY PLACE PHOTO, MASTER PLACE PHOTO, dan avatar terhadap konfigurasi yang berlaku saat upload. | Must | Sistem |
| FR-CFG-003 | Sistem HARUS menghapus metadata lokasi GPS (EXIF) dari foto saat upload. | Must | Sistem |

#### Business Rules
- BR-CFG-001: Perubahan konfigurasi berlaku untuk upload berikutnya; foto dan avatar yang sudah ada tidak terpengaruh.
- BR-CFG-002: Jika jumlah foto existing ≥ batas baru, foto existing tetap ada dan upload baru ditolak sampai jumlahnya di bawah batas.
- BR-CFG-003: Aturan foto dan avatar TIDAK BOLEH di-hard-code di aplikasi.
- BR-CFG-004: Riwayat perubahan konfigurasi tidak disimpan; hanya `updated_by` dan `updated_at` terakhir.

#### Validation Rules
| Field | Aturan | Pesan Error (contoh) |
|---|---|---|
| photo.allowed_types | Minimal satu tipe file gambar | "Pilih minimal satu tipe file" |
| photo.max_size_mb | Bilangan > 0 | "Ukuran maksimum tidak valid" |
| photo.max_per_visit / photo.max_per_my_place / photo.max_per_master_place | Bilangan bulat ≥ 1 | "Jumlah maksimum tidak valid" |
| avatar.allowed_types | Minimal satu tipe file gambar | "Pilih minimal satu tipe file" |
| avatar.max_size_mb | Bilangan > 0 | "Ukuran maksimum tidak valid" |

### 13.18 BACKUP (`BKP`)

#### Business Purpose
Menyediakan salinan data dan file foto untuk pemulihan bila terjadi kehilangan data.

#### Data (Conceptual)
```text
backup_logs
-----------
id
triggered_by
trigger_type        (MANUAL; SCHEDULED pada Fase 2)
status              (RUNNING / SUCCESS / FAILED)
file_reference NULL
file_size NULL
error_message NULL
started_at
finished_at NULL
```

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-BKP-001 | Admin HARUS dapat menjalankan backup manual yang mencakup database dan file foto. | Must | Admin |
| FR-BKP-002 | Sistem HARUS mencatat riwayat backup (waktu mulai/selesai, pelaksana, status, ukuran). | Must | Sistem |
| FR-BKP-003 | Admin HARUS dapat mengunduh file backup berstatus `SUCCESS`. | Must | Admin |
| FR-BKP-004 | Sistem TIDAK BOLEH menyediakan restore backup melalui aplikasi; restore dilakukan tim teknis. | Must | Sistem |
| FR-BKP-005 | Sistem DAPAT menjalankan backup terjadwal otomatis. | Won't (Fase 2) | Sistem |

#### Business Rules
- BR-BKP-001: Hanya satu backup berstatus `RUNNING` pada satu waktu.
- BR-BKP-002: File backup memuat data pribadi; hanya Admin yang dapat mengakses/mengunduhnya.
- BR-BKP-003: Riwayat backup tidak dapat diedit melalui aplikasi.
- BR-BKP-004: Lokasi penyimpanan, retensi file backup, serta RPO/RTO: `TBD` (OI-32).

### 13.19 MY PLACE PHOTO — Foto Tinjauan (`MPP`)

#### Business Purpose
Memberikan informasi visual atau penanda pada MY PLACE yang diisi Explorer secara opsional, terpisah dari dokumentasi kunjungan (VISIT PHOTO).

#### Data (Conceptual)
```text
my_place_photos
---------------
id
my_place_id
storage_type        (UPLOAD / EXTERNAL / S3 — sama dengan VISIT PHOTO)
file_reference      (file upload / external link; mekanisme storage ditentukan SRS)
caption NULL
sort_order
is_primary
created_at
updated_at
```

#### Ownership
Personal; owner = owner MY PLACE. Admin (mode Admin) read-only untuk kurasi.

#### Functional Requirements
| ID | Requirement | Prioritas | Role |
|---|---|---|---|
| FR-MPP-001 | Explorer HARUS dapat menambahkan satu atau banyak foto tinjauan (upload file atau external link) saat membuat atau mengubah MY PLACE miliknya. | Must | Explorer |
| FR-MPP-002 | Explorer HARUS dapat menghapus, mengurutkan, dan mengubah caption MY PLACE PHOTO. | Must | Explorer |
| FR-MPP-003 | Explorer DAPAT menandai maksimal satu MY PLACE PHOTO sebagai primary. | Should | Explorer |
| FR-MPP-004 | Admin HARUS dapat melihat MY PLACE PHOTO Explorer secara read-only untuk kurasi MASTER PLACE PHOTO (FR-MPH-004). | Must | Admin |

#### Business Rules
- BR-MPP-001: Foto tinjauan bersifat opsional; MY PLACE tidak wajib memiliki foto.
- BR-MPP-002: Satu MY PLACE dapat memiliki banyak MY PLACE PHOTO, dibatasi `photo.max_per_my_place`.
- BR-MPP-003: Maksimal satu primary photo per MY PLACE; primary opsional.
- BR-MPP-004: Aturan penyimpanan sama dengan VISIT PHOTO: `UPLOAD`, `EXTERNAL` (link), atau `S3`.
- BR-MPP-005: MY PLACE PHOTO tetap data personal walaupun dijadikan sumber MASTER PLACE PHOTO; menghapusnya TIDAK BOLEH menghapus MASTER PLACE PHOTO.
- BR-MPP-006: MY PLACE PHOTO tidak termasuk snapshot pengajuan MASTER dan tidak mengubah data MASTER secara otomatis.
- BR-MPP-007: MY PLACE PHOTO ikut terhapus permanen bila MY PLACE dihapus; keberadaannya tidak menambah syarat DELETE CONSENT.

#### Validation Rules
Tipe file dan ukuran maksimum mengikuti `photo.allowed_types` dan `photo.max_size_mb`; jumlah maksimum per MY PLACE mengikuti `photo.max_per_my_place` (13.17). External link wajib berupa URL valid. Metadata lokasi GPS (EXIF) dihapus dari file upload.

#### Deletion Behavior
Hard delete oleh owner — lihat Section 17.

---

## 14. State / Lifecycle Rules

> Setiap state machine berdiri sendiri dan TIDAK BOLEH dicampur dalam satu kolom status.

### 14.1 MASTER RELATION STATUS (MY PLACE)

| State | Makna |
|---|---|
| `UNREFERRED` | Tidak memiliki MASTER reference |
| `REVIEW` | Pengajuan sedang ditinjau; belum memiliki MASTER reference |
| `REJECTED` | Pengajuan ditolak; belum memiliki MASTER reference; dapat diajukan kembali |
| `REFERRED` | Memiliki MASTER reference |

**Initial state:** `UNREFERRED`, atau `REFERRED` (+ history `REFERRED`) jika MY PLACE dibuat dari MASTER `ACTIVE`.

| From | To | Trigger (Action History) | Aktor | Kondisi |
|---|---|---|---|---|
| UNREFERRED | REVIEW | SUBMIT (`SUBMITTED`) | Explorer (owner) | Snapshot disimpan |
| REJECTED | REVIEW | RESUBMIT (`SUBMITTED`) | Explorer (owner) | Snapshot baru disimpan |
| REVIEW | REFERRED | APPROVE — MASTER baru (`REFERRED`) | Admin | MASTER dibuat dari draft snapshot |
| REVIEW | REFERRED | APPROVE — MASTER existing (`REFERRED`) | Admin | MASTER `ACTIVE` |
| REVIEW | REJECTED | REJECT (`REJECTED`) | Admin | Alasan wajib |
| (baru) | REFERRED | CREATE dari MASTER (`REFERRED`) | Explorer (owner) | MASTER `ACTIVE` |
| UNREFERRED / REJECTED / REVIEW | REFERRED | REFER inisiatif, atau checkbox "Referensikan MY PLACE sumber" saat membuat MASTER (`REFERRED`) | Admin | MASTER `ACTIVE` |
| REFERRED | REFERRED | Checkbox "Referensikan MY PLACE sumber" saat membuat MASTER baru (`RE-REFER`) | Admin | MASTER baru ≠ MASTER saat ini |
| REFERRED | REFERRED | RE-REFER (`RE-REFER`) | Admin | MASTER target `ACTIVE` & berbeda |
| REFERRED | UNREFERRED | UNREFER manual (`UNREFERRED`) | Admin | — |
| REFERRED | UNREFERRED | AUTO UNREFER (`UNREFERRED`) | Sistem (actor = Admin yang menghapus) | MASTER di-soft-delete |

**Transisi terlarang:**
- `REVIEW → UNREFERRED` (pembatalan pengajuan).
- `REVIEW → REVIEW` / `REFERRED → REVIEW` (pengajuan ulang tanpa ditolak).
- Perubahan relasi oleh Explorer selain CREATE dari MASTER dan SUBMIT/RESUBMIT.
- SUBMIT/RESUBMIT untuk MY PLACE `INACTIVE`.
- Refer/RE-REFER ke MASTER `INACTIVE`/`DELETED`.

```text
                 SUBMIT                    APPROVE / REFER
UNREFERRED ─────────────▶ REVIEW ─────────────────────────▶ REFERRED ◀──┐
    ▲  │                  │  ▲                                  │  │     │ RE-REFER
    │  │          REJECT  │  │ RESUBMIT                         │  └─────┘
    │  │                  ▼  │                                  │
    │  │                REJECTED ──────── REFER (Admin) ───────▶│
    │  └──────────────────────────── REFER (Admin) ────────────▶│
    │                                                           │
    └──────────────── UNREFER (manual / MASTER dihapus) ────────┘
```

`RE-REFER` adalah action history, bukan state.

### 14.2 VISIT STATUS (MY PLACE)

| State | Makna |
|---|---|
| `PLAN` | MY PLACE belum memiliki VISIT |
| `VISITED` | MY PLACE memiliki ≥ 1 VISIT |

| From | To | Trigger | Aktor |
|---|---|---|---|
| PLAN | VISITED | VISIT pertama dibuat | Sistem |
| VISITED | PLAN | VISIT terakhir dihapus | Sistem |

**Initial state:** `PLAN`. State diturunkan oleh sistem, tidak diubah manual, dan tidak dipengaruhi workflow MASTER relation.

### 14.3 FAVORITE

```text
OFF ⇄ ON        (default OFF, tanpa history)
```

### 14.4 MASTER PLACE Lifecycle

| State | Representasi Konseptual | Makna |
|---|---|---|
| `ACTIVE` | `is_active = TRUE`, `deleted_at = NULL` | Tersedia untuk referensi baru & tampil ke Guest |
| `INACTIVE` | `is_active = FALSE`, `deleted_at = NULL` | Tidak tersedia untuk referensi baru, tidak tampil ke Guest; referensi existing tetap |
| `DELETED` | `is_active = FALSE`, `deleted_at ≠ NULL` | Soft deleted; seluruh referensi dilepas otomatis |

| From | To | Trigger | Aktor | Dampak |
|---|---|---|---|---|
| (baru) | ACTIVE | CREATE | Admin | — |
| ACTIVE | INACTIVE | INACTIVATE | Admin | MY PLACE tetap `REFERRED` |
| INACTIVE | ACTIVE | ACTIVATE | Admin | — |
| ACTIVE / INACTIVE | DELETED | DELETE | Admin | AUTO UNREFER + history |

**Transisi terlarang:** `DELETED → ACTIVE/INACTIVE` (tidak ada restore Fase 1).

### 14.5 USER Lifecycle

| State | Representasi | Dapat Login |
|---|---|:---:|
| `ACTIVE` | `is_active = TRUE`, `deleted_at = NULL` | ✅ |
| `INACTIVE` | `is_active = FALSE`, `deleted_at = NULL` | ❌ |
| `DELETED` | `is_active = FALSE`, `deleted_at ≠ NULL` | ❌ |

Transisi: `ACTIVE ⇄ INACTIVE`, `ACTIVE/INACTIVE → DELETED`, `DELETED → ACTIVE` (RESTORE) — seluruhnya oleh Admin.

### 14.6 CATEGORY & TAG COLOR REFERENCE

`ACTIVE ⇄ INACTIVE` (Admin). Inactive tidak tersedia untuk penggunaan baru; data existing tidak berubah.

### 14.7 TAG

Lifecycle CRUD personal (`CREATE`, `UPDATE`, `DELETE`) tanpa workflow bisnis.

### 14.8 MY PLACE Active Status

| State | Makna |
|---|---|
| `ACTIVE` | Tampil di list/peta default; dapat dipakai untuk ITINERARY PLACE baru, VISIT baru, dan pengajuan |
| `INACTIVE` | Disembunyikan dari list/peta default (tampil via filter); tidak dapat dipakai untuk aktivitas baru; seluruh data & referensi MASTER tetap |

| From | To | Trigger | Aktor |
|---|---|---|---|
| (baru) | ACTIVE | CREATE | Explorer |
| ACTIVE | INACTIVE | INACTIVATE | Explorer (owner) |
| INACTIVE | ACTIVE | ACTIVATE | Explorer (owner) |
| ACTIVE / INACTIVE | (dihapus) | DELETE (dengan consent bila disyaratkan) | Explorer (owner) |

Status ini terpisah dari MASTER RELATION STATUS dan VISIT STATUS; perubahannya tidak menghasilkan history.

### 14.9 Mode Aktif Akun ADMIN

| State | Makna |
|---|---|
| `ADMIN` | Hanya fungsi Admin tersedia |
| `EXPLORER` | Hanya fungsi Explorer atas data personal akun tersebut tersedia |

| From | To | Trigger | Aktor |
|---|---|---|---|
| (login) | ADMIN | LOGIN | Sistem |
| ADMIN | EXPLORER | SWITCH | Admin |
| EXPLORER | ADMIN | SWITCH | Admin |

Mode aktif adalah state sesi, bukan status data.

### 14.10 BACKUP Status

`RUNNING → SUCCESS | FAILED` (oleh sistem). Status akhir tidak berubah lagi.

### 14.11 EMAIL CHANGE REQUEST

| State | Makna |
|---|---|
| `PENDING` | Link terkirim, belum dikonfirmasi, belum kedaluwarsa |
| `CONFIRMED` | Link diklik dalam 24 jam; email akun berubah |
| `EXPIRED` | Lewat 24 jam tanpa konfirmasi |
| `CANCELLED` | Digantikan request yang lebih baru |

State diturunkan dari `expires_at`, `confirmed_at`, dan `cancelled_at`.

---

## 15. Business Rules & Data Integrity Rules

### 15.1 Ownership & Isolation
- DR-001: Data personal (MY PLACE, MY PLACE PHOTO, TAG, VISIT, VISIT PHOTO, ITINERARY, ITINERARY PLACE) HARUS terisolasi antar Explorer.
- DR-002: Ownership HARUS divalidasi sebelum setiap operasi pada data personal.
- DR-003: TAG milik User A TIDAK BOLEH digunakan pada MY PLACE milik User B.
- DR-004: ITINERARY hanya boleh menggunakan MY PLACE milik owner ITINERARY.
- DR-005: Admin hanya read-only terhadap data personal Explorer yang diperlukan untuk kurasi (MY PLACE, MY PLACE PHOTO, VISIT PHOTO).
- DR-006: Guest hanya dapat membaca MASTER PLACE `ACTIVE` beserta CATEGORY, rating, dan MASTER PLACE PHOTO.
- DR-007: Data personal akun ADMIN (mode Explorer) diperlakukan identik dengan data personal Explorer, termasuk isolasi dan ownership.
- DR-008: Fungsi Admin dan fungsi Explorer TIDAK BOLEH dapat diakses dalam mode yang sama; validasi mode HARUS dilakukan di sisi server.

### 15.2 Referential (MASTER ↔ MY PLACE)
- DR-010: Satu MASTER PLACE dapat direferensikan banyak MY PLACE.
- DR-011: Satu Explorer dapat memiliki beberapa MY PLACE yang mereferensikan MASTER yang sama; ini bukan duplikasi ilegal.
- DR-012: Satu MY PLACE maksimal memiliki satu MASTER aktif.
- DR-013: MY PLACE dan ITINERARY PLACE tidak wajib memiliki MASTER PLACE.
- DR-014: Referensi baru hanya ke MASTER `ACTIVE`.
- DR-015: `master_relation_status = REFERRED` ⇔ `master_place_id` terisi (dikonfirmasi PO, K-52).

### 15.3 Independence & Snapshot
- DR-020: Perubahan MASTER PLACE TIDAK BOLEH mengubah MY PLACE.
- DR-021: Perubahan CATEGORY MASTER TIDAK BOLEH mengubah CATEGORY MY PLACE.
- DR-022: Snapshot pengajuan TIDAK BOLEH berubah ketika MY PLACE diedit.
- DR-023: Admin mengubah draft MASTER, bukan MY PLACE sumber.

### 15.4 Uniqueness
- DR-030: `users.email` unik tanpa membedakan huruf besar/kecil, termasuk email user soft-deleted.
- DR-031: `categories.slug` unik.
- DR-032: `tags.name` dan `tags.slug` unik dalam scope Explorer.
- DR-033: Tidak ada keunikan `(itinerary_id, my_place_id)` — MY PLACE boleh muncul berkali-kali.
- DR-034: Duplikasi MY PLACE tidak dilarang; hanya warning.
- DR-035: `users.username` unik tanpa membedakan huruf besar/kecil, termasuk username user soft-deleted; panjang 4–20 karakter.

### 15.5 Visit & Itinerary
- DR-040: VISIT selalu mengacu ke satu MY PLACE dan tidak dapat dipindahkan.
- DR-041: Planned order = `itinerary_places.sequence`; actual order = `visits.visited_at`.
- DR-042: Unexpected visit: `itinerary_id` terisi, `itinerary_place_id = NULL`.
- DR-043: Visit di luar itinerary: `itinerary_id = NULL`, `itinerary_place_id = NULL`.
- DR-044: Start/end date ITINERARY dan planned date/time tidak membatasi `visited_at`.
- DR-045: Status `PLAN/VISITED` tidak boleh dicampur dengan MASTER RELATION STATUS maupun status aktif MY PLACE.
- DR-046: MY PLACE `INACTIVE` tidak dapat dipakai untuk ITINERARY PLACE baru, VISIT baru, atau pengajuan.

### 15.6 Rating
- DR-050: `visits.rating` bernilai NULL atau 1..5.
- DR-051: Rating MY PLACE dan MASTER PLACE adalah calculated value, bukan input langsung.

### 15.7 Photo
- DR-060: Satu VISIT, satu MY PLACE, dan satu MASTER PLACE dapat memiliki banyak foto.
- DR-061: Maksimal satu primary photo per VISIT, per MY PLACE, dan per MASTER PLACE; primary opsional.
- DR-062: VISIT PHOTO, MY PLACE PHOTO, dan MASTER PLACE PHOTO adalah record independen.
- DR-063: Satu user maksimal memiliki satu avatar; hanya pemilik akun yang dapat mengubahnya.

### 15.8 TAG & Reference
- DR-070: `tags.color` menyimpan nilai warna aktual `#RRGGBB`.
- DR-071: `ref_tag_colors` tidak menjadi FK dari TAG.
- DR-072: Preset/seed reference bukan enum hard-coded.

### 15.9 History
- DR-080: MASTER RELATION HISTORY bersifat append-only; tidak dapat diedit dan tidak dapat dihapus secara mandiri.
- DR-081: History bukan source-of-truth current state.
- DR-082: History historis tetap dipertahankan walaupun MASTER PLACE atau User kemudian dihapus.
- DR-083: Satu-satunya jalur penghapusan history adalah penghapusan MY PLACE oleh owner dengan persetujuan eksplisit (DELETE CONSENT).

### 15.10 Deletion Consent
- DR-090: MY PLACE yang memiliki MASTER RELATION HISTORY dan/atau ITINERARY PLACE TIDAK BOLEH dihapus tanpa DELETE CONSENT.
- DR-091: Dialog DELETE CONSENT HARUS merinci data terkait yang akan terhapus dan alasan diperlukannya persetujuan.
- DR-092: Penghapusan dengan consent bersifat atomik: MY PLACE dan seluruh data terkait terhapus bersama atau tidak sama sekali.

### 15.11 Account, Konfigurasi & Backup
- DR-100: Email akun hanya berubah setelah konfirmasi link yang masih berlaku.
- DR-101: Upload foto divalidasi terhadap konfigurasi yang berlaku saat upload; perubahan konfigurasi tidak memengaruhi foto existing.
- DR-102: File backup dan riwayat backup hanya dapat diakses Admin.
- DR-103: `visited_at` tidak boleh melebihi waktu saat ini; `sequence` unik per ITINERARY; `end_date ≥ start_date` bila keduanya diisi.
- DR-104: Username berubah langsung atas permintaan pemilik akun (tanpa konfirmasi); login memakai email atau username.

---

## 16. Calculated Values & Formula

| Nilai | Formula | Sumber | Jika Tidak Ada Data |
|---|---|---|---|
| Rating MY PLACE | `AVG(visits.rating WHERE my_place_id = X AND rating IS NOT NULL)` | visits | NULL |
| Rating MASTER PLACE | `AVG(rating seluruh VISIT dari seluruh MY PLACE ACTIVE yang saat ini mereferensikan MASTER, rating IS NOT NULL)` — langsung dari VISIT, bukan rata-rata rating MY PLACE; termasuk VISIT milik akun ADMIN (mode Explorer) | visits, my_places | NULL |
| Effective CATEGORY | Jika MY PLACE `REFERRED` → seluruh CATEGORY MASTER; jika tidak → CATEGORY MY PLACE | categories, junction tables | CATEGORY MY PLACE (boleh kosong) |
| VISIT STATUS | `VISITED` jika `COUNT(visits) ≥ 1`, selain itu `PLAN` | visits | `PLAN` |
| Actual visit order | `ORDER BY visits.visited_at` | visits | — |
| Planned order | `ORDER BY itinerary_places.sequence` | itinerary_places | — |

Catatan:
- Effective CATEGORY untuk MY PLACE yang mereferensikan MASTER `INACTIVE` tetap menggunakan CATEGORY MASTER (karena status tetap `REFERRED`).
- VISIT milik user `INACTIVE` tetap dihitung pada rating MASTER; VISIT milik user `DELETED` tidak dihitung (dihitung kembali bila user di-restore).
- Disimpan vs dihitung on-the-fly: ditentukan pada SRS. `visit_status` disimpan pada MY PLACE dan dijaga konsistensinya oleh sistem (ERD).

---

## 17. Deletion, Retention & Archival Rules

| Entitas Dihapus | Jenis Delete | Dampak ke Child / Relasi | History? |
|---|---|---|---|
| USER (Explorer) | Soft delete | Tidak dapat login; seluruh data milik user (termasuk avatar) tetap tersimpan namun tidak dapat diakses melalui aplikasi; email & username tetap terkunci (tidak dapat dipakai akun lain); tidak ada cascade | Tidak (tidak ada UNREFER massal) |
| MASTER PLACE | Soft delete | Seluruh MY PLACE yang mereferensikannya → `UNREFERRED`; data MY PLACE, CATEGORY MY PLACE, VISIT, TAG, FAVORITE, ITINERARY tetap; MASTER PLACE PHOTO & association CATEGORY MASTER tetap tersimpan | Ya, `UNREFERRED` per MY PLACE |
| MASTER PLACE (inactive) | Bukan delete | Tidak ada perubahan pada MY PLACE | Tidak |
| CATEGORY | Inactive; hard delete hanya bila belum pernah dipakai | Association existing tetap | Tidak |
| MY PLACE (tanpa history & tanpa ITINERARY PLACE) | Hard delete, konfirmasi biasa | VISIT, VISIT PHOTO, MY PLACE PHOTO, association TAG & CATEGORY ikut terhapus; MASTER PLACE PHOTO tetap | Tidak (tidak ada UNREFER) |
| MY PLACE (memiliki history dan/atau ITINERARY PLACE) | Hard delete **hanya dengan DELETE CONSENT** | VISIT, VISIT PHOTO, MY PLACE PHOTO, MASTER RELATION HISTORY, ITINERARY PLACE yang menunjuk MY PLACE ini, association TAG & CATEGORY ikut terhapus; ITINERARY & stop lain tetap; MASTER PLACE PHOTO tetap. Tanpa consent → tidak dihapus, disarankan INACTIVE | Tidak (history justru ikut terhapus) |
| MY PLACE (inactive) | Bukan delete | Seluruh data tetap; hanya disembunyikan & tidak dapat dipakai untuk aktivitas baru | Tidak |
| VISIT | Hard delete | VISIT PHOTO ikut terhapus; MY PLACE tetap (kembali `PLAN` bila VISIT terakhir); MASTER PLACE PHOTO tetap | Tidak |
| VISIT PHOTO | Hard delete | MASTER PLACE PHOTO yang bersumber darinya tetap (referensi sumber dikosongkan) | Tidak |
| MY PLACE PHOTO | Hard delete | MASTER PLACE PHOTO yang bersumber darinya tetap (referensi sumber dikosongkan) | Tidak |
| MASTER PLACE PHOTO | Hard delete | Tidak berdampak pada VISIT PHOTO maupun MY PLACE PHOTO | Tidak |
| AVATAR | Hapus / ganti oleh pemilik akun | File avatar lama dihapus dari penyimpanan; tidak ada riwayat | Tidak |
| TAG | Hard delete | Hanya association `my_place_tags` terhapus; MY PLACE, VISIT, CATEGORY, FAVORITE tidak terpengaruh | Tidak |
| TAG COLOR REFERENCE | Inactive | `tags.color` existing tetap | Tidak |
| ITINERARY | Hard delete | ITINERARY PLACE terhapus; MY PLACE & VISIT tetap; konteks itinerary pada VISIT tidak lagi tersedia | Tidak |
| ITINERARY PLACE (dihapus langsung) | Hard delete | MY PLACE tetap; VISIT yang mereferensikannya tetap dengan `itinerary_place_id` dikosongkan (tetap memiliki itinerary context) | Tidak |
| MASTER RELATION HISTORY | Tidak dapat dihapus secara mandiri; hanya ikut terhapus bersama MY PLACE dengan DELETE CONSENT | — | — |
| EMAIL CHANGE REQUEST | Tidak dihapus aktif; kedaluwarsa setelah 24 jam | — | — |
| BACKUP LOG & file backup | Tidak dihapus melalui aplikasi; retensi `TBD` (OI-32) | — | — |
| APP SETTING | Tidak dapat dihapus; hanya nilainya yang diubah | — | — |

**Retensi data:** Data soft-deleted (USER, MASTER PLACE) disimpan permanen pada Fase 1; kebijakan purge ditetapkan pada Fase 2.
**Restore:** Tidak tersedia untuk MASTER PLACE pada Fase 1; USER `DELETED` dapat di-restore oleh Admin.
**Penghapusan permanen data pribadi atas permintaan user:** Fase 2.

---

## 18. History / Audit Trail

### 18.1 Cakupan

- **Dicatat:** lifecycle hubungan MY PLACE ↔ MASTER PLACE (pengajuan, penolakan, refer, re-refer, unrefer).
- **Tidak dicatat:** perubahan biasa data MASTER PLACE, FAVORITE, TAG, CATEGORY, ITINERARY, VISIT; delete MY PLACE; inactivate/activate MY PLACE; delete USER; inactivate MASTER; switch mode Admin. General-purpose audit log Out-of-Scope.
- **Pembuatan MY PLACE dari MASTER** dicatat sebagai `REFERRED`.

### 18.2 Struktur (Conceptual)

```text
my_place_master_histories
-------------------------
id
my_place_id
action
from_master_place_id NULL
to_master_place_id NULL
snapshot_data NULL
reason NULL
note NULL
performed_by
performed_at
created_at
```

### 18.3 Action

| Action | Kapan | Wajib Isi |
|---|---|---|
| `SUBMITTED` | Explorer mengajukan / mengajukan ulang | snapshot_data, performed_by, performed_at |
| `REJECTED` | Admin menolak pengajuan | snapshot_data (snapshot pengajuan yang ditolak), reason, performed_by, performed_at |
| `REFERRED` | MY PLACE pertama kali direferensikan (dibuat dari MASTER, approve, refer inisiatif, checkbox saat Admin membuat MASTER) | from = NULL, to = target |
| `RE-REFER` | MY PLACE dipindah dari MASTER A ke B (termasuk via checkbox saat Admin membuat MASTER baru) | from = A, to = B |
| `UNREFERRED` | Referensi dilepas manual | from = MASTER saat ini, to = NULL |
| `UNREFERRED` (otomatis) | MASTER di-soft-delete | from = MASTER dihapus, to = NULL, reason = "MASTER PLACE dihapus", performed_by = Admin yang menghapus |

### 18.4 Sifat

- History bersifat **append-only** dan TIDAK BOLEH diedit atau dihapus secara mandiri melalui aplikasi.
- Pengecualian tunggal: history ikut terhapus ketika owner menghapus MY PLACE dengan DELETE CONSENT (12.10).
- History bukan source-of-truth current state; current state ada pada `my_places`.
- Untuk aksi otomatis, aktor adalah Admin yang memicu aksi tersebut.
- Nama action `RE-REFER` dipertahankan (keputusan PO, OI-21 CLOSED) walaupun berbeda dari konvensi `UPPER_SNAKE_CASE`.

---

## 19. User Stories & Acceptance Criteria

### 19.1 User Stories

| ID | User Story | Terkait |
|---|---|---|
| US-001 | Sebagai Admin, saya ingin membuat akun Explorer, agar Explorer dapat menggunakan aplikasi. | FR-USR-002, FR-USR-003 |
| US-002 | Sebagai Explorer/Admin, saya ingin login dengan email atau username beserta password, agar dapat mengakses data saya. | FR-USR-001, FR-USR-009 |
| US-003 | Sebagai Admin, saya ingin menonaktifkan atau menghapus Explorer, agar akun yang tidak berhak tidak dapat login. | FR-USR-005, FR-USR-006 |
| US-004 | Sebagai Admin, saya ingin mereset password Explorer secara random atau manual, agar Explorer yang lupa password dapat masuk kembali. | FR-USR-007, FR-USR-008 |
| US-005 | Sebagai Guest, saya ingin melihat tempat-tempat terdaftar di peta, agar saya mengetahui informasi tempat tanpa login. | FR-GST-001..003 |
| US-006 | Sebagai Explorer, saya ingin mencari tempat di peta atau pin manual, agar saya dapat mencatat lokasi tempat. | FR-MAP-001..004 |
| US-007 | Sebagai Explorer, saya ingin menyimpan tempat sebagai MY PLACE dari Google, MASTER, atau input manual, agar tempat tercatat di journal saya. | FR-MYP-001..005 |
| US-008 | Sebagai Explorer, saya ingin memilih CATEGORY untuk MY PLACE, agar tempat terklasifikasi. | FR-CAT-004, FR-CAT-005, FR-CAT-006 |
| US-009 | Sebagai Explorer, saya ingin membuat TAG berwarna dan memasangkannya ke MY PLACE, agar saya dapat mengelompokkan tempat secara personal. | FR-TAG-001..004, FR-CLR-001 |
| US-010 | Sebagai Explorer, saya ingin menandai MY PLACE sebagai FAVORITE, agar mudah menemukan tempat favorit. | FR-FAV-001 |
| US-011 | Sebagai Explorer, saya ingin memfilter MY PLACE, agar cepat menemukan tempat tertentu. | FR-FLT-001, FR-FAV-002, FR-TAG-005 |
| US-012 | Sebagai Explorer, saya ingin mencatat VISIT dengan tanggal, rating, catatan, dan foto, agar pengalaman kunjungan terdokumentasi. | FR-VST-001, FR-VST-004..006, FR-VPH-001..002 |
| US-013 | Sebagai Explorer, saya ingin membuat ITINERARY dari MY PLACE existing atau tempat baru, agar saya dapat merencanakan perjalanan. | FR-ITN-001..005 |
| US-014 | Sebagai Explorer, saya ingin mencatat planned place visit dan unexpected visit dalam ITINERARY, agar kunjungan aktual terhubung dengan rencana. | FR-VST-002, FR-VST-003 |
| US-015 | Sebagai Explorer, saya ingin melihat planned route dan actual visit di peta, agar saya dapat membandingkan rencana dan realisasi. | FR-RTE-001..004 |
| US-016 | Sebagai Explorer, saya ingin mengajukan MY PLACE menjadi MASTER dan melihat statusnya, agar tempat saya menjadi referensi bersama. | FR-REL-001..006, FR-MYP-006 |
| US-017 | Sebagai Admin, saya ingin meninjau pengajuan lalu menerima atau menolaknya, agar MASTER PLACE terkurasi. | FR-REL-007..010 |
| US-018 | Sebagai Admin, saya ingin mereferensikan, memindahkan, dan melepas referensi MY PLACE, agar data tetap terstandar. | FR-REL-011..014 |
| US-019 | Sebagai Admin, saya ingin mengelola MASTER PLACE (create, update, inactivate, delete), agar referensi tempat akurat. | FR-MST-001..009 |
| US-020 | Sebagai Admin, saya ingin mengelola foto MASTER PLACE termasuk dari VISIT PHOTO, agar MASTER PLACE memiliki foto representatif. | FR-MPH-001..003 |
| US-021 | Sebagai Admin, saya ingin mengelola CATEGORY dan preset warna TAG, agar data reference terpelihara. | FR-CAT-001..003, FR-CLR-002 |
| US-022 | Sebagai Explorer, saya ingin menghapus MY PLACE dengan pemahaman jelas atas data terkait yang ikut terhapus, agar tidak kehilangan data tanpa sengaja. | FR-MYP-010..012 |
| US-023 | Sebagai Explorer, saya ingin menonaktifkan MY PLACE yang tidak ingin saya hapus, agar list saya rapi tanpa kehilangan riwayat. | FR-MYP-013..014, FR-FLT-001 |
| US-024 | Sebagai Admin, saya ingin berpindah ke mode Explorer, agar saya dapat mencatat tempat dan kunjungan pribadi saya. | FR-USR-012..016 |
| US-025 | Sebagai Explorer, saya ingin peta terbuka di lokasi saya saat ini namun tetap bebas memilih pin di mana pun, agar pencatatan tempat cepat. | FR-MAP-005..007 |
| US-026 | Sebagai Admin, saya ingin memilih apakah MY PLACE sumber langsung direferensikan ke MASTER yang saya buat, agar referensi sesuai keputusan kurasi. | FR-MST-002, BR-REL-009 |
| US-027 | Sebagai user, saya ingin mengubah nama, password, dan email saya sendiri secara aman, agar akun saya tetap mutakhir. | FR-USR-011, FR-USR-017..019 |
| US-028 | Sebagai Admin, saya ingin me-restore akun Explorer yang terhapus, agar kesalahan penghapusan dapat diperbaiki. | FR-USR-020 |
| US-029 | Sebagai user, saya ingin memilih bahasa Indonesia atau English, agar antarmuka mudah saya pahami. | FR-USR-021..022 |
| US-030 | Sebagai Admin, saya ingin menjalankan backup dan mengunduh hasilnya, agar data dapat dipulihkan bila terjadi masalah. | FR-BKP-001..004 |
| US-031 | Sebagai Admin, saya ingin mengatur aturan foto tanpa perubahan kode, agar kapasitas penyimpanan terkendali. | FR-CFG-001..003 |
| US-032 | Sebagai user, saya ingin memiliki username unik yang dapat saya ganti sendiri, agar saya dapat login tanpa mengetik email. | FR-USR-001, FR-USR-023..024 |
| US-033 | Sebagai user, saya ingin mengunggah dan mengganti foto profil saya sendiri, agar akun saya mudah dikenali. | FR-USR-025..026 |
| US-034 | Sebagai Explorer, saya ingin menambahkan foto tinjauan saat membuat atau mengubah MY PLACE, agar saya memiliki penanda visual tempat tersebut. | FR-MYP-015, FR-MPP-001..003 |
| US-035 | Sebagai Admin, saya ingin menjadikan foto tinjauan MY PLACE sebagai foto MASTER PLACE, agar MASTER PLACE memiliki foto representatif. | FR-MPH-004, FR-MPP-004 |

### 19.2 Acceptance Criteria

```gherkin
AC-FR-USR-007-01
Given Admin login dan Explorer "E1" berstatus ACTIVE
When Admin memilih "Generate Password" untuk E1
Then sistem membuat password yang memuat minimal 1 huruf kecil, 1 huruf besar, 1 angka, dan 1 simbol
And password lama E1 tidak dapat digunakan lagi

AC-FR-USR-008-01
Given Admin login
When Admin mengisi password baru E1 tanpa simbol
Then sistem menolak dengan pesan "Password tidak memenuhi ketentuan"

AC-FR-USR-009-01
Given Explorer E1 berstatus INACTIVE
When E1 mencoba login dengan kredensial yang benar
Then sistem menolak login

AC-FR-USR-003-01
Given Admin login
When Admin membuat user baru dengan role ADMIN
Then sistem menolak; hanya role EXPLORER yang dapat dibuat

AC-FR-USR-001-01
Given Explorer E1 berstatus ACTIVE dengan email "e1@x.com" dan username "jalan.jalan"
When E1 login dengan identifier "Jalan.Jalan" dan password yang benar
Then login berhasil
And login dengan identifier "e1@x.com" dan password yang sama juga berhasil

AC-FR-USR-001-02
Given username "jalan.jalan" terdaftar
When user login dengan identifier "jalan.jalan" dan password yang salah
Then sistem menolak dengan pesan "Email/username atau password salah"

AC-FR-USR-023-01
Given Admin login
When Admin membuat Explorer dengan username "abc"
Then sistem menolak dengan pesan "Username harus 4–20 karakter"

AC-FR-USR-024-01
Given E1 login dengan username "jalan.jalan"
When E1 mengganti username menjadi "Kuliner_Malang"
Then username E1 tersimpan sebagai "kuliner_malang" dan langsung berlaku
And login berikutnya dengan "jalan.jalan" ditolak

AC-FR-USR-024-02
Given username "kuliner_malang" sudah dipakai akun lain (termasuk akun soft-deleted)
When user mengganti username menjadi "KULINER_MALANG"
Then sistem menolak dengan pesan "Username sudah digunakan"

AC-FR-USR-024-03
Given user login
When user mengganti username menjadi "nama@saya" atau string 21 karakter
Then sistem menolak dan username tidak berubah

AC-FR-GST-003-01
Given pengunjung tanpa login
When membuka detail MASTER PLACE "M1" berstatus ACTIVE
Then sistem menampilkan data MASTER, CATEGORY, rating MASTER, dan MASTER PLACE PHOTO
And tidak menampilkan MY PLACE, VISIT, atau VISIT PHOTO Explorer

AC-FR-GST-001-02
Given MASTER PLACE "M2" berstatus INACTIVE
When Guest membuka peta
Then M2 tidak ditampilkan

AC-FR-MYP-002-01
Given Explorer login dan MASTER "M1" ACTIVE
When Explorer membuat MY PLACE dari M1, mengubah name, lalu menyimpan
Then MY PLACE tersimpan dengan master_place_id = M1 dan name hasil ubahan
And data M1 tidak berubah

AC-FR-MYP-003-02
Given Explorer login
When Explorer menyimpan MY PLACE tanpa name
Then sistem menolak dengan pesan "Nama tempat wajib diisi"

AC-FR-MYP-006-01
Given MY PLACE "P1" berstatus REVIEW dengan snapshot name "Cafe A"
When Explorer mengubah name P1 menjadi "Cafe A Baru"
Then P1 tersimpan dengan name "Cafe A Baru"
And snapshot pengajuan yang dilihat Admin tetap "Cafe A"

AC-FR-REL-001-01
Given MY PLACE P1 milik Explorer berstatus UNREFERRED
When Explorer mengajukan P1
Then status P1 menjadi REVIEW
And history SUBMITTED dengan snapshot tercatat

AC-FR-REL-003-01
Given MY PLACE P1 berstatus REFERRED
When Explorer mencoba mengajukan P1
Then sistem menolak pengajuan

AC-FR-REL-004-01
Given MY PLACE P1 berstatus REVIEW
When Explorer membuka P1
Then tidak tersedia aksi membatalkan pengajuan

AC-FR-REL-010-01
Given pengajuan P1 berstatus REVIEW
When Admin menolak dengan alasan "Data alamat tidak lengkap"
Then status P1 menjadi REJECTED
And history REJECTED mencatat reason dan snapshot pengajuan

AC-FR-REL-010-02
Given pengajuan P1 berstatus REVIEW
When Admin menolak tanpa mengisi alasan
Then sistem menolak aksi

AC-FR-REL-012-01
Given P1 REFERRED ke M1 dan M2 ACTIVE
When Admin melakukan RE-REFER P1 ke M2
Then P1 tetap REFERRED dengan master_place_id = M2
And satu history RE-REFER (from M1, to M2) tercatat

AC-FR-REL-012-02
Given P1 REFERRED ke M1 dan M3 INACTIVE
When Admin mencoba RE-REFER P1 ke M3
Then sistem menolak aksi

AC-FR-MST-005-01
Given P1 REFERRED ke M1
When Admin menonaktifkan M1
Then P1 tetap REFERRED ke M1
And tidak ada history baru

AC-FR-MST-007-01
Given P1 dan P2 REFERRED ke M1
When Admin "A1" menghapus M1
Then P1 dan P2 menjadi UNREFERRED dengan master_place_id = NULL
And masing-masing memiliki history UNREFERRED dengan reason "MASTER PLACE dihapus" dan performed_by = A1
And data P1, P2, VISIT, TAG, CATEGORY MY PLACE tetap ada

AC-FR-CAT-005-01
Given Explorer login
When Explorer mencoba membuat CATEGORY baru
Then sistem menolak aksi

AC-FR-TAG-001-02
Given Explorer memiliki TAG "Hidden Gem"
When Explorer membuat TAG baru bernama "Hidden Gem"
Then sistem menolak dengan pesan "Tag sudah ada"

AC-FR-TAG-003-02
Given TAG "T1" milik Explorer B
When Explorer A memasang T1 ke MY PLACE miliknya
Then sistem menolak aksi

AC-FR-VST-001-01
Given MY PLACE P1 berstatus PLAN tanpa VISIT
When Explorer mencatat VISIT dengan rating 4
Then VISIT tersimpan, P1 menjadi VISITED, dan rating P1 = 4

AC-FR-VST-004-02
Given Explorer mencatat VISIT
When Explorer mengisi rating 6
Then sistem menolak dengan pesan "Rating harus 1–5"

AC-FR-VST-005-01
Given P1 memiliki satu VISIT
When Explorer menghapus VISIT tersebut
Then VISIT PHOTO-nya ikut terhapus dan P1 kembali PLAN

AC-FR-VST-003-01
Given ITINERARY I1 dan MY PLACE P5 yang bukan ITINERARY PLACE dari I1
When Explorer mencatat VISIT P5 dalam konteks I1
Then VISIT tersimpan dengan itinerary_id = I1 dan itinerary_place_id = NULL

AC-FR-ITN-002-02
Given MY PLACE P9 milik Explorer B
When Explorer A menambahkan P9 ke ITINERARY miliknya
Then sistem menolak aksi

AC-FR-ITN-003-01
Given Explorer menyusun ITINERARY I1
When Explorer menambah tempat baru "Museum X" yang belum ada di MY PLACE
Then MY PLACE "Museum X" dibuat dengan visit_status PLAN tanpa MASTER wajib
And ITINERARY PLACE baru menunjuk ke MY PLACE tersebut

AC-FR-MPH-002-01
Given VISIT PHOTO "VP1" dijadikan MASTER PLACE PHOTO "MP1"
When Explorer menghapus VP1
Then MP1 tetap ada

AC-FR-MYP-010-01
Given MY PLACE P1 tanpa history relasi dan tanpa ITINERARY PLACE, memiliki 2 VISIT
When Explorer menghapus P1 dan mengonfirmasi
Then P1, kedua VISIT, dan VISIT PHOTO-nya terhapus

AC-FR-MYP-011-01
Given MY PLACE P2 berstatus REFERRED (memiliki history) dan menjadi stop pada ITINERARY "Liburan Malang"
When Explorer menekan Hapus
Then sistem menampilkan dialog yang menjelaskan alasan, merinci jumlah VISIT, VISIT PHOTO, history relasi, dan ITINERARY PLACE beserta nama "Liburan Malang"
And tombol hapus hanya dapat dijalankan setelah checkbox persetujuan dicentang

AC-FR-MYP-011-02
Given dialog consent untuk P2 tampil dan checkbox dicentang
When Explorer mengonfirmasi
Then P2, VISIT, VISIT PHOTO, history relasi, dan ITINERARY PLACE P2 terhapus
And ITINERARY "Liburan Malang" beserta stop lainnya tetap ada
And tidak ada history UNREFERRED yang dibuat

AC-FR-MYP-012-01
Given dialog consent untuk P2 tampil
When Explorer tidak mencentang persetujuan
Then P2 tidak terhapus
And sistem menampilkan pesan bahwa P2 tidak dapat dihapus tanpa persetujuan karena memiliki data terkait, dan menyarankan menonaktifkan P2

AC-FR-MYP-013-01
Given MY PLACE P3 ACTIVE dan REFERRED ke M1
When Explorer menonaktifkan P3
Then P3 tidak tampil di list/peta default
And P3 tetap REFERRED ke M1 dan history tidak bertambah
And VISIT P3 tidak lagi dihitung pada rating M1

AC-FR-MYP-013-02
Given MY PLACE P3 INACTIVE
When Explorer mencoba menambahkan P3 ke ITINERARY, mencatat VISIT baru, atau mengajukan P3
Then sistem menolak aksi

AC-FR-USR-013-01
Given akun ADMIN "A1"
When A1 login
Then mode aktif A1 adalah ADMIN

AC-FR-USR-014-01
Given A1 dalam mode EXPLORER
When A1 mengakses fitur review pengajuan
Then sistem menolak dan meminta A1 switch ke mode ADMIN

AC-FR-USR-015-01
Given A1 switch ke mode EXPLORER
When A1 membuat MY PLACE "Kopi Z"
Then MY PLACE tersimpan dengan owner = A1 dan aturan yang sama seperti Explorer
And Explorer lain tidak dapat melihat "Kopi Z"

AC-FR-USR-012-02
Given akun EXPLORER "E1"
When E1 mencoba switch ke mode ADMIN
Then aksi tidak tersedia

AC-FR-REL-008-01
Given MASTER M1 ACTIVE
When Explorer membuat MY PLACE dari M1
Then MY PLACE berstatus REFERRED ke M1
And history REFERRED (from NULL, to M1) tercatat

AC-BR-REL-009-01
Given MY PLACE P4 UNREFERRED
When Admin membuat MASTER M5 dari P4 dengan checkbox "Referensikan MY PLACE sumber" dicentang
Then P4 menjadi REFERRED ke M5 dan history REFERRED tercatat

AC-BR-REL-009-02
Given MY PLACE P4 UNREFERRED
When Admin membuat MASTER M5 dari P4 tanpa mencentang checkbox
Then P4 tetap UNREFERRED dengan master_place_id NULL dan tidak ada history

AC-FR-MAP-005-01
Given Explorer memberi izin lokasi perangkat
When Explorer membuka peta
Then titik tengah peta adalah lokasi perangkat
And Explorer tetap dapat menempatkan pin di lokasi lain mana pun

AC-FR-MAP-007-01
Given Explorer menolak izin lokasi
When Explorer membuka peta
Then tidak ada pin lokasi perangkat yang ditampilkan
And Explorer tetap dapat mencari tempat dan menempatkan pin manual

AC-FR-MYP-009-01
Given Admin dalam mode ADMIN membuka daftar MY PLACE untuk kurasi
When daftar ditampilkan tanpa mengubah pilihan
Then hanya MY PLACE ACTIVE yang tampil
And saat Admin memilih "tampilkan MY PLACE tidak aktif", MY PLACE INACTIVE ikut tampil

AC-FR-USR-017-01
Given Admin baru saja mereset password Explorer E1
When E1 login dengan password hasil reset
Then sistem mewajibkan E1 mengganti password sebelum dapat membuka fitur lain

AC-FR-USR-019-01
Given E1 login dengan email "lama@x.com"
When E1 mengajukan perubahan email ke "baru@x.com"
Then link konfirmasi dikirim ke "baru@x.com"
And E1 tetap login dengan "lama@x.com" sampai link diklik
And setelah link diklik dalam 24 jam, email E1 menjadi "baru@x.com"

AC-FR-USR-019-02
Given link konfirmasi perubahan email dibuat lebih dari 24 jam lalu
When link diklik
Then sistem menolak dan email tidak berubah

AC-FR-USR-019-03
Given "Baru@X.com" sudah dipakai akun lain (termasuk akun soft-deleted)
When user mengajukan perubahan email ke "baru@x.com"
Then sistem menolak dengan pesan "Email sudah digunakan"

AC-FR-USR-020-01
Given Explorer E2 berstatus DELETED
When Admin me-restore E2
Then E2 berstatus ACTIVE, dapat login, dan seluruh data miliknya kembali dapat diakses

AC-FR-USR-021-01
Given E1 memilih bahasa English di profil
When E1 membuka daftar MY PLACE
Then label antarmuka tampil dalam English
And nama tempat dan catatan tetap seperti yang diinput

AC-FR-VST-001-02
Given Explorer mencatat VISIT
When visited_at diisi waktu di masa depan
Then sistem menolak dengan pesan "Tanggal kunjungan tidak boleh di masa depan"

AC-FR-MYP-007-01
Given Explorer memiliki MY PLACE "Cafe ABC" pada koordinat tertentu
When Explorer menyimpan MY PLACE baru berjarak 30 m dari "Cafe ABC"
Then sistem menampilkan warning duplikasi
And Explorer tetap dapat menyimpan

AC-FR-MST-011-01
Given MY PLACE P1 REFERRED ke M1 dan M1 dinonaktifkan Admin
When Explorer membuka detail P1
Then detail M1 tampil read-only dengan label "Tidak aktif"

AC-FR-CAT-007-01
Given CATEGORY "Cafe" sudah dipakai oleh MASTER atau MY PLACE
When Admin mencoba menghapus permanen "Cafe"
Then sistem menolak dan menyarankan menonaktifkan CATEGORY

AC-FR-CFG-002-01
Given konfigurasi photo.max_size_mb = 5
When Explorer mengunggah foto berukuran 6 MB
Then sistem menolak upload

AC-FR-CFG-001-01
Given VISIT V1 memiliki 10 foto dan Admin mengubah photo.max_per_visit menjadi 5
When Explorer membuka V1
Then 10 foto tetap ada
And upload foto baru ke V1 ditolak sampai jumlah foto di bawah 5

AC-FR-USR-025-01
Given E1 login dan belum memiliki avatar
When E1 mengunggah file "profil.png" berukuran 1 MB
Then avatar E1 tersimpan tanpa metadata GPS dan tampil di profil
And saat E1 mengunggah avatar baru, file avatar lama dihapus

AC-FR-USR-026-01
Given konfigurasi avatar.allowed_types = "jpg, png, webp" dan avatar.max_size_mb = 5
When user mengunggah avatar "profil.gif" atau file berukuran 6 MB
Then sistem menolak upload dan avatar tidak berubah

AC-FR-USR-025-02
Given Admin dalam mode ADMIN membuka akun Explorer E1
When Admin mencoba mengubah atau menghapus avatar E1
Then sistem menolak

AC-FR-MPP-001-01
Given Explorer membuat MY PLACE "Cafe ABC" tanpa foto
When Explorer menyimpan
Then MY PLACE tersimpan tanpa MY PLACE PHOTO

AC-FR-MPP-001-02
Given MY PLACE "Cafe ABC" milik E1 dan photo.max_per_my_place = 10
When E1 menambahkan 2 foto upload dan 1 external link saat mengubah MY PLACE
Then ketiga foto tersimpan sebagai MY PLACE PHOTO
And penambahan foto ke-11 ditolak

AC-FR-MPH-004-01
Given MY PLACE P1 mereferensikan MASTER M1 dan memiliki MY PLACE PHOTO "MPP1"
When Admin menjadikan MPP1 sebagai MASTER PLACE PHOTO M1
Then MASTER PLACE PHOTO baru dibuat dengan sumber MPP1
And bila E1 kemudian menghapus MPP1, MASTER PLACE PHOTO tersebut tetap ada

AC-FR-MPH-004-02
Given MY PLACE P2 tidak mereferensikan MASTER M1
When Admin mencoba memakai MY PLACE PHOTO milik P2 untuk M1
Then sistem menolak

AC-FR-BKP-001-01
Given Admin dalam mode ADMIN dan tidak ada backup yang berjalan
When Admin menekan "Backup Sekarang"
Then backup database dan file foto dijalankan dan tercatat di riwayat
And bila berstatus SUCCESS, file backup dapat diunduh Admin

AC-FR-BKP-001-02
Given Explorer login
When Explorer mencoba mengakses fitur backup
Then sistem menolak akses
```

> AC untuk FR `Must` lain yang belum tercantum di atas: `TBD` (OI-22).

---

## 20. Reporting & Notification Requirements

Notifikasi umum (eksternal & in-app) berada di Out-of-Scope Fase 1. Satu-satunya pengiriman email adalah email transaksional berikut:

| ID | Jenis | Deskripsi | Penerima | Trigger / Periode |
|---|---|---|---|---|
| FR-NTF-001 | Email transaksional | Link konfirmasi perubahan email (sekali pakai, berlaku 24 jam) | Alamat email baru | Request perubahan email (FR-USR-019) |

Reporting — tidak ada requirement reporting khusus selain daftar pengajuan Admin (FR-REL-007) dan tampilan status pengajuan Explorer (FR-REL-006).

---

## 21. Integration Requirements

| ID | Sistem Eksternal | Tujuan | Arah Data | Data Dipertukarkan | Fallback Jika Gagal |
|---|---|---|---|---|---|
| FR-INT-001 | Google Maps | Menampilkan peta, MY PLACE, MASTER PLACE, dan route | Inbound | Map tiles / rendering | `TBD` (OI-23) |
| FR-INT-002 | Google Places | Pencarian tempat & prefill | Inbound | name, address, latitude, longitude, `google_place_id` | Pin manual / input manual |
| FR-INT-003 | Layanan pengiriman email | Mengirim link konfirmasi perubahan email | Outbound | email baru, link konfirmasi | Request ditandai gagal kirim; user dapat mengajukan ulang |

Biaya, kuota, API key management, dan caching: ditentukan pada SRS (OI-23). Penyedia layanan email: ditentukan pada SRS (OI-33). Kepatuhan penyimpanan data Google Places: OI-34.

---

## 22. Data Migration / Initial Data

| Data | Sumber | Jumlah Estimasi | Aturan Transformasi | Pemilik |
|---|---|---|---|---|
| Akun Admin awal | Seed sistem | `TBD` | Username awal ditetapkan pada seed (mengikuti BR-USR-015) | Sistem |
| `ref_user_roles` | ERD | 2 (`ADMIN`, `EXPLORER`) | — | Sistem |
| Reference status relasi & action history | ERD | sesuai Section 14.1 & 18.3 | — | Sistem |
| `ref_tag_colors` (preset) | BRD | 10 | — | Admin |
| `categories` awal | SPEC-PPJ (dikonfirmasi PO, K-47) | 5 | Generate slug dari name | Admin |
| `app_settings` (aturan foto & avatar) | BRD 13.17 | 7 | — | Admin |
| Data legacy | Tidak ada | — | — | — |

**Preset TAG COLOR awal:**

| No | Name | HEX |
|---:|---|---|
| 1 | Red | `#EF4444` |
| 2 | Orange | `#F97316` |
| 3 | Amber | `#F59E0B` |
| 4 | Green | `#22C55E` |
| 5 | Emerald | `#10B981` |
| 6 | Cyan | `#06B6D4` |
| 7 | Blue | `#3B82F6` |
| 8 | Violet | `#8B5CF6` |
| 9 | Pink | `#EC4899` |
| 10 | Slate | `#64748B` |

**CATEGORY awal (dikonfirmasi PO, K-47):** Tempat Makan, Wisata, Cafe, Fasilitas Umum, Playground.

Seluruh preset/seed adalah reference data, **bukan enum hard-coded** sebagai business constraint.

---

## 23. High-Level Data Structure

```text
users
 ├── my_places
 │    ├── my_place_categories
 │    ├── my_place_tags
 │    ├── my_place_photos ──(source, optional)──▶ master_place_photos
 │    ├── visits
 │    │    └── visit_photos
 │    └── my_place_master_histories
 ├── tags
 └── itineraries
      └── itinerary_places ──▶ my_places

master_places
 ├── master_place_categories
 ├── master_place_photos
 └── referenced by my_places

categories
 ├── master_place_categories
 └── my_place_categories

ref_tag_colors       (shared preset only — NO FK TO tags)
ref_user_roles       (reference)

users ──< email_change_requests
users ──< backup_logs (triggered_by)
app_settings         (konfigurasi aplikasi, dikelola Admin)
```

**Core tables:** `users`, `categories`, `master_places`, `master_place_categories`, `my_places`, `my_place_categories`, `tags`, `my_place_tags`, `my_place_photos`, `ref_tag_colors`, `master_place_photos`, `my_place_master_histories`, `visits`, `visit_photos`, `itineraries`, `itinerary_places`, `email_change_requests`, `app_settings`, `backup_logs`.

**Relasi yang sengaja tanpa FK:**

| Relasi | Alasan |
|---|---|
| `tags.color` → `ref_tag_colors` | TAG menyimpan nilai warna aktual; reference dapat diubah/dinonaktifkan tanpa merusak TAG existing. |
| `users.role`, `my_places.master_relation_status`, history `action` → tabel reference | Reference value; tidak menggunakan FK database (sesuai ERD). |

Struktur ini merupakan logical structure. Detail physical schema, UID publik, tipe data, index, dan ON DELETE behavior ditentukan pada ERD (ERD-PPJ-001 v1.3.0, `ERD_PPJ.md`) dan SRS. BRD tidak mengunci database engine tertentu.

---

## 24. Non-Functional Requirements

| ID | Kategori | Requirement | Target |
|---|---|---|---|
| NFR-PERF-001 | Performance | Waktu respons halaman list MY PLACE / peta | ≤ 2 detik untuk 1.000 record |
| NFR-SCAL-001 | Scalability | Jumlah Explorer & user aktif bersamaan Fase 1 | `TBD` |
| NFR-AVAIL-001 | Availability | Uptime | ≥ 99% per bulan |
| NFR-USAB-001 | Usability | Dapat digunakan pada layar mobile (web responsive) | Lebar layar ≥ 360px |
| NFR-COMP-001 | Compatibility | Browser yang didukung | 2 versi terakhir Chrome, Edge, Safari, Firefox |
| NFR-A11Y-001 | Accessibility | Standar aksesibilitas | `TBD` |
| NFR-I18N-001 | Localization | Bahasa antarmuka & zona waktu tampilan | Bahasa Indonesia (default) & English; zona waktu tampilan WIB (Asia/Jakarta) |
| NFR-BKP-001 | Backup & Recovery | Backup database & file foto | Manual oleh Admin (Fase 1), terjadwal (Fase 2); RPO/RTO `TBD` (OI-32) |
| NFR-LOG-001 | Observability | Error logging & monitoring | `TBD` |
| NFR-FILE-001 | File Upload | Tipe & ukuran maksimum foto dan avatar; jumlah maksimum foto per VISIT/MY PLACE/MASTER | Dapat dikonfigurasi Admin (13.17); default JPG/PNG/WebP, ≤ 5 MB, 10 per VISIT, 10 per MY PLACE, 20 per MASTER; avatar JPG/PNG/WebP ≤ 5 MB |
| NFR-DATA-001 | Data Integrity | Operasi multi-record (soft delete MASTER + auto UNREFER + history; delete MY PLACE dengan consent) HARUS atomik | Semua atau tidak sama sekali |
| NFR-MAINT-001 | Maintainability | Struktur data dapat digunakan API/backend dan AI coding agent; detail teknis pada SRS | — |

Nilai yang masih `TBD` (scalability, accessibility, observability, RPO/RTO) tercatat pada OI-25 dan OI-32.

---

## 25. Security, Privacy & Compliance

| ID | Requirement |
|---|---|
| NFR-SEC-001 | Seluruh akses selain Guest read-only HARUS melalui autentikasi. |
| NFR-SEC-002 | Ownership HARUS divalidasi di sisi server untuk setiap operasi data personal. |
| NFR-SEC-003 | Password TIDAK BOLEH disimpan dalam bentuk plain text. |
| NFR-SEC-004 | Password HARUS memuat huruf kecil, huruf besar, angka, dan simbol; minimal 8 karakter; password hasil generate 12 karakter. |
| NFR-SEC-005 | Password hasil generate hanya ditampilkan kepada Admin pada saat reset. |
| NFR-SEC-006 | User `INACTIVE`/`DELETED` TIDAK BOLEH dapat login; sesi aktifnya diakhiri. |
| NFR-SEC-007 | Session timeout: `TBD`. |
| NFR-SEC-008 | Endpoint Guest HARUS hanya mengekspos data MASTER PLACE `ACTIVE`. |
| NFR-SEC-009 | Mode aktif akun ADMIN HARUS divalidasi di sisi server untuk setiap fungsi Admin maupun Explorer. |
| NFR-SEC-010 | Link konfirmasi email berupa token acak sekali pakai, berlaku 24 jam, dan disimpan dalam bentuk hash. |
| NFR-SEC-011 | User HARUS mengganti password setelah akun dibuat atau password di-reset. |
| NFR-SEC-012 | File backup memuat data pribadi; hanya Admin yang dapat mengakses/mengunduh melalui kanal aman. |
| NFR-SEC-013 | Kegagalan login HARUS menampilkan pesan generik yang tidak mengungkap apakah email/username terdaftar. |
| NFR-PRIV-005 | Lokasi perangkat hanya diakses dengan izin pengguna dan digunakan sebagai titik tengah peta; tidak disimpan kecuali dipilih sebagai pin. |
| NFR-PRIV-001 | Data pribadi (name, username, email, avatar, lokasi MY PLACE, foto tinjauan MY PLACE, foto VISIT, waktu kunjungan) diklasifikasikan sebagai data sensitif. |
| NFR-PRIV-002 | Penghapusan permanen/anonimisasi data pribadi atas permintaan user: Fase 2. |
| NFR-PRIV-003 | Metadata lokasi GPS (EXIF) HARUS dihapus dari foto (termasuk avatar dan foto tinjauan) saat upload. |
| NFR-PRIV-004 | VISIT PHOTO atau MY PLACE PHOTO yang dijadikan MASTER PLACE PHOTO menjadi data publik tanpa memerlukan persetujuan/pemberitahuan Explorer; Admin bertanggung jawab atas kelayakan foto yang dipublikasikan. |
| NFR-COMP-002 | Aplikasi HARUS mengikuti UU PDP No. 27/2022 (Indonesia). |

**Klasifikasi data:**

| Data | Klasifikasi | Siapa yang Boleh Melihat |
|---|---|---|
| email, username, password user | Confidential | User ybs (email, username), Admin (email, username) |
| MY PLACE, koordinat, TAG, FAVORITE | Personal | Explorer pemilik; Admin (read-only MY PLACE) |
| VISIT, rating, catatan | Personal | Explorer pemilik |
| VISIT PHOTO | Personal | Explorer pemilik; Admin (read-only) |
| MY PLACE PHOTO | Personal | Explorer pemilik; Admin (read-only) |
| Avatar | Confidential | User ybs; Admin (read-only) |
| ITINERARY | Personal | Explorer pemilik |
| MASTER PLACE `ACTIVE`, CATEGORY, MASTER PLACE PHOTO, rating MASTER | Public | Semua, termasuk Guest |
| MASTER RELATION HISTORY | Internal | Admin; Explorer untuk MY PLACE miliknya |
| Request perubahan email | Confidential | User ybs, Admin |
| File backup | Confidential | Admin |

---

## 26. Assumptions, Constraints & Dependencies

### 26.1 Assumptions

| ID | Status | Deskripsi | Dampak Jika Salah |
|---|---|---|---|
| AS-01 | ACTIVE | Explorer memiliki koneksi internet saat menggunakan aplikasi | Perlu mode offline (Out-of-Scope) |
| AS-02 | `DEPRECATED` | Ditetapkan menjadi constraint CO-05 (K-28) | — |
| AS-03 | `DEPRECATED` | Dikonfirmasi PO (K-17) | — |
| AS-04 | `DEPRECATED` | Dikonfirmasi menjadi aturan 10.1 (K-29) | — |
| AS-05 | `DEPRECATED` | Digantikan keputusan bilingual (K-27, NFR-I18N-001) | — |
| AS-06 | ACTIVE | KPI pada Section 6 masih usulan; target ditetapkan setelah baseline 3 bulan | Perlu revisi BO |
| AS-07 | `DEPRECATED` | Dikonfirmasi menjadi aturan 10.4 (K-29) | — |
| AS-08 | `DEPRECATED` | Dikonfirmasi menjadi BR-MYP-011 (K-29) | — |
| AS-09 | `DEPRECATED` | Dikonfirmasi menjadi aturan DR-015 (K-52) | — |
| AS-10 | `DEPRECATED` | Dikonfirmasi menjadi aturan FR-USR-011 (K-51) | — |
| AS-11 | `DEPRECATED` | Dikonfirmasi menjadi aturan BR-USR-010 (K-51) | — |
| AS-12 | `DEPRECATED` | Dikonfirmasi menjadi aturan FR-USR-022 (K-51) | — |
| AS-13 | `DEPRECATED` | Dikonfirmasi menjadi aturan BR-BKP-001 (K-51) | — |
| AS-14 | `DEPRECATED` | Dikonfirmasi menjadi aturan BR-CFG-004 (K-51) | — |
| AS-15 | `DEPRECATED` | Dikonfirmasi menjadi aturan Section 17 (K-51) | — |

### 26.2 Constraints

| ID | Deskripsi | Dampak |
|---|---|---|
| CO-01 | Tidak ada self-registration pada Fase 1 | Akun Explorer dibuat Admin |
| CO-02 | Admin tidak dapat membuat Admin baru pada Fase 1 | Admin awal melalui seed |
| CO-03 | Tidak ada restore MASTER PLACE pada Fase 1 | Penghapusan MASTER bersifat final |
| CO-04 | BRD tidak mengunci database engine, framework, atau storage provider | Ditetapkan di SRS |
| CO-05 | Aplikasi berupa web responsive (bukan aplikasi native) | Pengalaman mobile melalui browser |
| CO-06 | Pada Fase 1 hanya akun ADMIN yang dapat switch mode | — |
| CO-07 | Backup Fase 1 dijalankan manual oleh Admin; restore tidak melalui aplikasi | Bergantung disiplin Admin (RK-13) |
| CO-08 | Bahasa antarmuka terbatas pada Bahasa Indonesia dan English | Bahasa lain perlu pengembangan |

Tidak ada constraint budget, jadwal, atau tim yang ditetapkan untuk Fase 1.

### 26.3 Dependencies

| ID | Deskripsi | Dampak Jika Tidak Tersedia |
|---|---|---|
| DP-01 | Ketersediaan Google Maps & Google Places API | Pencarian & peta terganggu |
| DP-02 | Layanan penyimpanan file foto (ditentukan SRS) | Upload foto tidak berfungsi |
| DP-03 | ERD-PPJ-001 dan SRS-PPJ-001 selaras dengan BRD ini (ERD-PPJ-001 v1.3.0) | Implementasi tidak konsisten |
| DP-04 | Layanan pengiriman email (ditentukan SRS) | Perubahan email tidak dapat dikonfirmasi |
| DP-05 | Media penyimpanan file backup (ditentukan SRS) | Backup tidak dapat dijalankan |

---

## 27. Risks & Mitigation

| ID | Risiko | Probabilitas | Dampak | Mitigasi | Owner | Status |
|---|---|---|---|---|---|---|
| RK-01 | Biaya/kuota Google API melebihi budget | Medium | High | Batasi pencarian, caching (SRS), fallback pin manual | Tech Lead | OPEN |
| RK-02 | MASTER PLACE duplikat | High | Medium | Review Admin, RE-REFER, warning duplikasi (K-37) | PO | OPEN |
| RK-03 | Antrean pengajuan `REVIEW` menumpuk karena tidak dapat dibatalkan | Medium | Medium | Admin dapat refer inisiatif/menolak; pantau BO-04 | PO | OPEN |
| RK-04 | Foto personal menjadi publik tanpa sepengetahuan Explorer | Medium | Medium | Kurasi oleh Admin yang kredibel; EXIF GPS dihapus saat upload (K-49) | PO | ACCEPTED (K-16) |
| RK-05 | Kebocoran data personal antar Explorer | Low | High | Validasi ownership server-side (NFR-SEC-002), test isolasi | Tech Lead | OPEN |
| RK-06 | Inkonsistensi `visit_status` dengan jumlah VISIT | Medium | Medium | Pembaruan status dalam transaksi yang sama | Tech Lead | OPEN |
| RK-07 | Explorer kehilangan data/history karena menghapus MY PLACE | Medium | High | DELETE CONSENT dengan rincian data terkait; saran INACTIVE | PO | OPEN |
| RK-08 | Admin menyalahgunakan mode (fungsi Admin atas data pribadinya, self-review) | Low | Medium | Mode eksklusif & validasi server-side | PO | ACCEPTED (K-22) |
| RK-09 | Penghapusan history via CASCADE terpicu tanpa consent | Low | High | DELETE CONSENT divalidasi di service layer; delete MY PLACE hanya melalui business transaction | Tech Lead | OPEN |
| RK-10 | Ketentuan Google Maps Platform membatasi penyimpanan konten Places (selain `place_id`), sedangkan aplikasi menyimpan nama/alamat/koordinat hasil prefill | Medium | High | Kajian ToS pada SRS (OI-34); simpan `google_place_id` sebagai referensi; data yang disimpan adalah hasil konfirmasi/edit user | PO, Tech Lead | OPEN |
| RK-11 | Password Explorer diketahui Admin saat reset | Medium | Medium | Password generate ditampilkan sekali; wajib ganti password setelah reset (FR-USR-017) | PO | OPEN |
| RK-12 | Admin menjadi bottleneck review pengajuan | Medium | Medium | Refer inisiatif, self-review diizinkan; pantau BO-04 | PO | OPEN |
| RK-13 | Kehilangan data karena backup manual tidak rutin dijalankan | Medium | High | Backup manual + riwayat backup (FR-BKP-001..002); scheduler pada Fase 2 | PO, Tech Lead | OPEN |
| RK-14 | Email konfirmasi tidak terkirim/masuk spam | Low | Medium | User dapat mengajukan ulang; konfigurasi pengirim email pada SRS (OI-33) | Tech Lead | OPEN |
| RK-15 | Username lebih mudah ditebak daripada email sehingga percobaan login tidak sah meningkat; username lama yang dipakai akun lain dapat membingungkan | Medium | Medium | Pesan login generik (NFR-SEC-013); pembatasan percobaan login ditetapkan pada SRS (OI-25); username hanya diganti pemilik akun | Tech Lead | OPEN |
| RK-16 | Volume penyimpanan file bertambah karena avatar dan foto tinjauan MY PLACE | Medium | Medium | Batas tipe, ukuran, dan jumlah melalui `app_settings` (13.17); file avatar lama dihapus saat diganti; kapasitas storage ditetapkan pada SRS (OI-28) | Tech Lead | OPEN |

---

## 28. Open Issues / TBD Log

| ID | Pertanyaan / Isu | Section | Owner | Target Keputusan | Status | Keputusan |
|---|---|---|---|---|---|---|
| OI-01 | Target angka KPI Business Objectives | 6 | PO | 3 bulan setelah rilis Fase 1 | DEFERRED | Ditetapkan dari data baseline (K-50) |
| OI-02 | Target waktu rilis Fase 1 dan Fase 2 | 7.3 | PO | `TBD` | DEFERRED | Menyusul (K-50) |
| OI-03 | Kriteria warning duplikasi MY PLACE | 12.1, 13.4 | PO | 2026-10-13 | CLOSED | `google_place_id` sama / MASTER sama / jarak ≤ 50 m pada milik user yang sama (K-37) |
| OI-04 | Restore user `DELETED` dan hak penghapusan permanen data pribadi | 14.5, 17, 25 | PO | 2026-10-13 | CLOSED | Restore oleh Admin; penghapusan permanen Fase 2 (K-45) |
| OI-05 | Explorer melihat MASTER `INACTIVE` yang direferensikan | 10.5 | PO | 2026-10-13 | CLOSED | Boleh, read-only, berlabel "Tidak aktif" (K-38) |
| OI-06 | Ubah profil & password sendiri; wajib ganti password setelah reset | 10.5, 13.1 | PO | 2026-10-13 | CLOSED | Boleh; email via konfirmasi link 24 jam; wajib ganti password (K-32) |
| OI-07 | MY PLACE dari MASTER langsung `REFERRED` + history | 12.1, 14.1 | PO | 2026-10-13 | CLOSED | Ya (K-17) |
| OI-08 | Referensi MY PLACE sumber saat Admin membuat MASTER | 12.4 | PO | 2026-10-13 | CLOSED | Checkbox (K-18) |
| OI-09 | Cakupan VISIT PHOTO untuk MASTER PLACE PHOTO | 12.8 | PO | 2026-10-13 | CLOSED | Hanya dari MY PLACE yang mereferensikan MASTER; upload langsung oleh Admin tetap tersedia (K-35) |
| OI-10 | Panjang minimum password & password generate | 12.9, 25 | PO | 2026-10-13 | CLOSED | Min 8; generate 12 (K-33) |
| OI-11 | Field wajib & batas panjang | 13.2–13.4 | PO | 2026-10-13 | CLOSED | K-34 |
| OI-12 | Hapus CATEGORY | 13.3, 17 | PO | 2026-10-13 | CLOSED | Hanya bila belum dipakai (K-39) |
| OI-13 | Pengelolaan TAG COLOR REFERENCE | 13.8 | PO | 2026-10-13 | CLOSED | UI Admin (K-40) |
| OI-14 | Konsistensi konteks VISIT | 13.9 | PO | 2026-10-13 | CLOSED | Wajib (K-41) |
| OI-15 | `visited_at` masa depan | 13.9 | PO | 2026-10-13 | CLOSED | Tidak boleh (K-42) |
| OI-16 | Tipe, ukuran, jumlah foto | 13.10, 24 | PO | 2026-10-13 | CLOSED | Konfigurasi aplikasi oleh Admin (K-36) |
| OI-17 | Validasi tanggal ITINERARY & keunikan `sequence` | 13.12 | PO | 2026-10-13 | CLOSED | K-43 |
| OI-18 | Rating MASTER dari user `INACTIVE`/`DELETED` | 16 | PO | 2026-10-13 | CLOSED | INACTIVE dihitung, DELETED tidak (K-44) |
| OI-19 | History relasi saat MY PLACE dihapus | 17 | PO | 2026-10-13 | CLOSED | DELETE CONSENT (K-14, K-15) |
| OI-20 | Retensi data soft-deleted | 17 | PO | 2026-10-13 | CLOSED | Permanen di Fase 1; purge Fase 2 (K-46) |
| OI-21 | Penamaan `RE-REFER` | 18.4 | PO | 2026-10-13 | CLOSED | Tetap (K-19) |
| OI-22 | Acceptance criteria lengkap untuk seluruh FR `Must` | 19 | BA, QA | Sebelum status APPROVED | OPEN | — |
| OI-23 | Fallback Google Maps, biaya/kuota, API key management | 21 | Tech Lead | SRS | OPEN | — |
| OI-24 | Daftar CATEGORY awal | 22 | PO | 2026-10-13 | CLOSED | 5 kategori (K-47) |
| OI-25 | Target NFR tersisa: scalability, accessibility, observability, session timeout | 24, 25 | Tech Lead | SRS | OPEN | Sebagian ditetapkan (K-48) |
| OI-26 | EXIF lokasi & UU PDP | 25 | PO | 2026-10-13 | CLOSED | EXIF GPS dihapus; ikut UU PDP (K-49) |
| OI-27 | Persetujuan Explorer atas VISIT PHOTO menjadi publik | 25 | PO | 2026-10-13 | CLOSED | Tidak diperlukan (K-16) |
| OI-28 | Mekanisme storage file final | 13.10, 13.11 | Tech Lead | SRS | OPEN | — |
| OI-29 | Perilaku peta tanpa izin lokasi | 13.14 | PO | 2026-10-13 | CLOSED | K-24 |
| OI-30 | Pembaruan ERD (`is_active`, ON DELETE) | 13.4, 17, 23 | PO | 2026-10-13 | CLOSED | ERD-PPJ-001 v1.0.0 (K-25) |
| OI-31 | Admin melihat MY PLACE `INACTIVE` | 13.4 | PO | 2026-10-13 | CLOSED | K-26 |
| OI-32 | Lokasi penyimpanan & retensi file backup; RPO/RTO | 13.18, 24 | Tech Lead | SRS | OPEN | — |
| OI-33 | Penyedia layanan pengiriman email & konfigurasi pengirim | 21 | Tech Lead | SRS | OPEN | — |
| OI-34 | Kajian ToS Google Maps Platform atas penyimpanan data Places | 21, 27 | PO, Tech Lead | Sebelum implementasi | OPEN | — |
| OI-35 | Penyelarasan ERD ke BRD v1.1.0: `users.preferred_language`, `users.must_change_password`, `email_change_requests`, `app_settings`, `backup_logs`, batas panjang & check constraint baru | 13, 23 | Tech Lead | 2026-10-13 | CLOSED | ERD-PPJ-001 v1.1.0 (`ERD_PPJ_v1.1.0.md`) |
| OI-36 | Penyelarasan ERD ke BRD v1.2.0: kolom `users.username`, unique case-insensitive, check panjang & format | 13.1, 23 | Tech Lead | 2026-10-14 | CLOSED | ERD-PPJ-001 v1.2.0 (`result/v1.2.0/ERD_PPJ_v1.2.0.md`) |
| OI-37 | Penyelarasan ERD ke BRD v1.3.0: kolom avatar pada `users`, tabel `my_place_photos`, sumber `master_place_photos.source_my_place_photo_id`, key `app_settings` baru | 13.1, 13.11, 13.17, 13.19, 23 | Tech Lead | 2026-10-15 | CLOSED | ERD-PPJ-001 v1.3.0 (`result/v1.3.0/ERD_PPJ_v1.3.0.md`) |

---

## 29. Requirement Traceability Matrix

| Business Objective | Requirement | User Story | Acceptance Criteria | Test Case | Status |
|---|---|---|---|---|---|
| BO-01 | FR-USR-001..009 | US-001..004 | AC-FR-USR-003-01, AC-FR-USR-007-01, AC-FR-USR-008-01, AC-FR-USR-009-01 | `TBD` | Planned |
| BO-01 | FR-MAP-001..005, FR-MYP-001..009 | US-006, US-007 | AC-FR-MYP-002-01, AC-FR-MYP-003-02, AC-FR-MYP-006-01 | `TBD` | Planned |
| BO-01 | FR-CAT-004..006, FR-TAG-001..005, FR-CLR-001, FR-FAV-001..002, FR-FLT-001..002 | US-008..011 | AC-FR-CAT-005-01, AC-FR-TAG-001-02, AC-FR-TAG-003-02 | `TBD` | Planned |
| BO-02 | FR-VST-001..006, FR-VPH-001..003 | US-012 | AC-FR-VST-001-01, AC-FR-VST-004-02, AC-FR-VST-005-01 | `TBD` | Planned |
| BO-03 | FR-REL-001..014 | US-016..018 | AC-FR-REL-001-01, AC-FR-REL-003-01, AC-FR-REL-004-01, AC-FR-REL-010-01..02, AC-FR-REL-012-01..02 | `TBD` | Planned |
| BO-04 | FR-REL-007..010 | US-017 | AC-FR-REL-010-01..02 | `TBD` | Planned |
| BO-03, BO-06 | FR-MST-001..010, FR-CAT-001..003, FR-CLR-002 | US-019, US-021 | AC-FR-MST-005-01, AC-FR-MST-007-01 | `TBD` | Planned |
| BO-06 | FR-MPH-001..003 | US-020 | AC-FR-MPH-002-01 | `TBD` | Planned |
| BO-05 | FR-ITN-001..005, FR-VST-002..003, FR-RTE-001..004 | US-013..015 | AC-FR-ITN-002-02, AC-FR-ITN-003-01, AC-FR-VST-003-01 | `TBD` | Planned |
| BO-06 | FR-GST-001..003, FR-INT-001..002 | US-005 | AC-FR-GST-003-01, AC-FR-GST-001-02 | `TBD` | Planned |
| BO-01 | FR-MYP-010..014 | US-022, US-023 | AC-FR-MYP-010-01, AC-FR-MYP-011-01..02, AC-FR-MYP-012-01, AC-FR-MYP-013-01..02 | `TBD` | Planned |
| BO-01 | FR-USR-012..016 | US-024 | AC-FR-USR-012-02, AC-FR-USR-013-01, AC-FR-USR-014-01, AC-FR-USR-015-01 | `TBD` | Planned |
| BO-01 | FR-MAP-005..007 | US-025 | AC-FR-MAP-005-01, AC-FR-MAP-007-01 | `TBD` | Planned |
| BO-03 | FR-MYP-009 | US-018 | AC-FR-MYP-009-01 | `TBD` | Planned |
| BO-03 | FR-MST-002, BR-REL-008..009 | US-026 | AC-FR-REL-008-01, AC-BR-REL-009-01..02 | `TBD` | Planned |
| BO-01 | FR-USR-011, FR-USR-017..022, FR-NTF-001 | US-027..029 | AC-FR-USR-017-01, AC-FR-USR-019-01..03, AC-FR-USR-020-01, AC-FR-USR-021-01 | `TBD` | Planned |
| BO-01 | FR-BKP-001..005 | US-030 | AC-FR-BKP-001-01..02 | `TBD` | Planned |
| BO-02, BO-06 | FR-CFG-001..003, FR-MPH-001 | US-031 | AC-FR-CFG-001-01, AC-FR-CFG-002-01 | `TBD` | Planned |
| BO-03 | FR-MYP-007, FR-MST-011, FR-CAT-007 | US-007, US-019 | AC-FR-MYP-007-01, AC-FR-MST-011-01, AC-FR-CAT-007-01 | `TBD` | Planned |
| BO-02 | FR-VST-001 (validasi `visited_at`) | US-012 | AC-FR-VST-001-02 | `TBD` | Planned |
| BO-01 | FR-USR-001, FR-USR-023..024 | US-002, US-032 | AC-FR-USR-001-01..02, AC-FR-USR-023-01, AC-FR-USR-024-01..03 | `TBD` | Planned |
| BO-01 | FR-USR-025..026, FR-CFG-001..002 | US-033 | AC-FR-USR-025-01..02, AC-FR-USR-026-01 | `TBD` | Planned |
| BO-01 | FR-MYP-015, FR-MPP-001..004 | US-034 | AC-FR-MPP-001-01..02 | `TBD` | Planned |
| BO-06 | FR-MPH-004 | US-035 | AC-FR-MPH-004-01..02 | `TBD` | Planned |

---

## 30. AI Implementation Rules

AI coding agent **HARUS** mengikuti prinsip berikut:

**Umum**
1. Jangan mengubah business rule tanpa persetujuan.
2. Jika requirement belum ditentukan, jangan mengarang business rule baru; tandai `TBD`.
3. Perubahan struktur database yang memengaruhi business rule harus disetujui terlebih dahulu.

**Domain — MASTER & MY PLACE**
4. Jangan menggabungkan MASTER PLACE dan MY PLACE menjadi satu entitas.
5. Jangan membuat perubahan MASTER PLACE otomatis mengubah MY PLACE.
6. Admin mengubah draft MASTER, bukan data MY PLACE sumber.
7. Jangan menganggap beberapa MY PLACE dengan MASTER yang sama sebagai duplikasi ilegal.
8. MY PLACE dan ITINERARY PLACE tidak wajib memiliki MASTER PLACE.
9. MASTER `INACTIVE` tidak mengubah status MY PLACE yang mereferensikannya.

**Domain — State & History**
10. Jangan menggunakan PLAN/VISITED sebagai status workflow MASTER; jangan mencampur state machine.
11. Jangan menyediakan pembatalan pengajuan `REVIEW`; jangan izinkan pengajuan dari `REVIEW`/`REFERRED`.
12. Edit MY PLACE selama `REVIEW` tidak boleh mengubah snapshot pengajuan.
13. Semua business action relasi MASTER harus menghasilkan history.
14. Automatic UNREFER akibat MASTER deletion harus menghasilkan history dengan actor Admin yang menghapus.
15. Delete MY PLACE dan delete User tidak boleh membuat history relasi massal.
16. History MASTER relation append-only; tidak boleh diedit/dihapus, kecuali ikut terhapus saat owner menghapus MY PLACE dengan DELETE CONSENT.
17. `RE-REFER` adalah action history, bukan state.

**Domain — Visit & Itinerary**
18. Jangan membuat tabel khusus unexpected visit; gunakan konteks ITINERARY tanpa ITINERARY PLACE.
19. Jangan menambahkan `sequence` pada VISIT; gunakan `visited_at` untuk actual order.
20. Gunakan `sequence` pada ITINERARY PLACE untuk planned order; satu MY PLACE boleh muncul lebih dari satu kali.
21. Start/end date ITINERARY tidak boleh menjadi constraint `VISIT.visited_at`.
22. Jangan membuat factual visit note pada ITINERARY PLACE.
23. Rating hanya melekat pada VISIT (NULL atau 1–5); rating MY PLACE & MASTER adalah calculated value.

**Domain — TAG, CATEGORY, FAVORITE**
24. Jangan membuat TAG global; jangan menyatukan TAG dengan CATEGORY.
25. Jangan izinkan Explorer membuat CATEGORY.
26. Jangan membuat FAVORITE sebagai entity terpisah; default OFF.
27. Jangan membuat `tag_color_id` sebagai foreign key; `tags.color` menyimpan nilai aktual.
28. Jangan mengubah warna TAG existing karena reference color diubah/dinonaktifkan.

**Photo**
29. Foto VISIT, foto tinjauan MY PLACE, dan foto MASTER memiliki lifecycle/storage reference independen; MASTER PHOTO bukan alias VISIT PHOTO maupun MY PLACE PHOTO.

**Ownership & Security**
30. Validasi ownership di sisi server sebelum operasi pada MY PLACE, MY PLACE PHOTO, TAG, VISIT, VISIT PHOTO, dan ITINERARY.
31. Guest hanya boleh menerima data MASTER PLACE `ACTIVE`.
32. Jangan izinkan pembuatan akun Admin melalui aplikasi pada Fase 1.
33. Password random hasil generate harus memuat huruf kecil, huruf besar, angka, dan simbol; jangan simpan password plain text.
34. Jangan hapus MY PLACE yang memiliki history atau ITINERARY PLACE tanpa DELETE CONSENT; tampilkan alasan dan sarankan INACTIVE.
35. Jangan izinkan MY PLACE `INACTIVE` dipakai untuk ITINERARY PLACE baru, VISIT baru, atau pengajuan; jangan ubah referensi MASTER saat menonaktifkan.
36. Jangan menghitung VISIT dari MY PLACE `INACTIVE` pada rating MASTER.
37. Jangan membuat skema data personal terpisah untuk Admin; data mode Explorer milik Admin memakai tabel & aturan yang sama dengan Explorer.
38. Validasi mode aktif akun ADMIN di sisi server; fungsi Admin dan Explorer tidak boleh aktif bersamaan; login selalu ke mode Admin.
39. Lokasi perangkat hanya dipakai sebagai titik tengah peta; jangan membatasi pin hanya pada lokasi perangkat.
40. Email hanya berubah setelah konfirmasi link (sekali pakai, 24 jam); berlaku juga saat Admin mengubah email Explorer.
41. Wajibkan ganti password setelah akun dibuat atau password di-reset.
42. Validasi upload foto terhadap `app_settings` yang berlaku saat upload; jangan hard-code aturan foto.
43. Hapus metadata GPS (EXIF) saat upload foto.
44. Jangan sediakan restore backup melalui aplikasi; backup dan unduh file backup hanya untuk Admin.
45. Bilingual hanya untuk teks antarmuka; jangan menerjemahkan data yang diinput user.
46. Tolak `visited_at` di masa depan; jaga `sequence` unik per ITINERARY dan `end_date ≥ start_date`.
47. Jangan hitung VISIT milik user `DELETED` pada rating MASTER.
48. Login menerima email atau username; identifier yang mengandung `@` dicocokkan dengan email, selain itu dengan username; pesan gagal login generik.
49. Username 4–20 karakter (huruf, angka, `.`, `_`), disimpan lowercase, unik case-insensitive termasuk user soft-deleted; hanya pemilik akun yang dapat mengganti, berlaku langsung tanpa konfirmasi.
50. Avatar opsional, satu per user, hanya upload file; validasi terhadap `avatar.allowed_types` & `avatar.max_size_mb`; hapus file lama saat diganti; hanya pemilik akun yang dapat mengubah.
51. Foto tinjauan MY PLACE opsional dan boleh lebih dari satu; storage sama dengan VISIT PHOTO (UPLOAD/EXTERNAL/S3); batas jumlah `photo.max_per_my_place`; jangan masukkan ke snapshot pengajuan.
52. MASTER PLACE PHOTO dari MY PLACE PHOTO adalah salinan independen dengan `source_my_place_photo_id`; hanya dari MY PLACE yang mereferensikan MASTER tersebut; satu MASTER PHOTO maksimal satu sumber.

---

## 31. Business Flow Summary

```text
GUEST
   └── View Map
         └── MASTER PLACE ACTIVE (detail, category, rating, photo)

EXPLORER
   ├── Search Map (center = lokasi perangkat)
   │     ├── Google Places
   │     ├── MASTER PLACE
   │     └── Manual Pin (bebas)
   ├── Create MY PLACE
   │     ├── from Google
   │     ├── from MASTER
   │     ├── New personal place
   │     └── Foto tinjauan (opsional)
   ├── Manage MY PLACE
   │     ├── CATEGORY (pilih)
   │     ├── TAG
   │     ├── FAVORITE
   │     ├── Foto tinjauan (MY PLACE PHOTO)
   │     ├── Inactivate / Activate
   │     ├── Delete (consent bila ada history / itinerary)
   │     └── VISIT
   │           ├── Rating
   │           └── VISIT PHOTO
   ├── Submit / Resubmit MASTER
   ├── Manage ITINERARY
   │     ├── Planned Places
   │     │     ├── Existing MY PLACE
   │     │     └── New MY PLACE (PLAN)
   │     ├── Actual Visits
   │     │     ├── Planned Place Visit
   │     │     └── Unexpected Visit
   │     └── Route (planned vs actual)
   ├── Login (email atau username)
   ├── Profile
   │     ├── Nama / Username / Password
   │     ├── Foto profil (avatar)
   │     ├── Email (konfirmasi link)
   │     └── Bahasa (ID / EN)
   └── Filter / Search
         ├── CATEGORY
         ├── TAG
         ├── FAVORITE
         ├── VISIT STATUS
         └── MASTER RELATION STATUS

ADMIN  (login → mode ADMIN; Switch ⇄ mode EXPLORER = seluruh alur EXPLORER di atas atas data milik sendiri)
   ├── Manage USER (Explorer)
   │     ├── Create (username awal wajib) / Update (tanpa username)
   │     ├── Inactivate / Activate / Soft delete / Restore
   │     ├── Change Email (konfirmasi link)
   │     └── Reset Password (generate / manual)
   ├── Manage MASTER PLACE
   │     ├── Manual CRUD
   │     ├── From MY PLACE (draft + checkbox referensi)
   │     ├── From Submission
   │     └── Inactivate / Activate / Soft delete
   ├── Review Submission
   │     ├── REJECTED
   │     └── REFERRED (new / existing MASTER)
   ├── Refer / RE-REFER / UNREFER MY PLACE
   ├── Manage MASTER PHOTOS
   │     ├── Upload
   │     ├── From VISIT PHOTO
   │     └── From MY PLACE PHOTO
   ├── Manage CATEGORY
   ├── Manage TAG COLOR REFERENCE
   ├── Manage Photo & Avatar Settings
   └── Backup (manual, unduh)

REFERENCE DATA
   └── TAG COLOR
         ├── shared by all Explorers
         ├── preset for TAG
         └── no FK to TAG
```

---

## 32. Appendix

### 32.1 Dokumen Terkait

| Dokumen | File | Keterangan |
|---|---|---|
| Kebutuhan awal | `SPEC-PPJ.md` | Sumber kebutuhan awal; ketentuan "semua tempat itinerary masuk master" digantikan oleh K-02 |
| BRD v1.0.0 (arsip) | `BRD_PPJ_v1.0.0.md` | Digantikan oleh versi ini |
| BRD sebelumnya | `BRD_final.md` | Basis BRD v1.0.0 |
| ERD | `ERD_PPJ.md` (ERD-PPJ-001 v1.3.0) | Logical data model, UID, ON DELETE matrix (arsip: `result/v1.3.0/ERD_PPJ_v1.3.0.md`, `result/v1.2.0/ERD_PPJ_v1.2.0.md`, `result/v1.1.0/ERD_PPJ_v1.1.0.md`, `result/v1.0.0/ERD_PPJ_v1.0.0.md`, `ERD_final.md`) |
| Standar BRD | `standard/BRD_standard.md` | Acuan struktur dokumen |

### 32.2 Contoh Data

```text
USER A (Explorer)
 ├── TAG: Wajib Coba (#EF4444), Keluarga (#3B82F6), Work From Cafe (#10B981)
 ├── MY PLACE: Cafe ABC  [REFERRED → MASTER "Cafe ABC"] [VISITED] [FAVORITE ON]
 │     ├── CATEGORY: Cafe
 │     ├── TAG: Wajib Coba, Work From Cafe
 │     ├── VISIT #1 — 2026-01-10, rating 4
 │     ├── VISIT #2 — 2026-02-15, rating 5
 │     └── VISIT #3 — 2026-03-20, rating NULL
 │           → rating MY PLACE = AVG(4,5) = 4.5
 └── ITINERARY: Liburan Malang
       ├── 1. Hotel
       ├── 2. Museum
       ├── 3. Cafe ABC
       └── 4. Jatim Park
```

### 32.3 Mockup

`TBD` — UI-Mockup belum tersedia.
