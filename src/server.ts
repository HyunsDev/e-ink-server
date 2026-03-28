import "dotenv/config";

import Fastify, { type FastifyInstance } from "fastify";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { E213_BUFFER_LENGTH } from "./screen/framebuffer.js";
import { requireNoteFilePath } from "./screen/note-content.js";
import {
  getCurrentScreen,
  getWrongTokenScreen,
} from "./screen/current-screen.js";

export interface BuildServerOptions {
  logger?: boolean;
  now?: () => Date;
  noteFilePath?: string;
  secretToken?: string;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const secretToken = requireSecretToken(
    options.secretToken ?? process.env.SECRET_TOKEN,
  );
  const noteFilePath = requireNoteFilePath(
    options.noteFilePath ?? process.env.NOTE_FILE,
  );
  const app = Fastify({
    logger: options.logger ?? true,
  });

  app.get<{ Querystring: Record<string, string | string[] | undefined> }>(
    "/current-id",
    async (request, reply) => {
      if (!hasValidToken(getFirstQueryValue(request.query.token), secretToken)) {
        reply.header("content-type", "text/plain; charset=utf-8");
        return "wrong_token";
      }

      const snapshot = getCurrentScreen({
        noteFilePath,
        now: getRequestTime(options.now),
        templateVariables: extractTemplateVariables(request.query),
      });

      reply.header("content-type", "text/plain; charset=utf-8");
      return snapshot.id;
    },
  );

  app.get<{ Querystring: Record<string, string | string[] | undefined> }>(
    "/screen",
    async (request, reply) => {
      const snapshot = hasValidToken(getFirstQueryValue(request.query.token), secretToken)
        ? getCurrentScreen({
            noteFilePath,
            now: getRequestTime(options.now),
            templateVariables: extractTemplateVariables(request.query),
          })
        : getWrongTokenScreen();

      reply
        .header("content-type", "application/octet-stream")
        .header("content-length", String(E213_BUFFER_LENGTH))
        .header("etag", `"${snapshot.id}"`)
        .header("cache-control", "no-store");

      return Buffer.from(snapshot.buffer);
    },
  );

  return app;
}

async function start(): Promise<void> {
  const port = requirePort(process.env.PORT);
  const host = process.env.HOST ?? "0.0.0.0";
  let app: FastifyInstance | undefined;

  try {
    app = buildServer();
    await app.listen({ host, port });
  } catch (error) {
    if (app) {
      app.log.error(error);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

function isEntrypointModule(): boolean {
  const currentModulePath = fileURLToPath(import.meta.url);
  const entryCandidates = [process.argv[1], process.env.pm_exec_path];

  return entryCandidates.some(
    (entryPath) => entryPath !== undefined && resolve(entryPath) === currentModulePath,
  );
}

if (isEntrypointModule()) {
  void start();
}

function requireSecretToken(secretToken: string | undefined): string {
  if (!secretToken) {
    throw new Error("SECRET_TOKEN must be set before starting the server.");
  }

  return secretToken;
}

function requirePort(portValue: string | undefined): number {
  const parsedPort = Number(portValue ?? "3000");

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return parsedPort;
}

function hasValidToken(
  receivedToken: string | undefined,
  secretToken: string,
): boolean {
  return receivedToken === secretToken;
}

function getRequestTime(nowProvider: BuildServerOptions["now"]): Date {
  return nowProvider?.() ?? new Date();
}

function extractTemplateVariables(
  query: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    if (key === "token") {
      continue;
    }

    if (typeof value === "string") {
      variables[key] = value;
      continue;
    }

    if (Array.isArray(value) && typeof value[0] === "string") {
      variables[key] = value[0];
    }
  }

  return variables;
}

function getFirstQueryValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return undefined;
}
