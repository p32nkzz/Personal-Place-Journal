import { getCurrentUser } from "~/server/auth/session";
import { redirect } from "next/navigation";
import { HomeMap } from "./HomeMap";

export const metadata = { title: "Map" };

const num = (v: string | string[] | undefined, min: number, max: number) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user?.mustChangePassword) redirect("/change-password");
  const viewer = !user ? "GUEST" : user.mode === "ADMIN" ? "ADMIN" : "EXPLORER";
  // Kembali dari form tempat baru (tombol Batal): pin bebas aktif; pin dipasang bila koordinat ada.
  const back = sp.freepin === "1";
  // Dari tombol "Tambah dari peta": pin bebas aktif + daftar lokasi terdekat langsung terbuka.
  const add = sp.add === "1";
  const my = typeof sp.my === "string" && /^[0-9a-f-]{36}$/i.test(sp.my) ? sp.my : null;
  const lat = num(sp.lat, -90, 90);
  const lng = num(sp.lng, -180, 180);
  return (
    <HomeMap
      viewer={viewer}
      initialFreePin={(back || add) && viewer !== "GUEST"}
      initialNearby={add && viewer !== "GUEST"}
      initialMy={viewer === "EXPLORER" && my && lat != null && lng != null ? { uid: my, lat, lng } : null}
      initialPin={back && viewer !== "GUEST" && lat != null && lng != null ? { lat, lng } : null}
    />
  );
}
