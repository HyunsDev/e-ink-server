import { describe, expect, it } from "vitest";

import { renderSceneToGrayscale } from "../src/rendering/canvas-renderer.js";
import {
  ensurePretendardFontLoaded,
  PRETENDARD_FONT_FAMILY,
} from "../src/rendering/fonts.js";
import {
  applyGamma,
  binarizeWithThreshold,
  DEFAULT_THRESHOLD,
} from "../src/rendering/mono-rasterizer.js";
import { renderSceneTo1bpp } from "../src/rendering/render-scene.js";
import { type ScreenScene } from "../src/rendering/scene.js";
import { buildTimeScene } from "../src/screen/time-screen.js";
import { E213_BUFFER_LENGTH, E213_STRIDE, E213_WIDTH } from "../src/screen/framebuffer.js";

describe("vector renderer", () => {
  it("loads Pretendard from the bundled font asset", () => {
    expect(ensurePretendardFontLoaded()).toContain("PretendardVariable.ttf");
  });

  it("throws a clear error when the font file is missing", () => {
    expect(() =>
      ensurePretendardFontLoaded({
        fontPath: "/tmp/pretendard-missing.ttf",
        force: true,
      }),
    ).toThrow("Pretendard font file not found");
  });

  it("renders English and Korean text scenes to the E213 raw length", () => {
    const englishScene: ScreenScene = {
      width: 250,
      height: 122,
      background: "white",
      nodes: [
        {
          type: "text",
        text: "WRONG TOKEN",
        x: 125,
        y: 42,
        fontFamily: PRETENDARD_FONT_FAMILY,
        fontSize: 24,
        fontWeight: 800,
        align: "center",
        baseline: "middle",
        color: "black",
        },
      ],
    };

    const koreanScene: ScreenScene = {
      width: 250,
      height: 122,
      background: "white",
      nodes: [
        {
          type: "text",
        text: "현재 시간",
        x: 125,
        y: 61,
        fontFamily: PRETENDARD_FONT_FAMILY,
        fontSize: 30,
        fontWeight: 800,
        align: "center",
        baseline: "middle",
        color: "black",
        },
      ],
    };

    expect(renderSceneTo1bpp(englishScene)).toHaveLength(E213_BUFFER_LENGTH);
    expect(renderSceneTo1bpp(koreanScene)).toHaveLength(E213_BUFFER_LENGTH);
  });

  it("renders deterministic threshold output for the same scene", () => {
    const scene = buildFixtureScene();

    expect(renderSceneTo1bpp(scene)).toEqual(renderSceneTo1bpp(scene));
  });

  it("supports mixed text and shape scenes", () => {
    const scene = buildFixtureScene();
    const buffer = renderSceneTo1bpp(scene);
    const inkPixels = countInk(buffer);

    expect(buffer).toHaveLength(E213_BUFFER_LENGTH);
    expect(inkPixels).toBeGreaterThan(2200);
  });

  it("produces grayscale content before monochrome conversion", () => {
    const grayscale = renderSceneToGrayscale(buildTimeScene(new Date("2026-03-27T11:34:00.000Z")));

    const uniqueValues = new Set(grayscale.pixels);
    expect(uniqueValues.size).toBeGreaterThan(2);
  });

  it("applies gamma correction before threshold binarization", () => {
    expect(applyGamma(128, 1.35)).toBeLessThan(128);
    expect(binarizeWithThreshold(applyGamma(128, 1.35), DEFAULT_THRESHOLD)).toBe(true);
    expect(binarizeWithThreshold(applyGamma(240, 1.35), DEFAULT_THRESHOLD)).toBe(false);
  });

  it("produces deterministic binary pixels after thresholding", () => {
    const first = renderSceneTo1bpp(buildFixtureScene());
    const second = renderSceneTo1bpp(buildFixtureScene());

    expect(first).toEqual(second);
  });
});

function buildFixtureScene(): ScreenScene {
  return {
    width: 250,
    height: 122,
    background: 255,
    nodes: [
      {
        type: "roundRect",
        x: 10,
        y: 10,
        width: 230,
        height: 102,
        radius: 16,
        stroke: 0,
        strokeWidth: 2,
      },
      {
        type: "circle",
        cx: 40,
        cy: 40,
        r: 12,
        fill: 0,
      },
      {
        type: "line",
        x1: 24,
        y1: 85,
        x2: 226,
        y2: 85,
        stroke: 0,
        strokeWidth: 2,
      },
      {
        type: "text",
        text: "현재 시간",
        x: 125,
        y: 42,
        fontFamily: PRETENDARD_FONT_FAMILY,
        fontSize: 24,
        fontWeight: 800,
        align: "center",
        baseline: "middle",
        color: 0,
      },
      {
        type: "text",
        text: "21:34",
        x: 125,
        y: 96,
        fontFamily: PRETENDARD_FONT_FAMILY,
        fontSize: 28,
        fontWeight: 800,
        align: "center",
        baseline: "middle",
        color: 0,
      },
    ],
  };
}

function countInk(buffer: Uint8Array): number {
  let total = 0;

  for (let y = 0; y < 122; y += 1) {
    const rowOffset = y * E213_STRIDE;

    for (let x = 0; x < E213_WIDTH; x += 1) {
      const byteIndex = rowOffset + (x >> 3);
      const mask = 1 << (x & 7);
      if ((buffer[byteIndex] & mask) !== 0) {
        total += 1;
      }
    }
  }

  return total;
}
