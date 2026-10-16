import Image from "next/image";

const TEXT = {
  ID: {
    title: "Database tidak dapat dihubungi",
    text: "Aplikasi sedang tidak dapat terhubung ke database, jadi data belum bisa ditampilkan. Ini bukan kesalahan pada akun atau data Anda.",
    stepsTitle: "Yang bisa dicoba",
    steps: [
      "Tunggu beberapa saat lalu muat ulang halaman.",
      "Jika Anda menjalankan aplikasi sendiri: pastikan server MySQL berjalan (mis. Laragon sudah Start All).",
      "Periksa DATABASE_URL pada file .env (alamat, port, nama database, user, dan password).",
      "Jika masih gagal, hubungi administrator.",
    ],
    retry: "Muat ulang",
  },
  EN: {
    title: "Cannot reach the database",
    text: "The application cannot connect to its database right now, so data cannot be shown. This is not a problem with your account or data.",
    stepsTitle: "What you can try",
    steps: [
      "Wait a moment and reload the page.",
      "If you run the app yourself: make sure the MySQL server is running (e.g. Laragon is started).",
      "Check DATABASE_URL in the .env file (host, port, database name, user, and password).",
      "If it still fails, contact your administrator.",
    ],
    retry: "Reload",
  },
} as const;

/** Halaman mandiri (tanpa akses database) saat koneksi database gagal. */
export function DbUnavailable({ lang, fonts }: { lang: "ID" | "EN"; fonts: string }) {
  const m = TEXT[lang];
  return (
    <html lang={lang === "ID" ? "id" : "en"} className={fonts}>
      {/* Ekstensi browser (mis. ColorZilla: cz-shortcut-listen) menambah atribut di <body> sebelum React
          hydrate; abaikan selisih atribut di elemen ini saja (anak-anaknya tetap diperiksa). */}
      <body suppressHydrationWarning>
        <div className="auth-wrap">
          <div className="auth-card" role="alert" style={{ maxWidth: 520 }}>
            <div className="auth-brand">
              <Image src="/logo.png" alt="" width={72} height={72} priority />
              <h1 className="t-headline" style={{ marginTop: 8 }}>{m.title}</h1>
            </div>
            <p style={{ textAlign: "center", margin: "0 0 12px" }}>{m.text}</p>
            <div className="card" style={{ background: "var(--color-background)", boxShadow: "none", padding: 16 }}>
              <b className="t-small">{m.stepsTitle}</b>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 4 }} className="t-small">
                {m.steps.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            {/* Tautan biasa agar tetap berfungsi tanpa JavaScript. */}
            <p style={{ textAlign: "center", margin: "16px 0 0" }}>
              <a className="btn btn-primary" href="">{m.retry}</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
