import { createCanvas } from "@napi-rs/canvas";

import { ensureDisplayFontLoaded } from "./fonts.js";

export interface FitTextToBoxOptions {
  text: string;
  maxWidth: number;
  maxHeight: number;
  fontFamily: string;
  fontWeight?: number | string;
  maxFontSize: number;
  minFontSize?: number;
}

const measureCanvas = createCanvas(1, 1);
const measureContext = measureCanvas.getContext("2d");

export function fitTextToBox(options: FitTextToBoxOptions): number {
  ensureDisplayFontLoaded();

  const minFontSize = options.minFontSize ?? 8;

  for (let fontSize = options.maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    const metrics = measureText(options.text, fontSize, options.fontFamily, options.fontWeight);
    if (metrics.width <= options.maxWidth && metrics.height <= options.maxHeight) {
      return fontSize;
    }
  }

  return minFontSize;
}

export function measureText(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight?: number | string,
): { width: number; height: number } {
  measureContext.font = buildCanvasFont(fontSize, fontFamily, fontWeight);
  const metrics = measureContext.measureText(text);
  const height =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || fontSize;

  return {
    width: metrics.width,
    height,
  };
}

export function buildCanvasFont(
  fontSize: number,
  fontFamily: string,
  fontWeight?: number | string,
): string {
  const resolvedWeight = fontWeight ?? 400;
  return `${resolvedWeight} ${fontSize}px "${fontFamily}"`;
}
