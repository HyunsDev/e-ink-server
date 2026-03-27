import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildServer } from "../src/server.js";
import {
  getCurrentScreen,
  getWrongTokenScreen,
  resetScreenCache,
} from "../src/screen/current-screen.js";
import { E213_BUFFER_LENGTH } from "../src/screen/framebuffer.js";

describe("HTTP API", () => {
  const initialNoteText = "안녕하세요\n첫 번째 메모";

  beforeEach(() => {
    resetScreenCache();
  });

  afterEach(() => {
    resetScreenCache();
  });

  it("serves the current id as text/plain", async () => {
    const testNote = createTestNoteFile(initialNoteText);
    const app = buildServer({
      logger: false,
      noteFilePath: testNote.filePath,
      secretToken: "secret",
    });

    const response = await app.inject({
      method: "GET",
      url: "/current-id?token=secret",
    });
    const snapshot = getCurrentScreen({ noteFilePath: testNote.filePath });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.body).toBe(snapshot.id);

    await app.close();
    testNote.cleanup();
  });

  it("serves the screen as raw binary with the expected headers", async () => {
    const testNote = createTestNoteFile(initialNoteText);
    const app = buildServer({
      logger: false,
      noteFilePath: testNote.filePath,
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
    testNote.cleanup();
  });

  it("updates current-id and screen when NOTE_FILE content changes", async () => {
    const firstText = "첫 번째 내용";
    const secondText = "두 번째 내용\n변경됨";
    const testNote = createTestNoteFile(firstText);
    const app = buildServer({
      logger: false,
      noteFilePath: testNote.filePath,
      secretToken: "secret",
    });

    const firstIdResponse = await app.inject({
      method: "GET",
      url: "/current-id?token=secret",
    });
    const firstScreenResponse = await app.inject({
      method: "GET",
      url: "/screen?token=secret",
    });

    writeFileSync(testNote.filePath, secondText, "utf8");
    resetScreenCache();

    const secondIdResponse = await app.inject({
      method: "GET",
      url: "/current-id?token=secret",
    });
    const secondScreenResponse = await app.inject({
      method: "GET",
      url: "/screen?token=secret",
    });
    const secondSnapshot = getCurrentScreen({ noteFilePath: testNote.filePath });

    expect(firstIdResponse.body).not.toBe("");
    expect(secondIdResponse.body).toBe(secondSnapshot.id);
    expect(secondIdResponse.body).not.toBe(firstIdResponse.body);
    expect(secondScreenResponse.rawPayload).not.toEqual(firstScreenResponse.rawPayload);

    await app.close();
    testNote.cleanup();
  });

  it("returns wrong_token when the token is invalid", async () => {
    const testNote = createTestNoteFile(initialNoteText);
    const app = buildServer({
      logger: false,
      noteFilePath: testNote.filePath,
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
    testNote.cleanup();
  });

  it("returns the wrong-token screen when the token is invalid", async () => {
    const testNote = createTestNoteFile(initialNoteText);
    const app = buildServer({
      logger: false,
      noteFilePath: testNote.filePath,
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
    testNote.cleanup();
  });

  it("treats a missing token as invalid", async () => {
    const testNote = createTestNoteFile(initialNoteText);
    const app = buildServer({
      logger: false,
      noteFilePath: testNote.filePath,
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
    testNote.cleanup();
  });

  it("fails fast when SECRET_TOKEN is missing", () => {
    const testNote = createTestNoteFile(initialNoteText);

    expect(() =>
      buildServer({
        logger: false,
        noteFilePath: testNote.filePath,
        secretToken: "",
      }),
    ).toThrow("SECRET_TOKEN must be set before starting the server.");

    testNote.cleanup();
  });

  it("fails fast when NOTE_FILE is missing", () => {
    expect(() =>
      buildServer({
        logger: false,
        noteFilePath: "",
        secretToken: "secret",
      }),
    ).toThrow("NOTE_FILE must be set before starting the server.");
  });
});

function createTestNoteFile(content: string): { filePath: string; cleanup: () => void } {
  const directory = mkdtempSync(join(tmpdir(), "eink-note-server-"));
  const filePath = join(directory, "NOTE.md");
  writeFileSync(filePath, content, "utf8");

  return {
    filePath,
    cleanup: () => {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
