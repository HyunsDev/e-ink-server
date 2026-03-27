export const E213_WIDTH = 250;
export const E213_HEIGHT = 122;
export const E213_STRIDE = Math.ceil(E213_WIDTH / 8);
export const E213_BUFFER_LENGTH = E213_STRIDE * E213_HEIGHT;

export class Framebuffer1bpp {
  readonly width: number;
  readonly height: number;
  readonly stride: number;
  private readonly data: Uint8Array;

  constructor(
    width = E213_WIDTH,
    height = E213_HEIGHT,
    data = new Uint8Array(Math.ceil(width / 8) * height),
  ) {
    this.width = width;
    this.height = height;
    this.stride = Math.ceil(width / 8);
    this.data = data;
  }

  clear(value = false): void {
    this.data.fill(value ? 0xff : 0x00);
  }

  setPixel(x: number, y: number, value = true): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    const byteIndex = y * this.stride + (x >> 3);
    const mask = 1 << (x & 7);

    if (value) {
      this.data[byteIndex] |= mask;
      return;
    }

    this.data[byteIndex] &= ~mask;
  }

  getPixel(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }

    const byteIndex = y * this.stride + (x >> 3);
    const mask = 1 << (x & 7);
    return (this.data[byteIndex] & mask) !== 0;
  }

  fillRect(x: number, y: number, width: number, height: number, value = true): void {
    if (width <= 0 || height <= 0) {
      return;
    }

    const startX = Math.max(0, x);
    const startY = Math.max(0, y);
    const endX = Math.min(this.width, x + width);
    const endY = Math.min(this.height, y + height);

    for (let py = startY; py < endY; py += 1) {
      for (let px = startX; px < endX; px += 1) {
        this.setPixel(px, py, value);
      }
    }
  }

  toUint8Array(): Uint8Array {
    return this.data;
  }
}
