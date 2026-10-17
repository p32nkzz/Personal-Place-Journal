"use client";

import { useSyncExternalStore } from "react";

/**
 * Mode tampilan peta (jalan / satelit) dibagi ke semua peta & tombol pengganti di halaman yang sama,
 * dan diingat per perangkat (localStorage; aman bila penyimpanan tidak tersedia).
 */
const KEY = "ppj.map.satellite";
const listeners = new Set<() => void>();
let memo: boolean | null = null;

const read = () => {
  if (memo != null) return memo;
  try {
    memo = localStorage.getItem(KEY) === "1";
  } catch {
    memo = false;
  }
  return memo;
};

export function setSatellite(v: boolean) {
  memo = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    // penyimpanan tidak tersedia: berlaku untuk sesi ini saja
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      memo = e.newValue === "1";
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
};

export function useSatellite() {
  return useSyncExternalStore(subscribe, read, () => false);
}
