// 화면 편집 계산 — 포함 판정 · 커서 · 스냅 · 간격 · 기준 px
import type { Geo, Rect } from '../../design/layout';
import type { CanvasAspect } from '../../types';

export const SNAP_PX = 6;
export const MIN_PX = 12;
export const GRID_PX = 20;

/** 핸들: 가로(-1 왼쪽 · 0 · 1 오른쪽) × 세로 */
export const HANDLES: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
];

/** 회전된 상태에서도 핸들 방향에 맞는 커서 */
export function handleCursor(hx: number, hy: number, r: number) {
  const a = ((((Math.atan2(hy, hx) * 180) / Math.PI + r) % 180) + 180) % 180;
  const i = Math.round(a / 45) % 4;
  return ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'][i];
}

export const isInside = (g: Geo, x: number, y: number, pad = 4) => {
  const rad = (-g.r * Math.PI) / 180;
  const dx = x - g.cx;
  const dy = y - g.cy;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(lx) <= g.w / 2 + pad && Math.abs(ly) <= g.h / 2 + pad;
};

export const geoKey = (g?: Geo) => (g ? `${Math.round(g.cx)},${Math.round(g.cy)},${Math.round(g.w)},${Math.round(g.h)},${g.r}` : '-');

/** 여러 가장자리 중 후보선과 가장 가까운 것 (허용 거리 안) */
export function nearest(edges: number[], cands: number[], tol = SNAP_PX) {
  let m: { delta: number; pos: number } | null = null;
  for (const e of edges)
    for (const c of cands) {
      const delta = c - e;
      if (Math.abs(delta) <= tol && (!m || Math.abs(delta) < Math.abs(m.delta))) m = { delta, pos: c };
    }
  return m;
}

/** 화면 비율별 기준 크기 (px 표시 · 눈금자) — free 는 실제 화면 크기 */
const BASE_W: Record<CanvasAspect, number | null> = { free: null, '16:9': 1920, '9:16': 1080, '4:3': 1440, '1:1': 1080, '21:9': 2520 };

/** 화면 1px 이 기준 몇 px 인지 */
export function basePerScreenPx(aspect: CanvasAspect, canvas: Rect, zoom: number) {
  const base = BASE_W[aspect];
  return base ? base / canvas.width : 1 / zoom;
}

export interface Gap {
  axis: 'x' | 'y';
  /** 선의 시작·끝 (화면 px) 과 다른 축 위치 */
  from: number;
  to: number;
  at: number;
}

/** 옮기는 묶음과 이웃 요소 사이 간격 (위·아래·왼쪽·오른쪽 가장 가까운 것) */
export function gapsAround(bb: Rect, others: Rect[]): Gap[] {
  const out: Gap[] = [];
  const cx = bb.left + bb.width / 2;
  const cy = bb.top + bb.height / 2;
  const overlapY = (o: Rect) => o.top < bb.top + bb.height && o.top + o.height > bb.top;
  const overlapX = (o: Rect) => o.left < bb.left + bb.width && o.left + o.width > bb.left;
  const pick = (cands: { d: number; g: Gap }[]) => cands.filter((c) => c.d > 0.5).sort((a, b) => a.d - b.d)[0]?.g;
  const left = pick(others.filter(overlapY).map((o) => ({ d: bb.left - (o.left + o.width), g: { axis: 'x' as const, from: o.left + o.width, to: bb.left, at: cy } })));
  const right = pick(others.filter(overlapY).map((o) => ({ d: o.left - (bb.left + bb.width), g: { axis: 'x' as const, from: bb.left + bb.width, to: o.left, at: cy } })));
  const up = pick(others.filter(overlapX).map((o) => ({ d: bb.top - (o.top + o.height), g: { axis: 'y' as const, from: o.top + o.height, to: bb.top, at: cx } })));
  const down = pick(others.filter(overlapX).map((o) => ({ d: o.top - (bb.top + bb.height), g: { axis: 'y' as const, from: bb.top + bb.height, to: o.top, at: cx } })));
  for (const g of [left, right, up, down]) if (g) out.push(g);
  return out;
}

/** 눈금 간격 — 화면에서 50px 이상 벌어지는 가장 작은 단위 */
export function rulerStep(basePerPx: number) {
  for (const s of [5, 10, 20, 50, 100, 200, 500, 1000]) if (s / basePerPx >= 50) return s;
  return 2000;
}
