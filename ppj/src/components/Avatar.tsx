/* eslint-disable @next/next/no-img-element */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

/** Avatar bulat: foto profil bila ada, selain itu inisial nama (TX-19). */
export function Avatar({
  name,
  src,
  large,
  xl,
}: {
  name: string;
  src?: string | null;
  large?: boolean;
  xl?: boolean;
}) {
  const cls = `avatar${large ? " avatar-lg" : ""}${xl ? " avatar-xl" : ""}${src ? " avatar-img" : ""}`;
  return (
    <span className={cls}>
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}
