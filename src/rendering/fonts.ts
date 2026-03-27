import { GlobalFonts } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PRETENDARD_FONT_FAMILY = "Pretendard";

let registeredFontPath: string | undefined;

export function ensurePretendardFontLoaded(options: { fontPath?: string; force?: boolean } = {}): string {
  const fontPath = options.fontPath ?? getPretendardFontPath();

  if (!options.force && registeredFontPath === fontPath) {
    return fontPath;
  }

  if (!existsSync(fontPath)) {
    throw new Error(`Pretendard font file not found: ${fontPath}`);
  }

  const registered = GlobalFonts.registerFromPath(fontPath, PRETENDARD_FONT_FAMILY);
  if (!registered) {
    throw new Error(`Failed to register Pretendard font from path: ${fontPath}`);
  }

  registeredFontPath = fontPath;
  return fontPath;
}

export function getPretendardFontPath(): string {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDirectory, "../../assets/fonts/PretendardVariable.ttf");
}
