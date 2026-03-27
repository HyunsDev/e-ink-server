import {
  DISPLAY_FONT_FAMILY,
  DISPLAY_FONT_WEIGHT,
} from "../rendering/fonts.js";
import { renderSceneTo1bpp } from "../rendering/render-scene.js";
import { type ScreenScene, type TextNode } from "../rendering/scene.js";
import { fitTextToBox, measureText } from "../rendering/text-layout.js";
import { E213_HEIGHT, E213_WIDTH } from "./framebuffer.js";
import {
  NOTE_FILE_EMPTY_TEXT,
  NOTE_FILE_ERROR_TEXT,
  type NoteContent,
} from "./note-content.js";

const NOTE_PADDING_X = 8;
const NOTE_PADDING_Y = 6;
export const NOTE_FONT_SIZE = 16;
export const NOTE_LINE_GAP = 4;
export const NOTE_LINE_HEIGHT = NOTE_FONT_SIZE + NOTE_LINE_GAP;
export const NOTE_VISIBLE_LINE_COUNT = Math.max(
  1,
  Math.floor(
    (E213_HEIGHT - NOTE_PADDING_Y * 2 + NOTE_LINE_GAP) / NOTE_LINE_HEIGHT,
  ),
);
export const NOTE_RENDER_LINE_COUNT = NOTE_VISIBLE_LINE_COUNT + 1;
export function renderNoteScreen(note: NoteContent): Uint8Array {
  return renderSceneTo1bpp(buildNoteScene(note));
}

export function buildNoteScene(note: NoteContent): ScreenScene {
  switch (note.kind) {
    case "note":
      return buildNoteTextScene(note.text);
    case "empty":
      return buildCenteredStatusScene(["NOTE FILE", "EMPTY"]);
    case "error":
      return buildCenteredStatusScene(["NOTE FILE", "ERROR"]);
    default: {
      const exhaustiveCheck: never = note.kind;
      throw new Error(
        `Unsupported note content kind: ${String(exhaustiveCheck)}`,
      );
    }
  }
}

export function buildNoteTextScene(text: string): ScreenScene {
  const availableWidth = E213_WIDTH - NOTE_PADDING_X * 2;
  const lines = wrapNoteText(text, availableWidth, NOTE_FONT_SIZE).slice(
    0,
    NOTE_RENDER_LINE_COUNT,
  );

  const nodes: TextNode[] = lines.map((line, index) => ({
    type: "text",
    text: line,
    x: NOTE_PADDING_X,
    y: NOTE_PADDING_Y + index * NOTE_LINE_HEIGHT,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontSize: NOTE_FONT_SIZE,
    fontWeight: DISPLAY_FONT_WEIGHT,
    align: "left",
    baseline: "top",
    color: "black",
  }));

  return {
    width: E213_WIDTH,
    height: E213_HEIGHT,
    background: "white",
    nodes,
  };
}

export function buildNoteFileEmptyScene(): ScreenScene {
  return buildCenteredStatusScene(["NOTE FILE", "EMPTY"]);
}

export function buildNoteFileErrorScene(): ScreenScene {
  return buildCenteredStatusScene(["NOTE FILE", "ERROR"]);
}

export function fitWrappedTextToBox(
  text: string,
  maxWidth: number,
  maxHeight: number,
): number {
  const wrapped = wrapNoteText(text, maxWidth, NOTE_FONT_SIZE);

  const totalHeight =
    wrapped.length * NOTE_FONT_SIZE +
    Math.max(0, wrapped.length - 1) * NOTE_LINE_GAP;

  if (totalHeight > maxHeight) {
    return NOTE_FONT_SIZE;
  }

  return NOTE_FONT_SIZE;
}

export function wrapNoteText(
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  const normalized = text === "" ? [""] : text.split("\n");
  const lines: string[] = [];

  for (const rawLine of normalized) {
    if (rawLine === "") {
      lines.push("");
      continue;
    }

    lines.push(...wrapSingleLine(rawLine, maxWidth, fontSize));
  }

  return lines;
}

function wrapSingleLine(
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  const chars = Array.from(text);
  const lines: string[] = [];
  let current = "";

  for (const char of chars) {
    const candidate = current + char;
    const candidateWidth = measureText(
      candidate,
      fontSize,
      DISPLAY_FONT_FAMILY,
      DISPLAY_FONT_WEIGHT,
    ).width;

    if (current !== "" && candidateWidth > maxWidth) {
      lines.push(current.trimEnd());
      current = char === " " ? "" : char;
      continue;
    }

    current = candidate;
  }

  if (current !== "" || lines.length === 0) {
    lines.push(current.trimEnd());
  }

  return lines;
}

function buildCenteredStatusScene(lines: string[]): ScreenScene {
  const fontSize = Math.min(
    ...lines.map((line) =>
      fitTextToBox({
        text: line,
        maxWidth: E213_WIDTH - 16,
        maxHeight: 44,
        fontFamily: DISPLAY_FONT_FAMILY,
        fontWeight: DISPLAY_FONT_WEIGHT,
        maxFontSize: 44,
        minFontSize: 12,
      }),
    ),
  );

  const lineGap = Math.max(6, Math.round(fontSize * 0.24));
  const totalHeight = fontSize * lines.length + lineGap * (lines.length - 1);
  const startY = Math.round((E213_HEIGHT - totalHeight) / 2 + fontSize / 2);

  return {
    width: E213_WIDTH,
    height: E213_HEIGHT,
    background: "white",
    nodes: lines.map((line, index) => ({
      type: "text" as const,
      text: line,
      x: E213_WIDTH / 2,
      y: startY + index * (fontSize + lineGap),
      fontFamily: DISPLAY_FONT_FAMILY,
      fontSize,
      fontWeight: DISPLAY_FONT_WEIGHT,
      align: "center" as const,
      baseline: "middle" as const,
      color: "black",
    })),
  };
}
