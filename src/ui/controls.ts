import { SPEED_STOPS, speedColor, toCss } from "../render/palette";
import type { WindSample } from "../wind/field";
import styles from "./styles.css?inline";
import { daySegments, formatHour, isTickHour } from "./timeline";

export const MAX_HOUR_OFFSET = 144;
const LEGEND_MAX_SPEED = 50;
const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const DEGREES_PER_COMPASS_POINT = 360 / COMPASS.length;
const THUMB_WIDTH_PX = 16;
const STRIP_ALPHA = 0.55;
const ARROW = "➤";
const ARROW_BASE_ROTATION = -90;
const HALF_CIRCLE = 180;
const MESSAGE_HIDE_MS = 3000;
const CHEVRON =
  '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export interface ControlsOptions {
  enabled: boolean;
  collapsed: boolean;
  hourOffset: number;
  onToggle(enabled: boolean): void;
  onCollapse(collapsed: boolean): void;
  onHourOffset(hourOffset: number): void;
  onCopyDebug(): Promise<void>;
}

export interface Controls {
  setHover(sample: WindSample | null): void;
  setSeries(samples: WindSample[]): void;
  setPlace(text: string): void;
  setSource(text: string): void;
  showMessage(text: string, isError?: boolean): void;
  clearMessage(): void;
}

export function createControls(
  container: HTMLElement,
  options: ControlsOptions,
): Controls {
  injectStyles();
  const panel = document.createElement("div");
  panel.className = "swo-panel";
  panel.innerHTML = `
    <div class="swo-header">
      <div class="swo-header-main">
      <button class="swo-toggle" type="button" aria-pressed="${options.enabled}">Wind</button>
      <button class="swo-now" type="button" title="Back to the current hour">Now</button>
      <span class="swo-place"></span>
      <span class="swo-reading"></span>
      <span class="swo-message" hidden></span>
      <div class="swo-legend">
        <div class="swo-legend-bar" style="background:${legendGradient()}"></div>
        <div class="swo-legend-ticks"><span>0</span><span>${LEGEND_MAX_SPEED / 2}</span><span>${LEGEND_MAX_SPEED}+ km/h</span></div>
      </div>
      <span class="swo-meta"><span class="swo-source"></span><button class="swo-debug" type="button" title="Copy a debug report to the clipboard">Debug</button></span>
      </div>
      <button class="swo-collapse" type="button">${CHEVRON}</button>
    </div>
    <div class="swo-timeline">
      <output></output>
      <input type="range" min="0" max="${MAX_HOUR_OFFSET}" step="1" value="${options.hourOffset}" aria-label="Forecast time">
      <div class="swo-days">${dayLabels()}</div>
      <div class="swo-row swo-hours">${hourLabels()}</div>
      <div class="swo-row swo-speed"><label>Wind</label></div>
      <div class="swo-row swo-gusts"><label>Gusts</label></div>
      <div class="swo-row swo-arrows"><label>Dir</label></div>
    </div>`;
  container.appendChild(panel);

  const query = <T extends Element>(selector: string) =>
    panel.querySelector(selector) as T;
  const toggle = query<HTMLButtonElement>(".swo-toggle");
  const collapse = query<HTMLButtonElement>(".swo-collapse");
  const now = query<HTMLButtonElement>(".swo-now");
  const slider = query<HTMLInputElement>("input");
  const timeLabel = query<HTMLOutputElement>("output");
  const reading = query<HTMLSpanElement>(".swo-reading");
  const message = query<HTMLSpanElement>(".swo-message");
  const place = query<HTMLSpanElement>(".swo-place");
  const source = query<HTMLSpanElement>(".swo-source");
  const speedRow = query<HTMLDivElement>(".swo-speed");
  const gustRow = query<HTMLDivElement>(".swo-gusts");
  const arrowRow = query<HTMLDivElement>(".swo-arrows");

  let series: WindSample[] = [];
  let hover: WindSample | null = null;

  const selectedOffset = () => Number(slider.value);
  const updateReading = (offset = selectedOffset()) => {
    const sample = hover ?? series[offset];
    const prefix = hover ? "At cursor" : formatHour(offset);
    reading.textContent = sample ? `${prefix} · ${formatSample(sample)}` : "";
  };
  const updateTimeLabel = () => {
    const offset = selectedOffset();
    timeLabel.textContent = formatHour(offset);
    timeLabel.style.left = thumbCenter(offset);
    now.hidden = offset === 0;
    updateReading(offset);
  };
  const commit = (hourOffset: number) => {
    slider.value = String(hourOffset);
    updateTimeLabel();
    options.onHourOffset(hourOffset);
  };
  const setCollapsed = (collapsed: boolean) => {
    panel.dataset.collapsed = String(collapsed);
    collapse.setAttribute("aria-expanded", String(!collapsed));
    collapse.title = collapsed
      ? "Show forecast timeline"
      : "Hide forecast timeline";
  };
  const showMessage = (text: string, isError = false) => {
    message.hidden = false;
    message.dataset.state = isError ? "error" : "";
    message.textContent = text;
  };
  const clearMessage = () => {
    message.hidden = true;
  };

  setCollapsed(options.collapsed);
  updateTimeLabel();

  for (const type of ["pointerdown", "pointermove", "wheel"] as const) {
    panel.addEventListener(type, (event) => event.stopPropagation());
  }
  panel.addEventListener("pointerenter", () => {
    hover = null;
    updateReading();
  });
  collapse.addEventListener("click", () => {
    const collapsed = panel.dataset.collapsed !== "true";
    setCollapsed(collapsed);
    options.onCollapse(collapsed);
  });
  toggle.addEventListener("click", () => {
    const enabled = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", String(enabled));
    options.onToggle(enabled);
  });
  slider.addEventListener("input", updateTimeLabel);
  slider.addEventListener("change", () => commit(selectedOffset()));
  query<HTMLButtonElement>(".swo-now").addEventListener("click", () =>
    commit(0),
  );
  query<HTMLButtonElement>(".swo-debug").addEventListener("click", () => {
    options.onCopyDebug().then(
      () => {
        showMessage("Debug report copied");
        setTimeout(clearMessage, MESSAGE_HIDE_MS);
      },
      () => showMessage("Copy failed, see the [swo] console log", true),
    );
  });

  return {
    showMessage,
    clearMessage,
    setHover(sample) {
      hover = sample;
      updateReading();
    },
    setPlace(text) {
      place.textContent = text;
    },
    setSource(text) {
      source.textContent = text;
    },
    setSeries(samples) {
      series = samples;
      updateReading();
      fillRow(speedRow, samples, (sample) => sample.speed);
      fillRow(gustRow, samples, (sample) => sample.gusts);
      fillRow(arrowRow, samples, null, arrowLabel);
    },
  };
}

export function compassPoint(degrees: number): string {
  const index =
    Math.round(degrees / DEGREES_PER_COMPASS_POINT) % COMPASS.length;
  return COMPASS[index] as string;
}

function formatSample(sample: WindSample): string {
  const speed = Math.round(sample.speed);
  const gusts = Math.round(sample.gusts);
  return `${speed} km/h from ${compassPoint(sample.direction)} · gusts ${gusts}`;
}

const cellCenter = (offset: number) =>
  `${((offset + 0.5) / (MAX_HOUR_OFFSET + 1)) * 100}%`;

function thumbCenter(offset: number): string {
  const fraction = offset / MAX_HOUR_OFFSET;
  return `calc(${fraction * 100}% + ${(0.5 - fraction) * THUMB_WIDTH_PX}px)`;
}

function dayLabels(): string {
  return daySegments(MAX_HOUR_OFFSET)
    .map(
      (day) =>
        `<span style="flex:${day.hours}" title="${day.label}">${day.label}</span>`,
    )
    .join("");
}

function hourLabels(): string {
  return Array.from({ length: MAX_HOUR_OFFSET + 1 }, (_, offset) =>
    isTickHour(offset)
      ? `<b style="left:${cellCenter(offset)}">${hourOfDay(offset)}</b>`
      : "",
  ).join("");
}

function hourOfDay(offset: number): number {
  return (new Date().getHours() + offset) % 24;
}

type Metric = (sample: WindSample) => number;
type Label = (sample: WindSample, offset: number) => string;

function fillRow(
  row: HTMLElement,
  samples: WindSample[],
  metric: Metric | null,
  label?: Label,
): void {
  const rowLabel = row.querySelector("label")?.outerHTML ?? "";
  const cells = metric
    ? samples.map((sample) => colorCell(metric(sample))).join("")
    : "";
  const labels = samples
    .map(
      label ?? ((sample, offset) => numberLabel(metric?.(sample) ?? 0, offset)),
    )
    .join("");
  row.innerHTML = rowLabel + cells + labels;
}

function colorCell(speed: number): string {
  const [r, g, b] = speedColor(speed);
  return `<i style="background:rgba(${r},${g},${b},${STRIP_ALPHA})"></i>`;
}

function numberLabel(value: number, offset: number): string {
  if (!isTickHour(offset)) return "";
  return `<b style="left:${cellCenter(offset)}">${Math.round(value)}</b>`;
}

function arrowLabel(sample: WindSample, offset: number): string {
  if (!isTickHour(offset)) return "";
  const rotation = sample.direction + HALF_CIRCLE + ARROW_BASE_ROTATION;
  const title = `${Math.round(sample.speed)} km/h from ${compassPoint(sample.direction)}`;
  return `<b style="left:${cellCenter(offset)};transform:translateX(-50%) rotate(${rotation}deg)" title="${title}">${ARROW}</b>`;
}

function legendGradient(): string {
  const stops = SPEED_STOPS.filter(
    (stop) => stop.speed <= LEGEND_MAX_SPEED,
  ).map(
    (stop) => `${toCss(stop.color)} ${(stop.speed / LEGEND_MAX_SPEED) * 100}%`,
  );
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = styles;
  document.head.appendChild(style);
}
