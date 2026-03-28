import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const NOTE_FILE_EMPTY_TEXT = "NOTE FILE EMPTY";
export const NOTE_FILE_ERROR_TEXT = "NOTE FILE ERROR";
const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type NoteContentKind = "note" | "empty" | "error";

export interface NoteContent {
  kind: NoteContentKind;
  text: string;
  id: string;
}

export interface NoteTemplateContext {
  now: Date;
  customVariables?: Record<string, string>;
}

export function loadNoteContent(noteFilePath: string): NoteContent {
  try {
    const raw = readFileSync(noteFilePath, "utf8");
    const normalized = normalizeNoteText(raw);

    if (normalized.trim() === "") {
      return createNoteState("empty", NOTE_FILE_EMPTY_TEXT);
    }

    return createNoteState("note", normalized);
  } catch (error) {
    console.error("Error loading note content:", error);
    return createNoteState("error", NOTE_FILE_ERROR_TEXT);
  }
}

export function requireNoteFilePath(noteFilePath: string | undefined): string {
  if (!noteFilePath) {
    throw new Error("NOTE_FILE must be set before starting the server.");
  }

  return noteFilePath;
}

export function normalizeNoteText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function resolveNoteTemplate(
  note: NoteContent,
  context: NoteTemplateContext,
): NoteContent {
  if (note.kind !== "note") {
    return note;
  }

  const resolvedText = resolveNoteTemplateText(note.text, context);
  return createNoteState("note", resolvedText);
}

export function resolveNoteTemplateText(
  text: string,
  context: NoteTemplateContext,
): string {
  const customVariables = context.customVariables ?? {};
  const replacements = createDateVariableMap(context.now);

  return text
    .replace(
      /\{(YYYY|YY|MM|M|DD|D|HH|H|hh|h|mm|m|ss|s|a|ddd)\}/g,
      (fullMatch, token: keyof ReturnType<typeof createDateVariableMap>) =>
        replacements[token] ?? fullMatch,
    )
    .replace(/\{&([^{}]+)\}/g, (_fullMatch, name: string) => customVariables[name] ?? "");
}

export function createDateVariableMap(now: Date): Record<string, string> {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hours24 = now.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  return {
    YY: String(year).slice(-2),
    YYYY: String(year),
    M: String(month),
    MM: pad2(month),
    D: String(day),
    DD: pad2(day),
    H: String(hours24),
    HH: pad2(hours24),
    h: String(hours12),
    hh: pad2(hours12),
    m: String(minutes),
    mm: pad2(minutes),
    s: String(seconds),
    ss: pad2(seconds),
    a: hours24 < 12 ? "오전" : "오후",
    ddd: KOREAN_WEEKDAYS[now.getDay()] ?? "",
  };
}

function createNoteState(kind: NoteContentKind, text: string): NoteContent {
  return {
    kind,
    text,
    id: createHash("sha1").update(text).digest("hex"),
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
