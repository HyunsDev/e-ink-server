import { describe, expect, it } from "vitest";

import {
  E213_BUFFER_LENGTH,
  E213_HEIGHT,
  E213_STRIDE,
  Framebuffer1bpp,
} from "../src/screen/framebuffer.js";

describe("Framebuffer1bpp", () => {
  it("packs pixels with XBM-compatible LSB-first bit order", () => {
    const framebuffer = new Framebuffer1bpp();

    framebuffer.setPixel(0, 0, true);
    framebuffer.setPixel(7, 0, true);
    framebuffer.setPixel(8, 0, true);
    framebuffer.setPixel(249, E213_HEIGHT - 1, true);

    const bytes = framebuffer.toUint8Array();
    expect(bytes[0]).toBe(0b10000001);
    expect(bytes[1]).toBe(0b00000001);
    expect(bytes[(E213_HEIGHT - 1) * E213_STRIDE + 31]).toBe(0b00000010);
  });

  it("always exposes the expected raw buffer length", () => {
    const framebuffer = new Framebuffer1bpp();
    expect(framebuffer.toUint8Array()).toHaveLength(E213_BUFFER_LENGTH);
  });
});
