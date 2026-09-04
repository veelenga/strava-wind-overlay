import type { View } from "./mercator";

const HASH_PATTERN = /^#(-?[\d.]+)\/(-?[\d.]+)\/(-?[\d.]+)/;
const POLL_INTERVAL_MS = 200;
const THREE_D_PARAM = "3d";

export function readView(url: Location = location): View | null {
  if (new URLSearchParams(url.search).get(THREE_D_PARAM) === "true")
    return null;
  const match = HASH_PATTERN.exec(url.hash);
  if (!match) return null;
  return {
    zoom: Number(match[1]),
    lat: Number(match[2]),
    lng: Number(match[3]),
  };
}

export function watchView(onChange: (view: View | null) => void): () => void {
  let last = "";
  const poll = () => {
    const key = location.search + location.hash;
    if (key === last) return;
    last = key;
    onChange(readView());
  };
  poll();
  const timer = setInterval(poll, POLL_INTERVAL_MS);
  return () => clearInterval(timer);
}
