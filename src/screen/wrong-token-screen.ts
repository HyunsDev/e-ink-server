import { PRETENDARD_FONT_FAMILY } from "../rendering/fonts.js";
import { renderSceneTo1bpp } from "../rendering/render-scene.js";
import { type ScreenScene } from "../rendering/scene.js";
import { fitTextToBox } from "../rendering/text-layout.js";
import { E213_HEIGHT, E213_WIDTH } from "./framebuffer.js";

const WRONG_TOKEN_LINES = ["WRONG", "TOKEN"] as const;

export function renderWrongTokenScreen(): Uint8Array {
  return renderSceneTo1bpp(buildWrongTokenScene());
}

export function buildWrongTokenScene(): ScreenScene {
  const fontSize = Math.min(
    ...WRONG_TOKEN_LINES.map((line) =>
      fitTextToBox({
        text: line,
        maxWidth: E213_WIDTH - 16,
        maxHeight: 44,
        fontFamily: PRETENDARD_FONT_FAMILY,
        fontWeight: 900,
        maxFontSize: 52,
        minFontSize: 12,
      }),
    ),
  );

  const lineGap = Math.max(6, Math.round(fontSize * 0.24));
  const totalHeight = fontSize * WRONG_TOKEN_LINES.length + lineGap;
  const firstLineY = Math.round((E213_HEIGHT - totalHeight) / 2 + fontSize / 2);

  return {
    width: E213_WIDTH,
    height: E213_HEIGHT,
    background: "white",
    nodes: WRONG_TOKEN_LINES.map((line, index) => ({
      type: "text" as const,
      text: line,
      x: E213_WIDTH / 2,
      y: firstLineY + index * (fontSize + lineGap),
      fontFamily: PRETENDARD_FONT_FAMILY,
      fontSize,
      fontWeight: 900,
      align: "center" as const,
      baseline: "middle" as const,
      color: "black",
    })),
  };
}
