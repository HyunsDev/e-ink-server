import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  getCurrentScreen,
  getWrongTokenScreen,
  resetScreenCache,
} from "../src/screen/current-screen.js";
import {
  E213_BUFFER_LENGTH,
  E213_STRIDE,
  E213_WIDTH,
} from "../src/screen/framebuffer.js";
import {
  buildNoteFileErrorScene,
  buildNoteFileEmptyScene,
  NOTE_LINE_HEIGHT,
  NOTE_RENDER_LINE_COUNT,
  buildNoteTextScene,
  NOTE_FONT_SIZE,
  NOTE_VISIBLE_LINE_COUNT,
} from "../src/screen/note-screen.js";

describe("note screen rendering", () => {
  const initialNoteText = "안녕하세요\n메모 첫 줄";

  it("renders deterministic bytes for the same file content", () => {
    resetScreenCache();
    const testNote = createTestNoteFile(initialNoteText);

    const first = getCurrentScreen({ noteFilePath: testNote.filePath });
    const second = getCurrentScreen({ noteFilePath: testNote.filePath });

    expect(first).toBe(second);
    expect(first.buffer).toHaveLength(E213_BUFFER_LENGTH);
    expect(first.id).not.toBe("");

    testNote.cleanup();
  });

  it("changes screen id and payload when the file content changes", () => {
    resetScreenCache();
    const testNote = createTestNoteFile("첫 번째 메모");

    const first = getCurrentScreen({ noteFilePath: testNote.filePath });
    writeFileSync(testNote.filePath, "두 번째 메모", "utf8");
    const second = getCurrentScreen({ noteFilePath: testNote.filePath });

    expect(first.id).not.toBe(second.id);
    expect(first.buffer).not.toEqual(second.buffer);

    testNote.cleanup();
  });

  it("returns the empty-note state for a blank file", () => {
    resetScreenCache();
    const testNote = createTestNoteFile("");

    const snapshot = getCurrentScreen({ noteFilePath: testNote.filePath });
    const emptyScene = buildNoteFileEmptyScene();

    expect(snapshot.id).not.toBe("");
    expect(snapshot.buffer).toHaveLength(E213_BUFFER_LENGTH);
    expect(emptyScene.nodes.every((node) => node.type === "text")).toBe(true);

    testNote.cleanup();
  });

  it("returns the error state when the note file is missing", () => {
    resetScreenCache();
    const testNote = createTestNoteFile("삭제될 메모");
    unlinkSync(testNote.filePath);

    const snapshot = getCurrentScreen({ noteFilePath: testNote.filePath });
    const errorScene = buildNoteFileErrorScene();

    expect(snapshot.id).not.toBe("");
    expect(snapshot.buffer).toHaveLength(E213_BUFFER_LENGTH);
    expect(errorScene.nodes.every((node) => node.type === "text")).toBe(true);

    testNote.cleanup();
  });

  it("keeps the wrong-token screen stable and distinct", () => {
    resetScreenCache();
    const testNote = createTestNoteFile(initialNoteText);

    const first = getWrongTokenScreen();
    const second = getWrongTokenScreen();
    const normal = getCurrentScreen({ noteFilePath: testNote.filePath });

    expect(first).toBe(second);
    expect(first.buffer).toHaveLength(E213_BUFFER_LENGTH);
    expect(first.buffer).not.toEqual(normal.buffer);
    expect(first.id).not.toBe(normal.id);

    testNote.cleanup();
  });

  it("renders the wrong-token screen as a large two-line message", () => {
    resetScreenCache();

    const snapshot = getWrongTokenScreen();
    const upperHalfInk = countInk(snapshot.buffer, 0, 60);
    const lowerHalfInk = countInk(snapshot.buffer, 61, 121);

    expect(upperHalfInk).toBeGreaterThan(500);
    expect(lowerHalfInk).toBeGreaterThan(500);
    expect(upperHalfInk + lowerHalfInk).toBeGreaterThan(1200);
  });

  it("reflects ongoing NOTE_FILE text updates in successive snapshots", () => {
    resetScreenCache();
    const firstText = "메모 A";
    const secondText = "메모 B\n두 번째 줄";
    const testNote = createTestNoteFile(firstText);

    const first = getCurrentScreen({ noteFilePath: testNote.filePath });
    writeFileSync(testNote.filePath, secondText, "utf8");
    const second = getCurrentScreen({ noteFilePath: testNote.filePath });

    expect(first.id).not.toBe("");
    expect(second.id).not.toBe("");
    expect(second.id).not.toBe(first.id);
    expect(second.buffer).not.toEqual(first.buffer);

    testNote.cleanup();
  });

  it("renders NOTE_FILE body text at a fixed 16px size", () => {
    const scene = buildNoteTextScene("첫 줄\n둘째 줄");

    expect(scene.nodes.length).toBeGreaterThan(0);
    expect(
      scene.nodes.every(
        (node) => node.type === "text" && node.fontSize === NOTE_FONT_SIZE,
      ),
    ).toBe(true);
  });

  it("renders one extra overflowing note line beyond the fully visible count", () => {
    const scene = buildNoteTextScene("1\n2\n3\n4\n5\n6\n7\n8");
    const textNodes = scene.nodes.filter(
      (node): node is (typeof scene.nodes)[number] & { type: "text" } =>
        node.type === "text",
    );

    expect(NOTE_VISIBLE_LINE_COUNT).toBeGreaterThan(0);
    expect(NOTE_RENDER_LINE_COUNT).toBe(NOTE_VISIBLE_LINE_COUNT + 1);
    expect(textNodes).toHaveLength(NOTE_RENDER_LINE_COUNT);
    expect(
      textNodes.every(
        (node, index) =>
          node.fontSize === NOTE_FONT_SIZE &&
          node.y === textNodes[0]?.y + index * NOTE_LINE_HEIGHT,
      ),
    ).toBe(true);
  });
});

function countInk(buffer: Uint8Array, startY: number, endY: number): number {
  let total = 0;

  for (let y = startY; y <= endY; y += 1) {
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

function createTestNoteFile(content: string): { filePath: string; cleanup: () => void } {
  const directory = mkdtempSync(join(tmpdir(), "eink-note-screen-"));
  const filePath = join(directory, "NOTE.md");
  writeFileSync(filePath, content, "utf8");

  return {
    filePath,
    cleanup: () => {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
