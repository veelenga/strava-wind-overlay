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

export interface ControlsOptions {
  enabled: boolean;
  hourOffset: number;
  onToggle(enabled: boolean): void;
  onHourOffset(hourOffset: number): void;
  onCopyDebug(): Promise<void>;
}

export interface Controls {
  setReadout(sample: WindSample | null): void;
  setStatus(text: string, isError?: boolean): void;
  setSeries(samples: WindSample[]): void;
  setPlace(text: string): void;
  setSource(text: string): void;
  contains(node: Node): boolean;
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
      <button class="swo-toggle" type="button" aria-pressed="${options.enabled}">Wind</button>
      <button class="swo-now" type="button">Now</button>
      <span class="swo-place"></span>
      <div class="swo-readout"></div>
      <span class="swo-source"></span>
      <button class="swo-debug" type="button" title="Copy a debug report to the clipboard">Debug</button>
      <div class="swo-legend">
        <div class="swo-legend-bar" style="background:${legendGradient()}"></div>
        <div class="swo-legend-ticks"><span>0</span><span>${LEGEND_MAX_SPEED / 2}</span><span>${LEGEND_MAX_SPEED}+ km/h</span></div>
      </div>
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
  const slider = query<HTMLInputElement>("input");
  const timeLabel = query<HTMLOutputElement>("output");
  const readout = query<HTMLDivElement>(".swo-readout");
  const place = query<HTMLSpanElement>(".swo-place");
  const source = query<HTMLSpanElement>(".swo-source");
  const speedRow = query<HTMLDivElement>(".swo-speed");
  const gustRow = query<HTMLDivElement>(".swo-gusts");
  const arrowRow = query<HTMLDivElement>(".swo-arrows");

  const updateTimeLabel = () => {
    const offset = Number(slider.value);
    timeLabel.textContent = formatHour(offset);
    timeLabel.style.left = thumbCenter(offset);
  };
  const commit = (hourOffset: number) => {
    slider.value = String(hourOffset);
    updateTimeLabel();
    options.onHourOffset(hourOffset);
  };
  const setStatus = (text: string, isError = false) => {
    readout.dataset.state = isError ? "error" : "";
    readout.textContent = text;
  };
  updateTimeLabel();

  toggle.addEventListener("click", () => {
    const enabled = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", String(enabled));
    options.onToggle(enabled);
  });
  slider.addEventListener("input", updateTimeLabel);
  slider.addEventListener("change", () => commit(Number(slider.value)));
  query<HTMLButtonElement>(".swo-now").addEventListener("click", () =>
    commit(0),
  );
  query<HTMLButtonElement>(".swo-debug").addEventListener("click", () => {
    options.onCopyDebug().then(
      () => setStatus("Debug report copied"),
      () =>
        setStatus(
          "Could not copy. Open DevTools and filter the console by [swo].",
          true,
        ),
    );
  });

  return {
    setStatus,
    contains: (node) => panel.contains(node),
    setReadout(sample) {
      readout.dataset.state = "";
      readout.textContent = sample ? formatSample(sample) : "";
    },
    setPlace(text) {
      place.textContent = `Timeline at map centre: ${text}`;
    },
    setSource(text) {
      source.textContent = text;
    },
    setSeries(samples) {
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
