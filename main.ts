// "One Day, One World" — 20 November 2026 in one image.
// A hero-led newspaper front page drawn from scratch with Node 22 stdlib only.
// No network at run time: every pixel is computed here, so both grader runs
// write byte-identical PNGs. Output: /output/entry.png (1024x1024, < 1 MiB).
//
// Stories covered (verified 20 Nov 2026, morning roundups):
//   HERO  - ICJ rules Myanmar committed genocide against the Rohingya (The Hague)
//   SUMMIT- Trump, Xi and Putin sign a "Declaration Towards Peace" in Shenzhen
//   GULF  - Tanker hit near Oman; Iran strikes a US base in Kuwait; Hormuz in peril
//   STORM - Cyclone Akvan makes landfall on India's east coast; 300,000 evacuated
//   MARKETS - Dow sinks below 50,000, down 1,090 points, sixth straight fall
//   CLIMATE - COP31 draft drops the fossil-fuel phase-out, backlash in Antalya
//   ISRAEL- Israel to keep buffer zones in Gaza, Lebanon and Syria indefinitely
//   ALSO  - Somalia expels the UAE ambassador; APEC summit in Shenzhen
//
// Layout (1024x1024): masthead 0-134 | hero 144-524 | stories 544-812 |
// minis 832-960 | footer 972-1024. All text is ASCII only (5x7 font).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePng(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter: none
    Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- 5x7 font
// Uppercase-only poster font; drawText uppercases input. Rows are 5 bits.
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '*': ['00000', '00100', '10101', '01110', '10101', '00100', '00000'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '|': ['00100', '00100', '00100', '00100', '00100', '00100', '00100'],
};

// ---------------------------------------------------------------- Canvas
type RGB = [number, number, number];
const W = 1024;
const H = 1024;

const PAPER: RGB = [247, 241, 227];
const INK: RGB = [22, 35, 61];
const NAVY: RGB = [16, 28, 52];
const RED: RGB = [180, 35, 42];
const GOLD: RGB = [201, 154, 46];
const GOLD_LT: RGB = [232, 185, 60];
const TEAL: RGB = [14, 74, 66];
const TEAL_LT: RGB = [23, 121, 106];
const STORM: RGB = [47, 93, 138];
const SKY: RGB = [220, 233, 242];
const CREAM: RGB = [250, 246, 236];
const GREY: RGB = [90, 98, 112];
const ORANGE: RGB = [224, 122, 42];
const GREEN: RGB = [46, 125, 70];

class Canvas {
  buf = new Uint8Array(W * H * 3);
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) this.set(xx, yy, c);
  }
  // Vertical gradient, c1 at top, c2 at bottom.
  vgrad(x: number, y: number, w: number, h: number, c1: RGB, c2: RGB): void {
    for (let yy = 0; yy < h; yy++) {
      const t = h <= 1 ? 0 : yy / (h - 1);
      const c: RGB = [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t),
      ];
      this.rect(x, y + yy, w, 1, c);
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r; xx <= r; xx++)
        if (xx * xx + yy * yy <= r * r) this.set(cx + xx, cy + yy, c);
  }
  ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r; xx <= r; xx++) {
        const d = Math.sqrt(xx * xx + yy * yy);
        if (d <= r && d >= r - t) this.set(cx + xx, cy + yy, c);
      }
  }
  // Thick line: stamp circles along the segment.
  line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    const r = Math.max(1, Math.round(t / 2));
    for (let i = 0; i <= steps; i++) {
      this.circle(Math.round(x0 + (dx * i) / steps), Math.round(y0 + (dy * i) / steps), r, c);
    }
  }
  // Scanline polygon fill.
  poly(pts: [number, number][], c: RGB): void {
    let minY = H;
    let maxY = 0;
    for (const [, y] of pts) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = Math.max(0, minY); y <= Math.min(H - 1, maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(Math.round(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0)));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.max(0, xs[k]); x <= Math.min(W - 1, xs[k + 1]); x++) this.set(x, y, c);
      }
    }
  }
  textWidth(s: string, scale: number): number {
    return s.toUpperCase().length * 6 * scale - scale;
  }
  // align 'c' centres on x; 'l' starts at x.
  text(s: string, x: number, y: number, scale: number, c: RGB, align: 'l' | 'c' = 'l'): void {
    const up = s.toUpperCase();
    let ox = x;
    if (align === 'c') ox = x - Math.floor(this.textWidth(up, scale) / 2);
    for (const ch of up) {
      const g = FONT[ch] ?? FONT[' '];
      for (let r = 0; r < 7; r++) {
        for (let col = 0; col < 5; col++) {
          if (g[r][col] === '1') this.rect(ox + col * scale, y + r * scale, scale, scale, c);
        }
      }
      ox += 6 * scale;
    }
  }
  // Word-wrap into lines no wider than maxW px at this scale.
  wrap(s: string, scale: number, maxW: number): string[] {
    const words = s.toUpperCase().split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (this.textWidth(next, scale) <= maxW || !cur) cur = next;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  block(lines: string[], x: number, y: number, scale: number, c: RGB, gap: number): void {
    let yy = y;
    for (const ln of lines) {
      this.text(ln, x, yy, scale, c);
      yy += 7 * scale + gap;
    }
  }
}

// ---------------------------------------------------------------- Scenes
// Hero: the courthouse and the scales of justice, gold on teal.
function drawHeroScene(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.vgrad(x, y, w, h, TEAL, [10, 52, 46]);
  cv.circle(x + w / 2, y + h / 2 + 10, 168, TEAL_LT);
  cv.ring(x + w / 2, y + h / 2 + 10, 168, 4, GOLD);
  // Courthouse pediment + columns behind the scales.
  cv.poly(
    [
      [x + 62, y + 78],
      [x + w / 2, y + 18],
      [x + w - 62, y + 78],
    ],
    GOLD,
  );
  cv.circle(x + w / 2, y + 52, 12, GOLD_LT);
  for (const cx of [x + 84, x + 178, x + w - 204, x + w - 110]) {
    cv.rect(cx, y + 82, 26, h - 150, GOLD);
    cv.rect(cx - 5, y + 76, 36, 10, GOLD_LT);
    cv.rect(cx - 5, y + h - 72, 36, 10, GOLD_LT);
  }
  cv.rect(x + 40, y + h - 62, w - 80, 12, GOLD);
  cv.rect(x + 26, y + h - 48, w - 52, 12, GOLD_LT);
  // Scales of justice, centred.
  const cx = x + w / 2;
  const top = y + 96;
  const base = y + h - 74;
  cv.circle(cx, top - 8, 10, GOLD_LT);
  cv.rect(cx - 5, top, 10, base - top, GOLD);
  cv.line(cx - 118, top + 34, cx + 118, top + 34, 9, GOLD);
  cv.circle(cx - 118, top + 34, 8, GOLD_LT);
  cv.circle(cx + 118, top + 34, 8, GOLD_LT);
  for (const side of [-1, 1]) {
    const px = cx + side * 118;
    cv.line(px, top + 40, px - 34, top + 118, 3, GOLD_LT);
    cv.line(px, top + 40, px + 34, top + 118, 3, GOLD_LT);
    cv.line(px, top + 40, px, top + 118, 3, GOLD_LT);
    cv.poly(
      [
        [px - 46, top + 118],
        [px + 46, top + 118],
        [px, top + 152],
      ],
      GOLD,
    );
  }
  cv.poly(
    [
      [cx - 52, base],
      [cx + 52, base],
      [cx + 30, base - 26],
      [cx - 30, base - 26],
    ],
    GOLD,
  );
}

// Three leaders at a summit table: three busts under three stars. Scene is 140 tall.
function drawSummitScene(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.vgrad(x, y, w, h, NAVY, [32, 54, 96]);
  cv.circle(x + w / 2, y + 48, 40, [38, 62, 108]);
  cv.ring(x + w / 2, y + 48, 40, 3, GOLD);
  const cols: RGB[] = [GOLD_LT, RED, CREAM];
  for (let i = 0; i < 3; i++) {
    const bx = x + 52 + i * 86;
    cv.circle(bx + 26, y + 84, 22, cols[i]);
    cv.poly(
      [
        [bx, y + 138],
        [bx + 52, y + 138],
        [bx + 40, y + 102],
        [bx + 12, y + 102],
      ],
      cols[i],
    );
  }
  // Stars above the three busts.
  for (const sx of [x + 78, x + 164, x + 250]) {
    cv.poly(
      [
        [sx, y + 10],
        [sx + 5, y + 22],
        [sx + 18, y + 22],
        [sx + 8, y + 30],
        [sx + 12, y + 42],
        [sx, y + 35],
        [sx - 12, y + 42],
        [sx - 8, y + 30],
        [sx - 18, y + 22],
        [sx - 5, y + 22],
      ],
      GOLD_LT,
    );
  }
}

// Tanker on a burning sea, Hormuz in peril. Scene is 140 tall.
function drawTankerScene(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.vgrad(x, y, w, h, [52, 28, 30], [26, 16, 20]);
  cv.circle(x + w - 52, y + 34, 24, [232, 150, 80]);
  // Flames over the deck.
  cv.poly(
    [
      [x + 96, y + 74],
      [x + 128, y + 28],
      [x + 150, y + 74],
    ],
    ORANGE,
  );
  cv.poly(
    [
      [x + 128, y + 74],
      [x + 158, y + 38],
      [x + 180, y + 74],
    ],
    RED,
  );
  cv.poly(
    [
      [x + 158, y + 74],
      [x + 186, y + 44],
      [x + 208, y + 74],
    ],
    GOLD_LT,
  );
  // Hull and containers.
  cv.poly(
    [
      [x + 18, y + 78],
      [x + w - 18, y + 78],
      [x + w - 48, y + 110],
      [x + 48, y + 110],
    ],
    [120, 40, 44],
  );
  for (let i = 0; i < 4; i++) {
    const cols: RGB[] = [GOLD, TEAL_LT, CREAM, STORM];
    cv.rect(x + 44 + i * 54, y + 48, 46, 30, cols[i]);
  }
  cv.rect(x + 18, y + 110, w - 36, 6, INK);
  // Sea.
  cv.rect(x, y + 116, w, h - 116, [24, 62, 96]);
  for (const wy of [y + 126, y + 136]) {
    for (let wx = x + 8; wx < x + w - 20; wx += 34) {
      cv.line(wx, wy, wx + 20, wy, 3, SKY);
    }
  }
}

// Cyclone spiral over the coast. Scene is 140 tall.
function drawStormScene(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.vgrad(x, y, w, h, STORM, [22, 48, 82]);
  const cx = x + w / 2;
  const cy = y + 62;
  // Spiral, thick white line winding outwards.
  let px = cx;
  let py = cy;
  for (let t = 0; t < Math.PI * 4.6; t += 0.12) {
    const r = 3 + t * 6.2;
    const nx = cx + Math.cos(t) * r;
    const ny = cy + Math.sin(t) * r * 0.9;
    cv.line(Math.round(px), Math.round(py), Math.round(nx), Math.round(ny), 6, CREAM);
    px = nx;
    py = ny;
  }
  cv.circle(cx, cy, 9, GOLD_LT);
  // Coast + rain.
  cv.rect(x, y + 118, w, h - 118, [52, 84, 52]);
  cv.rect(x + 26, y + 102, 34, 18, [190, 170, 120]);
  cv.poly(
    [
      [x + 22, y + 102],
      [x + 43, y + 86],
      [x + 64, y + 102],
    ],
    RED,
  );
  cv.rect(x + w - 76, y + 100, 40, 20, [190, 170, 120]);
  for (let i = 0; i < 8; i++) {
    const rx = x + 14 + i * 34;
    cv.line(rx, y + 18 + (i % 3) * 10, rx - 8, y + 38 + (i % 3) * 10, 3, SKY);
  }
}

// ---------------------------------------------------------------- Page build
function build(): Canvas {
  const cv = new Canvas();
  cv.rect(0, 0, W, H, PAPER);

  // Masthead (centred on x = 512).
  cv.rect(0, 0, W, 128, NAVY);
  cv.text('ONE DAY  |  ONE WORLD', 512, 16, 2, GOLD, 'c');
  cv.text('20 NOVEMBER 2026', 512, 40, 8, CREAM, 'c');
  cv.text('FRIDAY - THE WORLD NEWS IN ONE IMAGE', 512, 104, 2, GOLD, 'c');
  cv.rect(0, 128, W, 6, GOLD);

  // Hero card 144-524.
  cv.rect(24, 144, 976, 380, CREAM);
  cv.rect(24, 144, 976, 4, GOLD);
  cv.rect(24, 520, 976, 4, GOLD);
  cv.rect(24, 144, 4, 380, GOLD);
  cv.rect(996, 144, 4, 380, GOLD);
  drawHeroScene(cv, 44, 164, 470, 336);
  // Hero text.
  const hx = 544;
  cv.text('THE HAGUE - A HISTORIC VERDICT', hx, 176, 2, RED);
  cv.rect(hx, 202, 380, 4, RED);
  cv.block(cv.wrap('MYANMAR GUILTY OF GENOCIDE', 6, 420), hx, 220, 6, INK, 8);
  cv.block(
    cv.wrap('UN COURT: MYANMAR COMMITTED GENOCIDE AGAINST THE ROHINGYA.', 3, 420),
    hx,
    380,
    3,
    [58, 66, 82],
    6,
  );
  cv.block(
    cv.wrap('JUDGES ORDER MEASURES FOR THE RETURN OF THE DISPLACED.', 2, 420),
    hx,
    472,
    2,
    GREY,
    4,
  );

  // Story row: three cards 544-812. Tag, then 140-tall scene, headline, sub.
  const cards = [
    {
      x: 24,
      tag: 'SUMMIT IN SHENZHEN',
      head: 'TRUMP, XI, PUTIN MEET',
      sub: 'SIGN PEACE PACT, VOW TO CUT NUCLEAR RISKS.',
      scene: drawSummitScene,
      tagC: GOLD,
    },
    {
      x: 360,
      tag: 'GULF ON EDGE',
      head: 'TANKER HIT NEAR OMAN',
      sub: 'IRAN HITS US BASE IN KUWAIT; HORMUZ IN PERIL.',
      scene: drawTankerScene,
      tagC: RED,
    },
    {
      x: 696,
      tag: 'CYCLONE AKVAN',
      head: 'CYCLONE AKVAN SLAMS INDIA',
      sub: '300,000 EVACUATED IN ODISHA.',
      scene: drawStormScene,
      tagC: STORM,
    },
  ];
  for (const c of cards) {
    cv.rect(c.x, 544, 304, 268, CREAM);
    cv.rect(c.x, 544, 304, 4, c.tagC);
    cv.text(c.tag, c.x + 12, 556, 2, c.tagC);
    c.scene(cv, c.x + 8, 574, 288, 140);
    const headLines = cv.wrap(c.head, 3, 280);
    cv.block(headLines, c.x + 12, 718, 3, INK, 4);
    cv.block(cv.wrap(c.sub, 2, 280), c.x + 12, 718 + headLines.length * (7 * 3 + 4) + 4, 2, GREY, 4);
  }

  // Bottom row: three mini stories 832-960.
  const minis = [
    {
      x: 24,
      head: 'DOW SINKS BELOW 50,000',
      sub: 'SIXTH STRAIGHT FALL: -1,090',
      icon: 'dow',
    },
    {
      x: 360,
      head: 'COP31 DROPS FUEL EXIT',
      sub: 'BACKLASH IN ANTALYA',
      icon: 'cop',
    },
    {
      x: 696,
      head: 'ISRAEL BUFFER ZONES',
      sub: 'GAZA, LEBANON, SYRIA',
      icon: 'wall',
    },
  ];
  for (const m of minis) {
    cv.rect(m.x, 832, 304, 128, CREAM);
    cv.rect(m.x, 832, 304, 4, INK);
    const ix = m.x + 12;
    const iy = 848;
    cv.rect(ix, iy, 76, 76, NAVY);
    if (m.icon === 'dow') {
      cv.line(ix + 10, iy + 14, ix + 28, iy + 30, 4, RED);
      cv.line(ix + 28, iy + 30, ix + 46, iy + 22, 4, RED);
      cv.line(ix + 46, iy + 22, ix + 64, iy + 52, 4, RED);
      cv.poly(
        [
          [ix + 64, iy + 52],
          [ix + 52, iy + 48],
          [ix + 62, iy + 62],
        ],
        RED,
      );
      cv.rect(ix + 12, iy + 54, 10, 14, GOLD_LT);
      cv.rect(ix + 30, iy + 46, 10, 22, GOLD_LT);
      cv.rect(ix + 48, iy + 58, 10, 10, GOLD_LT);
    } else if (m.icon === 'cop') {
      cv.circle(ix + 38, iy + 38, 26, GREEN);
      cv.poly(
        [
          [ix + 38, iy + 16],
          [ix + 58, iy + 38],
          [ix + 38, iy + 60],
          [ix + 18, iy + 38],
        ],
        CREAM,
      );
      cv.line(ix + 38, iy + 16, ix + 38, iy + 60, 3, GREEN);
    } else {
      // Buffer-zone wall.
      for (let r = 0; r < 4; r++) {
        for (let col = 0; col < 3; col++) {
          cv.rect(ix + 8 + col * 22 + (r % 2) * 6, iy + 8 + r * 14, 18, 11, GOLD_LT);
        }
      }
      cv.line(ix + 6, iy + 66, ix + 70, iy + 66, 3, RED);
    }
    const headLines = cv.wrap(m.head, 3, 180);
    cv.block(headLines, m.x + 100, 842, 3, INK, 4);
    cv.block(cv.wrap(m.sub, 2, 180), m.x + 100, 842 + headLines.length * (7 * 3 + 4) + 4, 2, GREY, 4);
  }

  // Footer ticker (centred on x = 512).
  cv.rect(0, 972, W, 52, NAVY);
  cv.text('ALSO: SOMALIA EXPELS UAE ENVOY  |  APEC SUMMIT IN SHENZHEN  |  20 NOVEMBER 2026', 512, 990, 2, CREAM, 'c');

  return cv;
}

// ---------------------------------------------------------------- Run
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const png = encodePng(W, H, build().buf);
writeFileSync(join(outDir, 'entry.png'), png);
