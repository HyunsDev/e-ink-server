import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildServer } from "../src/server.js";
import {
  getWrongTokenScreen,
  resetScreenCache,
} from "../src/screen/current-screen.js";
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
      secretToken: "secret",
    });

    const response = await app.inject({
      method: "GET",
      url: "/current-id?token=secret",
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
      secretToken: "secret",
    });

    const idResponse = await app.inject({
      method: "GET",
      url: "/current-id?token=secret",
    });

    const response = await app.inject({
      method: "GET",
      url: "/screen?token=secret",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/octet-stream");
    expect(response.headers["content-length"]).toBe(String(E213_BUFFER_LENGTH));
    expect(response.headers.etag).toBe(`"${idResponse.body}"`);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.rawPayload).toHaveLength(E213_BUFFER_LENGTH);

    await app.close();
  });

  it("returns wrong_token when the token is invalid", async () => {
    const app = buildServer({
      logger: false,
      secretToken: "secret",
    });

    const response = await app.inject({
      method: "GET",
      url: "/current-id?token=wrong",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.body).toBe("wrong_token");

    await app.close();
  });

  it("returns the wrong-token screen when the token is invalid", async () => {
    const app = buildServer({
      logger: false,
      now: () => new Date("2026-03-27T11:34:00.000Z"),
      secretToken: "secret",
    });

    const response = await app.inject({
      method: "GET",
      url: "/screen?token=wrong",
    });

    const wrongTokenSnapshot = getWrongTokenScreen();

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/octet-stream");
    expect(response.headers["content-length"]).toBe(String(E213_BUFFER_LENGTH));
    expect(response.headers.etag).toBe(`"${wrongTokenSnapshot.id}"`);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.rawPayload).toEqual(Buffer.from(wrongTokenSnapshot.buffer));

    await app.close();
  });

  it("treats a missing token as invalid", async () => {
    const app = buildServer({
      logger: false,
      secretToken: "secret",
    });

    const idResponse = await app.inject({
      method: "GET",
      url: "/current-id",
    });

    const screenResponse = await app.inject({
      method: "GET",
      url: "/screen",
    });

    expect(idResponse.body).toBe("wrong_token");
    expect(screenResponse.rawPayload).toEqual(Buffer.from(getWrongTokenScreen().buffer));

    await app.close();
  });

  it("fails fast when SECRET_TOKEN is missing", () => {
    expect(() =>
      buildServer({
        logger: false,
        secretToken: "",
      }),
    ).toThrow("SECRET_TOKEN must be set before starting the server.");
  });
});
