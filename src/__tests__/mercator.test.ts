import { describe, expect, it } from "vitest";
import { contains, project, unproject, visibleBounds } from "../mercator";

const view = { zoom: 10.18, lat: 51.05, lng: 17.03 };
const size = { width: 1800, height: 896 };

describe("mercator", () => {
  it("places the view center in the middle of the canvas", () => {
    expect(project(view.lat, view.lng, view, size)).toEqual({ x: 900, y: 448 });
  });

  it("round-trips project and unproject", () => {
    const { x, y } = project(50.9418, 17.2917, view, size);
    const { lat, lng } = unproject(x, y, view, size);
    expect(lat).toBeCloseTo(50.9418, 5);
    expect(lng).toBeCloseTo(17.2917, 5);
  });

  it("puts a town east of the center to the right", () => {
    expect(project(51.05, 17.3, view, size).x).toBeGreaterThan(900);
  });

  it("computes padded bounds that contain the visible bounds", () => {
    expect(
      contains(visibleBounds(view, size, 0.5), visibleBounds(view, size)),
    ).toBe(true);
    expect(
      contains(visibleBounds(view, size), visibleBounds(view, size, 0.5)),
    ).toBe(false);
  });
});
