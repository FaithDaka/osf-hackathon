// Minimal QR Code encoder — byte mode, ECC level M, versions 1-4, mask 0.
// No dependencies. Deterministic. Import-safe (no side effects).
//
// Why from scratch: package.json has no QR library and none may be added,
// so the entry screen's "scan to open" code is generated here.
// Max encodable URL length: 62 chars (version 4-M). Longer input throws.
//
// Layout math follows the QR spec: finder + separator + timing + alignment
// patterns, BCH format info, Reed-Solomon ECC over GF(256), standard
// zigzag data placement with mask 0 ((row + col) % 2 === 0).

const MAX_VERSION = 4;
const MODE_BYTE = 0b0100;

// Per-version tables (ECC level M only).
const DATA_CW = { 1: 16, 2: 28, 3: 44, 4: 64 }; // data codewords
const EC_CW = { 1: 10, 2: 16, 3: 26, 4: 18 }; // EC codewords per block
const BLOCKS = { 1: 1, 2: 1, 3: 1, 4: 2 }; // RS blocks (v4 splits 32/32)
const ALIGN_AT = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26] };
const REMAINDER_BITS = { 1: 0, 2: 7, 3: 7, 4: 7 };

// Galois field GF(256) with primitive polynomial 0x11D.
const EXP = new Array(512);
const LOG = new Array(256);
(function initGalois() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

// Reed-Solomon divisor polynomial for `degree` EC codewords.
function rsDivisor(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data, degree) {
  const divisor = rsDivisor(degree);
  const result = [...data, ...new Array(degree).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const factor = result[i];
    if (factor === 0) continue;
    for (let j = 0; j < divisor.length; j++) {
      result[i + j] ^= gfMul(divisor[j], factor);
    }
  }
  return result.slice(data.length);
}

// 15-bit format info: 5 data bits (ECC level + mask) + 10 BCH bits, XOR mask.
function formatInfoBits(eccLevelBits, mask) {
  const data = (eccLevelBits << 3) | mask;
  let bits = data << 10;
  for (let i = 4; i >= 0; i--) {
    if (bits & (1 << (i + 10))) bits ^= 0x537 << i;
  }
  return (((data << 10) | bits) ^ 0x5412) & 0x7fff;
}

function pickVersion(charCount) {
  for (let v = 1; v <= MAX_VERSION; v++) {
    const capacityBits = DATA_CW[v] * 8;
    if (12 + charCount * 8 <= capacityBits) return v;
  }
  throw new Error(`URL too long for QR v${MAX_VERSION}-M (max 62 chars)`);
}

function buildBitStream(text, version) {
  const bytes = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code > 0xff) throw new Error('QR encoder supports Latin-1 text only');
    bytes.push(code);
  }
  const bits = [];
  const push = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(MODE_BYTE, 4);
  push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  const capacity = DATA_CW[version] * 8;
  // Terminator (up to 4 zero bits), then pad to byte boundary.
  const term = Math.min(4, capacity - bits.length);
  for (let i = 0; i < term; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  // Pad bytes 0xEC / 0x11 alternating.
  const pads = [0xec, 0x11];
  let pi = 0;
  while (bits.length < capacity) {
    push(pads[pi % 2], 8);
    pi++;
  }
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let cw = 0;
    for (let j = 0; j < 8; j++) cw = (cw << 1) | bits[i + j];
    codewords.push(cw);
  }
  return codewords;
}

function interleaveBlocks(codewords, version) {
  const numBlocks = BLOCKS[version];
  const perBlock = DATA_CW[version] / numBlocks;
  const ecLen = EC_CW[version];
  const blocks = [];
  for (let b = 0; b < numBlocks; b++) {
    blocks.push(codewords.slice(b * perBlock, (b + 1) * perBlock));
  }
  const ecs = blocks.map((block) => rsRemainder(block, ecLen));
  const out = [];
  for (let i = 0; i < perBlock; i++) {
    for (let b = 0; b < numBlocks; b++) out.push(blocks[b][i]);
  }
  for (let i = 0; i < ecLen; i++) {
    for (let b = 0; b < numBlocks; b++) out.push(ecs[b][i]);
  }
  return out;
}

function emptyMatrix(size) {
  return {
    size,
    modules: Array.from({ length: size }, () => new Array(size).fill(null)),
    isFunction: Array.from({ length: size }, () => new Array(size).fill(false)),
  };
}

function setFunction(m, row, col, dark) {
  m.modules[row][col] = !!dark;
  m.isFunction[row][col] = true;
}

function drawFinder(m, top, left) {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const r = top + dr;
      const c = left + dc;
      if (r < 0 || r >= m.size || c < 0 || c >= m.size) continue;
      const inCore = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      if (!inCore) {
        setFunction(m, r, c, false); // separator ring
        continue;
      }
      const border = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const center = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      setFunction(m, r, c, border || center);
    }
  }
}

function drawTiming(m) {
  for (let i = 8; i < m.size - 8; i++) {
    const dark = i % 2 === 0;
    if (!m.isFunction[6][i]) setFunction(m, 6, i, dark);
    if (!m.isFunction[i][6]) setFunction(m, i, 6, dark);
  }
}

function drawAlignment(m, version) {
  const at = ALIGN_AT[version];
  for (const r of at) {
    for (const c of at) {
      // Skip patterns overlapping the three finders.
      if (
        (r < 9 && c < 9) ||
        (r < 9 && c >= m.size - 8) ||
        (r >= m.size - 8 && c < 9)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const edge = Math.max(Math.abs(dr), Math.abs(dc));
          setFunction(m, r + dr, c + dc, edge !== 1);
        }
      }
    }
  }
}

function reserveFormatAreas(m) {
  // Top-left copy L-shape + split copy along top row / left column.
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      m.isFunction[8][i] = true;
      m.isFunction[i][8] = true;
    }
  }
  // Split copy: 7 vertical cells (rows size-1..size-7, bits 0-6),
  // 8 horizontal cells (cols size-8..size-1, bits 7-14),
  // plus the standalone dark module at (size-8, 8) — 16 cells total.
  // (The dark module must NOT share a cell with format bit 7.)
  for (let i = 0; i < 7; i++) {
    m.isFunction[m.size - 1 - i][8] = true;
  }
  for (let i = 7; i < 15; i++) {
    m.isFunction[8][m.size - 15 + i] = true;
  }
  m.isFunction[m.size - 8][8] = true; // dark module cell
}

function drawCodewords(m, codewords, remainderBits) {
  const bits = [];
  for (const cw of codewords) {
    for (let i = 7; i >= 0; i--) bits.push((cw >>> i) & 1);
  }
  for (let i = 0; i < remainderBits; i++) bits.push(0);

  let bitIndex = 0;
  const size = m.size;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip vertical timing column (cols 5+4 next)
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        // Upward in even column pairs, downward in odd ones.
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? size - 1 - vert : vert;
        if (!m.isFunction[r][c] && bitIndex < bits.length) {
          let dark = bits[bitIndex] === 1;
          if ((r + c) % 2 === 0) dark = !dark; // mask 0
          m.modules[r][c] = dark;
          bitIndex++;
        }
      }
    }
  }
  return bitIndex;
}

function drawFormatInfo(m, formatBits) {
  const bit = (i) => (formatBits >>> i) & 1;
  for (let i = 0; i <= 5; i++) setFunction(m, 8, i, bit(i));
  setFunction(m, 8, 7, bit(6));
  setFunction(m, 8, 8, bit(7));
  setFunction(m, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) setFunction(m, 14 - i, 8, bit(i));
  const size = m.size;
  for (let i = 0; i < 7; i++) setFunction(m, size - 1 - i, 8, bit(i));
  for (let i = 7; i < 15; i++) setFunction(m, 8, size - 15 + i, bit(i));
  setFunction(m, size - 8, 8, true); // dark module
}

export function encodeQr(text) {
  const version = pickVersion(text.length);
  const size = version * 4 + 17;
  const codewords = interleaveBlocks(buildBitStream(text, version), version);
  const m = emptyMatrix(size);
  drawFinder(m, 0, 0);
  drawFinder(m, 0, size - 7);
  drawFinder(m, size - 7, 0);
  drawTiming(m);
  drawAlignment(m, version);
  reserveFormatAreas(m);
  const placed = drawCodewords(m, codewords, REMAINDER_BITS[version]);
  if (placed !== codewords.length * 8 + REMAINDER_BITS[version]) {
    throw new Error('QR placement mismatch: data cells != codeword bits');
  }
  drawFormatInfo(m, formatInfoBits(0b00, 0)); // ECC M, mask 0
  return { version, size, modules: m.modules };
}

export function qrToSvg(modules, options) {
  const { scale = 6, margin = 4, fg = '#212121', bg = '#ffffff' } = options || {};
  const n = modules.length;
  const total = (n + margin * 2) * scale;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" role="img" aria-label="QR code">`,
    `<rect width="${total}" height="${total}" fill="${bg}"/>`,
  ];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules[r][c]) {
        parts.push(
          `<rect x="${(c + margin) * scale}" y="${(r + margin) * scale}" width="${scale}" height="${scale}" fill="${fg}"/>`,
        );
      }
    }
  }
  parts.push('</svg>');
  return parts.join('');
}

// Test-only export: raw 15-bit format info for (eccLevelBits, mask).
export function _formatInfoBits(eccLevelBits, mask) {
  return formatInfoBits(eccLevelBits, mask);
}
