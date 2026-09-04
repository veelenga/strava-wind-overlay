import { describe, expect, it } from "vitest";
import { SPEED_STOPS, speedColor } from "../render/palette";
import { compassPoint } from "../ui/controls";

describe("palette", () => {
  it("returns exact colors on stops and clamps above the top", () => {
    expect(speedColor(0)).toEqual(SPEED_STOPS[0]?.color);
    expect(speedColor(999)).toEqual(SPEED_STOPS.at(-1)?.color);
  });

  it("interpolates between stops", () => {
    const [r] = speedColor(2.5);
    expect(r).toBeGreaterThan(57);
    expect(r).toBeLessThan(98);
  });
});

describe("compass", () => {
  it("maps degrees to compass points", () => {
    expect(compassPoint(0)).toBe("N");
    expect(compassPoint(225)).toBe("SW");
    expect(compassPoint(359)).toBe("N");
  });
});
