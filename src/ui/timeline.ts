const HOUR_MS = 3_600_000;
const TICK_EVERY_HOURS = 3;

export interface DaySegment {
  label: string;
  hours: number;
}

export function forecastTime(hourOffset: number, now = new Date()): Date {
  const currentHour = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
  return new Date(currentHour + hourOffset * HOUR_MS);
}

export function daySegments(
  maxHourOffset: number,
  now = new Date(),
): DaySegment[] {
  const segments: DaySegment[] = [];
  for (let offset = 0; offset <= maxHourOffset; offset++) {
    const label = formatDay(forecastTime(offset, now));
    const last = segments[segments.length - 1];
    if (last?.label === label) last.hours++;
    else segments.push({ label, hours: 1 });
  }
  return segments;
}

export function isTickHour(hourOffset: number, now = new Date()): boolean {
  return forecastTime(hourOffset, now).getHours() % TICK_EVERY_HOURS === 0;
}

export function formatHour(hourOffset: number, now = new Date()): string {
  if (hourOffset === 0) return "Now";
  return forecastTime(hourOffset, now).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const formatDay = (date: Date) =>
  date.toLocaleDateString(undefined, { weekday: "long", day: "numeric" });
