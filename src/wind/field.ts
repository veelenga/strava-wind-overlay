import type { WindGrid } from "./open-meteo";

export interface WindSample {
  u: number;
  v: number;
  speed: number;
  gusts: number;
  direction: number;
}

export interface WindField {
  sample(lat: number, lng: number): WindSample;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;
const FULL_CIRCLE = 360;
const HALF_CIRCLE = 180;

export function createWindField(grid: WindGrid, hourIndex: number): WindField {
  const pointCount = grid.rows * grid.columns;
  const base = hourIndex * pointCount;
  const u = new Float32Array(pointCount);
  const v = new Float32Array(pointCount);
  const gusts = grid.gusts.subarray(base, base + pointCount);
  for (let i = 0; i < pointCount; i++) {
    const speed = grid.speed[base + i] ?? 0;
    const blowingTo = toRadians((grid.direction[base + i] ?? 0) + HALF_CIRCLE);
    u[i] = speed * Math.sin(blowingTo);
    v[i] = speed * Math.cos(blowingTo);
  }

  const { south, west, north, east } = grid.bounds;
  const interpolate = (
    values: ArrayLike<number>,
    row: number,
    column: number,
  ) => {
    const row0 = Math.floor(row);
    const column0 = Math.floor(column);
    const row1 = Math.min(row0 + 1, grid.rows - 1);
    const column1 = Math.min(column0 + 1, grid.columns - 1);
    const rowT = row - row0;
    const columnT = column - column0;
    const at = (r: number, c: number) => values[r * grid.columns + c] ?? 0;
    const top = at(row0, column0) * (1 - columnT) + at(row0, column1) * columnT;
    const bottom =
      at(row1, column0) * (1 - columnT) + at(row1, column1) * columnT;
    return top * (1 - rowT) + bottom * rowT;
  };

  return {
    sample(lat, lng) {
      const row = clamp(
        ((lat - south) / (north - south)) * (grid.rows - 1),
        0,
        grid.rows - 1,
      );
      const column = clamp(
        ((lng - west) / (east - west)) * (grid.columns - 1),
        0,
        grid.columns - 1,
      );
      const su = interpolate(u, row, column);
      const sv = interpolate(v, row, column);
      const blowingFrom =
        (toDegrees(Math.atan2(su, sv)) + HALF_CIRCLE + FULL_CIRCLE) %
        FULL_CIRCLE;
      return {
        u: su,
        v: sv,
        speed: Math.hypot(su, sv),
        gusts: interpolate(gusts, row, column),
        direction: blowingFrom,
      };
    },
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
