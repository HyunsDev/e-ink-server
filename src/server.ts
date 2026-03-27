import "dotenv/config";

import Fastify, { type FastifyInstance } from "fastify";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { E213_BUFFER_LENGTH } from "./screen/framebuffer.js";
import { requireNoteFilePath } from "./screen/note-content.js";
import { getCurrentScreen, getWrongTokenScreen } from "./screen/current-screen.js";

export interface BuildServerOptions {
  logger?: boolean;
  now?: () => Date;
  noteFilePath?: string;
  secretToken?: string;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const secretToken = requireSecretToken(options.secretToken ?? process.env.SECRET_TOKEN);
  const noteFilePath = requireNoteFilePath(options.noteFilePath ?? process.env.NOTE_FILE);
  const app = Fastify({
    logger: options.logger ?? true,
  });

  app.get<{ Querystring: { token?: string } }>("/current-id", async (request, reply) => {
    if (!hasValidToken(request.query.token, secretToken)) {
      reply.header("content-type", "text/plain; charset=utf-8");
      return "wrong_token";
    }

    const snapshot = getCurrentScreen({ noteFilePath });

    reply.header("content-type", "text/plain; charset=utf-8");
    return snapshot.id;
  });

  app.get<{ Querystring: { token?: string } }>("/screen", async (request, reply) => {
    const snapshot = hasValidToken(request.query.token, secretToken)
      ? getCurrentScreen({ noteFilePath })
      : getWrongTokenScreen();

    reply
      .header("content-type", "application/octet-stream")
      .header("content-length", String(E213_BUFFER_LENGTH))
      .header("etag", `"${snapshot.id}"`)
      .header("cache-control", "no-store");

    return Buffer.from(snapshot.buffer);
  });

  return app;
}

async function start(): Promise<void> {
  const port = Number(process.env.PORT ?? "3000");
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

const isEntrypoint = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isEntrypoint) {
  void start();
}

function requireSecretToken(secretToken: string | undefined): string {
  if (!secretToken) {
    throw new Error("SECRET_TOKEN must be set before starting the server.");
  }

  return secretToken;
}

function hasValidToken(receivedToken: string | undefined, secretToken: string): boolean {
  return receivedToken === secretToken;
}
