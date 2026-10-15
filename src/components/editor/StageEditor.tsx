// 화면 직접 편집 (파워포인트식)
// 선택(클릭·Shift/Ctrl·영역·그룹) · 이동 · 크기(하나·여러 개) · 회전 · 스냅(가이드·안내선·눈금) · 간격 표시
// · 줌/이동 · 눈금자·안내선 · 클립보드 · 서식 복사 · 그룹 · 우클릭 메뉴 · 단축키
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { copyFormat, copyItems, deleteSelected, duplicateItems, groupSelected, hasClipboard, hasFormat, pasteFormat, pasteItems, ungroupSelected } from '../../design/items';
import {
  alignBoxes,
  canEditText,
  canvasRect,
  editIds,
  expandGroups,
  getBox,
  groupOf,
  isItemId,
  labelOf,
  measure,
  normDeg,
  patchBoxes,
  reorder,
  shiftBox,
  stackOrder,
  stageUnit,
  unionRect,
  type Geo,
  type Rect,
} from '../../design/layout';
import type { HistoryApi } from '../../hooks/useHistory';
import type { Box, EditId, Settings } from '../../types';
import { EditorMenu, type EditView, type InsertKind, type MenuState } from './EditorMenu';
import { basePerScreenPx, gapsAround, geoKey, GRID_PX, handleCursor, HANDLES, isInside, MIN_PX, nearest, rulerStep, type Gap } from './geometry';
import { tr } from '../../i18n';

export type { EditView } from './EditorMenu';
export { ALIGN_LABEL } from './EditorMenu';
export { GRID_PX } from './geometry';

export interface Zoom {
  z: number;
  x: number;
  y: number;
}

interface Props {
  settings: Settings;
  onChange: (updater: (s: Settings) => Settings) => void;
  selected: EditId[];
  onSelect: (ids: EditId[]) => void;
  /** 텍스트 요소 더블클릭·Enter → 화면 위에서 바로 글자 편집 */
  onEditText: (id: EditId) => void;
  /** 글자 편집 중인 요소 (그동안 레이어는 마우스를 통과시킴) */
  textEditing: EditId | null;
  onExit: () => void;
  view: EditView;
  onView: (v: EditView) => void;
  /** 다음 변경을 새 실행 취소 단계로 (바꾸기 직전 호출) */
  record: (label?: string) => void;
  history: HistoryApi;
  /** 드래그로 옮기기·크기·회전 중인지 (그동안 패널 갱신을 멈춰 프레임 확보) */
  onGesture?: (active: boolean) => void;
  zoom: Zoom;
  onZoom: (z: Zoom) => void;
  /** 삽입 (at: 무대 가운데 기준 위치 %) */
  onInsert: (kind: InsertKind, at?: { x: number; y: number }) => void;
}

type Guide = { axis: 'x' | 'y'; pos: number; strong: boolean };

type Drag =
  | { kind: 'move'; ids: EditId[]; boxes: Map<EditId, Box>; bb0: Rect; startX: number; startY: number; started: boolean }
  | { kind: 'resize'; id: EditId; hx: number; hy: number; box0: Box; g0: Geo; startX: number; startY: number; started: boolean }
  | {
      kind: 'gresize';
      ids: EditId[];
      boxes: Map<EditId, Box>;
      geos: Map<EditId, Geo>;
      bb0: Rect;
      hx: number;
      hy: number;
      startX: number;
      startY: number;
      started: boolean;
    }
  | { kind: 'rotate'; id: EditId; box0: Box; g0: Geo; a0: number; started: boolean }
  | { kind: 'marquee'; startX: number; startY: number; x: number; y: number; additive: boolean; base: EditId[] }
  | { kind: 'pan'; startX: number; startY: number; z0: Zoom }
  | { kind: 'guide'; axis: 'x' | 'y'; index: number | null; pos: number };

const ZOOMS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.25, 1.5, 2, 3, 4];
const clampZoom = (z: number) => Math.min(4, Math.max(0.25, z));

export function StageEditor(props: Props) {
  const { settings, onChange, selected, onSelect, onEditText, textEditing, onExit, view, onView, record, history, onGesture, zoom, onZoom, onInsert } = props;

  /* ───── 요소 위치 측정 — 바뀔 때만 (매 프레임 강제 레이아웃을 피함) ───── */
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const viewRef = useRef(view);
  viewRef.current = view;
  const [geos, setGeos] = useState<Partial<Record<EditId, Geo>>>({});
  const [canvas, setCanvas] = useState<Rect>(canvasRect);
  const lastKey = useRef('');
  const frames = useRef(0);
  const raf = useRef(0);

  const measureNow = () => {
    const s = settingsRef.current;
    const next: Partial<Record<EditId, Geo>> = {};
    for (const id of editIds(s)) {
      const box = getBox(s, id);
      if (box.hidden && !viewRef.current.showHidden) continue;
      const g = measure(id, box);
      if (g) next[id] = g;
    }
    const cr = canvasRect();
    const key = Object.keys(next).map((id) => `${id}:${geoKey(next[id as EditId])}`).join('|') + `|${Math.round(cr.left)},${Math.round(cr.top)},${Math.round(cr.width)},${Math.round(cr.height)}`;
    if (key !== lastKey.current) {
      lastKey.current = key;
      setGeos(next);
      setCanvas(cr);
    }
  };

  /** 앞으로 n 프레임 동안 다시 잼 (전환·등장 애니메이션이 끝날 때까지) — 여러 번 불러도 루프는 하나 */
  const schedule = (n: number) => {
    frames.current = Math.max(frames.current, n);
    if (raf.current) return;
    const loop = () => {
      measureNow();
      frames.current -= 1;
      raf.current = frames.current > 0 ? requestAnimationFrame(loop) : 0;
    };
    raf.current = requestAnimationFrame(loop);
  };
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;

  // 설정·줌·보기 옵션이 바뀌면 다시 잼
  useEffect(() => scheduleRef.current(2), [settings, zoom, view.showHidden]);

  useEffect(() => {
    const again = (n: number) => () => scheduleRef.current(n);
    // 편집 시작 직후 패널이 열리며 무대가 비켜서는 동안
    scheduleRef.current(36);
    const stageEl = document.querySelector('.stage');
    // 결과·공개 문구가 나타나고 사라질 때 (등장 애니메이션 포함)
    const mo = new MutationObserver(again(36));
    if (stageEl) mo.observe(stageEl, { childList: true, subtree: true, characterData: true });
    const ro = new ResizeObserver(again(2));
    if (stageEl) ro.observe(stageEl);
    const onResize = again(2);
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(again(2));
    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, []);
  const geosRef = useRef(geos);
  geosRef.current = geos;

  const ccx = canvas.left + canvas.width / 2;
  const ccy = canvas.top + canvas.height / 2;
  const bpp = basePerScreenPx(settings.canvas.aspect, canvas, zoom.z);
  /** 직접 만든 안내선 (화면 px) */
  const guideX = settings.guides.x.map((v) => canvas.left + (v / 100) * canvas.width);
  const guideY = settings.guides.y.map((v) => canvas.top + (v / 100) * canvas.height);

  /** 앞에 있는 것부터 */
  const hitOrder = () => stackOrder(settingsRef.current).reverse();
  const hitTest = (x: number, y: number) => hitOrder().find((id) => geos[id] && isInside(geos[id]!, x, y)) ?? null;
  const movable = (ids: EditId[]) => ids.filter((id) => !getBox(settingsRef.current, id).locked && geosRef.current[id]);

  /* ───── 동작 ───── */
  const act = (label: string, fn: (s: Settings) => Settings) => {
    record(label);
    onChange(fn);
  };
  const single = selected.length === 1 ? selected[0] : null;
  const singleBox = single ? getBox(settings, single) : null;
  const hasItems = selected.some(isItemId);
  const grouped = selected.length > 1 && !!groupOf(settings, selected[0]) && selected.every((id) => groupOf(settings, id)?.id === groupOf(settings, selected[0])?.id);
  const allLocked = selected.length > 0 && selected.every((id) => getBox(settings, id).locked);

  const doCopy = () => copyItems(settingsRef.current, selected);
  const doPaste = () => {
    if (!hasClipboard()) return;
    // 지금 설정에서 결과를 먼저 계산해 새 요소를 바로 선택
    const r = pasteItems(settingsRef.current);
    record(tr('붙여넣기'));
    onChange(() => r.settings);
    onSelect(r.ids);
  };
  const doDuplicate = () => {
    const r = duplicateItems(settingsRef.current, selected);
    if (!r.ids.length) return;
    record(tr('복제'));
    onChange(() => r.settings);
    onSelect(r.ids);
  };
  const doDelete = () => {
    act(hasItems ? tr('삭제') : tr('숨기기'), (s) => deleteSelected(s, selected));
    onSelect([]);
  };
  const doCut = () => {
    doCopy();
    doDelete();
  };
  const toggleLock = () => act(allLocked ? tr('잠금 해제') : tr('잠금'), (s) => patchBoxes(s, selected, () => ({ locked: !allLocked })));
  const doRotate = (deg: number | null) => act(tr('회전'), (s) => patchBoxes(s, movable(selected), (b) => ({ r: deg === null ? 0 : normDeg(b.r + deg) })));
  const selectAll = () => onSelect(editIds(settingsRef.current).filter((id) => geosRef.current[id]));

  /** 화면 점 → 무대 가운데 기준 위치 % (삽입 위치) */
  const toStage = (x: number, y: number) => {
    const u = stageUnit();
    return { x: Math.round(((x - ccx) / u.w) * 100) / 100, y: Math.round(((y - ccy) / u.h) * 100) / 100 };
  };

  /** 커서 위치를 고정한 채 줌 */
  const zoomAt = (z: number, px = ccx - zoom.x, py = ccy - zoom.y) => {
    const nz = clampZoom(z);
    const area = document.querySelector('.canvas-area')?.getBoundingClientRect();
    const cx = area ? area.left + area.width / 2 : innerWidth / 2;
    const cy = area ? area.top + area.height / 2 : innerHeight / 2;
    const k = nz / zoom.z;
    onZoom({ z: nz, x: px - cx - k * (px - cx - zoom.x), y: py - cy - k * (py - cy - zoom.y) });
  };
  const zoomStep = (dir: 1 | -1) => {
    const next = dir > 0 ? ZOOMS.find((z) => z > zoom.z + 0.001) : [...ZOOMS].reverse().find((z) => z < zoom.z - 0.001);
    zoomAt(next ?? zoom.z);
  };
  const zoomFit = () => onZoom({ z: 1, x: 0, y: 0 });

  /* ───── 마우스 ───── */
  const drag = useRef<Drag | null>(null);
  const spaceDown = useRef(false);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [hover, setHover] = useState<EditId | null>(null);
  const [cursor, setCursor] = useState('default');
  const [active, setActive] = useState<Drag['kind'] | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [draftGuide, setDraftGuide] = useState<{ axis: 'x' | 'y'; pos: number } | null>(null);
  const closeMenu = () => setMenu(null);

  const startGesture = (d: Drag & { started?: boolean }) => {
    if ('started' in d && !d.started) {
      d.started = true;
      record(d.kind === 'move' ? tr('이동') : d.kind === 'rotate' ? tr('회전') : tr('크기 조절'));
      setActive(d.kind);
      onGesture?.(true);
    }
  };

  /** 클릭한 요소의 선택 (그룹은 통째로, 이미 그룹이 선택돼 있으면 그 안의 하나만 — 파워포인트와 같음) */
  const pickTarget = (hit: EditId) => {
    const g = groupOf(settingsRef.current, hit);
    if (!g) return [hit];
    const whole = g.members.every((m) => selected.includes(m));
    return whole && selected.length === g.members.length ? [hit] : g.members;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.edit-menu')) return;
    setMenu(null);
    if (e.button === 2) return; // 우클릭은 메뉴에서
    (document.activeElement as HTMLElement | null)?.blur?.();
    const el = e.currentTarget;
    const capture = () => el.setPointerCapture(e.pointerId);

    // 이동(팬): 가운데 버튼 또는 스페이스 + 드래그
    if (e.button === 1 || (e.button === 0 && spaceDown.current)) {
      e.preventDefault();
      capture();
      drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, z0: zoom };
      setActive('pan');
      return;
    }
    if (e.button !== 0) return;

    // 눈금자에서 끌어 안내선 만들기 · 안내선 옮기기
    const t = e.target as HTMLElement;
    const ruler = t.closest<HTMLElement>('[data-ruler]');
    const guideEl = t.closest<HTMLElement>('[data-guide]');
    if (ruler || guideEl) {
      capture();
      const axis = (ruler?.dataset.ruler ?? guideEl!.dataset.guide) as 'x' | 'y';
      const index = guideEl ? Number(guideEl.dataset.index) : null;
      const pos = axis === 'x' ? e.clientX : e.clientY;
      drag.current = { kind: 'guide', axis, index, pos };
      setDraftGuide({ axis, pos });
      setActive('guide');
      return;
    }

    // 크기·회전 핸들
    const handle = t.closest<HTMLElement>('[data-handle]');
    if (handle) {
      capture();
      if (handle.dataset.handle === 'group') {
        const ids = movable(selected);
        if (!ids.length) return;
        const s = settingsRef.current;
        drag.current = {
          kind: 'gresize',
          ids,
          boxes: new Map(ids.map((id) => [id, getBox(s, id)])),
          geos: new Map(ids.map((id) => [id, geos[id]!])),
          bb0: unionRect(ids.map((id) => geos[id]!.bb)),
          hx: Number(handle.dataset.hx),
          hy: Number(handle.dataset.hy),
          startX: e.clientX,
          startY: e.clientY,
          started: false,
        };
        return;
      }
      if (single && singleBox && geos[single] && !singleBox.locked) {
        const g0 = geos[single]!;
        if (handle.dataset.handle === 'rotate') {
          const a0 = (Math.atan2(e.clientY - g0.cy, e.clientX - g0.cx) * 180) / Math.PI;
          drag.current = { kind: 'rotate', id: single, box0: singleBox, g0, a0, started: false };
        } else {
          drag.current = { kind: 'resize', id: single, hx: Number(handle.dataset.hx), hy: Number(handle.dataset.hy), box0: singleBox, g0, startX: e.clientX, startY: e.clientY, started: false };
        }
      }
      return;
    }

    const hit = hitTest(e.clientX, e.clientY);
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!hit) {
      // 빈 곳: 영역 선택
      if (!additive) onSelect([]);
      capture();
      drag.current = { kind: 'marquee', startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, additive, base: additive ? selected : [] };
      return;
    }
    let next = selected;
    const target = pickTarget(hit);
    if (additive) {
      const on = target.every((id) => selected.includes(id));
      next = on ? selected.filter((id) => !target.includes(id)) : [...new Set([...selected, ...target])];
      onSelect(next);
      if (on) return;
    } else if (!selected.includes(hit) || target.length < selected.length) {
      next = target;
      onSelect(next);
    }
    const ids = movable(next);
    if (!ids.length) return;
    capture();
    const s = settingsRef.current;
    drag.current = {
      kind: 'move',
      ids,
      boxes: new Map(ids.map((id) => [id, getBox(s, id)])),
      bb0: unionRect(ids.map((id) => geos[id]!.bb)),
      startX: e.clientX,
      startY: e.clientY,
      started: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) {
      if (menu) return;
      const t = e.target as HTMLElement;
      if (spaceDown.current) return setCursor('grab');
      if (t.closest('[data-ruler="x"]') || t.closest('[data-guide="x"]')) return setCursor('ew-resize');
      if (t.closest('[data-ruler="y"]') || t.closest('[data-guide="y"]')) return setCursor('ns-resize');
      const handle = t.closest<HTMLElement>('[data-handle]');
      if (handle) {
        setCursor(handle.dataset.handle === 'rotate' ? 'grab' : handleCursor(Number(handle.dataset.hx), Number(handle.dataset.hy), handle.dataset.handle === 'group' ? 0 : (singleBox?.r ?? 0)));
        return;
      }
      const id = hitTest(e.clientX, e.clientY);
      setHover(id);
      setCursor(id ? (getBox(settings, id).locked ? 'default' : 'move') : 'default');
      return;
    }

    if (d.kind === 'pan') {
      onZoom({ ...d.z0, x: d.z0.x + e.clientX - d.startX, y: d.z0.y + e.clientY - d.startY });
      return;
    }

    if (d.kind === 'guide') {
      let pos = d.axis === 'x' ? e.clientX : e.clientY;
      // 안내선도 캔버스 가운데·모서리에 붙음
      const cands = d.axis === 'x' ? [ccx, canvas.left, canvas.left + canvas.width] : [ccy, canvas.top, canvas.top + canvas.height];
      const m = e.altKey ? null : nearest([pos], cands);
      if (m) pos += m.delta;
      d.pos = pos;
      setDraftGuide({ axis: d.axis, pos });
      return;
    }

    if (d.kind === 'marquee') {
      d.x = e.clientX;
      d.y = e.clientY;
      const r = { left: Math.min(d.startX, d.x), top: Math.min(d.startY, d.y), width: Math.abs(d.x - d.startX), height: Math.abs(d.y - d.startY) };
      setMarquee(r);
      setActive('marquee');
      // 완전히 감싼 것만 (파워포인트와 같음) · 그룹은 통째로
      const inside = editIds(settingsRef.current).filter((id) => {
        const bb = geos[id]?.bb;
        return bb && bb.left >= r.left && bb.top >= r.top && bb.left + bb.width <= r.left + r.width && bb.top + bb.height <= r.top + r.height;
      });
      onSelect(expandGroups(settingsRef.current, [...new Set([...d.base, ...inside])]));
      return;
    }

    if (d.kind === 'rotate') {
      startGesture(d);
      const a = (Math.atan2(e.clientY - d.g0.cy, e.clientX - d.g0.cx) * 180) / Math.PI;
      let r = d.box0.r + (a - d.a0);
      // Shift: 15° 단위
      if (e.shiftKey) r = Math.round(r / 15) * 15;
      const id = d.id;
      onChange((s) => patchBoxes(s, [id], () => ({ r: normDeg(r) })));
      return;
    }

    let dx = e.clientX - d.startX;
    let dy = e.clientY - d.startY;
    // 클릭만 하고 살짝 흔들린 건 무시
    if (!d.started) {
      if (Math.hypot(dx, dy) < 3) return;
      startGesture(d);
    }
    const unit = stageUnit();
    const others = (exclude: EditId[]) => editIds(settingsRef.current).filter((id) => !exclude.includes(id) && geosRef.current[id]).map((id) => geosRef.current[id]!.bb);
    const xCands = (ex: EditId[]) => [ccx, canvas.left, canvas.left + canvas.width, ...guideX, ...(view.guides ? others(ex).flatMap((o) => [o.left, o.left + o.width / 2, o.left + o.width]) : [])];
    const yCands = (ex: EditId[]) => [ccy, canvas.top, canvas.top + canvas.height, ...guideY, ...(view.guides ? others(ex).flatMap((o) => [o.top, o.top + o.height / 2, o.top + o.height]) : [])];

    if (d.kind === 'move') {
      // Shift: 수평 또는 수직으로만
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const bb = d.bb0;
      const next: Guide[] = [
        { axis: 'x', pos: ccx, strong: false },
        { axis: 'y', pos: ccy, strong: false },
      ];
      // Alt: 스냅 끄기
      if (!e.altKey) {
        let snappedX = false;
        let snappedY = false;
        if (!(e.shiftKey && dx === 0)) {
          const m = nearest([bb.left + dx, bb.left + bb.width / 2 + dx, bb.left + bb.width + dx], xCands(d.ids));
          if (m) {
            dx += m.delta;
            snappedX = true;
            if (m.pos === ccx) next[0].strong = true;
            else next.push({ axis: 'x', pos: m.pos, strong: true });
          }
        }
        if (!(e.shiftKey && dy === 0)) {
          const m = nearest([bb.top + dy, bb.top + bb.height / 2 + dy, bb.top + bb.height + dy], yCands(d.ids));
          if (m) {
            dy += m.delta;
            snappedY = true;
            if (m.pos === ccy) next[1].strong = true;
            else next.push({ axis: 'y', pos: m.pos, strong: true });
          }
        }
        // 눈금에 맞춤: 왼쪽 위 모서리를 눈금선에 (가이드에 붙지 않은 축만)
        if (view.snapGrid) {
          const step = GRID_PX * zoom.z;
          const g = (v: number, o: number) => o + Math.round((v - o) / step) * step;
          if (!snappedX && !(e.shiftKey && dx === 0)) dx = g(bb.left + dx, ccx) - bb.left;
          if (!snappedY && !(e.shiftKey && dy === 0)) dy = g(bb.top + dy, ccy) - bb.top;
        }
      }
      setGuides(next);
      setGaps(gapsAround({ ...bb, left: bb.left + dx, top: bb.top + dy }, others(d.ids)));
      const { ids, boxes } = d;
      onChange((s) => patchBoxes(s, ids, (_, id) => shiftBox(boxes.get(id)!, dx, dy, unit)));
      return;
    }

    if (d.kind === 'gresize') {
      // 여러 개 크기: 묶음 사각형을 늘리고 각 요소를 같은 비율로 옮기고 키움
      const bb = d.bb0;
      const fromCenter = e.ctrlKey || e.metaKey;
      const k = fromCenter ? 2 : 1;
      let nw = d.hx ? Math.max(MIN_PX, bb.width + d.hx * dx * k) : bb.width;
      let nh = d.hy ? Math.max(MIN_PX, bb.height + d.hy * dy * k) : bb.height;
      if (e.shiftKey || (d.hx && d.hy)) {
        // 모서리는 기본으로 비율 유지 (회전된 요소가 찌그러지지 않게)
        const fx = nw / bb.width;
        const fy = nh / bb.height;
        const f = !d.hy ? fx : !d.hx ? fy : Math.abs(fx - 1) > Math.abs(fy - 1) ? fx : fy;
        nw = bb.width * f;
        nh = bb.height * f;
      }
      const fx = nw / bb.width;
      const fy = nh / bb.height;
      const ax = fromCenter || !d.hx ? bb.left + bb.width / 2 : d.hx > 0 ? bb.left : bb.left + bb.width;
      const ay = fromCenter || !d.hy ? bb.top + bb.height / 2 : d.hy > 0 ? bb.top : bb.top + bb.height;
      setGuides([]);
      setGaps([]);
      const { ids, boxes, geos: g0s } = d;
      onChange((s) =>
        patchBoxes(s, ids, (_, id) => {
          const b0 = boxes.get(id)!;
          const g0 = g0s.get(id)!;
          const ncx = ax + (g0.cx - ax) * fx;
          const ncy = ay + (g0.cy - ay) * fy;
          const fu = g0.r ? Math.sqrt(fx * fy) : 0;
          return {
            ...shiftBox(b0, ncx - g0.cx, ncy - g0.cy, unit),
            w: Math.round(b0.w * (fu || fx) * 10) / 10,
            h: Math.round(b0.h * (fu || fy) * 10) / 10,
          };
        }),
      );
      return;
    }

    // 크기: 회전된 요소의 축 기준. 반대쪽 변 고정 (Ctrl 은 가운데 기준), Shift 는 비율 유지
    const { g0, box0: b0 } = d;
    const rad = (g0.r * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const lx = dx * cos + dy * sin;
    const ly = -dx * sin + dy * cos;
    const fromCenter = e.ctrlKey || e.metaKey;
    const k = fromCenter ? 2 : 1;
    let nw = d.hx ? Math.max(MIN_PX, g0.w + d.hx * lx * k) : g0.w;
    let nh = d.hy ? Math.max(MIN_PX, g0.h + d.hy * ly * k) : g0.h;
    const next: Guide[] = [];
    // 회전 없는 요소는 움직이는 변을 가이드·안내선에 스냅
    if (!g0.r && !e.altKey && !fromCenter) {
      if (d.hx) {
        const edge = d.hx > 0 ? g0.cx - g0.w / 2 + nw : g0.cx + g0.w / 2 - nw;
        const m = nearest([edge], xCands([d.id]));
        if (m) {
          nw += d.hx * m.delta;
          next.push({ axis: 'x', pos: m.pos, strong: true });
        }
      }
      if (d.hy) {
        const edge = d.hy > 0 ? g0.cy - g0.h / 2 + nh : g0.cy + g0.h / 2 - nh;
        const m = nearest([edge], yCands([d.id]));
        if (m) {
          nh += d.hy * m.delta;
          next.push({ axis: 'y', pos: m.pos, strong: true });
        }
      }
    }
    if (e.shiftKey) {
      const fx = nw / g0.w;
      const fy = nh / g0.h;
      const f = !d.hy ? fx : !d.hx ? fy : Math.abs(fx - 1) > Math.abs(fy - 1) ? fx : fy;
      nw = Math.max(MIN_PX, g0.w * f);
      nh = Math.max(MIN_PX, g0.h * f);
    }
    const lcx = fromCenter || !d.hx ? 0 : (d.hx * (nw - g0.w)) / 2;
    const lcy = fromCenter || !d.hy ? 0 : (d.hy * (nh - g0.h)) / 2;
    const sx = lcx * cos - lcy * sin;
    const sy = lcx * sin + lcy * cos;
    setGuides(next);
    setGaps([]);
    const id = d.id;
    onChange((s) =>
      patchBoxes(s, [id], () => ({
        ...shiftBox(b0, sx, sy, unit),
        w: Math.round(((b0.w * nw) / g0.w) * 10) / 10,
        h: Math.round(((b0.h * nh) / g0.h) * 10) / 10,
      })),
    );
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'guide') {
      // 눈금자로 되돌려 놓으면 지움, 캔버스 안이면 만들거나 옮김
      const inCanvas = d.axis === 'x' ? d.pos > canvas.left && d.pos < canvas.left + canvas.width : d.pos > canvas.top && d.pos < canvas.top + canvas.height;
      const onRuler = d.axis === 'x' ? d.pos < 22 : d.pos < 22;
      const v = Math.round((d.axis === 'x' ? ((d.pos - canvas.left) / canvas.width) * 100 : ((d.pos - canvas.top) / canvas.height) * 100) * 100) / 100;
      const axis = d.axis;
      const index = d.index;
      if (index === null && inCanvas && !onRuler) act(tr('안내선 추가'), (s) => ({ ...s, guides: { ...s.guides, [axis]: [...s.guides[axis], v] } }));
      else if (index !== null)
        act(inCanvas && !onRuler ? tr('안내선 이동') : tr('안내선 삭제'), (s) => ({
          ...s,
          guides: { ...s.guides, [axis]: inCanvas && !onRuler ? s.guides[axis].map((g, i) => (i === index ? v : g)) : s.guides[axis].filter((_, i) => i !== index) },
        }));
      setDraftGuide(null);
    }
    if ((d.kind === 'move' || d.kind === 'resize' || d.kind === 'gresize' || d.kind === 'rotate') && d.started) onGesture?.(false);
    drag.current = null;
    setGuides([]);
    setGaps([]);
    setMarquee(null);
    setActive(null);
  };

  const onContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if ((e.target as HTMLElement).closest('.edit-menu')) return;
    const hit = hitTest(e.clientX, e.clientY);
    if (hit && !selected.includes(hit)) onSelect(pickTarget(hit));
    if (!hit) onSelect([]);
    // 화면 밖으로 넘치지 않게
    setMenu({ x: Math.min(e.clientX, innerWidth - 260), y: Math.min(e.clientY, innerHeight - (hit ? 560 : 440)), onElement: !!hit });
    menuAt.current = { x: e.clientX, y: e.clientY };
  };
  const menuAt = useRef({ x: ccx, y: ccy });

  /* ───── 휠: Ctrl+휠 줌 (커서 기준) · 휠 이동 (확대했을 때) ───── */
  const layerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<(e: WheelEvent) => void>(() => undefined);
  wheelRef.current = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomAt(zoom.z * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    } else if (zoom.z !== 1) {
      e.preventDefault();
      onZoom({ ...zoom, x: zoom.x - (e.shiftKey ? e.deltaY : e.deltaX), y: zoom.y - (e.shiftKey ? 0 : e.deltaY) });
    }
  };
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const on = (e: WheelEvent) => wheelRef.current(e);
    el.addEventListener('wheel', on, { passive: false });
    return () => el.removeEventListener('wheel', on);
  }, []);

  /* ───── 키보드 ───── */
  const lastNudge = useRef(0);
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyRef.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    // 입력칸·설정 패널에서 누른 키는 건드리지 않음
    if (t?.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"], .panel')) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = (fn: () => void) => {
      e.preventDefault();
      fn();
    };
    if (e.code === 'Space' && !mod) {
      e.preventDefault();
      if (!spaceDown.current) {
        spaceDown.current = true;
        setCursor('grab');
      }
      return;
    }
    if (e.key === 'Escape') return key(() => (menu ? setMenu(null) : selected.length ? onSelect([]) : onExit()));
    if (mod && e.code === 'KeyA') return key(selectAll);
    if (mod && (e.code === 'Digit0' || e.code === 'Numpad0')) return key(zoomFit);
    if (mod && (e.code === 'Equal' || e.code === 'NumpadAdd')) return key(() => zoomStep(1));
    if (mod && (e.code === 'Minus' || e.code === 'NumpadSubtract')) return key(() => zoomStep(-1));
    if (mod && e.code === 'KeyV' && e.shiftKey) return key(() => hasFormat() && selected.length && act(tr('서식 붙여넣기'), (s) => pasteFormat(s, selected)));
    if (mod && e.code === 'KeyV') return key(doPaste);
    if (e.key === 'F9' && e.shiftKey && e.altKey) return key(() => onView({ ...view, rulers: !view.rulers }));
    if (e.key === 'F9' && e.shiftKey) return key(() => onView({ ...view, grid: !view.grid }));
    if (e.key === 'F9' && e.altKey) return key(() => onView({ ...view, guides: !view.guides }));
    if (e.key === 'Tab') {
      // 보이는 요소를 차례로 선택
      return key(() => {
        const visible = editIds(settingsRef.current).filter((id) => geos[id]);
        if (!visible.length) return;
        const i = single ? visible.indexOf(single) : -1;
        onSelect([visible[(i + (e.shiftKey ? -1 : 1) + visible.length) % visible.length]]);
      });
    }
    if (!selected.length) return;
    if (mod && e.code === 'KeyC' && e.shiftKey) return key(() => single && copyFormat(settingsRef.current, single));
    if (mod && e.code === 'KeyC') return key(doCopy);
    if (mod && e.code === 'KeyX') return key(doCut);
    if (mod && e.code === 'KeyD') return key(doDuplicate);
    if (mod && e.code === 'KeyG') return key(() => (e.shiftKey ? act(tr('그룹 해제'), (s) => ungroupSelected(s, selected)) : act(tr('그룹'), (s) => groupSelected(s, selected))));
    if (mod && (e.code === 'BracketRight' || e.code === 'BracketLeft')) {
      const up = e.code === 'BracketRight';
      return key(() => act(tr('정렬 순서'), (s) => reorder(s, selected, e.shiftKey ? (up ? 'front' : 'back') : up ? 'forward' : 'backward')));
    }
    if (e.key === 'Delete' || e.key === 'Backspace') return key(doDelete);
    if ((e.key === 'Enter' || e.key === 'F2') && single && canEditText(single, settingsRef.current)) return key(() => onEditText(single));
    // Alt+←/→: 15° 회전
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return key(() => doRotate(e.key === 'ArrowRight' ? 15 : -15));

    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!step) return;
    e.preventDefault();
    const ids = movable(selected);
    if (!ids.length) return;
    // 연속 이동은 한 번에 되돌리기
    if (performance.now() - lastNudge.current > 700) record(tr('이동'));
    lastNudge.current = performance.now();
    const px = e.shiftKey ? 10 : 1;
    const unit = stageUnit();
    onChange((s) => patchBoxes(s, ids, (b) => shiftBox(b, step[0] * px, step[1] * px, unit)));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false;
        setCursor('default');
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  /* ───── 그리기 ───── */
  const outline = (g: Geo): CSSProperties => ({ left: g.cx, top: g.cy, width: g.w, height: g.h, rotate: g.r ? `${g.r}deg` : undefined });
  const singleGeo = single ? geos[single] : undefined;
  const selGeos = selected.map((id) => geos[id]).filter((g): g is Geo => !!g);
  const groupBB = selGeos.length > 1 ? unionRect(selGeos.map((g) => g.bb)) : null;
  const layerCursor = active === 'move' ? 'move' : active === 'rotate' || active === 'pan' ? 'grabbing' : active === 'resize' || active === 'gresize' ? undefined : cursor;
  const step = rulerStep(bpp);
  const ticks = (len: number, origin: number) => {
    const out: number[] = [];
    const startBase = Math.ceil(((0 - origin) * bpp) / step) * step;
    for (let b = startBase; (b / bpp + origin) < len; b += step) out.push(b);
    return out;
  };

  return (
    <div
      ref={layerRef}
      className={`editor-layer ${view.grid ? 'has-grid' : ''} ${active ? 'is-dragging' : ''} ${textEditing ? 'is-text-editing' : ''}`}
      style={
        {
          '--text': settings.text,
          '--accent': settings.accent,
          cursor: layerCursor,
          backgroundPosition: `${ccx % (GRID_PX * zoom.z)}px ${ccy % (GRID_PX * zoom.z)}px`,
          backgroundSize: `${GRID_PX * zoom.z}px ${GRID_PX * zoom.z}px`,
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => !drag.current && setHover(null)}
      onContextMenu={onContextMenu}
      onDoubleClick={(e) => {
        const id = hitTest(e.clientX, e.clientY);
        if (id && canEditText(id, settingsRef.current)) onEditText(id);
      }}
    >
      {/* 직접 만든 안내선 */}
      {settings.guides.x.map((_, i) => (
        <span key={`gx${i}`} className="user-guide is-x" data-guide="x" data-index={i} style={{ left: guideX[i] }} />
      ))}
      {settings.guides.y.map((_, i) => (
        <span key={`gy${i}`} className="user-guide is-y" data-guide="y" data-index={i} style={{ top: guideY[i] }} />
      ))}
      {draftGuide && <span className={`user-guide is-${draftGuide.axis} is-draft`} style={draftGuide.axis === 'x' ? { left: draftGuide.pos } : { top: draftGuide.pos }} />}

      {guides.map((g, i) => (
        <span key={i} className={`edit-guide is-${g.axis} ${g.strong ? 'is-strong' : ''}`} style={g.axis === 'x' ? { left: g.pos } : { top: g.pos }} />
      ))}

      {/* 간격 (기준 px) */}
      {gaps.map((g, i) => (
        <span
          key={i}
          className={`edit-gap is-${g.axis}`}
          style={g.axis === 'x' ? { left: g.from, top: g.at, width: g.to - g.from } : { top: g.from, left: g.at, height: g.to - g.from }}
        >
          <b>{Math.round((g.to - g.from) * bpp)}</b>
        </span>
      ))}

      {hover && !selected.includes(hover) && geos[hover] && !active && <span className="edit-hover" style={outline(geos[hover]!)} />}

      {/* 여러 개 선택: 각자 윤곽 + 묶음 (크기 핸들) */}
      {selected.length > 1 &&
        selected.map((id) => geos[id] && <span key={id} className={`edit-multi ${getBox(settings, id).locked ? 'is-locked' : ''}`} style={outline(geos[id]!)} />)}
      {groupBB && (
        <span className={`edit-group ${grouped ? 'is-grouped' : ''}`} style={{ left: groupBB.left, top: groupBB.top, width: groupBB.width, height: groupBB.height }}>
          {!allLocked &&
            HANDLES.map(([hx, hy]) => (
              <span
                key={`${hx}${hy}`}
                className="edit-handle is-group"
                data-handle="group"
                data-hx={hx}
                data-hy={hy}
                style={{ left: `${(hx + 1) * 50}%`, top: `${(hy + 1) * 50}%`, cursor: handleCursor(hx, hy, 0) }}
              />
            ))}
          <span className={`edit-tag ${groupBB.top < 70 ? 'is-below' : ''}`}>
            {grouped ? tr('그룹') : tr('{0}개 선택', selected.length)}
            <b>{Math.round(groupBB.width * bpp)} × {Math.round(groupBB.height * bpp)}</b>
          </span>
        </span>
      )}

      {single && singleGeo && singleBox && (
        <div className={`edit-sel ${singleBox.locked ? 'is-locked' : ''} ${textEditing === single ? 'is-text' : ''}`} style={outline(singleGeo)}>
          {!singleBox.locked && textEditing !== single && (
            <>
              <span className="edit-rotate-line" />
              <span className="edit-handle is-rotate" data-handle="rotate" title={tr('회전 (Shift: 15° 단위)')}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
                  <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
                </svg>
              </span>
              {HANDLES.map(([hx, hy]) => (
                <span
                  key={`${hx}${hy}`}
                  className="edit-handle"
                  data-handle="size"
                  data-hx={hx}
                  data-hy={hy}
                  style={{ left: `${(hx + 1) * 50}%`, top: `${(hy + 1) * 50}%`, cursor: handleCursor(hx, hy, singleBox.r) }}
                />
              ))}
            </>
          )}
          <span className={`edit-tag ${singleGeo.bb.top < 70 ? 'is-below' : ''}`} style={{ rotate: singleBox.r ? `${-singleBox.r}deg` : undefined }}>
            {singleBox.locked && '🔒 '}
            {labelOf(settings, single)}
            <b>
              {view.units === 'px'
                ? `${Math.round(singleGeo.w * bpp)} × ${Math.round(singleGeo.h * bpp)}`
                : singleBox.w === singleBox.h
                  ? `${singleBox.w}%`
                  : `${singleBox.w} × ${singleBox.h}%`}
              {singleBox.r ? ` · ${singleBox.r}°` : ''}
            </b>
          </span>
        </div>
      )}

      {marquee && <span className="edit-marquee" style={{ left: marquee.left, top: marquee.top, width: marquee.width, height: marquee.height }} />}

      {/* 눈금자 (캔버스 왼쪽 위가 0, 기준 px) — 끌어서 안내선 */}
      {view.rulers && (
        <>
          <div className="ruler is-x" data-ruler="y" title={tr('끌어서 가로 안내선 만들기')}>
            {ticks(innerWidth, canvas.left).map((b) => (
              <span key={b} className="ruler-tick" style={{ left: canvas.left + b / bpp }}>
                {b}
              </span>
            ))}
          </div>
          <div className="ruler is-y" data-ruler="x" title={tr('끌어서 세로 안내선 만들기')}>
            {ticks(innerHeight, canvas.top).map((b) => (
              <span key={b} className="ruler-tick" style={{ top: canvas.top + b / bpp }}>
                {b}
              </span>
            ))}
          </div>
          <span className="ruler-corner" />
        </>
      )}

      {/* 줌 표시 */}
      {zoom.z !== 1 && (
        <button className="zoom-chip" onClick={zoomFit} title={tr('화면에 맞춤 (Ctrl+0)')}>
          {Math.round(zoom.z * 100)}%
        </button>
      )}

      {menu && (
        <EditorMenu
          menu={menu}
          close={closeMenu}
          selectedCount={selected.length}
          canText={!!single && canEditText(single, settings)}
          hasItems={hasItems}
          grouped={!!single ? !!groupOf(settings, single) : grouped}
          canPaste={hasClipboard()}
          canPasteFormat={hasFormat() && selected.length > 0}
          allLocked={allLocked}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          view={view}
          onView={onView}
          act={{
            editText: () => single && onEditText(single),
            cut: doCut,
            copy: doCopy,
            paste: doPaste,
            duplicate: doDuplicate,
            del: doDelete,
            copyFormat: () => single && copyFormat(settingsRef.current, single),
            pasteFormat: () => act(tr('서식 붙여넣기'), (s) => pasteFormat(s, selected)),
            group: () => act(tr('그룹'), (s) => groupSelected(s, selected)),
            ungroup: () => act(tr('그룹 해제'), (s) => ungroupSelected(s, selected)),
            order: (k) => act(tr('정렬 순서'), (s) => reorder(s, selected, k)),
            align: (k) => act(tr('맞춤'), (s) => alignBoxes(s, selected, k)),
            rotate: doRotate,
            toggleLock,
            reset: () => act(tr('원래대로'), (s) => patchBoxes(s, movable(selected), () => ({ x: 0, y: 0, w: 100, h: 100, r: 0 }))),
            insert: (k) => onInsert(k, toStage(menuAt.current.x, menuAt.current.y)),
            undo: history.undo,
            redo: history.redo,
            selectAll,
            zoomFit,
          }}
        />
      )}
    </div>
  );
}
