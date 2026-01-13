import { ComparisonResult, ComparisonCategory, ExpectedColorStats } from "./types";

const MAX_CANVAS_SIZE = 600;

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const brightnessFromRgb = (r: number, g: number, b: number) =>
  (0.299 * r + 0.587 * g + 0.114 * b) / 255;

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const dataUrl = await readFileAsDataUrl(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getCanvasContext(img: HTMLImageElement): CanvasRenderingContext2D {
  const scale = Math.min(1, MAX_CANVAS_SIZE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported.");
  ctx.drawImage(img, 0, 0, w, h);
  return ctx;
}

/**
 * Calculate local color variance around a pixel to identify areas with detail (food) vs uniform areas (pan/counter)
 */
function getLocalVariance(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number = 3
): number {
  const { data } = imageData;
  const colors: number[] = [];
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * 4;
        const brightness = brightnessFromRgb(data[idx], data[idx + 1], data[idx + 2]);
        colors.push(brightness);
      }
    }
  }
  
  if (colors.length < 2) return 0;
  
  const mean = colors.reduce((a, b) => a + b, 0) / colors.length;
  const variance = colors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / colors.length;
  return variance;
}

/**
 * Calculate edge strength using simple gradient (Sobel-like)
 */
function getEdgeStrength(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number
): number {
  const { data } = imageData;
  if (x === 0 || x === width - 1 || y === 0 || y === height - 1) return 0;
  
  const getBrightness = (nx: number, ny: number) => {
    const idx = (ny * width + nx) * 4;
    return brightnessFromRgb(data[idx], data[idx + 1], data[idx + 2]);
  };
  
  // Simple gradient calculation
  const gx = getBrightness(x + 1, y) - getBrightness(x - 1, y);
  const gy = getBrightness(x, y + 1) - getBrightness(x, y - 1);
  return Math.sqrt(gx * gx + gy * gy);
}

/**
 * Calculate center distance weight (pixels closer to center get higher weight)
 */
function getCenterWeight(x: number, y: number, width: number, height: number): number {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
  // Weight decreases from 1.0 at center to ~0.3 at edges
  return Math.max(0.3, 1.0 - (dist / maxDist) * 0.7);
}

/**
 * Compute weighted average focusing on food areas (center, high variance, edges)
 */
function computeAverage(imageData: ImageData) {
  const { data, width, height } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  let totalWeight = 0;
  
  // Sample every 2nd pixel for performance (can adjust)
  const step = 2;
  
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const pixelR = data[idx];
      const pixelG = data[idx + 1];
      const pixelB = data[idx + 2];
      
      // Calculate weights
      const centerWeight = getCenterWeight(x, y, width, height);
      const variance = getLocalVariance(imageData, x, y, width, height);
      const edgeStrength = getEdgeStrength(imageData, x, y, width, height);
      
      // Normalize variance and edge strength (0-1 range)
      const varianceWeight = Math.min(1.0, variance * 10); // Scale variance
      const edgeWeight = Math.min(1.0, edgeStrength * 2); // Scale edge strength
      
      // Combine weights: prefer center, high variance (food detail), and edges
      // This filters out uniform areas like empty pans and counters
      const combinedWeight = centerWeight * (0.5 + 0.3 * varianceWeight + 0.2 * edgeWeight);
      
      r += pixelR * combinedWeight;
      g += pixelG * combinedWeight;
      b += pixelB * combinedWeight;
      totalWeight += combinedWeight;
    }
  }
  
  if (totalWeight === 0) {
    // Fallback to simple average if no weights
    return computeSimpleAverage(imageData);
  }
  
  return {
    r: Math.round(r / totalWeight),
    g: Math.round(g / totalWeight),
    b: Math.round(b / totalWeight)
  };
}

/**
 * Fallback: simple average of all pixels
 */
function computeSimpleAverage(imageData: ImageData) {
  const { data } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  const totalPixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return {
    r: Math.round(r / totalPixels),
    g: Math.round(g / totalPixels),
    b: Math.round(b / totalPixels)
  };
}

export function computeCategory(delta: number, tolerance: number): ComparisonCategory {
  if (Math.abs(delta) <= tolerance * 0.4) return "match";
  if (Math.abs(delta) <= tolerance * 0.9) return "close";
  return "off";
}

function guidanceFromDeltas(
  deltaRgb: { r: number; g: number; b: number; brightness: number },
  expected: ExpectedColorStats
): string[] {
  const guidance: string[] = [];
  const { brightnessRange } = expected;
  const [minB, maxB] = brightnessRange;

  if (deltaRgb.brightness < 0 && deltaRgb.brightness < minB - maxB) {
    guidance.push("Looks too dark; add a splash of coconut milk/stock to lighten and stir.");
  } else if (deltaRgb.brightness > 0 && deltaRgb.brightness > maxB - minB) {
    guidance.push("Looks too pale; add a small spoon of curry paste to deepen color.");
  }

  if (deltaRgb.r > 15 && deltaRgb.g < -10) {
    guidance.push("Too red; add a bit more coconut milk to balance.");
  }
  if (deltaRgb.g > 15 && deltaRgb.r < -10) {
    guidance.push("Too green/under-browned; add a spoon of paste or simmer a bit longer.");
  }
  if (deltaRgb.b > 15) {
    guidance.push("Too cool-toned; add a touch of coconut milk and stir to warm the tone.");
  }
  if (deltaRgb.b < -15) {
    guidance.push("Too warm-toned; balance with a splash of stock/coconut milk.");
  }

  if (guidance.length === 0) guidance.push("Color is on track. Keep going!");
  return guidance;
}

export async function analyzeImageAgainstExpected(
  file: File,
  expected: ExpectedColorStats
): Promise<ComparisonResult> {
  const img = await loadImageFromFile(file);
  const ctx = getCanvasContext(img);
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const average = computeAverage(imageData);
  const brightness = brightnessFromRgb(average.r, average.g, average.b);

  const delta = {
    r: average.r - expected.avgRgb.r,
    g: average.g - expected.avgRgb.g,
    b: average.b - expected.avgRgb.b,
    brightness:
      brightness -
      clamp(
        (expected.brightnessRange[0] + expected.brightnessRange[1]) / 2,
        0,
        1
      )
  };

  const maxDelta = Math.max(Math.abs(delta.r), Math.abs(delta.g), Math.abs(delta.b));
  const category = computeCategory(maxDelta, expected.tolerance);
  const guidance = guidanceFromDeltas(delta, expected);

  return { average, brightness, delta, category, guidance };
}

