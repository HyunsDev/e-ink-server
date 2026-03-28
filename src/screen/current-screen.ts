import { createHash } from "node:crypto";

import {
  loadNoteContent,
  requireNoteFilePath,
  resolveNoteTemplate,
} from "./note-content.js";
import { renderNoteScreen } from "./note-screen.js";
import { renderWrongTokenScreen } from "./wrong-token-screen.js";

export interface ScreenSnapshot {
  cacheKey: string;
  id: string;
  buffer: Uint8Array;
}

let cachedSnapshot: ScreenSnapshot | undefined;
let cachedWrongTokenSnapshot: ScreenSnapshot | undefined;

export function getCurrentScreen(
  options: {
    noteFilePath?: string;
    now?: Date;
    templateVariables?: Record<string, string>;
  } = {},
): ScreenSnapshot {
  const noteFilePath = requireNoteFilePath(options.noteFilePath);
  const note = resolveNoteTemplate(loadNoteContent(noteFilePath), {
    now: options.now ?? new Date(),
    customVariables: options.templateVariables,
  });

  if (cachedSnapshot?.cacheKey === note.id) {
    return cachedSnapshot;
  }

  const buffer = renderNoteScreen(note);
  const renderedId = createHash("sha1").update(buffer).digest("hex");

  cachedSnapshot = {
    cacheKey: note.id,
    id: renderedId,
    buffer,
  };

  return cachedSnapshot;
}

export function resetScreenCache(): void {
  cachedSnapshot = undefined;
  cachedWrongTokenSnapshot = undefined;
}

export function getWrongTokenScreen(): ScreenSnapshot {
  if (cachedWrongTokenSnapshot) {
    return cachedWrongTokenSnapshot;
  }

  const buffer = renderWrongTokenScreen();
  const id = createHash("sha1").update(buffer).digest("hex");

  cachedWrongTokenSnapshot = {
    cacheKey: "wrong-token",
    id,
    buffer,
  };

  return cachedWrongTokenSnapshot;
}
