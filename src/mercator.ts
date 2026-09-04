export interface View {
  zoom: number;
  lat: number;
  lng: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

const TILE_SIZE = 512;
const MAX_LATITUDE = 85.05;

const worldSize = (zoom: number) => TILE_SIZE * 2 ** zoom;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

function toWorld(lat: number, lng: number, zoom: number): Point {
  const size = worldSize(zoom);
  const sin = Math.sin(toRadians(lat));
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

function fromWorld(x: number, y: number, zoom: number): LatLng {
  const size = worldSize(zoom);
  const n = Math.PI - (2 * Math.PI * y) / size;
  return {
    lat: toDegrees(Math.atan(Math.sinh(n))),
    lng: (x / size) * 360 - 180,
  };
}

export function project(
  lat: number,
  lng: number,
  view: View,
  size: Size,
): Point {
  const center = toWorld(view.lat, view.lng, view.zoom);
  const point = toWorld(lat, lng, view.zoom);
  return {
    x: point.x - center.x + size.width / 2,
    y: point.y - center.y + size.height / 2,
  };
}

export function unproject(
  x: number,
  y: number,
  view: View,
  size: Size,
): LatLng {
  const center = toWorld(view.lat, view.lng, view.zoom);
  return fromWorld(
    center.x + x - size.width / 2,
    center.y + y - size.height / 2,
    view.zoom,
  );
}

export function visibleBounds(view: View, size: Size, padding = 0): Bounds {
  const padX = size.width * padding;
  const padY = size.height * padding;
  const northWest = unproject(-padX, -padY, view, size);
  const southEast = unproject(
    size.width + padX,
    size.height + padY,
    view,
    size,
  );
  return {
    south: Math.max(-MAX_LATITUDE, southEast.lat),
    west: northWest.lng,
    north: Math.min(MAX_LATITUDE, northWest.lat),
    east: southEast.lng,
  };
}

export function contains(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.south >= outer.south &&
    inner.north <= outer.north &&
    inner.west >= outer.west &&
    inner.east <= outer.east
  );
}
