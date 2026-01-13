export type ColorVector = { r: number; g: number; b: number };

export type ExpectedColorStats = {
  avgRgb: ColorVector;
  brightnessRange: [number, number];
  tolerance: number;
};

export type Step = {
  id: string;
  order: number;
  title: string;
  instructions: string;
  referenceImageUrl: string;
  expectedColorStats: ExpectedColorStats;
  tips?: string[];
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  steps: Step[];
};

export type ComparisonCategory = "match" | "close" | "off";

export type ComparisonResult = {
  average: ColorVector;
  brightness: number;
  delta: {
    r: number;
    g: number;
    b: number;
    brightness: number;
  };
  category: ComparisonCategory;
  guidance: string[];
};

