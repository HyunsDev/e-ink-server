import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

import { ensureDisplayFontLoaded, DISPLAY_FONT_FAMILY } from "./fonts.js";
import {
  type GrayColor,
  type GroupNode,
  type SceneNode,
  type ScreenScene,
  type TextNode,
} from "./scene.js";
import { buildCanvasFont } from "./text-layout.js";

export const SUPERSAMPLE_SCALE = 8;
export const DEFAULT_STROKE_WIDTH = 2;

export interface GrayscaleImage {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export function renderSceneToGrayscale(scene: ScreenScene): GrayscaleImage {
  ensureDisplayFontLoaded();

  const canvas = createCanvas(
    scene.width * SUPERSAMPLE_SCALE,
    scene.height * SUPERSAMPLE_SCALE,
  );
  const context = canvas.getContext("2d");

  context.scale(SUPERSAMPLE_SCALE, SUPERSAMPLE_SCALE);
  context.fillStyle = toCanvasColor(scene.background ?? "white");
  context.fillRect(0, 0, scene.width, scene.height);

  renderNodes(context, scene.nodes);

  const sourceImage = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const pixels = downsampleToGrayscale(
    sourceImage,
    scene.width,
    scene.height,
    SUPERSAMPLE_SCALE,
  );

  return {
    width: scene.width,
    height: scene.height,
    pixels,
  };
}

function renderNodes(context: SKRSContext2D, nodes: SceneNode[]): void {
  for (const node of nodes) {
    renderNode(context, node);
  }
}

function renderNode(context: SKRSContext2D, node: SceneNode): void {
  switch (node.type) {
    case "text":
      drawText(context, node);
      return;
    case "rect":
      applyFillAndStroke(context, node, () => {
        context.rect(node.x, node.y, node.width, node.height);
      });
      return;
    case "roundRect":
      applyFillAndStroke(context, node, () => {
        createRoundRectPath(context, node.x, node.y, node.width, node.height, node.radius);
      });
      return;
    case "line":
      context.save();
      context.beginPath();
      context.strokeStyle = toCanvasColor(node.stroke ?? "black");
      context.lineWidth = node.strokeWidth ?? DEFAULT_STROKE_WIDTH;
      context.moveTo(
        alignStrokeCoordinate(node.x1, context.lineWidth),
        alignStrokeCoordinate(node.y1, context.lineWidth),
      );
      context.lineTo(
        alignStrokeCoordinate(node.x2, context.lineWidth),
        alignStrokeCoordinate(node.y2, context.lineWidth),
      );
      context.stroke();
      context.restore();
      return;
    case "circle":
      applyFillAndStroke(context, node, () => {
        context.arc(node.cx, node.cy, node.r, 0, Math.PI * 2);
      });
      return;
    case "ellipse":
      applyFillAndStroke(context, node, () => {
        context.ellipse(node.cx, node.cy, node.rx, node.ry, 0, 0, Math.PI * 2);
      });
      return;
    case "group":
      drawGroup(context, node);
      return;
    default: {
      const exhaustiveCheck: never = node;
      throw new Error(`Unsupported scene node: ${String(exhaustiveCheck)}`);
    }
  }
}

function drawText(context: SKRSContext2D, node: TextNode): void {
  context.save();
  context.fillStyle = toCanvasColor(node.color ?? "black");
  context.font = buildCanvasFont(
    node.fontSize,
    node.fontFamily ?? DISPLAY_FONT_FAMILY,
    node.fontWeight,
  );
  context.textAlign = node.align ?? "left";
  context.textBaseline = node.baseline ?? "alphabetic";

  if (node.maxWidth) {
    context.fillText(node.text, node.x, node.y, node.maxWidth);
  } else {
    context.fillText(node.text, node.x, node.y);
  }

  context.restore();
}

function drawGroup(context: SKRSContext2D, node: GroupNode): void {
  context.save();
  context.translate(node.x ?? 0, node.y ?? 0);
  renderNodes(context, node.nodes);
  context.restore();
}

function applyFillAndStroke(
  context: SKRSContext2D,
  node: {
    fill?: GrayColor;
    stroke?: GrayColor;
    strokeWidth?: number;
  },
  buildPath: () => void,
): void {
  context.save();
  context.beginPath();
  buildPath();

  if (node.fill !== undefined) {
    context.fillStyle = toCanvasColor(node.fill);
    context.fill();
  }

  if (node.stroke !== undefined) {
    context.strokeStyle = toCanvasColor(node.stroke);
    context.lineWidth = node.strokeWidth ?? DEFAULT_STROKE_WIDTH;
    context.stroke();
  }

  context.restore();
}

function createRoundRectPath(
  context: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const clampedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

  if (clampedRadius === 0) {
    context.rect(x, y, width, height);
    return;
  }

  context.moveTo(x + clampedRadius, y);
  context.lineTo(x + width - clampedRadius, y);
  context.arcTo(x + width, y, x + width, y + clampedRadius, clampedRadius);
  context.lineTo(x + width, y + height - clampedRadius);
  context.arcTo(x + width, y + height, x + width - clampedRadius, y + height, clampedRadius);
  context.lineTo(x + clampedRadius, y + height);
  context.arcTo(x, y + height, x, y + height - clampedRadius, clampedRadius);
  context.lineTo(x, y + clampedRadius);
  context.arcTo(x, y, x + clampedRadius, y, clampedRadius);
  context.closePath();
}

function downsampleToGrayscale(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  scale: number,
): Uint8ClampedArray {
  const supersampledWidth = width * scale;
  const pixels = new Uint8ClampedArray(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let luminanceTotal = 0;

      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const sampleX = x * scale + sx;
          const sampleY = y * scale + sy;
          const offset = (sampleY * supersampledWidth + sampleX) * 4;

          luminanceTotal += rgbaToGray(
            source[offset],
            source[offset + 1],
            source[offset + 2],
            source[offset + 3],
          );
        }
      }

      pixels[y * width + x] = Math.round(luminanceTotal / (scale * scale));
    }
  }

  return pixels;
}

function rgbaToGray(r: number, g: number, b: number, a: number): number {
  const alpha = a / 255;
  const blendedR = r * alpha + 255 * (1 - alpha);
  const blendedG = g * alpha + 255 * (1 - alpha);
  const blendedB = b * alpha + 255 * (1 - alpha);

  return 0.299 * blendedR + 0.587 * blendedG + 0.114 * blendedB;
}

function toCanvasColor(color: GrayColor): string {
  if (typeof color === "number") {
    const clamped = Math.max(0, Math.min(255, Math.round(color)));
    return `rgb(${clamped}, ${clamped}, ${clamped})`;
  }

  if (color === "black" || color === "white") {
    return color;
  }

  return color;
}

function alignStrokeCoordinate(value: number, strokeWidth: number): number {
  if (Math.round(strokeWidth) % 2 === 0) {
    return Math.round(value);
  }

  return Math.round(value) + 0.5;
}
