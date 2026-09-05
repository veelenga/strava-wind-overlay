import { readView, watchView } from "./camera";
import { debugReport, log, logError } from "./debug";
import {
  type Bounds,
  contains,
  unproject,
  type View,
  visibleBounds,
} from "./mercator";
import { createOverlay } from "./overlay";
import { drawFill } from "./render/fill";
import { createParticleLayer } from "./render/particles";
import { loadSettings, saveSettings } from "./settings";
import { type Controls, createControls, MAX_HOUR_OFFSET } from "./ui/controls";
import { forecastTime } from "./ui/timeline";
import { createWindField, type WindField, type WindSample } from "./wind/field";
import { fetchWindGrid, type WindGrid } from "./wind/open-meteo";
import { formatCoordinates, placeName } from "./wind/place";

const MAP_CONTAINER_SELECTOR = '[data-testid="mre-map-container"]';
const CONTAINER_POLL_MS = 500;
const FETCH_PADDING = 0.5;
const FORECAST_DAYS = 7;
const SETTLE_DELAY_MS = 500;
const HOUR_MS = 3_600_000;
const GRID_MAX_AGE_MS = 3 * HOUR_MS;
const STALE_CHECK_MS = 60_000;
const SOURCE_NAME = "Open-Meteo";

async function main(): Promise<void> {
  const container = await waitForContainer();
  const settings = loadSettings();
  log("start", {
    settings,
    size: [container.clientWidth, container.clientHeight],
  });
  const overlay = createOverlay(container, () => scheduleRender());
  const particles = createParticleLayer(overlay.particles);
  let grid: WindGrid | null = null;
  let field: WindField | null = null;
  let view: View | null = readView();
  let settleTimer = 0;

  const scheduleRender = () => {
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(render, SETTLE_DELAY_MS);
  };

  const controls: Controls = createControls(container, {
    enabled: settings.enabled,
    collapsed: settings.collapsed,
    hourOffset: settings.hourOffset,
    onCollapse(collapsed) {
      settings.collapsed = collapsed;
      saveSettings(settings);
    },
    onToggle(enabled) {
      settings.enabled = enabled;
      saveSettings(settings);
      log("toggle", enabled);
      render();
    },
    onHourOffset(hourOffset) {
      settings.hourOffset = hourOffset;
      saveSettings(settings);
      log("hourOffset", hourOffset);
      render();
    },
    onCopyDebug: () =>
      navigator.clipboard.writeText(
        debugReport({
          settings,
          view,
          grid: grid && { bounds: grid.bounds, fetchedAt: grid.fetchedAt },
        }),
      ),
  });

  const hide = () => {
    overlay.setVisible(false);
    particles.stop();
    field = null;
  };

  const showPlace = async (target: View) => {
    const coordinates = formatCoordinates(target.lat, target.lng);
    controls.setPlace(coordinates);
    const name = await placeName(target.lat, target.lng);
    log("place", { coordinates, name });
    if (name && view === target) controls.setPlace(name);
  };

  const render = async () => {
    if (!settings.enabled || !view) return hide();
    const size = overlay.size();
    try {
      grid = await ensureGrid(grid, visibleBounds(view, size), controls);
    } catch (error) {
      logError("fetch", error);
      controls.showMessage(
        error instanceof Error ? error.message : "Wind data unavailable",
        true,
      );
      return hide();
    }
    const hourIndex = hourIndexFor(grid, settings.hourOffset);
    if (hourIndex === null) {
      log("hourIndex", {
        hourOffset: settings.hourOffset,
        firstTime: grid.times[0],
      });
      controls.showMessage("Forecast not available for this time", true);
      return hide();
    }
    field = createWindField(grid, hourIndex);
    controls.setSeries(centerSeries(grid, view));
    showPlace(view);
    drawFill(overlay.fill, field, view, size);
    particles.start(field, view, size);
    overlay.setVisible(true);
    controls.clearMessage();
    log("render", { view, hourIndex });
  };

  watchView((next) => {
    view = next;
    log("view", next);
    render();
  });
  setInterval(() => {
    if (grid && isStale(grid) && settings.enabled) render();
  }, STALE_CHECK_MS);
  for (const type of ["pointerdown", "wheel"] as const) {
    container.addEventListener(type, (event) => {
      if (controls.contains(event.target as Node)) return;
      overlay.setVisible(false);
      scheduleRender();
    });
  }
  container.addEventListener("pointermove", (event) => {
    if (!field || !view) return;
    if (controls.contains(event.target as Node)) return controls.setHover(null);
    const rect = container.getBoundingClientRect();
    const { lat, lng } = unproject(
      event.clientX - rect.left,
      event.clientY - rect.top,
      view,
      overlay.size(),
    );
    controls.setHover(field.sample(lat, lng));
  });
  container.addEventListener("pointerleave", () => controls.setHover(null));
}

const isStale = (grid: WindGrid) =>
  Date.now() - grid.fetchedAt > GRID_MAX_AGE_MS;

async function ensureGrid(
  current: WindGrid | null,
  visible: Bounds,
  controls: Controls,
): Promise<WindGrid> {
  if (current && !isStale(current) && contains(current.bounds, visible))
    return current;
  controls.showMessage("Loading wind…");
  const started = performance.now();
  const grid = await fetchWindGrid(paddedBounds(visible), FORECAST_DAYS);
  log("fetch", {
    bounds: grid.bounds,
    hours: grid.times.length,
    ms: Math.round(performance.now() - started),
  });
  controls.setSource(`${SOURCE_NAME} ${formatClock(grid.fetchedAt)}`);
  return grid;
}

function paddedBounds(bounds: Bounds): Bounds {
  const latPad = (bounds.north - bounds.south) * FETCH_PADDING;
  const lngPad = (bounds.east - bounds.west) * FETCH_PADDING;
  return {
    south: bounds.south - latPad,
    north: bounds.north + latPad,
    west: bounds.west - lngPad,
    east: bounds.east + lngPad,
  };
}

function centerSeries(grid: WindGrid, view: View): WindSample[] {
  const series: WindSample[] = [];
  for (let offset = 0; offset <= MAX_HOUR_OFFSET; offset++) {
    const hourIndex = hourIndexFor(grid, offset);
    if (hourIndex === null) break;
    series.push(createWindField(grid, hourIndex).sample(view.lat, view.lng));
  }
  return series;
}

function hourIndexFor(grid: WindGrid, hourOffset: number): number | null {
  const first = grid.times[0];
  if (!first) return null;
  const firstMs = Date.parse(`${first}Z`);
  const index = Math.round(
    (forecastTime(hourOffset).getTime() - firstMs) / HOUR_MS,
  );
  return index >= 0 && index < grid.times.length ? index : null;
}

const formatClock = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

function waitForContainer(): Promise<HTMLElement> {
  return new Promise((resolve) => {
    const check = () => {
      const container = document.querySelector<HTMLElement>(
        MAP_CONTAINER_SELECTOR,
      );
      if (container?.clientWidth) resolve(container);
      else setTimeout(check, CONTAINER_POLL_MS);
    };
    check();
  });
}

main().catch((error) => logError("main", error));
