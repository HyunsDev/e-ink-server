import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const NOTE_FILE_EMPTY_TEXT = "NOTE FILE EMPTY";
export const NOTE_FILE_ERROR_TEXT = "NOTE FILE ERROR";

export type NoteContentKind = "note" | "empty" | "error";

export interface NoteContent {
  kind: NoteContentKind;
  text: string;
  id: string;
}

export function loadNoteContent(noteFilePath: string): NoteContent {
  try {
    const raw = readFileSync(noteFilePath, "utf8");
    const normalized = normalizeNoteText(raw);

    if (normalized.trim() === "") {
      return createNoteState("empty", NOTE_FILE_EMPTY_TEXT);
    }

    return createNoteState("note", normalized);
  } catch {
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

function createNoteState(kind: NoteContentKind, text: string): NoteContent {
  return {
    kind,
    text,
    id: createHash("sha1").update(text).digest("hex"),
  };
}
