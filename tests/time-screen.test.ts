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
  buildTimeScene,
  formatTime,
  renderTimeScreen,
} from "../src/screen/time-screen.js";
import { buildWrongTokenScene } from "../src/screen/wrong-token-screen.js";

describe("time screen rendering", () => {
  it("renders deterministic bytes for the same time", () => {
    const date = new Date("2026-03-27T11:34:56.000Z");

    const first = renderTimeScreen(date);
    const second = renderTimeScreen(date);

    expect(first).toEqual(second);
    expect(first).toHaveLength(E213_BUFFER_LENGTH);
    expect(formatTime(date)).toBe("20:34");
  });

  it("changes screen id and payload when the minute changes", () => {
    resetScreenCache();

    const first = getCurrentScreen(new Date("2026-03-27T11:34:01.000Z"));
    const second = getCurrentScreen(new Date("2026-03-27T11:35:01.000Z"));

    expect(first.id).not.toBe(second.id);
    expect(first.buffer).not.toEqual(second.buffer);
  });

  it("reuses the same snapshot within a minute", () => {
    resetScreenCache();

    const first = getCurrentScreen(new Date("2026-03-27T11:34:01.000Z"));
    const second = getCurrentScreen(new Date("2026-03-27T11:34:59.000Z"));

    expect(second).toBe(first);
  });

  it("keeps the wrong-token screen stable and distinct", () => {
    resetScreenCache();

    const first = getWrongTokenScreen();
    const second = getWrongTokenScreen();
    const normal = getCurrentScreen(new Date("2026-03-27T11:34:01.000Z"));

    expect(first).toBe(second);
    expect(first.buffer).toHaveLength(E213_BUFFER_LENGTH);
    expect(first.buffer).not.toEqual(normal.buffer);
    expect(first.id).not.toBe(normal.id);
  });

  it("renders the wrong-token screen as a large two-line message", () => {
    resetScreenCache();

    const snapshot = getWrongTokenScreen();
    const upperHalfInk = countInk(snapshot.buffer, 0, 60);
    const lowerHalfInk = countInk(snapshot.buffer, 61, 121);

    expect(upperHalfInk).toBeGreaterThan(2800);
    expect(lowerHalfInk).toBeGreaterThan(2800);
    expect(upperHalfInk + lowerHalfInk).toBeGreaterThan(6800);
  });

  it("builds time and wrong-token scenes with text nodes", () => {
    const timeScene = buildTimeScene(new Date("2026-03-27T11:34:56.000Z"));
    const wrongTokenScene = buildWrongTokenScene();

    expect(timeScene.nodes.some((node) => node.type === "text")).toBe(true);
    expect(wrongTokenScene.nodes.filter((node) => node.type === "text")).toHaveLength(2);
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
