import { brightnessFromRgb, computeCategory } from "../lib/color";

describe("color utilities", () => {
  it("computes brightness within 0-1", () => {
    expect(brightnessFromRgb(0, 0, 0)).toBeCloseTo(0);
    expect(brightnessFromRgb(255, 255, 255)).toBeCloseTo(1);
    expect(brightnessFromRgb(128, 128, 128)).toBeCloseTo(0.5, 1);
  });

  it("categorizes deltas with tolerance", () => {
    expect(computeCategory(5, 40)).toBe("match");
    expect(computeCategory(30, 40)).toBe("close");
    expect(computeCategory(60, 40)).toBe("off");
  });
});

