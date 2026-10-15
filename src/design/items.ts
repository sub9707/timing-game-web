// 삽입 요소 만들기·복사·붙여넣기·삭제 · 서식 복사 · 그룹
import { NO_TEXT_FX } from '../settings/themes';
import { putAsset } from '../storage/assets';
import { imageSize, optimizeImage } from '../storage/optimize';
import type { Box, EditId, Fill, ImageItem, Item, Settings, ShapeItem, ShapeKind, TextItem } from '../types';
import { DEFAULT_BOX, getBox, groupOf, isItemId, itemIdOf, itemOf, patchBoxes, stackOrder, uid } from './layout';
import { tr } from '../i18n';

const solidFill = (color: string): Fill => ({
  mode: 'solid',
  color,
  type: 'linear',
  angle: 90,
  shape: 'circle',
  cx: 50,
  cy: 50,
  repeat: false,
  stops: [
    { color, pos: 0 },
    { color: '#8a8a8a', pos: 100 },
  ],
});

/** 새 요소는 맨 앞에 */
const topZ = (s: Settings) => Math.max(0, ...stackOrder(s).map((id) => getBox(s, id).z)) + 1;

const nameFor = (s: Settings, base: string) => {
  const n = s.items.filter((i) => i.name.startsWith(base)).length + 1;
  return `${base} ${n}`;
};

export function newTextItem(s: Settings, text = tr('텍스트를 입력하세요')): TextItem {
  return {
    ...DEFAULT_BOX,
    z: topZ(s),
    id: uid(),
    type: 'text',
    name: nameFor(s, tr('텍스트')),
    opacity: 100,
    text,
    font: s.design.titleFont,
    weight: Math.min(700, s.design.titleWeight),
    italic: false,
    size: 3.2,
    fill: s.design.titleFill.mode === 'solid' ? solidFill(s.text) : structuredClone(s.design.titleFill),
    align: 'center',
    fx: { ...NO_TEXT_FX },
  };
}

const SHAPE_NAMES: Record<ShapeKind, string> = { rect: tr('사각형'), ellipse: tr('원'), triangle: tr('삼각형'), line: tr('선'), star: tr('별') };

export function newShapeItem(s: Settings, shape: ShapeKind): ShapeItem {
  const isLine = shape === 'line';
  return {
    ...DEFAULT_BOX,
    z: topZ(s),
    id: uid(),
    type: 'shape',
    name: nameFor(s, SHAPE_NAMES[shape]),
    opacity: 100,
    shape,
    width: isLine ? 24 : 14,
    height: isLine ? 0 : 14,
    fill: solidFill(s.accent),
    stroke: isLine ? 4 : 0,
    strokeColor: isLine ? s.accent : '#ffffff',
    radius: 12,
  };
}

/** 그림 파일 고르기 (취소하면 null) */
export function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/** 그림 파일 → 에셋 저장 후 그림 요소 */
export async function newImageItem(s: Settings, file: Blob, name?: string): Promise<ImageItem | null> {
  const blob = await optimizeImage(file);
  const id = uid();
  const asset = `img:${id}`;
  if (!(await putAsset(asset, blob, 'load'))) return null;
  const { w, h } = await imageSize(blob);
  // 가로로 긴 그림은 넓게, 세로로 긴 그림은 좁게 (기본 높이가 무대의 약 30%)
  const width = Math.max(6, Math.min(40, (30 * w) / Math.max(1, h)));
  return {
    ...DEFAULT_BOX,
    z: topZ(s),
    id,
    type: 'image',
    name: name?.replace(/\.[^.]+$/, '') || nameFor(s, tr('그림')),
    opacity: 100,
    asset,
    width: Math.round(width * 10) / 10,
    radius: 0,
  };
}

export const addItems = (s: Settings, items: Item[]): Settings => ({ ...s, items: [...s.items, ...items] });

/** 삭제 — 삽입 요소는 지우고 기본 요소는 숨김 (기본 요소는 없앨 수 없음) */
export function deleteSelected(s: Settings, ids: EditId[]): Settings {
  const del = new Set(ids.filter(isItemId).map((id) => id.slice(5)));
  const builtins = ids.filter((id) => !isItemId(id));
  let next: Settings = { ...s, items: s.items.filter((i) => !del.has(i.id)) };
  next = patchBoxes(next, builtins, () => ({ hidden: true }));
  // 비게 된 그룹 정리
  const gone = new Set<EditId>(ids.filter(isItemId));
  next = { ...next, groups: next.groups.map((g) => ({ ...g, members: g.members.filter((m) => !gone.has(m)) })).filter((g) => g.members.length > 1) };
  return next;
}

/* ───── 클립보드 (삽입 요소만 복사 가능) ───── */

let clipboard: Item[] = [];

export function copyItems(s: Settings, ids: EditId[]) {
  clipboard = ids.map((id) => itemOf(s, id)).filter((i): i is Item => !!i).map((i) => structuredClone(i));
  return clipboard.length;
}

export const hasClipboard = () => clipboard.length > 0;

/** 붙여넣기·복제 — 살짝 비켜서 새 id 로 (그림 에셋은 같은 파일을 공유) */
export function pasteItems(s: Settings, items: Item[] = clipboard, offset = 2): { settings: Settings; ids: EditId[] } {
  let z = topZ(s);
  const copies = items.map((i) => ({ ...structuredClone(i), id: uid(), name: tr('{0} 복사본', i.name), x: i.x + offset, y: i.y + offset, z: z++ }));
  return { settings: addItems(s, copies), ids: copies.map((c) => itemIdOf(c.id)) };
}

export function duplicateItems(s: Settings, ids: EditId[]) {
  const items = ids.map((id) => itemOf(s, id)).filter((i): i is Item => !!i);
  return pasteItems(s, items);
}

/* ───── 서식 복사 (Ctrl+Shift+C / V) ───── */

interface Format {
  box: Pick<Box, 'w' | 'h' | 'r'>;
  item?: Partial<Item>;
  type?: Item['type'];
}

let painter: Format | null = null;

export function copyFormat(s: Settings, id: EditId) {
  const b = getBox(s, id);
  const it = itemOf(s, id);
  let style: Partial<Item> | undefined;
  if (it?.type === 'text') {
    const { font, weight, italic, size, fill, align, fx, opacity } = it;
    style = { font, weight, italic, size, fill, align, fx, opacity } as Partial<TextItem>;
  } else if (it?.type === 'shape') {
    const { fill, stroke, strokeColor, radius, opacity } = it;
    style = { fill, stroke, strokeColor, radius, opacity } as Partial<ShapeItem>;
  } else if (it?.type === 'image') {
    const { radius, opacity } = it;
    style = { radius, opacity } as Partial<ImageItem>;
  }
  painter = { box: { w: b.w, h: b.h, r: b.r }, item: style ? structuredClone(style) : undefined, type: it?.type };
}

export const hasFormat = () => !!painter;

/** 같은 종류면 모양까지, 아니면 크기·회전만 */
export function pasteFormat(s: Settings, ids: EditId[]): Settings {
  if (!painter) return s;
  const p = painter;
  let next = patchBoxes(s, ids, () => ({ ...p.box }));
  next = {
    ...next,
    items: next.items.map((i) => (ids.includes(itemIdOf(i.id)) && p.item && p.type === i.type ? ({ ...i, ...structuredClone(p.item) } as Item) : i)),
  };
  return next;
}

/* ───── 그룹 ───── */

export function groupSelected(s: Settings, ids: EditId[]): Settings {
  if (ids.length < 2) return s;
  // 이미 다른 그룹에 있던 요소는 빼서 새 그룹으로
  const groups = s.groups.map((g) => ({ ...g, members: g.members.filter((m) => !ids.includes(m)) })).filter((g) => g.members.length > 1);
  return { ...s, groups: [...groups, { id: uid(), members: [...ids] }] };
}

export function ungroupSelected(s: Settings, ids: EditId[]): Settings {
  const hit = new Set(ids.map((id) => groupOf(s, id)?.id).filter(Boolean));
  return { ...s, groups: s.groups.filter((g) => !hit.has(g.id)) };
}
