import { Framebuffer1bpp } from "./framebuffer.js";

type Glyph = readonly string[];

const DIGIT_GLYPHS: Record<string, Glyph> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "001", "001", "001"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  ":": ["0", "1", "0", "1", "0"],
};

export const FONT_HEIGHT = DIGIT_GLYPHS["0"].length;
export const FONT_GAP_COLUMNS = 1;

export function getGlyph(character: string): Glyph {
  const glyph = DIGIT_GLYPHS[character];
  if (!glyph) {
    throw new Error(`Unsupported glyph: ${character}`);
  }
  return glyph;
}

export function getGlyphWidth(character: string): number {
  return getGlyph(character)[0]?.length ?? 0;
}

export function measureTextColumns(text: string): number {
  return text.split("").reduce((total, character, index) => {
    const gap = index === 0 ? 0 : FONT_GAP_COLUMNS;
    return total + gap + getGlyphWidth(character);
  }, 0);
}

export function drawScaledText(
  framebuffer: Framebuffer1bpp,
  text: string,
  startX: number,
  startY: number,
  scale: number,
): void {
  let cursorX = startX;

  for (const character of text) {
    drawScaledGlyph(framebuffer, getGlyph(character), cursorX, startY, scale);
    cursorX += (getGlyphWidth(character) + FONT_GAP_COLUMNS) * scale;
  }
}

function drawScaledGlyph(
  framebuffer: Framebuffer1bpp,
  glyph: Glyph,
  startX: number,
  startY: number,
  scale: number,
): void {
  for (let row = 0; row < glyph.length; row += 1) {
    for (let column = 0; column < glyph[row].length; column += 1) {
      if (glyph[row][column] !== "1") {
        continue;
      }

      framebuffer.fillRect(
        startX + column * scale,
        startY + row * scale,
        scale,
        scale,
        true,
      );
    }
  }
}
