// 색 변환 유틸 — 앱 안의 색은 모두 #rrggbb 또는 #rrggbbaa (투명도 포함)

export interface Rgba {
  r: number;
  g: number;
  b: number;
  /** 0~1 */
  a: number;
}

export interface Hsva {
  /** 0~360 */
  h: number;
  /** 0~1 */
  s: number;
  v: number;
  a: number;
}

export function parseHex(input: string): Rgba | null {
  let hex = input.trim().replace(/^#/, '');
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  if (hex.length === 3 || hex.length === 4) hex = [...hex].map((c) => c + c).join('');
  if (hex.length !== 6 && hex.length !== 8) return null;
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? n(6) / 255 : 1 };
}

const h2 = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');

export function toHex({ r, g, b, a }: Rgba) {
  return `#${h2(r)}${h2(g)}${h2(b)}${a < 1 ? h2(a * 255) : ''}`;
}

export function rgbToHsv({ r, g, b, a }: Rgba): Hsva {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const d = max - Math.min(R, G, B);
  let h = 0;
  if (d) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? d / max : 0, v: max, a };
}

export function hsvToRgb({ h, s, v, a }: Hsva): Rgba {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };
  return { r: f(5), g: f(3), b: f(1), a };
}

/** 같은 색인지 (대소문자·#rgb 축약 무시) */
export function sameColor(a: string, b: string) {
  const x = parseHex(a);
  const y = parseHex(b);
  return !!x && !!y && toHex(x) === toHex(y);
}

export const alphaOf = (c: string) => parseHex(c)?.a ?? 1;

export function withAlpha(c: string, a: number) {
  const rgba = parseHex(c);
  return rgba ? toHex({ ...rgba, a: Math.min(1, Math.max(0, a)) }) : c;
}

/** 두 색 사이 t(0~1) 지점 색 */
export function mixColor(a: string, b: string, t: number) {
  const x = parseHex(a);
  const y = parseHex(b);
  if (!x || !y) return a;
  const l = (p: number, q: number) => p + (q - p) * t;
  return toHex({ r: l(x.r, y.r), g: l(x.g, y.g), b: l(x.b, y.b), a: l(x.a, y.a) });
}

function hsl(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const A = s * Math.min(l, 1 - l);
  const f = (n: number) => (l - A * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) * 255;
  return toHex({ r: f(0), g: f(8), b: f(4), a: 1 });
}

/** 팔레트: 열마다 한 색상, 위에서 아래로 밝은 → 어두운 (오피스 색 표와 같은 배치) */
const HUES = [0, 24, 45, 90, 150, 180, 205, 230, 265, 300, 330];
export const PALETTE_ROWS: string[][] = [
  // 무채색
  ['#ffffff', '#e5e5e5', '#cccccc', '#b3b3b3', '#999999', '#808080', '#666666', '#4d4d4d', '#333333', '#1a1a1a', '#000000'],
  ...[0.88, 0.76, 0.62, 0.5, 0.38, 0.26].map((l) => HUES.map((h) => hsl(h, l > 0.8 ? 0.9 : 0.85, l))),
];
