import { Framebuffer1bpp } from "../screen/framebuffer.js";

import { type GrayscaleImage } from "./canvas-renderer.js";

export const DEFAULT_GAMMA = 1.35;
export const DEFAULT_THRESHOLD = 186;

export function rasterizeGrayscaleTo1bpp(image: GrayscaleImage): Uint8Array {
  const framebuffer = new Framebuffer1bpp(image.width, image.height);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const gray = image.pixels[y * image.width + x];
      const corrected = applyGamma(gray, DEFAULT_GAMMA);
      framebuffer.setPixel(x, y, binarizeWithThreshold(corrected, DEFAULT_THRESHOLD));
    }
  }

  return framebuffer.toUint8Array();
}

export function applyGamma(gray: number, gamma: number): number {
  const normalized = Math.max(0, Math.min(255, gray)) / 255;
  return Math.round(255 * normalized ** gamma);
}

export function binarizeWithThreshold(gray: number, threshold: number): boolean {
  return gray < threshold;
}
