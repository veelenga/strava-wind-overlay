import { describe, expect, it } from "vitest";
import { createWindField } from "../wind/field";
import type { WindGrid } from "../wind/open-meteo";

function uniformGrid(speed: number, direction: number): WindGrid {
  const points = 4;
  return {
    bounds: { south: 50, west: 16, north: 52, east: 18 },
    fetchedAt: 0,
    rows: 2,
    columns: 2,
    times: ["2026-09-04T00:00"],
    speed: new Float32Array(points).fill(speed),
    direction: new Float32Array(points).fill(direction),
    gusts: new Float32Array(points).fill(speed * 2),
  };
}

describe("wind field", () => {
  it("turns a wind from the west into an eastward vector", () => {
    const sample = createWindField(uniformGrid(20, 270), 0).sample(51, 17);
    expect(sample.u).toBeCloseTo(20);
    expect(sample.v).toBeCloseTo(0);
    expect(sample.speed).toBeCloseTo(20);
    expect(sample.direction).toBeCloseTo(270);
    expect(sample.gusts).toBeCloseTo(40);
  });

  it("turns a wind from the north into a southward vector", () => {
    const sample = createWindField(uniformGrid(10, 0), 0).sample(51, 17);
    expect(sample.u).toBeCloseTo(0);
    expect(sample.v).toBeCloseTo(-10);
  });

  it("clamps samples outside the grid", () => {
    expect(
      createWindField(uniformGrid(10, 90), 0).sample(40, 0).speed,
    ).toBeCloseTo(10);
  });
});
