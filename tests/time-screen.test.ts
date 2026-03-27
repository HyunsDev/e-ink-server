import { describe, expect, it } from "vitest";

import { getCurrentScreen, resetScreenCache } from "../src/screen/current-screen.js";
import { E213_BUFFER_LENGTH } from "../src/screen/framebuffer.js";
import { formatTime, renderTimeScreen } from "../src/screen/time-screen.js";

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
});
