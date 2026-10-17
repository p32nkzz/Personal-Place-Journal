"use client";

import { useMemo, useRef, useState } from "react";

import {
  GooglePlaceSearch,
  MapView,
  useDeviceLocation,
  type MapMarker,
} from "~/components/map/MapView";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { CategoryMultiSelect } from "~/components/CategoryMultiSelect";
import { TagMultiSelect } from "~/components/TagMultiSelect";
import { Icon } from "~/components/Icon";
import { readableOn } from "~/components/map/colors";
import { useMapColors } from "~/components/map/useMapColors";
import { useMapSearchConfig } from "~/components/map/useMapSearchConfig";
import { MasterPopup, MyPlacePopup, PinPopup, type Selection, type Viewer } from "./MapPopups";


export function HomeMap({
  viewer,
  initialFreePin = false,
  initialPin = null,
  initialMy = null,
  initialNearby = false,
}: {
  viewer: Viewer;
  /** Daftar lokasi terdekat langsung terbuka (dari tombol "Tambah dari peta"). */
  initialNearby?: boolean;
  /** Pin bebas langsung aktif (kembali dari form tempat baru). */
  initialFreePin?: boolean;
  /** Pin yang dipasang sejak awal (koordinat dari form tempat baru). */
  initialPin?: { lat: number; lng: number } | null;
  /** MY PLACE yang langsung dibuka pop-up-nya (kembali dari form ubah). */
  initialMy?: { uid: string; lat: number; lng: number } | null;
}) {
  const { t } = useT();
  const explorer = viewer === "EXPLORER";
  const canPin = viewer !== "GUEST";
  const mapColors = useMapColors();
  const C_MY = mapColors.mine;
  const C_FAV = mapColors.favorite;
  const C_MASTER = mapColors.master;
  const C_PIN = mapColors.newPin;
  const { location } = useDeviceLocation();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(-1);
  // Saran "terakhir ditambahkan" saat field fokus: 3 data awal, +3 setiap kali daftar digulir ke bawah.
  const filterRef = useRef<HTMLInputElement>(null);
  const [recentOpen, setRecentOpen] = useState(false);
  const { recentPageSize } = useMapSearchConfig();
  const [recentCount, setRecentCount] = useState(recentPageSize);
  const [categoryUids, setCategoryUids] = useState<string[]>([]);
  // Filter TAG hanya untuk Explorer (TAG milik user; berlaku pada Tempat Saya).
  const [tagUids, setTagUids] = useState<string[]>([]);
  // Filter jenis pin dikendalikan dari legenda di bawah peta.
  const [showMine, setShowMine] = useState(true);
  const [showFav, setShowFav] = useState(true);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  // Pin bebas default OFF agar peta nyaman digeser tanpa memunculkan pin baru.
  const [freePin, setFreePin] = useState(initialFreePin);
  const [showMaster, setShowMaster] = useState(true);
  // Layar sempit: kontrol filter selain pencarian nama dilipat di balik tombol "Filter".
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sel, setSel] = useState<Selection | null>(
    initialMy ? { kind: "my", uid: initialMy.uid } : initialPin ? { kind: "pin", lat: initialPin.lat, lng: initialPin.lng } : null,
  );
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    initialMy ? { lat: initialMy.lat, lng: initialMy.lng } : initialPin ? { ...initialPin } : null,
  );

  const cats = api.categories.listActive.useQuery();
  const masters = api.master.listMap.useQuery({ categoryUids: categoryUids.length ? categoryUids : undefined });
  const mine = api.place.list.useQuery(undefined, { enabled: explorer });
  const tags = api.tag.list.useQuery(undefined, { enabled: explorer });

  const needle = q.trim().toLowerCase();
  const myItems = useMemo(
    () =>
      (mine.data ?? [])
        .filter((p) => !categoryUids.length || p.categories.some((c) => categoryUids.includes(c.uid)))
        .filter((p) => !tagUids.length || p.tags.some((x) => tagUids.includes(x.uid)))
        .filter((p) => !needle || p.name.toLowerCase().includes(needle) || (p.address ?? "").toLowerCase().includes(needle)),
    [mine.data, needle, categoryUids, tagUids],
  );
  const masterItems = useMemo(
    () =>
      // MASTER tidak memiliki TAG: saat filter TAG aktif, hanya Tempat Saya yang ditampilkan.
      tagUids.length
        ? []
        : (masters.data ?? []).filter(
            (m) => !needle || m.name.toLowerCase().includes(needle) || m.address.toLowerCase().includes(needle),
          ),
    [masters.data, needle, tagUids],
  );

  const markers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    // Tumpukan pin yang berdekatan: Tempat Saya di atas MASTER; di antara jenis yang sama,
    // data yang terakhir diinput/diubah berada paling atas.
    const rank = <T extends { updatedAt: Date | string }>(items: T[]) => {
      const order = new Map<T, number>();
      [...items]
        .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
        .forEach((it, i) => order.set(it, i));
      return order;
    };
    const masterRank = rank(masterItems);
    if (showMaster)
      for (const m of masterItems)
        out.push({
          id: `ms:${m.uid}`,
          lat: m.latitude,
          lng: m.longitude,
          color: C_MASTER,
          glyph: "M",
          title: m.name,
          z: 1000 + (masterRank.get(m) ?? 0),
          selected: sel?.kind === "master" && sel.uid === m.uid,
        });
    if (explorer) {
      const myRank = rank(myItems);
      for (const p of myItems) {
        if (p.isFavorite ? !showFav : !showMine) continue;
        out.push({
          id: `my:${p.uid}`,
          lat: p.latitude,
          lng: p.longitude,
          color: p.isFavorite ? C_FAV : C_MY,
          glyph: p.isFavorite ? "★" : undefined, // glyph pin Google wajib teks/DOM, bukan komponen React
          title: p.name,
          z: 5000 + (myRank.get(p) ?? 0),
          selected: sel?.kind === "my" && sel.uid === p.uid,
        });
      }
    }
    if (sel?.kind === "pin")
      out.push({ id: "pin", lat: sel.lat, lng: sel.lng, color: C_PIN, glyph: "+", selected: true, draggable: true, title: sel.google?.name });
    return out;
  }, [masterItems, myItems, showMaster, showMine, showFav, explorer, sel, C_MY, C_FAV, C_MASTER, C_PIN]);

  const select = (s: Selection, lat: number, lng: number) => {
    setSel(s);
    setFocus({ lat, lng });
  };

  const onMarkerClick = (id: string) => {
    if (id === "pin") return;
    const [kind, uid] = id.split(":") as ["my" | "ms", string];
    if (kind === "my") {
      const p = mine.data?.find((x) => x.uid === uid);
      if (p) select({ kind: "my", uid }, p.latitude, p.longitude);
    } else {
      const m = masters.data?.find((x) => x.uid === uid);
      if (m) select({ kind: "master", uid }, m.latitude, m.longitude);
    }
  };


  type Item = { key: string; name: string; sub: string; color: string; lat: number; lng: number; sel: Selection };
  const myAll: Item[] = explorer
    ? myItems.filter((p) => (p.isFavorite ? showFav : showMine)).map((p) => ({ key: `my:${p.uid}`, name: p.name, sub: `${t("nav.myPlaces")} · ${p.address ?? "—"}`, color: p.isFavorite ? C_FAV : C_MY, lat: p.latitude, lng: p.longitude, sel: { kind: "my", uid: p.uid } as Selection }))
    : [];
  const masterAll: Item[] = showMaster
    ? masterItems.map((m) => ({ key: `ms:${m.uid}`, name: m.name, sub: `MASTER · ${m.address}`, color: C_MASTER, lat: m.latitude, lng: m.longitude, sel: { kind: "master", uid: m.uid } as Selection }))
    : [];
  const allMatches: Item[] = needle ? [...myAll, ...masterAll] : [];
  const matches: Item[] = allMatches.slice(0, 8);

  // Terakhir diinput: Tempat Saya lebih dulu (terbaru → lama), lalu MASTER (terbaru → lama).
  const recentAll: Item[] = useMemo(() => {
    const byNewest = <T extends { createdAt: Date | string }>(a: T, b: T) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const mineSorted = explorer ? [...(mine.data ?? [])].filter((p) => (p.isFavorite ? showFav : showMine)).sort(byNewest) : [];
    const masterSorted = showMaster ? [...(masters.data ?? [])].sort(byNewest) : [];
    return [
      ...mineSorted.map((p) => ({ key: `my:${p.uid}`, name: p.name, sub: `${t("nav.myPlaces")} · ${p.address ?? "—"}`, color: p.isFavorite ? C_FAV : C_MY, lat: p.latitude, lng: p.longitude, sel: { kind: "my", uid: p.uid } as Selection })),
      ...masterSorted.map((m) => ({ key: `ms:${m.uid}`, name: m.name, sub: `MASTER · ${m.address}`, color: C_MASTER, lat: m.latitude, lng: m.longitude, sel: { kind: "master", uid: m.uid } as Selection })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine.data, masters.data, explorer, showMine, showFav, showMaster, C_MY, C_FAV, C_MASTER]);
  const showingRecent = !needle && recentOpen && recentAll.length > 0;
  const recentShown = showingRecent ? recentAll.slice(0, recentCount) : [];
  const list: Item[] = needle ? matches : recentShown;
  const hasMoreRecent = showingRecent && recentCount < recentAll.length;
  // Rincian data yang belum dimuat/ditampilkan: Tempat Saya dan MASTER.
  const notLoaded = (items: Item[]) => {
    const my = items.filter((i) => i.sel.kind === "my").length;
    const ms = items.filter((i) => i.sel.kind === "master").length;
    return [my ? `${my} ${t("nav.myPlaces")}` : "", ms ? `${ms} MASTER` : ""].filter(Boolean).join(" · ");
  };
  const recentRest = hasMoreRecent ? notLoaded(recentAll.slice(recentCount)) : "";
  const matchRest = needle && allMatches.length > matches.length ? notLoaded(allMatches.slice(matches.length)) : "";

  return (
    <div className={`map-full${canPin ? " has-gsearch" : ""}${sel ? " has-popup" : ""}`}>
      <MapView
        className="map-box"
        satelliteToggle
        markers={markers}
        deviceLocation={location}
        focus={focus}
        onMarkerClick={onMarkerClick}
        onCenterChange={(lat, lng) => setCenter({ lat, lng })}
        onMarkerDragEnd={(id, lat, lng) => {
          if (id !== "pin") return;
          // Geser pin: koordinat diperbarui dan alamat dicari ulang lewat reverse geocoding.
          setSel((s) => (s?.kind === "pin" ? { kind: "pin", lat, lng, google: s.google, moved: true } : s));
        }}
        onMapClick={canPin && freePin ? (lat, lng) => setSel({ kind: "pin", lat, lng }) : undefined}
      />

      {/* Kiri atas: pencarian Google */}
      {canPin && (
        <div className="map-float map-tl">
          <GooglePlaceSearch
            placeholder={t("map.googlePlaceholder")}
            origin={location ?? center}
            autoNearby={initialNearby}
            onSelect={(g) => select({ kind: "pin", lat: g.lat, lng: g.lng, google: g }, g.lat, g.lng)}
          />
        </div>
      )}

      {/* Kanan atas: pencarian data, kategori, chip jenis tempat */}
      <div className={`map-float map-tr map-filters${filtersOpen ? " is-open" : ""}`}>
        <div
          className="map-search"
          style={{ width: 300, maxWidth: "100%" }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setRecentOpen(false);
          }}
        >
          <input
            ref={filterRef}
            className="input has-clear"
            placeholder={t("map.filterPlaceholder")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(-1);
            }}
            onFocus={() => {
              setRecentOpen(true);
              setRecentCount(recentPageSize);
              setActive(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQ("");
                setRecentOpen(false);
                return;
              }
              if (!list.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setRecentOpen(true);
                {
                  const n = active + 1;
                  const loadMore = showingRecent && n >= recentShown.length && hasMoreRecent;
                  if (loadMore) setRecentCount((c) => c + recentPageSize);
                  setActive(n >= list.length && !loadMore ? 0 : n);
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => (i <= 0 ? list.length - 1 : i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const m = list[active >= 0 ? active : 0];
                if (m) {
                  select(m.sel, m.lat, m.lng);
                  setQ("");
                  setRecentOpen(false);
                }
              }
            }}
            aria-label={t("map.filterPlaceholder")}
          />
          {q && (
            <button
              type="button"
              className="clear-btn"
              aria-label={t("common.clear")}
              title={t("common.clear")}
              onClick={() => {
                setQ("");
                setActive(-1);
                setRecentOpen(true);
                setRecentCount(recentPageSize);
                filterRef.current?.focus();
              }}
            >
              <Icon name="xmark" fixedWidth={false} />
            </button>
          )}
          {list.length > 0 && (
            <div
              className="suggest"
              role="listbox"
              tabIndex={-1}
              style={showingRecent ? { maxHeight: 190 } : undefined}
              onScroll={(e) => {
                // Gulir hingga dasar daftar → muat 3 data berikutnya.
                const el = e.currentTarget;
                if (hasMoreRecent && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setRecentCount((c) => c + recentPageSize);
              }}
            >
              {showingRecent && <div className="suggest-head">{t("map.recent")}</div>}
              {list.map((m, i) => (
                <button
                  key={m.key}
                  type="button"
                  className={i === active ? "is-active" : undefined}
                  ref={(el) => {
                    if (el && i === active) el.scrollIntoView({ block: "nearest" });
                  }}
                  onClick={() => {
                    select(m.sel, m.lat, m.lng);
                    setQ("");
                    setRecentOpen(false);
                  }}
                >
                  <div className="s-title"><span className="tag-dot" style={{ background: m.color, marginRight: 6 }} />{m.name}</div>
                  <div className="s-sub">{m.sub}</div>
                </button>
              ))}
              {hasMoreRecent && (
                <div className="suggest-foot">
                  <b>{t("map.notLoaded", { parts: recentRest })}</b>
                  <div>{t("map.scrollMore", { n: recentPageSize })}</div>
                </div>
              )}
              {matchRest && (
                <div className="suggest-foot">
                  <b>{t("map.moreMatches", { parts: matchRest })}</b>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="map-filter-toggle"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((o) => !o)}
          title={t("map.filters")}
        >
          <Icon name="layers" fixedWidth={false} /> {t("map.filters")}
          {categoryUids.length + tagUids.length > 0 && <span className="cat-dd-badge">{categoryUids.length + tagUids.length}</span>}
          <Icon name={filtersOpen ? "chevron-up" : "chevron-down"} fixedWidth={false} style={{ fontSize: 10 }} />
        </button>
        <CategoryMultiSelect compact categories={cats.data ?? []} value={categoryUids} onChange={setCategoryUids} />
        {explorer && <TagMultiSelect compact tags={tags.data ?? []} value={tagUids} onChange={setTagUids} />}
        {canPin && (
          <button
            type="button"
            role="switch"
            aria-checked={freePin}
            className="switch-btn"
            title={t("map.freePinHint")}
            onClick={() => {
              setFreePin((v) => !v);
              // Mematikan fitur menghapus pin manual yang sedang tampil (hasil pencarian tetap).
              if (freePin) setSel((s) => (s?.kind === "pin" && !s.google ? null : s));
            }}
          >
            <span className="switch-track" aria-hidden><span className="switch-thumb" /></span>
            {t("map.freePin")}
          </button>
        )}
        {(masters.isLoading || (explorer && mine.isLoading)) && <Icon name="refresh" spin className="map-filters-spin" />}
      </div>

      {/* Popup detail + aksi */}
      {sel && (
        <div className="map-float map-popup">
          {sel.kind === "master" && <MasterPopup uid={sel.uid} viewer={viewer} onClose={() => setSel(null)} />}
          {sel.kind === "my" && <MyPlacePopup uid={sel.uid} onClose={() => setSel(null)} />}
          {sel.kind === "pin" && <PinPopup sel={sel} viewer={viewer} onClose={() => setSel(null)} />}
        </div>
      )}

      {/* Bawah: legenda */}
      <div className="map-float map-legend">
        <div className="legend" aria-label="Legend">
          <button type="button" className="legend-btn" aria-pressed={showMaster} title={t("map.legendToggle")} onClick={() => setShowMaster((v) => !v)}>
            <i style={{ background: C_MASTER }} /> MASTER
          </button>
          {explorer && (
            <>
              <button type="button" className="legend-btn" aria-pressed={showMine} title={t("map.legendToggle")} onClick={() => setShowMine((v) => !v)}>
                <i style={{ background: C_MY }} /> {t("nav.myPlaces")}
              </button>
              <button type="button" className="legend-btn" aria-pressed={showFav} title={t("map.legendToggle")} onClick={() => setShowFav((v) => !v)}>
                <i style={{ background: C_FAV, display: "inline-grid", placeItems: "center", color: readableOn(C_FAV), fontSize: 8, width: 14, height: 14 }}>★</i> {t("place.favorite")}
              </button>
            </>
          )}
          {canPin && <span className="legend-static"><i style={{ background: C_PIN }} /> {t("map.pin")}</span>}
          {((canPin && freePin) || !location) && (
            <span className="legend-note">
              {canPin && freePin && <span><Icon name="pin" fixedWidth={false} /> {t("map.clickHint")}</span>}
              {!location && <span><Icon name="circle-info" fixedWidth={false} /> {t("map.noLocation")}</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
