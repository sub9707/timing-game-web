import type { CSSProperties } from 'react';
import type { Box, BuiltinId, EditId, Item, KeyHintStage, Phase, Settings, StagePreview } from '../types';
import { tr } from '../i18n';

export const DEFAULT_BOX: Box = { x: 0, y: 0, w: 100, h: 100, r: 0, z: 0, hidden: false, locked: false };

export const BUILTIN_LABELS: Record<BuiltinId, string> = {
  title: tr('메인 타이틀'),
  sub: tr('서브 타이틀'),
  frame: tr('타이머 박스'),
  'result-success': tr('성공 문구'),
  'result-fail': tr('실패 문구'),
  prompt: tr('공개 확인 문구'),
  hint: tr('키 안내 (화면 아래)'),
  player: tr('참가자 이름'),
};

export const BUILTIN_IDS = Object.keys(BUILTIN_LABELS) as BuiltinId[];

export const isItemId = (id: EditId): id is `item:${string}` => id.startsWith('item:');
export const itemIdOf = (itemId: string): EditId => `item:${itemId}`;

/** 지금 설정에 있는 모든 편집 요소 (기본 + 삽입) */
export const editIds = (s: Settings): EditId[] => [...BUILTIN_IDS, ...s.items.map((i) => itemIdOf(i.id))];

export const itemOf = (s: Settings, id: EditId): Item | undefined => (isItemId(id) ? s.items.find((i) => i.id === id.slice(5)) : undefined);

export function labelOf(s: Settings, id: EditId) {
  if (!isItemId(id)) return BUILTIN_LABELS[id];
  return itemOf(s, id)?.name ?? tr('삭제된 요소');
}

/** 결과 자리에 놓이는 요소는 그 상태를 화면에 띄워야 보임 */
export const PREVIEW_FOR: Partial<Record<EditId, StagePreview>> = {
  'result-success': 'result',
  'result-fail': 'result-fail',
  prompt: 'confirm',
};

/** 텍스트 요소의 문구 필드 */
export const TEXT_FIELD: Partial<Record<EditId, 'mainTitle' | 'subTitle' | 'successText' | 'failText' | 'revealPrompt'>> = {
  title: 'mainTitle',
  sub: 'subTitle',
  'result-success': 'successText',
  'result-fail': 'failText',
  prompt: 'revealPrompt',
};

/** 화면 위 글자 편집이 되는 요소 (키 안내는 지금 상태의 문구, 텍스트 상자는 그 글자) */
export const canEditText = (id: EditId, s?: Settings) => !!TEXT_FIELD[id] || id === 'hint' || (!!s && itemOf(s, id)?.type === 'text');

/** 게임 상태 → 키 안내 문구 */
export const keyHintStage = (phase: Phase): KeyHintStage =>
  phase === 'idle' || phase === 'countdown' ? 'start' : phase === 'running' ? 'stop' : phase === 'result' ? 'reset' : 'reveal';

const pickBox = (b: Box): Box => ({ x: b.x, y: b.y, w: b.w, h: b.h, r: b.r, z: b.z, hidden: b.hidden, locked: b.locked });

export function getBox(s: Settings, id: EditId): Box {
  if (isItemId(id)) {
    const it = itemOf(s, id);
    return it ? pickBox(it) : { ...DEFAULT_BOX };
  }
  switch (id) {
    case 'result-success':
    case 'result-fail':
      return pickBox(s.resultStyle[id === 'result-success' ? 'success' : 'fail']);
    case 'prompt':
      return pickBox(s.revealPromptStyle);
    default:
      return s.layout[id];
  }
}

export function setBox(s: Settings, id: EditId, box: Box): Settings {
  if (isItemId(id)) {
    const key = id.slice(5);
    return { ...s, items: s.items.map((i) => (i.id === key ? { ...i, ...box } : i)) };
  }
  switch (id) {
    case 'result-success':
    case 'result-fail': {
      const key = id === 'result-success' ? 'success' : 'fail';
      return { ...s, resultStyle: { ...s.resultStyle, [key]: { ...s.resultStyle[key], ...box } } };
    }
    case 'prompt':
      return { ...s, revealPromptStyle: { ...s.revealPromptStyle, ...box } };
    default:
      return { ...s, layout: { ...s.layout, [id]: box } };
  }
}

export const patchBoxes = (s: Settings, ids: EditId[], fn: (b: Box, id: EditId) => Partial<Box>) =>
  ids.reduce((acc, id) => {
    const b = getBox(acc, id);
    return setBox(acc, id, { ...b, ...fn(b, id) });
  }, s);

/**
 * 배치를 CSS 로 — 이동은 무대 크기 비율(cqw/cqh, 고정 화면 비율·줌과 무관하게 같은 자리),
 * 배율·회전은 가운데 기준. showHidden: 화면 편집에서 숨긴 요소를 반투명으로
 */
export function boxStyle(b: Box, showHidden = false): CSSProperties {
  return {
    translate: b.x || b.y ? `${b.x}cqw ${b.y}cqh` : undefined,
    scale: b.w !== 100 || b.h !== 100 ? `${b.w / 100} ${b.h / 100}` : undefined,
    rotate: b.r ? `${b.r}deg` : undefined,
    zIndex: b.z || undefined,
    visibility: b.hidden && !showHidden ? 'hidden' : undefined,
    opacity: b.hidden && showHidden ? 0.3 : undefined,
  };
}

export const round2 = (v: number) => Math.round(v * 100) / 100;

/** -180 ~ 180 으로 */
export const normDeg = (d: number) => {
  const v = ((((d + 180) % 360) + 360) % 360) - 180;
  return Math.round(v * 10) / 10;
};

/** 고유 id */
export const uid = () => Math.random().toString(36).slice(2, 9);

/* ───────── 화면 측정 (편집기·맞춤 공용) ───────── */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Geo {
  /** 화면상 중심 */
  cx: number;
  cy: number;
  /** 회전 전 실제 크기 (배율·줌 적용) */
  w: number;
  h: number;
  r: number;
  /** 회전까지 포함한 바깥 사각형 */
  bb: Rect;
}

export const elOf = (id: EditId) => document.querySelector<HTMLElement>(`[data-edit-id="${id}"]`);

/** 무대 요소가 화면에 그려지는 배율 (화면 편집 줌) */
function zoomOf(el: HTMLElement) {
  const st = el.closest<HTMLElement>('.stage');
  if (!st || !st.offsetWidth) return 1;
  return st.getBoundingClientRect().width / st.offsetWidth;
}

export function measure(id: EditId, box: Box): Geo | null {
  const el = elOf(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const z = zoomOf(el);
  return {
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    w: (el.offsetWidth * box.w * z) / 100,
    h: (el.offsetHeight * box.h * z) / 100,
    r: box.r,
    bb: { left: r.left, top: r.top, width: r.width, height: r.height },
  };
}

/** 화면 비율 틀(캔버스) — 맞춤·가운데 가이드 기준 */
export function canvasRect(): Rect {
  const r = (document.querySelector('.canvas') ?? document.querySelector('.stage'))?.getBoundingClientRect();
  return r ? { left: r.left, top: r.top, width: r.width, height: r.height } : { left: 0, top: 0, width: innerWidth, height: innerHeight };
}
/** 예전 이름 */
export const stageRect = canvasRect;

/** 이동 단위: 무대 내용 영역 1% 가 화면에서 몇 px 인지 (cqw/cqh 와 같은 기준, 줌 반영) */
export function stageUnit() {
  const el = document.querySelector<HTMLElement>('.stage');
  if (!el) return { w: innerWidth / 100, h: innerHeight / 100 };
  const cs = getComputedStyle(el);
  const z = el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1;
  const w = (el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * z;
  const h = (el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) * z;
  return { w: w / 100, h: h / 100 };
}

export function unionRect(rects: Rect[]): Rect {
  const l = Math.min(...rects.map((r) => r.left));
  const t = Math.min(...rects.map((r) => r.top));
  const rr = Math.max(...rects.map((r) => r.left + r.width));
  const b = Math.max(...rects.map((r) => r.top + r.height));
  return { left: l, top: t, width: rr - l, height: b - t };
}

/** 픽셀 이동 → 박스 이동 (무대 비율 %) */
export const shiftBox = (b: Box, dxPx: number, dyPx: number, unit = stageUnit()): Partial<Box> => ({
  x: round2(b.x + dxPx / unit.w),
  y: round2(b.y + dyPx / unit.h),
});

/* ───────── 맞춤 · 배분 (파워포인트: 하나면 화면 기준, 여럿이면 선택 영역 기준) ───────── */

export type AlignKind = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'dist-h' | 'dist-v';

export function alignBoxes(s: Settings, ids: EditId[], kind: AlignKind): Settings {
  const items = ids
    .map((id) => {
      const box = getBox(s, id);
      const g = measure(id, box);
      return g && !box.locked ? { id, box, bb: g.bb } : null;
    })
    .filter((v): v is { id: EditId; box: Box; bb: Rect } => !!v);
  if (!items.length) return s;

  const moves = new Map<EditId, [number, number]>();
  if (kind === 'dist-h' || kind === 'dist-v') {
    if (items.length < 3) return s;
    const h = kind === 'dist-h';
    const pos = (r: Rect) => (h ? r.left : r.top);
    const size = (r: Rect) => (h ? r.width : r.height);
    const sorted = [...items].sort((a, b) => pos(a.bb) - pos(b.bb));
    const first = sorted[0].bb;
    const last = sorted[sorted.length - 1].bb;
    const span = pos(last) + size(last) - pos(first);
    const gap = (span - sorted.reduce((sum, i) => sum + size(i.bb), 0)) / (sorted.length - 1);
    let cursor = pos(first);
    for (const it of sorted) {
      const d = cursor - pos(it.bb);
      moves.set(it.id, h ? [d, 0] : [0, d]);
      cursor += size(it.bb) + gap;
    }
  } else {
    const ref = items.length === 1 ? canvasRect() : unionRect(items.map((i) => i.bb));
    for (const { id, bb } of items) {
      const dx =
        kind === 'left' ? ref.left - bb.left : kind === 'right' ? ref.left + ref.width - (bb.left + bb.width) : kind === 'center' ? ref.left + ref.width / 2 - (bb.left + bb.width / 2) : 0;
      const dy =
        kind === 'top' ? ref.top - bb.top : kind === 'bottom' ? ref.top + ref.height - (bb.top + bb.height) : kind === 'middle' ? ref.top + ref.height / 2 - (bb.top + bb.height / 2) : 0;
      moves.set(id, [dx, dy]);
    }
  }
  const unit = stageUnit();
  return patchBoxes(s, [...moves.keys()], (b, id) => shiftBox(b, ...moves.get(id)!, unit));
}

/* ───────── 겹침 순서 ───────── */

export type OrderKind = 'front' | 'back' | 'forward' | 'backward';

/** 뒤 → 앞 순서 */
export const stackOrder = (s: Settings) =>
  editIds(s)
    .map((id, i) => ({ id, z: getBox(s, id).z, i }))
    .sort((a, b) => a.z - b.z || a.i - b.i)
    .map((v) => v.id);

export function reorder(s: Settings, ids: EditId[], kind: OrderKind): Settings {
  let order = stackOrder(s);
  const sel = new Set(ids);
  if (kind === 'front') order = [...order.filter((id) => !sel.has(id)), ...order.filter((id) => sel.has(id))];
  else if (kind === 'back') order = [...order.filter((id) => sel.has(id)), ...order.filter((id) => !sel.has(id))];
  else if (kind === 'forward') {
    for (let i = order.length - 2; i >= 0; i--) if (sel.has(order[i]) && !sel.has(order[i + 1])) [order[i], order[i + 1]] = [order[i + 1], order[i]];
  } else {
    for (let i = 1; i < order.length; i++) if (sel.has(order[i]) && !sel.has(order[i - 1])) [order[i], order[i - 1]] = [order[i - 1], order[i]];
  }
  return setOrder(s, order);
}

/** 뒤 → 앞 순서대로 z 다시 매기기 (선택 창 드래그 정렬) */
export const setOrder = (s: Settings, order: EditId[]) => patchBoxes(s, order, (_, id) => ({ z: order.indexOf(id) + 1 }));

/* ───────── 그룹 ───────── */

export const groupOf = (s: Settings, id: EditId) => s.groups.find((g) => g.members.includes(id));

/** 선택을 그룹 단위로 넓힘 */
export const expandGroups = (s: Settings, ids: EditId[]) => [...new Set(ids.flatMap((id) => groupOf(s, id)?.members ?? [id]))];
