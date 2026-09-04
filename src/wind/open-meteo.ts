import type { Bounds } from "../mercator";

const API_URL = "https://api.open-meteo.com/v1/forecast";
const HOURLY_FIELDS = [
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
] as const;
const GRID_COLUMNS = 10;
const GRID_ROWS = 7;
const DECIMALS = 3;

export interface WindGrid {
  bounds: Bounds;
  fetchedAt: number;
  rows: number;
  columns: number;
  times: string[];
  speed: Float32Array;
  direction: Float32Array;
  gusts: Float32Array;
}

interface ForecastPoint {
  hourly: {
    time: string[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
  };
}

export async function fetchWindGrid(
  bounds: Bounds,
  forecastDays: number,
): Promise<WindGrid> {
  const latitudes: number[] = [];
  const longitudes: number[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let column = 0; column < GRID_COLUMNS; column++) {
      latitudes.push(lerp(bounds.south, bounds.north, row / (GRID_ROWS - 1)));
      longitudes.push(
        lerp(bounds.west, bounds.east, column / (GRID_COLUMNS - 1)),
      );
    }
  }
  const params = new URLSearchParams({
    latitude: latitudes.map(round).join(","),
    longitude: longitudes.map(round).join(","),
    hourly: HOURLY_FIELDS.join(","),
    forecast_days: String(forecastDays),
    timezone: "UTC",
  });
  const response = await fetch(`${API_URL}?${params}`);
  if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
  const points = (await response.json()) as ForecastPoint[];
  return toGrid(bounds, points);
}

function toGrid(bounds: Bounds, points: ForecastPoint[]): WindGrid {
  const first = points[0];
  if (!first) throw new Error("Open-Meteo returned no points");
  const times = first.hourly.time;
  const pointCount = points.length;
  const grid: WindGrid = {
    bounds,
    fetchedAt: Date.now(),
    rows: GRID_ROWS,
    columns: GRID_COLUMNS,
    times,
    speed: new Float32Array(times.length * pointCount),
    direction: new Float32Array(times.length * pointCount),
    gusts: new Float32Array(times.length * pointCount),
  };
  points.forEach((point, index) => {
    for (let hour = 0; hour < times.length; hour++) {
      const offset = hour * pointCount + index;
      grid.speed[offset] = point.hourly.wind_speed_10m[hour] ?? 0;
      grid.direction[offset] = point.hourly.wind_direction_10m[hour] ?? 0;
      grid.gusts[offset] = point.hourly.wind_gusts_10m[hour] ?? 0;
    }
  });
  return grid;
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const round = (value: number) => Number(value.toFixed(DECIMALS));
