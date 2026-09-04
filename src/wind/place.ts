const API_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const DECIMALS = 3;
const cache = new Map<string, Promise<string | null>>();

interface ReverseGeocode {
  locality?: string;
  city?: string;
}

export function placeName(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(DECIMALS)},${lng.toFixed(DECIMALS)}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = lookup(lat, lng).catch(() => null);
    cache.set(key, pending);
  }
  return pending;
}

async function lookup(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    localityLanguage: navigator.language.split("-")[0] ?? "en",
  });
  const response = await fetch(`${API_URL}?${params}`);
  if (!response.ok) return null;
  const { locality, city } = (await response.json()) as ReverseGeocode;
  if (!locality) return city ?? null;
  return city && city !== locality ? `${locality}, ${city}` : locality;
}

export const formatCoordinates = (lat: number, lng: number) =>
  `${lat.toFixed(DECIMALS)}, ${lng.toFixed(DECIMALS)}`;
