import {
  DISPLAY_FONT_FAMILY,
  DISPLAY_FONT_WEIGHT,
} from "../rendering/fonts.js";
import { renderSceneTo1bpp } from "../rendering/render-scene.js";
import { type ScreenScene } from "../rendering/scene.js";
import { fitTextToBox } from "../rendering/text-layout.js";
import { E213_HEIGHT, E213_WIDTH } from "./framebuffer.js";

const TIME_ZONE = "Asia/Seoul";

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});

export function renderTimeScreen(date: Date): Uint8Array {
  return renderSceneTo1bpp(buildTimeScene(date));
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

export function buildTimeScene(date: Date): ScreenScene {
  const text = formatTime(date);
  const fittedFontSize = fitTextToBox({
    text,
    maxWidth: E213_WIDTH - 32,
    maxHeight: E213_HEIGHT - 32,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: DISPLAY_FONT_WEIGHT,
    maxFontSize: 88,
    minFontSize: 12,
  });
  const fontSize = Math.max(12, fittedFontSize - 2);

  return {
    width: E213_WIDTH,
    height: E213_HEIGHT,
    background: "white",
    nodes: [
      {
        type: "text",
        text,
        x: E213_WIDTH / 2,
        y: E213_HEIGHT / 2,
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize,
        fontWeight: DISPLAY_FONT_WEIGHT,
        align: "center",
        baseline: "middle",
        color: "black",
      },
    ],
  };
}
