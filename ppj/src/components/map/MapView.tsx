"use client";

import {
  AdvancedMarker,
  APIProvider,
  ControlPosition,
  Map,
  MapControl,
  Pin,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";

import { Icon } from "~/components/Icon";
import { Alert, Modal } from "~/components/ui";
import { useT } from "~/lib/i18n";
import { readableOn } from "./colors";
import { useMapSearchConfig } from "./useMapSearchConfig";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  /** Warna latar penanda. */
  color: string;
  glyph?: string;
  glyphColor?: string;
  title?: string;
  /** Penanda terpilih ditampilkan lebih besar. */
  selected?: boolean;
  /** Penanda dapat digeser (drag & drop) oleh user. */
  draggable?: boolean;
  /** Urutan tumpukan (z-index); makin besar makin di atas. Penanda terpilih selalu paling atas. */
  z?: number;
};

export type MapLine = {
  id: string;
  path: { lat: number; lng: number }[];
  color: string;
  dashed?: boolean;
};

export type DeviceLocation = { lat: number; lng: number } | null;

/** FR-MAP-005/007 — lokasi perangkat hanya untuk titik tengah peta; tidak disimpan. */
export function useDeviceLocation(enabled = true) {
  const [loc, setLoc] = useState<DeviceLocation>(null);
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
      setAsked(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
        setAsked(true);
      },
      () => setAsked(true),
      { timeout: 8000, maximumAge: 300000 },
    );
  }, [enabled]);
  return { location: loc, asked };
}

function Lines({ lines }: { lines: MapLine[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const made = lines
      .filter((l) => l.path.length > 1)
      .map((l) => {
        return new google.maps.Polyline({
          map,
          path: l.path,
          strokeColor: l.color,
          strokeOpacity: l.dashed ? 0 : 0.95,
          strokeWeight: l.dashed ? 0 : 4,
          icons: l.dashed
            ? [
                {
                  icon: {
                    path: "M 0,-1 0,1",
                    strokeOpacity: 1,
                    strokeColor: l.color,
                    scale: 3,
                  },
                  offset: "0",
                  repeat: "14px",
                },
              ]
            : undefined,
        });
      });
    return () => made.forEach((p) => p.setMap(null));
  }, [map, lines]);
  return null;
}

function Controller({
  markers,
  focus,
  fit,
  deviceLocation,
}: {
  markers: MapMarker[];
  focus?: { lat: number; lng: number; zoom?: number } | null;
  fit?: boolean;
  deviceLocation: DeviceLocation;
}) {
  const map = useMap();
  const fitted = useRef("");
  const centeredOnDevice = useRef<number | false>(false);
  // Zoom bawaan dari Pengaturan. Bila nilainya baru selesai dimuat setelah peta tampil, efek di bawah
  // dijalankan ulang sekali agar zoom akhir sesuai pengaturan.
  const { defaultZoom } = useMapSearchConfig();
  const zoomRef = useRef(defaultZoom);
  zoomRef.current = defaultZoom;

  useEffect(() => {
    if (!map || !focus) return;
    map.panTo({ lat: focus.lat, lng: focus.lng });
    map.setZoom(focus.zoom ?? zoomRef.current);
  }, [map, focus, defaultZoom]);

  useEffect(() => {
    if (!map || !fit || !markers.length) return;
    const sig = markers.map((m) => `${m.id}:${m.lat}:${m.lng}`).join("|") + `@${defaultZoom}`;
    if (fitted.current === sig) return;
    fitted.current = sig;
    if (markers.length === 1) {
      map.setCenter({ lat: markers[0]!.lat, lng: markers[0]!.lng });
      map.setZoom(zoomRef.current);
      return;
    }
    const b = new google.maps.LatLngBounds();
    markers.forEach((m) => b.extend({ lat: m.lat, lng: m.lng }));
    map.fitBounds(b, 60);
    // Titik yang berhimpitan/berdekatan tidak boleh memicu zoom berlebihan.
    google.maps.event.addListenerOnce(map, "idle", () => {
      const cap = Math.min(21, zoomRef.current + 1);
      if ((map.getZoom() ?? 0) > cap) map.setZoom(cap);
    });
  }, [map, markers, fit, defaultZoom]);

  useEffect(() => {
    // Titik tengah awal = lokasi perangkat bila izin diberikan (K-20).
    if (!map || !deviceLocation || centeredOnDevice.current === defaultZoom || focus || fit) return;
    centeredOnDevice.current = defaultZoom;
    map.setCenter(deviceLocation);
    map.setZoom(zoomRef.current);
  }, [map, deviceLocation, focus, fit, defaultZoom]);

  return null;
}

export function MapView({
  markers = [],
  lines = [],
  onMarkerClick,
  onMarkerDragEnd,
  onMapClick,
  onCenterChange,
  focus,
  fit,
  deviceLocation = null,
  className = "map-box",
  satelliteToggle = false,
}: {
  markers?: MapMarker[];
  lines?: MapLine[];
  onMarkerClick?: (id: string) => void;
  onMarkerDragEnd?: (id: string, lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  /** Dipanggil saat peta berhenti digeser/di-zoom (pusat peta saat ini). */
  onCenterChange?: (lat: number, lng: number) => void;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  fit?: boolean;
  deviceLocation?: DeviceLocation;
  className?: string;
  /** Tampilkan tombol ganti tampilan peta jalan ⇄ satelit. */
  satelliteToggle?: boolean;
}) {
  const { t } = useT();
  const [satellite, setSatellite] = useState(() => {
    try {
      return localStorage.getItem("ppj.map.satellite") === "1";
    } catch {
      return false;
    }
  });
  const toggleSatellite = () =>
    setSatellite((v) => {
      try {
        localStorage.setItem("ppj.map.satellite", v ? "0" : "1");
      } catch {
        // penyimpanan tidak tersedia
      }
      return !v;
    });
  if (!KEY) {
    return (
      <div className={className} style={{ display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <span className="muted">{t("map.noKey")}</span>
      </div>
    );
  }
  return (
    <APIProvider apiKey={KEY} language={undefined}>
      <Map
        className={className}
        mapId="DEMO_MAP_ID"
        mapTypeId={satelliteToggle && satellite ? "hybrid" : "roadmap"}
        defaultCenter={{ lat: -2.5, lng: 118 }}
        defaultZoom={5}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        clickableIcons={false}
        onClick={(e) => {
          const ll = e.detail.latLng;
          if (ll && onMapClick) onMapClick(ll.lat, ll.lng);
        }}
        onIdle={(e) => {
          const c = e.map.getCenter();
          if (c && onCenterChange) onCenterChange(c.lat(), c.lng());
        }}
      >
        {satelliteToggle && (
          <MapControl position={ControlPosition.LEFT_BOTTOM}>
            <button
              type="button"
              className="map-type-btn"
              aria-pressed={satellite}
              title={satellite ? t("map.typeRoadmap") : t("map.typeSatellite")}
              onClick={toggleSatellite}
            >
              <Icon name={satellite ? "map" : "image"} fixedWidth={false} /> {satellite ? t("map.typeRoadmap") : t("map.typeSatellite")}
            </button>
          </MapControl>
        )}
        <Controller markers={markers} focus={focus} fit={fit} deviceLocation={deviceLocation} />
        <Lines lines={lines} />
        {markers.map((m) => (
          <AdvancedMarker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            title={m.title}
            zIndex={m.selected ? 100000 : (m.z ?? 1)}
            onClick={() => onMarkerClick?.(m.id)}
            draggable={!!m.draggable}
            onDragEnd={(e) => {
              const ll = e.latLng;
              if (ll) onMarkerDragEnd?.(m.id, ll.lat(), ll.lng());
            }}
          >
            <Pin
              background={m.color}
              borderColor="#ffffff"
              glyphColor={m.glyphColor ?? readableOn(m.color)}
              glyph={m.glyph}
              scale={m.selected ? 1.4 : 1}
            />
          </AdvancedMarker>
        ))}
        {deviceLocation && (
          <AdvancedMarker position={deviceLocation} title={t("map.you")} zIndex={0}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#0077B6",
                border: "3px solid #fff",
                boxShadow: "0 0 0 6px rgba(0,119,182,0.25)",
              }}
            />
          </AdvancedMarker>
        )}
      </Map>
    </APIProvider>
  );
}

/* ------------------------------ Search --------------------------------- */

/** Foto tempat dari Google — hanya untuk ditampilkan (tidak disimpan ke database; sesuai ketentuan Google). */
export type GooglePhoto = {
  url: string;
  /** Atribusi wajib: nama kontributor + tautan profilnya. */
  credits: { name: string; href: string }[];
};

export type GooglePlaceResult = {
  googlePlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  photos?: GooglePhoto[];
};

/** Mengurai html_attributions Google (<a href="...">Nama</a>) menjadi data aman, tanpa HTML mentah. */
function parseCredits(attrs: string[] | undefined) {
  const out: { name: string; href: string }[] = [];
  for (const a of attrs ?? []) {
    const m = /<a[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/i.exec(a);
    if (m && /^https?:\/\//i.test(m[1]!)) out.push({ href: m[1]!, name: m[2]!.trim() });
    else {
      const text = a.replace(/<[^>]*>/g, "").trim();
      if (text) out.push({ href: "", name: text });
    }
  }
  return out;
}

type Suggestion = {
  id: string;
  title: string;
  sub: string;
  kind: "place" | "address";
  /** Untuk hasil Geocoder, koordinat sudah tersedia. */
  result?: GooglePlaceResult;
};

/**
 * Pencarian alamat/tempat. Urutan: Places (legacy) → Places API (New) → Geocoding (alamat).
 * Sehingga tetap berfungsi walau salah satu API belum diaktifkan pada project Google Cloud.
 */
function GoogleSearchInner({
  onSelect,
  placeholder,
  origin,
}: {
  onSelect: (p: GooglePlaceResult) => void;
  placeholder: string;
  origin?: { lat: number; lng: number } | null;
}) {
  const { t } = useT();
  const places = useMapsLibrary("places");
  const geocoding = useMapsLibrary("geocoding");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [nearby, setNearby] = useState<Suggestion[]>([]);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const nearbyKey = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const [notFound, setNotFound] = useState<string | null>(null);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const detailService = useRef<google.maps.places.PlacesService | null>(null);

  const fromGeocode = (r: google.maps.GeocoderResult): Suggestion => ({
    id: r.place_id,
    title: r.formatted_address,
    sub: "",
    kind: "address",
    result: {
      googlePlaceId: r.place_id,
      name: r.address_components[0]?.long_name ?? r.formatted_address,
      address: r.formatted_address,
      lat: r.geometry.location.lat(),
      lng: r.geometry.location.lng(),
    },
  });

  const geocode = async (req: google.maps.GeocoderRequest) => {
    if (!geocoding) return [];
    try {
      const { results } = await new geocoding.Geocoder().geocode(req);
      return results;
    } catch {
      return [];
    }
  };

  /** Saran lokasi terdekat dari titik asal (lokasi perangkat atau pusat peta), diurutkan menurut jarak. */
  const loadNearby = () => {
    if (!places || !origin) return;
    const key = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}`;
    if (nearbyKey.current === key && nearby.length) return;
    nearbyKey.current = key;
    detailService.current ??= new places.PlacesService(document.createElement("div"));
    detailService.current.nearbySearch(
      { location: origin, radius: 1000 },
      (res, status) => {
        if (status !== "OK" || !res) {
          setNearby([]);
          return;
        }
        const rad = (d: number) => (d * Math.PI) / 180;
        const dist = (lat: number, lng: number) => {
          const dLat = rad(lat - origin.lat);
          const dLng = rad(lng - origin.lng);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(origin.lat)) * Math.cos(rad(lat)) * Math.sin(dLng / 2) ** 2;
          return 2 * 6371000 * Math.asin(Math.sqrt(a));
        };
        const list = res
          .filter((r) => r.place_id && r.name && r.geometry?.location)
          // Buang wilayah administratif (kota/kecamatan/jalan); sisakan tempat yang bisa dikunjungi.
          .filter((r) => !r.types?.some((ty) => ["locality", "political", "route", "country", "sublocality", "neighborhood"].includes(ty)))
          .map((r) => ({ r, d: dist(r.geometry!.location!.lat(), r.geometry!.location!.lng()) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 8)
          .map(({ r, d }) => ({
            id: r.place_id!,
            title: r.name!,
            sub: `${d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`}${r.vicinity ? ` · ${r.vicinity}` : ""}`,
            kind: "place" as const,
          }));
        setNearby(list);
        setActive(-1);
      },
    );
  };

  useEffect(() => {
    if (!places || q.trim().length < 3) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      token.current ??= new places.AutocompleteSessionToken();
      let list: Suggestion[] | null = null;

      // 1) Places legacy (AutocompleteService)
      try {
        list = await new Promise<Suggestion[]>((resolve, reject) => {
          void new places.AutocompleteService().getPlacePredictions(
            { input: q, sessionToken: token.current! },
            (preds, status) => {
              if (status === "OK" && preds)
                resolve(
                  preds.map((p) => ({
                    id: p.place_id,
                    title: p.structured_formatting.main_text,
                    sub: p.structured_formatting.secondary_text ?? "",
                    kind: "place" as const,
                  })),
                );
              else if (status === "ZERO_RESULTS") resolve([]);
              else reject(new Error(status));
            },
          );
        });
      } catch {
        list = null;
      }

      // 2) Places API (New)
      if (list === null) {
        try {
          const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: q,
            sessionToken: token.current,
          });
          list = suggestions
            .filter((s) => s.placePrediction)
            .map((s) => ({
              id: s.placePrediction!.placeId,
              title: s.placePrediction!.mainText?.text ?? s.placePrediction!.text.text,
              sub: s.placePrediction!.secondaryText?.text ?? "",
              kind: "place" as const,
            }));
        } catch {
          list = null;
        }
      }

      // 3) Geocoding (pencarian alamat)
      if (list === null) {
        const results = await geocode({ address: q });
        list = results.slice(0, 6).map(fromGeocode);
        if (!cancelled) setError(list.length === 0 && !geocoding);
      } else if (!cancelled) setError(false);

      if (!cancelled) {
        setItems(list);
        setActive(-1);
      }
    };
    const h = setTimeout(() => void run(), 350);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, geocoding, q]);

  const finish = (r: GooglePlaceResult) => {
    token.current = null;
    setItems([]);
    setNearbyOpen(false);
    setQ("");
    onSelect(r);
  };

  const choose = async (s: Suggestion) => {
    if (s.result) return finish(s.result);
    setBusy(true);
    try {
      // Detail via Places legacy; bila gagal gunakan Geocoder (place_id) lalu Places baru.
      detailService.current ??= new places!.PlacesService(document.createElement("div"));
      const legacy = await new Promise<GooglePlaceResult | null>((resolve) => {
        detailService.current!.getDetails(
          {
            placeId: s.id,
            fields: ["place_id", "name", "formatted_address", "geometry", "photos"],
            sessionToken: token.current ?? undefined,
          },
          (p, status) => {
            if (status === "OK" && p?.geometry?.location)
              resolve({
                googlePlaceId: p.place_id ?? s.id,
                name: p.name ?? s.title,
                address: p.formatted_address ?? s.sub,
                lat: p.geometry.location.lat(),
                lng: p.geometry.location.lng(),
                photos: (p.photos ?? []).slice(0, 6).map((ph) => ({
                  url: ph.getUrl({ maxWidth: 640 }),
                  credits: parseCredits(ph.html_attributions),
                })),
              });
            else resolve(null);
          },
        );
      });
      if (legacy) return finish(legacy);

      const g = (await geocode({ placeId: s.id }))[0];
      if (g) {
        const r = fromGeocode(g).result!;
        return finish({ ...r, name: s.title });
      }
      const place = new places!.Place({ id: s.id });
      await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location"] });
      if (place.location)
        finish({
          googlePlaceId: place.id,
          name: place.displayName ?? s.title,
          address: place.formattedAddress ?? s.sub,
          lat: place.location.lat(),
          lng: place.location.lng(),
        });
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  // Enter: cari langsung sebagai alamat (Geocoding)
  const searchAddress = async () => {
    if (!q.trim()) return;
    setBusy(true);
    const results = await geocode({ address: q });
    setBusy(false);
    setError(false);
    setActive(-1);
    setItems(results.slice(0, 6).map(fromGeocode));
    // Lokasi tidak ditemukan: tampilkan pop up agar mudah terbaca.
    if (results.length === 0) setNotFound(q.trim());
  };

  // Daftar yang ditampilkan: hasil pencarian, atau lokasi terdekat saat field fokus & kosong.
  const showingNearby = items.length === 0 && nearbyOpen && q.trim().length < 3 && nearby.length > 0;
  const list = items.length ? items : showingNearby ? nearby : [];

  return (
    <div
      className="map-search"
      onBlur={(e) => {
        // Tutup saran terdekat saat fokus keluar dari area pencarian.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setNearbyOpen(false);
      }}
    >
      <input
        ref={inputRef}
        className="input has-clear"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          setNearbyOpen(true);
          if (q.trim().length < 3) loadNearby();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && list.length) {
            e.preventDefault();
            setNearbyOpen(true);
            setActive((i) => (i + 1) % list.length);
          } else if (e.key === "ArrowUp" && list.length) {
            e.preventDefault();
            setActive((i) => (i <= 0 ? list.length - 1 : i - 1));
          } else if (e.key === "Escape") {
            setItems([]);
            setNearbyOpen(false);
            setActive(-1);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const sel = list[active];
            if (sel) void choose(sel);
            else void searchAddress();
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
      />
      {q && (
        <button
          type="button"
          className="clear-btn"
          aria-label={t("common.clear")}
          title={t("common.clear")}
          onClick={() => {
            setQ("");
            setItems([]);
            setNotFound(null);
            setError(false);
            setActive(-1);
            setNearbyOpen(true);
            inputRef.current?.focus();
          }}
        >
          <Icon name="xmark" fixedWidth={false} />
        </button>
      )}
      {busy && <div className="helper">{t("common.loading")}</div>}
      {error && <div className="helper helper-error">{t("map.placesUnavailable")}</div>}
      {notFound && (
        <Modal
          title={t("map.notFoundTitle")}
          onClose={() => setNotFound(null)}
          actions={
            <button className="btn btn-primary" autoFocus onClick={() => setNotFound(null)}>
              {t("common.close")}
            </button>
          }
        >
          <Alert kind="warning">{t("map.notFoundText", { q: notFound })}</Alert>
        </Modal>
      )}
      {list.length > 0 && (
        <div className="suggest" role="listbox" onMouseDown={(e) => e.preventDefault()}>
          {showingNearby && (
            <div className="suggest-head">
              <Icon name="pin" fixedWidth={false} /> {origin ? t("map.nearby") : ""}
            </div>
          )}
          {list.map((s, i) => (
            <button
              key={`${s.kind}:${s.id}`}
              type="button"
              className={i === active ? "is-active" : undefined}
              ref={(el) => {
                if (el && i === active) el.scrollIntoView({ block: "nearest" });
              }}
              onClick={() => void choose(s)}
            >
              <div className="s-title">{s.title}</div>
              {s.sub && <div className="s-sub">{s.sub}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function GooglePlaceSearch({
  onSelect,
  placeholder,
  origin,
}: {
  onSelect: (p: GooglePlaceResult) => void;
  placeholder: string;
  /** Titik asal saran lokasi terdekat (lokasi perangkat atau pusat peta). */
  origin?: { lat: number; lng: number } | null;
}) {
  if (!KEY) return null;
  return (
    <APIProvider apiKey={KEY}>
      <GoogleSearchInner onSelect={onSelect} placeholder={placeholder} origin={origin} />
    </APIProvider>
  );
}

/** Reverse geocoding Google Maps: koordinat → alamat. Menunggu Maps JS API selesai dimuat. */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ address: string; placeId: string } | null> {
  for (let i = 0; i < 50 && !(typeof google !== "undefined" && google.maps?.importLibrary); i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (typeof google === "undefined" || !google.maps?.importLibrary) return null;
  try {
    const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
    const { results } = await new Geocoder().geocode({ location: { lat, lng } });
    const r = results[0];
    return r ? { address: r.formatted_address, placeId: r.place_id } : null;
  } catch {
    return null;
  }
}

/**
 * Tempat Google terdekat pada sebuah titik (radius ±60 m) beserta fotonya. Dipakai saat pin manual
 * diklik/digeser: nama tempat dan fotonya ditampilkan (foto tidak disimpan).
 */
export async function nearestPlacePhotos(
  lat: number,
  lng: number,
  radius = 60,
): Promise<{ name: string; distance: number; photos: GooglePhoto[] } | null> {
  for (let i = 0; i < 50 && !(typeof google !== "undefined" && google.maps?.importLibrary); i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (typeof google === "undefined" || !google.maps?.importLibrary) return null;
  try {
    const { PlacesService } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
    const results = await new Promise<google.maps.places.PlaceResult[]>((resolve) => {
      new PlacesService(document.createElement("div")).nearbySearch(
        { location: { lat, lng }, radius },
        (res, status) => resolve(status === "OK" && res ? res : []),
      );
    });
    const rad = (d: number) => (d * Math.PI) / 180;
    const dist = (a: number, b: number) => {
      const dLat = rad(a - lat);
      const dLng = rad(b - lng);
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(a)) * Math.sin(dLng / 2) ** 2;
      return 2 * 6371000 * Math.asin(Math.sqrt(x));
    };
    const best = results
      .filter((r) => r.name && r.geometry?.location)
      .filter((r) => !r.types?.some((ty) => ["locality", "political", "route", "country", "sublocality", "neighborhood"].includes(ty)))
      .map((r) => ({ r, d: dist(r.geometry!.location!.lat(), r.geometry!.location!.lng()) }))
      .sort((a, b) => a.d - b.d)[0];
    if (!best || best.d > radius) return null;
    // Hasil Nearby biasanya hanya membawa 1 foto: ambil foto lengkap lewat Place Details.
    let photos = best.r.photos ?? [];
    if (best.r.place_id) {
      const full = await new Promise<google.maps.places.PlaceResult | null>((resolve) => {
        new PlacesService(document.createElement("div")).getDetails(
          { placeId: best.r.place_id!, fields: ["photos"] },
          (pl, st) => resolve(st === "OK" ? pl : null),
        );
      });
      if (full?.photos?.length) photos = full.photos;
    }
    return {
      name: best.r.name!,
      distance: Math.round(best.d),
      photos: photos.slice(0, 6).map((ph) => ({
        url: ph.getUrl({ maxWidth: 640 }),
        credits: parseCredits(ph.html_attributions),
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Foto Google untuk tempat yang sudah tersimpan: memakai google_place_id bila ada, selain itu
 * tempat Google terdekat dari koordinatnya. Hanya untuk ditampilkan (tidak disimpan).
 */
export async function googlePhotosFor(
  placeId: string | null | undefined,
  lat: number,
  lng: number,
): Promise<{ name: string; photos: GooglePhoto[]; exact: boolean } | null> {
  for (let i = 0; i < 50 && !(typeof google !== "undefined" && google.maps?.importLibrary); i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (typeof google === "undefined" || !google.maps?.importLibrary) return null;
  if (placeId) {
    try {
      const { PlacesService } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
      const pl = await new Promise<google.maps.places.PlaceResult | null>((resolve) => {
        new PlacesService(document.createElement("div")).getDetails(
          { placeId, fields: ["name", "photos"] },
          (res, st) => resolve(st === "OK" ? res : null),
        );
      });
      if (pl?.photos?.length)
        return {
          name: pl.name ?? "",
          exact: true,
          photos: pl.photos.slice(0, 8).map((ph) => ({
            url: ph.getUrl({ maxWidth: 640 }),
            credits: parseCredits(ph.html_attributions),
          })),
        };
    } catch {
      // lanjut ke pencarian terdekat
    }
  }
  const near = await nearestPlacePhotos(lat, lng, 80);
  return near?.photos.length ? { name: near.name, photos: near.photos, exact: false } : null;
}
