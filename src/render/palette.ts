export type Rgb = [number, number, number];

interface Stop {
  speed: number;
  color: Rgb;
}

export const SPEED_STOPS: Stop[] = [
  { speed: 0, color: [98, 113, 183] },
  { speed: 5, color: [57, 97, 159] },
  { speed: 10, color: [74, 148, 169] },
  { speed: 15, color: [77, 141, 123] },
  { speed: 20, color: [83, 165, 83] },
  { speed: 25, color: [139, 179, 57] },
  { speed: 30, color: [196, 178, 42] },
  { speed: 35, color: [226, 160, 42] },
  { speed: 40, color: [228, 99, 43] },
  { speed: 50, color: [197, 60, 49] },
  { speed: 60, color: [141, 39, 108] },
];

export function speedColor(speed: number): Rgb {
  const last = SPEED_STOPS[SPEED_STOPS.length - 1] as Stop;
  if (speed >= last.speed) return last.color;
  for (let i = 1; i < SPEED_STOPS.length; i++) {
    const upper = SPEED_STOPS[i] as Stop;
    if (speed > upper.speed) continue;
    const lower = SPEED_STOPS[i - 1] as Stop;
    const t = (speed - lower.speed) / (upper.speed - lower.speed);
    return mix(lower.color, upper.color, t);
  }
  return last.color;
}

const mix = (from: Rgb, to: Rgb, t: number): Rgb => [
  Math.round(from[0] + (to[0] - from[0]) * t),
  Math.round(from[1] + (to[1] - from[1]) * t),
  Math.round(from[2] + (to[2] - from[2]) * t),
];

export const toCss = ([r, g, b]: Rgb) => `rgb(${r},${g},${b})`;
