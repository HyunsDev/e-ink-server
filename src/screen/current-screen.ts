import { createHash } from "node:crypto";

import { renderTimeScreen } from "./time-screen.js";

const minuteKeyFormatter = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

export interface ScreenSnapshot {
  minuteKey: string;
  id: string;
  buffer: Uint8Array;
}

let cachedSnapshot: ScreenSnapshot | undefined;

export function getCurrentScreen(now = new Date()): ScreenSnapshot {
  const minuteKey = minuteKeyFormatter.format(now);

  if (cachedSnapshot?.minuteKey === minuteKey) {
    return cachedSnapshot;
  }

  const buffer = renderTimeScreen(now);
  const id = createHash("sha1").update(buffer).digest("hex");

  cachedSnapshot = {
    minuteKey,
    id,
    buffer,
  };

  return cachedSnapshot;
}

export function resetScreenCache(): void {
  cachedSnapshot = undefined;
}
