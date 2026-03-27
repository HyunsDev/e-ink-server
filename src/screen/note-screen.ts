import {
  DISPLAY_FONT_FAMILY,
  DISPLAY_FONT_WEIGHT,
} from "../rendering/fonts.js";
import { renderSceneTo1bpp } from "../rendering/render-scene.js";
import {
  type RectNode,
  type SceneNode,
  type ScreenScene,
  type TextNode,
} from "../rendering/scene.js";
import { fitTextToBox, measureText } from "../rendering/text-layout.js";
import { E213_HEIGHT, E213_WIDTH } from "./framebuffer.js";
import {
  NOTE_FILE_EMPTY_TEXT,
  NOTE_FILE_ERROR_TEXT,
  type NoteContent,
} from "./note-content.js";

const NOTE_PADDING_X = 0;
const NOTE_PADDING_Y = 5.5;
export const NOTE_FONT_SIZE = 16;
export const NOTE_LINE_GAP = 1;
export const NOTE_LINE_HEIGHT = NOTE_FONT_SIZE + NOTE_LINE_GAP;
export const NOTE_VISIBLE_LINE_COUNT = Math.max(
  1,
  Math.floor(
    (E213_HEIGHT - NOTE_PADDING_Y * 2 + NOTE_LINE_GAP) / NOTE_LINE_HEIGHT,
  ),
);
export const NOTE_RENDER_LINE_COUNT = NOTE_VISIBLE_LINE_COUNT + 1;
export const NOTE_INVERTED_TOP_EXTRA_Y = Math.ceil(NOTE_LINE_GAP / 2);
export const NOTE_INVERTED_BOTTOM_EXTRA_Y = Math.floor(NOTE_LINE_GAP / 2);
export const NOTE_INVERTED_STROKE_WIDTH = 0.75;

export interface NoteInlineSegment {
  text: string;
  inverted: boolean;
}

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
  const wrappedLines = wrapNoteSegments(
    text,
    availableWidth,
    NOTE_FONT_SIZE,
  ).slice(0, NOTE_RENDER_LINE_COUNT);
  const nodes = wrappedLines.flatMap((line, index) =>
    buildNoteLineNodes(line, NOTE_PADDING_Y + index * NOTE_LINE_HEIGHT),
  );

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
  return wrapNoteSegments(text, maxWidth, fontSize).map((line) =>
    line.map((segment) => segment.text).join(""),
  );
}

export function wrapNoteSegments(
  text: string,
  maxWidth: number,
  fontSize: number,
): NoteInlineSegment[][] {
  const normalized = text === "" ? [""] : text.split("\n");
  const lines: NoteInlineSegment[][] = [];

  for (const rawLine of normalized) {
    if (rawLine === "") {
      lines.push([]);
      continue;
    }

    lines.push(
      ...wrapSingleLine(parseHighlightedSegments(rawLine), maxWidth, fontSize),
    );
  }

  return lines;
}

function wrapSingleLine(
  segments: NoteInlineSegment[],
  maxWidth: number,
  fontSize: number,
): NoteInlineSegment[][] {
  const chars = expandSegmentsToChars(segments);
  const lines: NoteInlineSegment[][] = [];
  let current: NoteInlineSegment[] = [];

  for (const char of chars) {
    const candidate = appendCharToSegments(current, char.char, char.inverted);
    const candidateWidth = measureSegmentsWidth(candidate, fontSize);

    if (current.length > 0 && candidateWidth > maxWidth) {
      lines.push(trimTrailingSpaces(current));
      current =
        char.char === " " ? [] : [{ text: char.char, inverted: char.inverted }];
      continue;
    }

    current = candidate;
  }

  if (current.length > 0 || lines.length === 0) {
    lines.push(trimTrailingSpaces(current));
  }

  return lines;
}

function buildNoteLineNodes(line: NoteInlineSegment[], y: number): SceneNode[] {
  const nodes: SceneNode[] = [];
  let x = NOTE_PADDING_X;

  for (const segment of line) {
    if (segment.text === "") {
      continue;
    }

    const width = measureText(
      segment.text,
      NOTE_FONT_SIZE,
      DISPLAY_FONT_FAMILY,
      DISPLAY_FONT_WEIGHT,
    ).width;

    if (segment.inverted) {
      nodes.push({
        type: "rect",
        x,
        y: y - NOTE_INVERTED_TOP_EXTRA_Y,
        width: Math.ceil(width),
        height:
          NOTE_FONT_SIZE +
          NOTE_INVERTED_TOP_EXTRA_Y +
          NOTE_INVERTED_BOTTOM_EXTRA_Y,
        fill: "black",
      } satisfies RectNode);
    }

    nodes.push({
      type: "text",
      text: segment.text,
      x,
      y,
      fontFamily: DISPLAY_FONT_FAMILY,
      fontSize: NOTE_FONT_SIZE,
      fontWeight: DISPLAY_FONT_WEIGHT,
      align: "left",
      baseline: "top",
      color: segment.inverted ? "white" : "black",
      strokeColor: segment.inverted ? "white" : undefined,
      strokeWidth: segment.inverted ? NOTE_INVERTED_STROKE_WIDTH : undefined,
    } satisfies TextNode);

    x += width;
  }

  return nodes;
}

function parseHighlightedSegments(text: string): NoteInlineSegment[] {
  const segments: NoteInlineSegment[] = [];
  const pattern = /<([^<>]+)>/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const fullMatch = match[0];
    const highlightedText = match[1];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, matchIndex),
        inverted: false,
      });
    }

    segments.push({
      text: highlightedText,
      inverted: true,
    });

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      inverted: false,
    });
  }

  if (segments.length === 0) {
    return [{ text, inverted: false }];
  }

  return segments.filter((segment) => segment.text !== "");
}

function expandSegmentsToChars(
  segments: NoteInlineSegment[],
): Array<{ char: string; inverted: boolean }> {
  const chars: Array<{ char: string; inverted: boolean }> = [];

  for (const segment of segments) {
    for (const char of Array.from(segment.text)) {
      chars.push({ char, inverted: segment.inverted });
    }
  }

  return chars;
}

function appendCharToSegments(
  segments: NoteInlineSegment[],
  char: string,
  inverted: boolean,
): NoteInlineSegment[] {
  if (segments.length === 0) {
    return [{ text: char, inverted }];
  }

  const last = segments[segments.length - 1];
  if (last?.inverted === inverted) {
    return [
      ...segments.slice(0, -1),
      {
        text: `${last.text}${char}`,
        inverted,
      },
    ];
  }

  return [...segments, { text: char, inverted }];
}

function trimTrailingSpaces(
  segments: NoteInlineSegment[],
): NoteInlineSegment[] {
  const trimmed = segments.map((segment) => ({ ...segment }));

  while (trimmed.length > 0) {
    const last = trimmed[trimmed.length - 1];
    if (!last) {
      break;
    }

    const updatedText = last.text.replace(/\s+$/u, "");
    if (updatedText.length > 0) {
      last.text = updatedText;
      break;
    }

    trimmed.pop();
  }

  return trimmed;
}

function measureSegmentsWidth(
  segments: NoteInlineSegment[],
  fontSize: number,
): number {
  return segments.reduce(
    (total, segment) =>
      total +
      measureText(
        segment.text,
        fontSize,
        DISPLAY_FONT_FAMILY,
        DISPLAY_FONT_WEIGHT,
      ).width,
    0,
  );
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
