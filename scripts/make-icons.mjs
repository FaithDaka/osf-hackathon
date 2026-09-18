// Rasterizes the AlertCitizen icon (public/icons/icon.svg — person holding
// a microphone) to PWA PNGs with zero dependencies (Node built-ins only).
// Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BG = [27, 94, 32, 255]; // #1B5E20
const FG = [250, 250, 250, 255]; // #FAFAFA

// Design units: SVG viewBox is 512x512. Work in normalized 0..1 coords.
const N = (v) => v / 512;
const RADIUS = N(96); // rounded-rect rx

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-12;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// White (foreground) shapes — must mirror icon.svg.
const CIRCLES = [
  { x: N(205), y: N(440), r: N(120) }, // shoulders/body
  { x: N(205), y: N(190), r: N(62) }, // head
  { x: N(330), y: N(345), r: N(30) }, // hand
];
const CAPSULES = [
  { x1: N(205), y1: N(240), x2: N(205), y2: N(330), half: N(50) / 2 }, // neck
  { x1: N(280), y1: N(420), x2: N(330), y2: N(350), half: N(52) / 2 }, // arm
  { x1: N(340), y1: N(260), x2: N(340), y2: N(340), half: N(30) / 2 }, // mic handle
  { x1: N(340), y1: N(170), x2: N(340), y2: N(260), half: N(84) / 2 }, // mic head
];
// Green grille slits cut out of the mic head — must mirror icon.svg.
const SLITS = [
  { x1: N(310), y1: N(190), x2: N(370), y2: N(190), half: N(10) / 2 },
  { x1: N(310), y1: N(212), x2: N(370), y2: N(212), half: N(10) / 2 },
  { x1: N(310), y1: N(234), x2: N(370), y2: N(234), half: N(10) / 2 },
];

// Rounded-box SDF: <=0 inside, >0 outside.
function roundedBoxSDF(px, py, r) {
  const cx = 0.5;
  const cy = 0.5;
  const hx = 0.5;
  const hy = 0.5;
  const qx = Math.abs(px - cx) - (hx - r);
  const qy = Math.abs(py - cy) - (hy - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function onWhite(nx, ny) {
  for (const c of CIRCLES) {
    if (Math.hypot(nx - c.x, ny - c.y) <= c.r) return true;
  }
  for (const s of CAPSULES) {
    if (distToSeg(nx, ny, s.x1, s.y1, s.x2, s.y2) <= s.half) return true;
  }
  return false;
}

function onSlit(nx, ny) {
  for (const s of SLITS) {
    if (distToSeg(nx, ny, s.x1, s.y1, s.x2, s.y2) <= s.half) return true;
  }
  return false;
}

function paintPixel(nx, ny) {
  if (roundedBoxSDF(nx, ny, RADIUS) > 0) return [0, 0, 0, 0]; // transparent corners
  if (onWhite(nx, ny) && !onSlit(nx, ny)) return FG;
  return BG;
}

function makePng(size) {
  const SS = size >= 512 ? 2 : 4; // supersample factor for anti-aliasing
  const hi = size * SS;
  // Accumulators for box downsample.
  const acc = new Float64Array(size * size * 4);
  for (let y = 0; y < hi; y++) {
    const ny = (y + 0.5) / hi;
    for (let x = 0; x < hi; x++) {
      const nx = (x + 0.5) / hi;
      const [r, g, b, a] = paintPixel(nx, ny);
      const ox = Math.min(size - 1, Math.floor(x / SS));
      const oy = Math.min(size - 1, Math.floor(y / SS));
      const o = (oy * size + ox) * 4;
      acc[o] += r;
      acc[o + 1] += g;
      acc[o + 2] += b;
      acc[o + 3] += a;
    }
  }
  const raw = Buffer.alloc(size * (1 + size * 4));
  const n = SS * SS;
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      raw[o++] = Math.round(acc[i] / n);
      raw[o++] = Math.round(acc[i + 1] / n);
      raw[o++] = Math.round(acc[i + 2] / n);
      raw[o++] = Math.round(acc[i + 3] / n);
    }
  }
  const idat = deflateSync(raw);

  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  const crc = (buf) => {
    let c = -1;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const cs = Buffer.alloc(4);
    cs.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, cs]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolor + alpha
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png;
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), makePng(size));
  console.log(`wrote icon-${size}.png`);
}
