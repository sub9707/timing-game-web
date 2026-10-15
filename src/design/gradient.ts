import { mixColor } from './color';
import type { Gradient, GradientStop } from '../types';

export const MIN_STOPS = 2;
export const MAX_STOPS = 10;

/** 색 목록을 균등 간격 정지점으로 */
export const evenStops = (colors: string[]): GradientStop[] =>
  colors.map((color, i) => ({ color, pos: colors.length < 2 ? 0 : Math.round((i / (colors.length - 1)) * 100) }));

export const DEFAULT_GRADIENT: Gradient = {
  type: 'linear',
  angle: 180,
  shape: 'circle',
  cx: 50,
  cy: 50,
  repeat: false,
  stops: evenStops(['#ffffff', '#8a8a8a']),
};

export const linear = (colors: string[], angle = 180, extra?: Partial<Gradient>): Gradient => ({
  ...DEFAULT_GRADIENT,
  angle,
  stops: evenStops(colors),
  ...extra,
});

export const radial = (colors: string[], extra?: Partial<Gradient>): Gradient => ({
  ...DEFAULT_GRADIENT,
  type: 'radial',
  stops: evenStops(colors),
  ...extra,
});

export const sortStops = (stops: GradientStop[]) => [...stops].sort((a, b) => a.pos - b.pos);

export function gradientCss(g: Gradient) {
  const stops = sortStops(g.stops)
    .map((s) => `${s.color} ${s.pos}%`)
    .join(', ');
  const rep = g.repeat ? 'repeating-' : '';
  if (g.type === 'radial') return `${rep}radial-gradient(${g.shape} at ${g.cx}% ${g.cy}%, ${stops})`;
  if (g.type === 'conic') return `${rep}conic-gradient(from ${g.angle}deg at ${g.cx}% ${g.cy}%, ${stops})`;
  return `${rep}linear-gradient(${g.angle}deg, ${stops})`;
}

/** 정지점 색만 왼→오로 보여주는 막대 (편집기 트랙용) */
export const stopsBarCss = (stops: GradientStop[]) =>
  `linear-gradient(90deg, ${sortStops(stops)
    .map((s) => `${s.color} ${s.pos}%`)
    .join(', ')})`;

/** pos(0~100) 지점의 색 — 정지점 추가 시 사용 */
export function colorAt(stops: GradientStop[], pos: number) {
  const s = sortStops(stops);
  if (pos <= s[0].pos) return s[0].color;
  for (let i = 1; i < s.length; i++) {
    if (pos <= s[i].pos) {
      const span = s[i].pos - s[i - 1].pos || 1;
      return mixColor(s[i - 1].color, s[i].color, (pos - s[i - 1].pos) / span);
    }
  }
  return s.at(-1)!.color;
}

/** 글로우 등 한 색이 필요할 때 대표색 */
export const firstColor = (g: Gradient) => sortStops(g.stops)[0]?.color ?? '#ffffff';

/** 이전 버전 저장값(문자열 정지점, 각도만 있던 선형) 호환 */
export function normalizeGradient(saved: unknown, base: Gradient): Gradient {
  if (!saved || typeof saved !== 'object') return structuredClone(base);
  const g = saved as Partial<Gradient> & { stops?: (string | GradientStop)[] };
  const raw = Array.isArray(g.stops) && g.stops.length >= MIN_STOPS ? g.stops : base.stops;
  const stops = raw.every((s) => typeof s === 'string')
    ? evenStops(raw as string[])
    : (raw as GradientStop[]).filter((s) => s && typeof s.color === 'string').map((s) => ({ color: s.color, pos: Number(s.pos) || 0 }));
  return {
    ...base,
    ...g,
    // 예전 원형 배경은 중심이 살짝 위(42%)였음
    cy: g.cy ?? (g.type === 'radial' && g.cx === undefined ? 42 : base.cy),
    stops: stops.length >= MIN_STOPS ? stops : structuredClone(base.stops),
  };
}
