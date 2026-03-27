import Fastify, { type FastifyInstance } from "fastify";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { E213_BUFFER_LENGTH } from "./screen/framebuffer.js";
import { getCurrentScreen } from "./screen/current-screen.js";

export interface BuildServerOptions {
  logger?: boolean;
  now?: () => Date;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  app.get("/current-id", async (_request, reply) => {
    const snapshot = getCurrentScreen(options.now?.() ?? new Date());

    reply.header("content-type", "text/plain; charset=utf-8");
    return snapshot.id;
  });

  app.get("/screen", async (_request, reply) => {
    const snapshot = getCurrentScreen(options.now?.() ?? new Date());

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
  const app = buildServer();

  try {
    await app.listen({ host, port });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

const isEntrypoint = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isEntrypoint) {
  void start();
}
