// News Image — 22 November 2026. One-day world news, drawn in code.
// Node 22, standard library only. Writes /output/entry.png (1024x1024, PNG).
// Deterministic: no clock, no randomness, no network. Two runs are byte-identical.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// 5x7 bitmap font, authored here. Each glyph is 7 rows of 5 bits (MSB = left).
// Uppercase, lowercase, digits and punctuation. Unknown chars render blank.
// ---------------------------------------------------------------------------
const GLYPHS: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  a: [0, 0, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  b: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x1e],
  c: [0, 0, 0x0e, 0x10, 0x10, 0x11, 0x0e],
  d: [0x01, 0x01, 0x0f, 0x11, 0x11, 0x11, 0x0f],
  e: [0, 0, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  f: [0x06, 0x08, 0x1e, 0x08, 0x08, 0x08, 0x08],
  g: [0, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  h: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x11],
  i: [0x04, 0, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  j: [0x02, 0, 0x06, 0x02, 0x02, 0x12, 0x0c],
  k: [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  m: [0, 0, 0x1a, 0x15, 0x15, 0x15, 0x15],
  n: [0, 0, 0x1e, 0x11, 0x11, 0x11, 0x11],
  o: [0, 0, 0x0e, 0x11, 0x11, 0x11, 0x0e],
  p: [0, 0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10],
  q: [0, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x01],
  r: [0, 0, 0x16, 0x19, 0x10, 0x10, 0x10],
  s: [0, 0, 0x0f, 0x10, 0x0e, 0x01, 0x1e],
  t: [0x04, 0x04, 0x1f, 0x04, 0x04, 0x04, 0x03],
  u: [0, 0, 0x11, 0x11, 0x11, 0x13, 0x0d],
  v: [0, 0, 0x11, 0x11, 0x11, 0x0a, 0x04],
  w: [0, 0, 0x11, 0x11, 0x15, 0x15, 0x1b],
  x: [0, 0, 0x11, 0x0a, 0x04, 0x0a, 0x11],
  y: [0, 0, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  z: [0, 0, 0x1f, 0x02, 0x04, 0x08, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  '-': [0, 0, 0, 0x1f, 0, 0, 0],
  '–': [0, 0, 0, 0x1f, 0, 0, 0],
  '—': [0, 0, 0, 0x1f, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '’': [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '%': [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '#': [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  '@': [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '*': [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '<': [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  '>': [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  '•': [0, 0, 0x0e, 0x0e, 0x0e, 0, 0],
  '·': [0, 0, 0, 0x0c, 0x0c, 0, 0],
  '_': [0, 0, 0, 0, 0, 0, 0x1f],
  '[': [0x0e, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0e],
  ']': [0x0e, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0e],
  '°': [0x0e, 0x11, 0x0e, 0, 0, 0, 0],
  '×': [0, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0],
};

const BLANK = [0, 0, 0, 0, 0, 0, 0];

// ---------------------------------------------------------------------------
// PNG encoder (truecolour, filter 0) + CRC32.
// ---------------------------------------------------------------------------
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
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(w: number, h: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Canvas: RGB framebuffer + shapes + bitmap text (any pixel height).
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

class Canvas {
  w: number;
  h: number;
  buf: Uint8Array;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }
  px(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w));
    const y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * this.w + xx) * 3;
        this.buf[i] = c[0];
        this.buf[i + 1] = c[1];
        this.buf[i + 2] = c[2];
      }
    }
  }
  hline(x: number, y: number, w: number, c: RGB): void {
    this.fillRect(x, y, w, 1, c);
  }
  vline(x: number, y: number, h: number, c: RGB): void {
    this.fillRect(x, y, 1, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.px(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB, filled: boolean): void {
    if (filled) {
      for (let y = -r; y <= r; y++) {
        const half = Math.floor(Math.sqrt(r * r - y * y));
        this.fillRect(cx - half, cy + y, half * 2 + 1, 1, c);
      }
      return;
    }
    let x = r;
    let y = 0;
    let err = 0;
    while (x >= y) {
      this.px(cx + x, cy + y, c); this.px(cx + y, cy + x, c);
      this.px(cx - y, cy + x, c); this.px(cx - x, cy + y, c);
      this.px(cx - x, cy - y, c); this.px(cx - y, cy - x, c);
      this.px(cx + y, cy - x, c); this.px(cx + x, cy - y, c);
      y += 1;
      err += 1 + 2 * y;
      if (2 * (err - x) + 1 > 0) { x -= 1; err += 1 - 2 * x; }
    }
  }
  // Scanline polygon fill.
  poly(points: [number, number][], c: RGB): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        this.fillRect(Math.ceil(xs[k]), y, Math.floor(xs[k + 1]) - Math.ceil(xs[k]) + 1, 1, c);
      }
    }
  }
  // Star burst (explosion / badge star) centred at cx,cy.
  star(cx: number, cy: number, rOuter: number, rInner: number, points: number, c: RGB): void {
    const pts: [number, number][] = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      pts.push([Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))]);
    }
    this.poly(pts, c);
  }
  charWidth(size: number): number {
    return Math.max(1, Math.round((size * 5) / 7)) + Math.max(1, Math.round(size * 0.14));
  }
  textWidth(text: string, size: number): number {
    let w = 0;
    for (const ch of text) w += ch === ' ' ? this.charWidth(size) : this.charWidth(size);
    return w - Math.max(1, Math.round(size * 0.14));
  }
  drawChar(x: number, y: number, ch: string, size: number, c: RGB): void {
    const g = GLYPHS[ch] ?? BLANK;
    const cw = Math.max(1, Math.round((size * 5) / 7));
    for (let ty = 0; ty < size; ty++) {
      const row = g[Math.min(6, Math.floor((ty * 7) / size))];
      for (let tx = 0; tx < cw; tx++) {
        const col = Math.min(4, Math.floor((tx * 5) / cw));
        if ((row >> (4 - col)) & 1) this.px(x + tx, y + ty, c);
      }
    }
  }
  // Draw one line of text. align: 'l' | 'c' | 'r'. bold: extra 1px offset pass.
  text(x: number, y: number, text: string, size: number, c: RGB, align: 'l' | 'c' | 'r' = 'l', bold = false): number {
    const w = this.textWidth(text, size);
    let x0 = x;
    if (align === 'c') x0 = x - Math.round(w / 2);
    if (align === 'r') x0 = x - w;
    let cx = x0;
    for (const ch of text) {
      if (ch !== ' ') {
        this.drawChar(cx, y, ch, size, c);
        if (bold) this.drawChar(cx + 1, y, ch, size, c);
      }
      cx += this.charWidth(size);
    }
    return w;
  }
  // Word-wrap text into lines that fit maxWidth. Returns lines.
  wrap(text: string, size: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const word of words) {
      const test = cur === '' ? word : cur + ' ' + word;
      if (this.textWidth(test, size) <= maxWidth || cur === '') {
        cur = test;
      } else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur !== '') lines.push(cur);
    return lines;
  }
  // Wrapped paragraph; returns the y after the last line.
  para(x: number, y: number, text: string, size: number, c: RGB, maxWidth: number, lineH: number, bold = false, maxLines = 99): number {
    const lines = this.wrap(text, size, maxWidth).slice(0, maxLines);
    let yy = y;
    for (const ln of lines) {
      this.text(x, yy, ln, size, c, 'l', bold);
      yy += lineH;
    }
    return yy;
  }
}

// ---------------------------------------------------------------------------
// Palette (newspaper).
// ---------------------------------------------------------------------------
const PAPER: RGB = [247, 243, 234];
const INK: RGB = [17, 17, 17];
const RED: RGB = [185, 28, 28];
const NAVY: RGB = [30, 58, 95];
const GREY: RGB = [90, 86, 78];
const LIGHT: RGB = [232, 226, 214];
const RULE: RGB = [200, 192, 176];
const WHITE: RGB = [255, 255, 255];
const GOLD: RGB = [201, 162, 39];
const SAND: RGB = [217, 160, 102];
const TERRA: RGB = [164, 90, 54];
const DARKNAVY: RGB = [16, 28, 52];
const ORANGE: RGB = [232, 120, 40];
const COURT: RGB = [74, 140, 82];
const COURTLINE: RGB = [240, 240, 230];
const BALL: RGB = [205, 220, 60];

// ---------------------------------------------------------------------------
// Stories. Verified 21-22 Nov 2026 (Reuters, AP, AFP, BBC, Al Jazeera,
// Bloomberg, ISW, NCS). Headlines are short; details fit one line.
// Columns: 13 / 12 / 12. Heroes are drawn separately, not repeated here.
// ---------------------------------------------------------------------------
type Story = { tag: string; head: string; detail: string };

const COL1: Story[] = [
  { tag: 'UKRAINE', head: 'Russian missile hits Kryvyi Rih', detail: 'Boy, 7, and a paramedic among the dead' },
  { tag: 'BALTIC', head: 'Drones set Russian ship Sparta II ablaze', detail: 'Fire rages in Gulf of Finland; crew out' },
  { tag: 'UKRAINE', head: 'Zelenskyy offers local ceasefires', detail: 'To evacuate 15 villages on the Dnipro' },
  { tag: 'NATO', head: 'Rutte: NATO will defend every inch of Poland', detail: 'Allies drill in Poland for first time' },
  { tag: 'NORWAY', head: 'Top court voids disputed oil licences', detail: 'Climate groups win landmark ruling' },
  { tag: 'EUROPE', head: 'Hunt on for new ECB chief as Lagarde quits', detail: 'Lagarde resigns; the search opens' },
  { tag: 'DENMARK', head: 'Denmark urges EU curbs on Russian visas', detail: "After 'plot on US-Ukrainian rapper'" },
  { tag: 'FINLAND', head: 'Finland probes Russian helicopter incursion', detail: 'Suspected 4.1 km breach of its airspace' },
  { tag: 'ENGLAND', head: 'Leeds rout Chelsea 4-1; Arsenal held 2-2', detail: 'Madueke rescues leaders at Newcastle' },
  { tag: 'FRANCE', head: 'France reach rugby final vs Springboks', detail: 'Les Bleus beat Argentina in the semi' },
  { tag: 'GULF', head: 'Iran hits two US Patriot radars', detail: 'IRGC missile and drone attack in Gulf' },
  { tag: 'IRAN', head: 'Tanker convoy to break US blockade', detail: 'Tehran threatens Gulf; Hormuz offer' },
];

const COL2: Story[] = [
  { tag: 'YEMEN', head: '70+ Saudi strikes hit eight areas', detail: 'Houthis report raids across Yemen' },
  { tag: 'IRAQ', head: 'Power-station fire kills 4, hurts 35', detail: 'Blaze at Hartha plant in Basra' },
  { tag: 'GAZA', head: 'Gaza strike hits Islamic Jihad fighters', detail: 'Military says target was militants' },
  { tag: 'JAPAN', head: 'Japan, India deepen defence industry ties', detail: 'Live-fire drills on Indian ranges agreed' },
  { tag: 'S. CHINA SEA', head: 'China builds new island runway', detail: 'Satellite images show airstrip on reef' },
  { tag: 'MYANMAR', head: 'Quake of 4.1 shakes Myanmar at dawn', detail: 'Early-hours tremor on Sunday' },
  { tag: 'TECH', head: 'TikTok launches deepfake-spotter worldwide', detail: 'Tool shields public figures from fakes' },
  { tag: 'INDONESIA', head: 'EU-Indonesia trade deals signed', detail: 'CEPA and investment pacts sealed' },
  { tag: 'GHANA', head: 'Ghana unveils Heritage banknotes', detail: 'Nkrumah and Kofi Annan honoured' },
  { tag: 'SOMALIA', head: 'Al-Shabaab claims hundreds killed', detail: 'Ambush on Somali troops, group says' },
  { tag: 'DRC', head: 'Ebola toll passes 5,300 in Congo', detail: 'Kenya discharges its last patient' },
  { tag: 'DRC', head: 'Tshisekedi signs reform law', detail: 'Constitutional change amid high tension' },
];

const COL3: Story[] = [
  { tag: 'NIGERIA', head: 'Nigeria starts building naval ships', detail: 'Navy aims to cut foreign dependence' },
  { tag: 'NIGERIA', head: '24 bodies after boat capsizes', detail: 'NEMA reports toll from river accident' },
  { tag: 'S. AFRICA', head: 'First woman VP dies at 71', detail: 'Phumzile Mlambo-Ngcuka mourned' },
  { tag: 'USA', head: 'Democrats retake Congress in midterms', detail: 'Record Black intake since 1993' },
  { tag: 'USA', head: 'Hegseth memo curbs Canada defence ties', detail: 'Secret order limits joint work' },
  { tag: 'PERU', head: 'Quake leaves 152 homes uninhabitable', detail: 'Revised toll from Andes tremor' },
  { tag: 'AUSTRALIA', head: 'Australia beat Wales in rugby', detail: 'Wallabies win Nations Championship tie' },
  { tag: 'CRICKET', head: 'Smith out as Australia bowl first', detail: 'Injured star misses S. Africa decider' },
  { tag: 'PACIFIC', head: 'El Nino drought hits crisis levels', detail: 'Fiji and Tonga face severe dry spell' },
  { tag: 'PNG', head: 'Jet lands safely after engine alert', detail: 'All 146 aboard Air Niugini flight safe' },
  { tag: 'CLIMATE', head: 'COP31 deadlocked over fossil fuels', detail: 'Summit stalls as talks drag on' },
];

const ALSO_ON: string[] = [
  'Sao Tome PM Ramos reappointed',
  'Tigray mayor vows polls in 6 months',
  'Sahel states reopen talks with ECOWAS',
  'Kenya wins 293,600 Saudi jobs',
  'Awar Odhiang named model of the year',
  'Tyla, Tems, Kidjo lead Grammy hopes',
  'Paolo Bulgari dies',
  'EU Commission hit by cyberattack',
  'US farm dept and FBI hit by cyberattacks',
];

const NUMBERS: [string, string][] = [
  ['2', 'KILLED IN KRYVYI RIH'],
  ['70+', 'SAUDI STRIKES ON YEMEN'],
  ['146', 'SAFE ON AIR NIUGINI JET'],
  ['5,300+', 'EBOLA DEATHS IN DRC'],
  ['152', 'HOMES LOST IN PERU QUAKE'],
  ['6', 'EVANILSON SCORING RUN'],
];

const CLOCK: [string, string][] = [
  ['SAT 21 NOV', 'AM', 'Drones strike Sparta II in Gulf of Finland'],
  ['SAT 21 NOV', 'PM', 'Missile hits Kryvyi Rih; Mexico captures El Chapo Isidro'],
  ['SAT 21 NOV', 'EVE', 'Newcastle 2-2 Arsenal; Leeds thrash Chelsea 4-1'],
  ['SUN 22 NOV', 'AM', 'Myanmar quake M4.1; Bahrain reports Iran strike'],
  ['SUN 22 NOV', 'PM', 'Alcaraz v Zverev for the ATP Finals title'],
];

// World map: coarse continent outlines as [lon, lat] points.
const CONTINENTS: [number, number][][] = [
  // North America
  [[-168, 65], [-150, 70], [-130, 71], [-110, 68], [-95, 69], [-85, 66], [-75, 62], [-65, 60], [-55, 47], [-65, 44], [-74, 40], [-76, 35], [-81, 31], [-84, 30], [-90, 21], [-97, 16], [-92, 14], [-86, 12], [-80, 8], [-90, 14], [-97, 16], [-105, 20], [-112, 23], [-117, 32], [-124, 40], [-124, 48], [-130, 54], [-145, 60], [-158, 58]],
  // South America
  [[-80, 9], [-72, 11], [-62, 10], [-52, 5], [-50, 0], [-44, -3], [-35, -8], [-40, -20], [-48, -28], [-58, -35], [-65, -41], [-70, -50], [-73, -37], [-70, -23], [-77, -12], [-81, -5], [-80, 2]],
  // Africa
  [[-17, 15], [-10, 31], [0, 36], [10, 37], [20, 32], [30, 31], [35, 28], [40, 15], [43, 11], [48, 11], [51, 12], [44, 0], [40, -10], [36, -18], [32, -26], [26, -34], [20, -35], [16, -28], [12, -18], [9, 4], [-8, 4], [-13, 8]],
  // Europe
  [[-10, 36], [-9, 43], [-2, 48], [0, 50], [5, 53], [8, 57], [10, 59], [18, 56], [21, 55], [24, 58], [28, 60], [30, 62], [25, 65], [20, 70], [15, 68], [12, 65], [5, 60], [0, 55], [-5, 50], [-10, 44]],
  // Asia
  [[30, 62], [40, 68], [60, 70], [80, 73], [100, 76], [120, 73], [140, 72], [160, 70], [178, 66], [170, 60], [162, 58], [158, 52], [150, 59], [142, 54], [140, 45], [135, 43], [130, 42], [127, 40], [122, 38], [120, 32], [122, 28], [118, 25], [110, 20], [108, 12], [105, 9], [100, 8], [98, 12], [95, 16], [92, 21], [88, 22], [85, 19], [80, 13], [77, 8], [74, 15], [72, 20], [68, 23], [66, 25], [62, 25], [58, 26], [56, 27], [52, 26], [50, 29], [48, 30], [44, 29], [40, 31], [36, 36], [30, 36], [27, 40], [30, 45], [32, 50], [35, 55], [38, 60]],
  // Australia
  [[114, -22], [114, -30], [116, -35], [120, -34], [125, -32], [130, -32], [135, -35], [140, -38], [145, -38], [150, -37], [153, -32], [153, -27], [150, -22], [146, -19], [142, -15], [142, -11], [137, -12], [135, -15], [132, -12], [130, -13], [126, -14], [122, -17], [118, -20]],
];

const PINS: [number, number, string, number, number][] = [
  [-99, 19, 'MEXICO', 6, -4],
  [-77, -12, 'PERU', 6, -4],
  [-77, 39, 'USA', 6, -4],
  [0, 51, 'LONDON', -42, -4],
  [30, 50, 'KYIV', 6, 6],
  [50, 26, 'BAHRAIN', 6, -4],
  [96, 17, 'MYANMAR', 6, -4],
  [107, -6, 'JAKARTA', 6, -4],
  [3, 6, 'LAGOS', -34, 6],
  [15, -4, 'KINSHASA', 6, 6],
  [151, -34, 'SYDNEY', 6, -4],
];

// ---------------------------------------------------------------------------
// Layout. Page 1024x1024, margins 24.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const MX = 24;
const CW = W - MX * 2; // 976

function drawMasthead(cv: Canvas): void {
  cv.text(512, 16, 'THE WORLD IN ONE DAY', 40, INK, 'c', true);
  cv.fillRect(MX, 62, CW, 3, RED);
  cv.text(512, 70, 'SUNDAY, 22 NOVEMBER 2026', 17, RED, 'c', true);
  cv.text(512, 92, '47 STORIES  •  6 CONTINENTS  •  ONE DAY', 14, NAVY, 'c', true);
}

function drawNumbers(cv: Canvas): void {
  const y = 112;
  const bw = Math.floor((CW - 5 * 8) / 6);
  for (let i = 0; i < NUMBERS.length; i++) {
    const x = MX + i * (bw + 8);
    cv.fillRect(x, y, bw, 40, LIGHT);
    cv.fillRect(x, y, bw, 3, NAVY);
    const [num, label] = NUMBERS[i];
    cv.text(x + Math.floor(bw / 2), y + 8, num, 20, RED, 'c', true);
    const ls = 8;
    const lw = cv.textWidth(label, ls);
    if (lw <= bw - 6) {
      cv.text(x + Math.floor(bw / 2), y + 29, label, ls, INK, 'c');
    } else {
      // Two-line label: split at the middle space.
      const words = label.split(' ');
      const half = Math.ceil(words.length / 2);
      cv.text(x + Math.floor(bw / 2), y + 27, words.slice(0, half).join(' '), ls, INK, 'c');
      cv.text(x + Math.floor(bw / 2), y + 35, words.slice(half).join(' '), ls, INK, 'c');
    }
  }
}

function heroCaption(cv: Canvas, x: number, y: number, w: number, title: string, cap: string): void {
  const bh = 52;
  cv.fillRect(x, y + 140 - bh, w, bh, [17, 17, 17]);
  cv.text(x + 10, y + 140 - bh + 8, title, 15, WHITE, 'l', true);
  cv.text(x + 10, y + 140 - bh + 28, cap, 10, [220, 220, 210], 'l');
}

function drawHeroes(cv: Canvas): void {
  const y = 158;
  const hw = Math.floor((CW - 2 * 10) / 3); // 318
  // Panel 1 — Mexico: desert, mountains, badge.
  let x = MX;
  cv.fillRect(x, y, hw, 140, SAND);
  cv.circle(x + hw - 52, y + 30, 20, [245, 222, 160], true); // sun
  cv.poly([[x, y + 140], [x + 70, y + 70], [x + 140, y + 140]], TERRA);
  cv.poly([[x + 110, y + 140], [x + 190, y + 58], [x + 270, y + 140]], [122, 66, 40]);
  cv.poly([[x, y + 140], [x + 240, y + 110], [x + hw, y + 140]], [146, 84, 48]);
  cv.star(x + 62, y + 58, 30, 13, 5, GOLD);
  cv.circle(x + 62, y + 58, 15, GOLD, true);
  cv.text(x + 62, y + 51, 'M', 15, [17, 17, 17], 'c', true);
  heroCaption(cv, x, y, hw, 'EL CHAPO ISIDRO HELD', 'Mexico arrests top cartel boss');

  // Panel 2 — Bahrain: night sky, factory, blast.
  x = MX + hw + 10;
  cv.fillRect(x, y, hw, 140, DARKNAVY);
  for (let i = 0; i < 26; i++) {
    const sx = x + 12 + ((i * 53) % (hw - 24));
    const sy = y + 8 + ((i * 29) % 40);
    cv.px(sx, sy, WHITE);
  }
  cv.fillRect(x, y + 96, hw, 44, [10, 18, 36]);
  cv.fillRect(x + 30, y + 62, 34, 34, [40, 52, 74]);
  cv.fillRect(x + 78, y + 76, 26, 20, [40, 52, 74]);
  cv.fillRect(x + 200, y + 58, 14, 38, [40, 52, 74]);
  cv.fillRect(x + 228, y + 74, 44, 22, [40, 52, 74]);
  cv.star(x + 210, y + 46, 34, 14, 9, ORANGE);
  cv.star(x + 210, y + 46, 20, 8, 9, [245, 200, 80]);
  cv.circle(x + 210, y + 46, 8, WHITE, true);
  heroCaption(cv, x, y, hw, 'IRAN STRIKES BAHRAIN', 'Missile hits site; rest stopped');

  // Panel 3 — Tennis: green court, net, ball, trophy.
  x = MX + hw * 2 + 20;
  cv.fillRect(x, y, hw, 140, COURT);
  cv.fillRect(x, y + 20, hw, 114, [88, 158, 96]);
  cv.hline(x, y + 76, hw, COURTLINE);
  cv.vline(x + Math.floor(hw / 2), y + 20, 114, COURTLINE);
  cv.fillRect(x, y + 72, hw, 3, WHITE);
  cv.circle(x + 70, y + 46, 12, BALL, true);
  cv.circle(x + 70, y + 46, 12, COURTLINE, false);
  // Trophy: cup + stem + base.
  const tx = x + hw - 78;
  cv.fillRect(tx - 14, y + 34, 28, 20, GOLD);
  cv.fillRect(tx - 20, y + 38, 6, 12, GOLD);
  cv.fillRect(tx + 14, y + 38, 6, 12, GOLD);
  cv.fillRect(tx - 3, y + 54, 6, 12, GOLD);
  cv.fillRect(tx - 12, y + 66, 24, 6, GOLD);
  heroCaption(cv, x, y, hw, 'ALCARAZ v ZVEREV', 'ATP Finals title decider in Turin');
}

function drawRegionBar(cv: Canvas): void {
  const y = 304;
  cv.fillRect(MX, y, CW, 22, NAVY);
  cv.text(
    512, y + 6,
    'EUROPE 12  •  MIDDLE EAST 6  •  ASIA 5  •  AFRICA 12  •  AMERICAS 5  •  OCEANIA 4  •  WORLD 3',
    10, WHITE, 'c', true,
  );
}

function drawColumn(cv: Canvas, x: number, yTop: number, w: number, stories: Story[]): void {
  let y = yTop;
  for (let i = 0; i < stories.length; i++) {
    const s = stories[i];
    const head = s.tag + ' — ' + s.head;
    const lines = cv.wrap(head, 11, w);
    const shown = lines.slice(0, 2);
    let yy = y;
    for (let li = 0; li < shown.length; li++) {
      // Tag in red on the first line: redraw the tag part in red.
      if (li === 0) {
        const tagW = cv.textWidth(s.tag + ' — ', 11);
        cv.text(x, yy, s.tag + ' — ', 11, RED, 'l', true);
        cv.text(x + tagW, yy, shown[0].slice(s.tag.length + 3), 11, INK, 'l', true);
      } else {
        cv.text(x, yy, shown[li], 11, INK, 'l', true);
      }
      yy += 12;
    }
    // Detail, truncated with ellipsis so it never crosses the column edge.
    let detail = s.detail;
    while (cv.textWidth(detail, 9) > w && detail.length > 4) {
      detail = detail.slice(0, -1);
    }
    if (detail.length < s.detail.length) detail = detail.slice(0, -1) + '…';
    cv.text(x, yy, detail, 9, GREY, 'l');
    yy += 10;
    y = yy + 2;
    if (i < stories.length - 1) {
      cv.fillRect(x, y - 1, w, 1, RULE);
    }
  }
}

function drawMap(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, [214, 228, 235]);
  cv.text(x + 8, y + 6, 'THE WORLD TODAY', 11, NAVY, 'l', true);
  const lon2x = (lon: number): number => x + ((lon + 180) / 360) * w;
  const lat2y = (lat: number): number => y + 16 + ((85 - lat) / 145) * (h - 22);
  for (const cont of CONTINENTS) {
    cv.poly(
      cont.map(([lon, lat]) => [Math.round(lon2x(lon)), Math.round(lat2y(lat))] as [number, number]),
      [120, 138, 122],
    );
  }
  for (const [lon, lat, label, dx, dy] of PINS) {
    const px = Math.round(lon2x(lon));
    const py = Math.round(lat2y(lat));
    cv.circle(px, py, 4, RED, true);
    cv.circle(px, py, 4, WHITE, false);
    cv.text(px + dx, py + dy, label, 8, INK, 'l', true);
  }
}

function drawClock(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, LIGHT);
  cv.text(x + 10, y + 6, 'BY THE CLOCK · UTC', 11, NAVY, 'l', true);
  let yy = y + 24;
  for (const [day, part, text] of CLOCK) {
    cv.text(x + 10, yy, day, 9, RED, 'l', true);
    cv.text(x + 92, yy, part, 9, INK, 'l', true);
    const lines = cv.wrap(text, 9, w - 146);
    let ly = yy;
    for (const ln of lines.slice(0, 2)) {
      cv.text(x + 136, ly, ln, 9, INK, 'l');
      ly += 10;
    }
    yy += 20;
  }
}

function drawAlsoOn(cv: Canvas): void {
  const y = 912;
  cv.text(MX, y, 'ALSO ON', 12, NAVY, 'l', true);
  cv.hline(MX + 74, y + 6, CW - 74, RULE);
  const colW = Math.floor(CW / 3);
  for (let i = 0; i < ALSO_ON.length; i++) {
    const cx = MX + (i % 3) * colW;
    const cy = y + 18 + Math.floor(i / 3) * 13;
    cv.text(cx, cy, '• ' + ALSO_ON[i], 10, INK, 'l');
  }
}

function drawFooter(cv: Canvas): void {
  const y = 968;
  cv.fillRect(MX, y, CW, 2, RED);
  cv.para(
    MX, y + 8,
    'SOURCES: REUTERS · AP · AFP · BBC · AL JAZEERA · BLOOMBERG · ISW · NCS',
    9, INK, CW, 12,
  );
  cv.para(
    MX, y + 22,
    'DATE CHECK: All stories happened or were first reported 22 Nov 2026 (UTC), or 21 Nov as headlines in the 22 Nov papers.',
    9, INK, CW, 12,
  );
  cv.para(
    MX, y + 36,
    'News Image 22 November 2026 · make.fun bounty · Image drawn in code, no photographs.',
    9, GREY, CW, 12,
  );
}

function render(): Buffer {
  const cv = new Canvas(W, H, PAPER);
  drawMasthead(cv);
  drawNumbers(cv);
  drawHeroes(cv);
  drawRegionBar(cv);
  const colW = Math.floor((CW - 2 * 16) / 3);
  drawColumn(cv, MX, 334, colW, COL1);
  drawColumn(cv, MX + colW + 16, 334, colW, COL2);
  drawColumn(cv, MX + colW * 2 + 32, 334, colW, COL3);
  drawMap(cv, MX, 782, 470, 124);
  drawClock(cv, MX + 482, 782, CW - 482, 124);
  drawAlsoOn(cv);
  drawFooter(cv);
  return encodePNG(W, H, cv.buf);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), render());
