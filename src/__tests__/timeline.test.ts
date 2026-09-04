import { describe, expect, it } from "vitest";
import { daySegments, forecastTime, formatHour } from "../ui/timeline";

const now = new Date(2026, 8, 4, 19, 30);

describe("timeline", () => {
  it("floors the current time to the hour and adds the offset", () => {
    expect(forecastTime(0, now).getMinutes()).toBe(0);
    expect(forecastTime(3, now).getHours()).toBe(22);
  });

  it("splits the forecast range into day segments whose hours add up", () => {
    const segments = daySegments(144, now);
    expect(segments[0]?.hours).toBe(5);
    expect(segments.reduce((sum, day) => sum + day.hours, 0)).toBe(145);
  });

  it("labels the first hour as now", () => {
    expect(formatHour(0, now)).toBe("Now");
    expect(formatHour(1, now)).not.toBe("Now");
  });
});
