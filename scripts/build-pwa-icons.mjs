import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const iconsDir = resolve(root, "public", "icons");

const TOMATO = [255, 90, 69, 255];
const INK = [23, 21, 20, 255];
const CREAM = [255, 248, 232, 255];

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcSource = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcSource));
  return Buffer.concat([length, crcSource, crc]);
}

function encodePng(width, height, pixels) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function setPixel(pixels, width, x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const index = (y * width + x) * 4;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function fillRect(pixels, width, x0, y0, x1, y1, color) {
  const left = Math.max(0, Math.floor(x0));
  const top = Math.max(0, Math.floor(y0));
  const right = Math.min(width - 1, Math.ceil(x1));
  const bottom = Math.min(width - 1, Math.ceil(y1));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) setPixel(pixels, width, x, y, color);
  }
}

function fillCircle(pixels, width, cx, cy, radius, color) {
  const r2 = radius * radius;
  const top = Math.max(0, Math.floor(cy - radius));
  const bottom = Math.min(width - 1, Math.ceil(cy + radius));
  const left = Math.max(0, Math.floor(cx - radius));
  const right = Math.min(width - 1, Math.ceil(cx + radius));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPixel(pixels, width, x, y, color);
    }
  }
}

function fillRoundedRect(pixels, width, x0, y0, x1, y1, radius, color) {
  fillRect(pixels, width, x0 + radius, y0, x1 - radius, y1, color);
  fillRect(pixels, width, x0, y0 + radius, x1, y1 - radius, color);
  fillCircle(pixels, width, x0 + radius, y0 + radius, radius, color);
  fillCircle(pixels, width, x1 - radius, y0 + radius, radius, color);
  fillCircle(pixels, width, x0 + radius, y1 - radius, radius, color);
  fillCircle(pixels, width, x1 - radius, y1 - radius, radius, color);
}

function drawMark(pixels, width, inset) {
  const size = width - inset * 2;
  const x = inset;
  const y = inset;
  const stroke = Math.max(4, Math.round(size * 0.055));
  const radius = Math.round(size * 0.22);
  fillRoundedRect(pixels, width, x, y, x + size, y + size, radius, INK);
  fillRoundedRect(
    pixels,
    width,
    x + stroke,
    y + stroke,
    x + size - stroke,
    y + size - stroke,
    Math.max(8, radius - stroke),
    TOMATO
  );

  const cx = x + size / 2;
  const cy = y + size * 0.56;
  const letterWidth = size * 0.42;
  const letterHeight = size * 0.46;
  const bar = Math.max(6, Math.round(size * 0.11));
  const left = cx - letterWidth / 2;
  const right = cx + letterWidth / 2;
  const top = cy - letterHeight / 2;
  const bottom = cy + letterHeight / 2;
  fillRect(pixels, width, left, top, left + bar, bottom - bar / 2, CREAM);
  fillRect(pixels, width, right - bar, top, right, bottom - bar / 2, CREAM);
  fillCircle(pixels, width, cx, bottom - bar * 0.85, letterWidth / 2, CREAM);
  fillCircle(pixels, width, cx, bottom - bar * 1.55, letterWidth / 2 - bar, TOMATO);
  fillRect(pixels, width, left + bar, top, right - bar, bottom - bar * 1.2, TOMATO);
}

function renderIcon(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = TOMATO[0];
    pixels[index + 1] = TOMATO[1];
    pixels[index + 2] = TOMATO[2];
    pixels[index + 3] = 255;
  }
  const inset = maskable ? Math.round(size * 0.18) : Math.round(size * 0.08);
  if (maskable) fillRect(pixels, size, 0, 0, size, size, TOMATO);
  drawMark(pixels, size, inset);
  return encodePng(size, size, pixels);
}

const files = {
  "icon-192.png": renderIcon(192),
  "icon-512.png": renderIcon(512),
  "icon-maskable-192.png": renderIcon(192, { maskable: true }),
  "icon-maskable-512.png": renderIcon(512, { maskable: true })
};

await mkdir(iconsDir, { recursive: true });
for (const [name, bytes] of Object.entries(files)) {
  const path = resolve(iconsDir, name);
  await writeFile(path, bytes);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  console.log(`${name} ${bytes.length} ${hash}`);
}
