import { getCurrentUser } from "~/server/auth/session";
import { MasterPublicView } from "./MasterPublicView";

export const metadata = { title: "MASTER PLACE" };

const UID = /^[0-9a-f-]{36}$/i;
const coord = (v: unknown, lim: number) => {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && Math.abs(n) <= lim ? n : null;
};

export default async function MasterPage({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { uid } = await params;
  const sp = await searchParams;
  // Asal halaman untuk tautan kembali: Peta (pop-up MASTER), pop-up MY PLACE di Peta, atau detail MY PLACE.
  const place = typeof sp.place === "string" && UID.test(sp.place) ? sp.place : null;
  const lat = coord(sp.lat, 90);
  const lng = coord(sp.lng, 180);
  const back =
    sp.from === "place" && place
      ? ({ kind: "place", place } as const)
      : sp.from === "map-place" && place && lat != null && lng != null
        ? ({ kind: "map-place", place, lat, lng } as const)
        : ({ kind: "map" } as const);
  const user = await getCurrentUser();
  const viewer = !user ? "GUEST" : user.mode === "ADMIN" ? "ADMIN" : "EXPLORER";
  return <MasterPublicView uid={uid} viewer={viewer} back={back} />;
}
