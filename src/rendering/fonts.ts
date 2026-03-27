import { GlobalFonts } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DISPLAY_FONT_FAMILY = "DungGeunMo";
export const DISPLAY_FONT_WEIGHT = 400;

let registeredFontPath: string | undefined;

export function ensureDisplayFontLoaded(
  options: { fontPath?: string; force?: boolean } = {},
): string {
  const fontPath = options.fontPath ?? getDisplayFontPath();

  if (!options.force && registeredFontPath === fontPath) {
    return fontPath;
  }

  if (!existsSync(fontPath)) {
    throw new Error(`Display font file not found: ${fontPath}`);
  }

  const registered = GlobalFonts.registerFromPath(
    fontPath,
    DISPLAY_FONT_FAMILY,
  );
  if (!registered) {
    throw new Error(`Failed to register display font from path: ${fontPath}`);
  }

  registeredFontPath = fontPath;
  return fontPath;
}

export function getDisplayFontPath(): string {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDirectory, "../../assets/fonts/DungGeunMo.ttf");
}
