import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildServer } from "../src/server.js";
import { resetScreenCache } from "../src/screen/current-screen.js";
import { E213_BUFFER_LENGTH } from "../src/screen/framebuffer.js";

describe("HTTP API", () => {
  beforeEach(() => {
    resetScreenCache();
  });

  afterEach(() => {
    resetScreenCache();
  });

  it("serves the current id as text/plain", async () => {
    const app = buildServer({
      logger: false,
      now: () => new Date("2026-03-27T11:34:00.000Z"),
    });

    const response = await app.inject({
      method: "GET",
      url: "/current-id",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.body).toMatch(/^[a-f0-9]{40}$/);

    await app.close();
  });

  it("serves the screen as raw binary with the expected headers", async () => {
    const app = buildServer({
      logger: false,
      now: () => new Date("2026-03-27T11:34:00.000Z"),
    });

    const idResponse = await app.inject({
      method: "GET",
      url: "/current-id",
    });

    const response = await app.inject({
      method: "GET",
      url: "/screen",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/octet-stream");
    expect(response.headers["content-length"]).toBe(String(E213_BUFFER_LENGTH));
    expect(response.headers.etag).toBe(`"${idResponse.body}"`);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.rawPayload).toHaveLength(E213_BUFFER_LENGTH);

    await app.close();
  });
});
