import {
  E213_HEIGHT,
  E213_WIDTH,
  Framebuffer1bpp,
} from "./framebuffer.js";
import {
  drawScaledText,
  FONT_HEIGHT,
  measureTextColumns,
} from "./font.js";

const TIME_ZONE = "Asia/Seoul";
const HORIZONTAL_MARGIN = 10;
const VERTICAL_MARGIN = 10;

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});

export function renderTimeScreen(date: Date): Uint8Array {
  const framebuffer = new Framebuffer1bpp();
  const timeText = formatTime(date);
  const totalColumns = measureTextColumns(timeText);

  const scale = Math.max(
    1,
    Math.floor(
      Math.min(
        (E213_WIDTH - HORIZONTAL_MARGIN * 2) / totalColumns,
        (E213_HEIGHT - VERTICAL_MARGIN * 2) / FONT_HEIGHT,
      ),
    ),
  );

  const renderedWidth = totalColumns * scale;
  const renderedHeight = FONT_HEIGHT * scale;
  const offsetX = Math.floor((E213_WIDTH - renderedWidth) / 2);
  const offsetY = Math.floor((E213_HEIGHT - renderedHeight) / 2);

  drawScaledText(framebuffer, timeText, offsetX, offsetY, scale);
  return framebuffer.toUint8Array();
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}
