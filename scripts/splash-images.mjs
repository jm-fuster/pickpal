// Writes the iPhone launch images: one flat cream PNG per screen size, into
// public/splash/. The list of screens lives in src/app/launchImages.ts, which
// the root layout also reads to emit the <link rel="apple-touch-startup-image">
// tags.
//
//   node scripts/splash-images.mjs
//
// No dependencies: Node 24 strips the TypeScript types from launchImages.ts and
// ships zlib.crc32, which is all a flat PNG needs. Node warns that it reparses
// that file as an ES module; it is harmless.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { IPHONE_SCREENS, LAUNCH_BACKGROUND, launchImagePath } from "../src/app/launchImages.ts";

const hex = LAUNCH_BACKGROUND.replace("#", "");
const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));

const chunk = (type, data) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
};

const flatPng = (width, height) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB, deflate, no filter, no interlace
  const row = Buffer.alloc(1 + width * 3); // filter byte 0, then the pixels
  for (let x = 0; x < width; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

const outDir = path.resolve("public/splash");
mkdirSync(outDir, { recursive: true });
for (const screen of IPHONE_SCREENS) {
  const file = path.join("public", launchImagePath(screen));
  const png = flatPng(screen.width * screen.ratio, screen.height * screen.ratio);
  writeFileSync(file, png);
  console.log(`${file}  ${(png.length / 1024).toFixed(1)} KB`);
}
