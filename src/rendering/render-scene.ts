import { renderSceneToGrayscale } from "./canvas-renderer.js";
import { rasterizeGrayscaleTo1bpp } from "./mono-rasterizer.js";
import { type ScreenScene } from "./scene.js";

export function renderSceneTo1bpp(scene: ScreenScene): Uint8Array {
  return rasterizeGrayscaleTo1bpp(renderSceneToGrayscale(scene));
}
