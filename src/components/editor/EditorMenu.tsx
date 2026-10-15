// 화면 편집 우클릭 메뉴
import type { ReactNode } from 'react';
import type { AlignKind, OrderKind } from '../../design/layout';
import type { ShapeKind } from '../../types';
import { ALIGN_ICONS, ORDER_ICONS, RedoIcon, UndoIcon } from '../ui/Icons';
import { tr } from '../../i18n';

export interface EditView {
  /** 눈금선 표시 */
  grid: boolean;
  /** 눈금에 맞춤 */
  snapGrid: boolean;
  /** 스마트 가이드 (가운데·다른 요소에 맞춤) */
  guides: boolean;
  /** 눈금자 */
  rulers: boolean;
  /** 숨긴 요소를 반투명으로 보기 */
  showHidden: boolean;
  /** 위치·크기 단위 */
  units: 'pct' | 'px';
}

export const ALIGN_LABEL: Record<AlignKind, string> = {
  left: tr('왼쪽 맞춤'),
  center: tr('가운데 맞춤'),
  right: tr('오른쪽 맞춤'),
  top: tr('위쪽 맞춤'),
  middle: tr('중간 맞춤'),
  bottom: tr('아래쪽 맞춤'),
  'dist-h': tr('가로 간격을 동일하게'),
  'dist-v': tr('세로 간격을 동일하게'),
};

export type InsertKind = 'text' | 'image' | ShapeKind;

export const INSERT_KINDS: [InsertKind, string][] = [
  ['text', tr('텍스트 상자')],
  ['image', tr('그림')],
  ['rect', tr('사각형')],
  ['ellipse', tr('원')],
  ['triangle', tr('삼각형')],
  ['star', tr('별')],
  ['line', tr('선')],
];

export interface MenuState {
  x: number;
  y: number;
  onElement: boolean;
}

export interface MenuProps {
  menu: MenuState;
  close: () => void;
  selectedCount: number;
  canText: boolean;
  hasItems: boolean;
  grouped: boolean;
  canPaste: boolean;
  canPasteFormat: boolean;
  allLocked: boolean;
  canUndo: boolean;
  canRedo: boolean;
  view: EditView;
  onView: (v: EditView) => void;
  act: {
    editText: () => void;
    cut: () => void;
    copy: () => void;
    paste: () => void;
    duplicate: () => void;
    del: () => void;
    copyFormat: () => void;
    pasteFormat: () => void;
    group: () => void;
    ungroup: () => void;
    order: (k: OrderKind) => void;
    align: (k: AlignKind) => void;
    rotate: (deg: number | null) => void;
    toggleLock: () => void;
    reset: () => void;
    insert: (k: InsertKind) => void;
    undo: () => void;
    redo: () => void;
    selectAll: () => void;
    zoomFit: () => void;
  };
}

/** 메뉴 항목 — 컴포넌트 밖에 둬야 다시 그려져도 버튼이 교체되지 않아 클릭이 사라지지 않음 */
function Item({
  children,
  onClick,
  onClose,
  shortcut,
  icon,
  check,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  onClose: () => void;
  shortcut?: string;
  icon?: ReactNode;
  check?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className="edit-menu-item"
      onClick={() => {
        onClick();
        onClose();
      }}
    >
      <span className="edit-menu-ico">{check !== undefined ? (check ? '✓' : '') : icon}</span>
      <span>{children}</span>
      {shortcut && <kbd>{shortcut}</kbd>}
    </button>
  );
}

const Label = ({ children }: { children: ReactNode }) => <span className="edit-menu-label">{children}</span>;

export function EditorMenu(p: MenuProps) {
  const { menu, close, act, view, onView } = p;
  return (
    <div
      className="edit-menu"
      style={{ left: menu.x, top: menu.y }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menu.onElement ? (
        <>
          {p.canText && (
            <Item onClose={close} onClick={act.editText} shortcut="Enter">
              {tr('문구 편집')}
            </Item>
          )}
          <div className="edit-menu-row is-text">
            <button disabled={!p.hasItems} onClick={() => (act.cut(), close())} title={tr('잘라내기 (Ctrl+X)')}>
              {tr('잘라내기')}
            </button>
            <button disabled={!p.hasItems} onClick={() => (act.copy(), close())} title={tr('복사 (Ctrl+C)')}>
              {tr('복사')}
            </button>
            <button disabled={!p.canPaste} onClick={() => (act.paste(), close())} title={tr('붙여넣기 (Ctrl+V)')}>
              {tr('붙여넣기')}
            </button>
          </div>
          <Item onClose={close} onClick={act.duplicate} shortcut="Ctrl+D" disabled={!p.hasItems}>
            {tr('복제')}
          </Item>
          <Item onClose={close} onClick={act.del} shortcut="Delete">
            {p.hasItems ? tr('삭제') : tr('숨기기')}
          </Item>
          <hr />
          <Item onClose={close} onClick={act.copyFormat} shortcut="Ctrl+Shift+C" disabled={p.selectedCount !== 1}>
            {tr('서식 복사')}
          </Item>
          <Item onClose={close} onClick={act.pasteFormat} shortcut="Ctrl+Shift+V" disabled={!p.canPasteFormat}>
            {tr('서식 붙여넣기')}
          </Item>
          {p.selectedCount > 1 && !p.grouped && (
            <Item onClose={close} onClick={act.group} shortcut="Ctrl+G">
              {tr('그룹')}
            </Item>
          )}
          {p.grouped && (
            <Item onClose={close} onClick={act.ungroup} shortcut="Ctrl+Shift+G">
              {tr('그룹 해제')}
            </Item>
          )}
          <Label>{tr('정렬')}</Label>
          <Item onClose={close} icon={ORDER_ICONS.front} shortcut="Ctrl+Shift+]" onClick={() => act.order('front')}>
            {tr('맨 앞으로 가져오기')}
          </Item>
          <Item onClose={close} icon={ORDER_ICONS.forward} shortcut="Ctrl+]" onClick={() => act.order('forward')}>
            {tr('앞으로 가져오기')}
          </Item>
          <Item onClose={close} icon={ORDER_ICONS.backward} shortcut="Ctrl+[" onClick={() => act.order('backward')}>
            {tr('뒤로 보내기')}
          </Item>
          <Item onClose={close} icon={ORDER_ICONS.back} shortcut="Ctrl+Shift+[" onClick={() => act.order('back')}>
            {tr('맨 뒤로 보내기')}
          </Item>
          <Label>{p.selectedCount > 1 ? tr('맞춤 (선택한 개체 기준)') : tr('맞춤 (화면 기준)')}</Label>
          <div className="edit-menu-row">
            {(['left', 'center', 'right', 'top', 'middle', 'bottom', 'dist-h', 'dist-v'] as AlignKind[]).map((k) => (
              <button
                key={k}
                className="edit-menu-icon"
                disabled={k.startsWith('dist') && p.selectedCount < 3}
                title={ALIGN_LABEL[k]}
                onClick={() => {
                  act.align(k);
                  close();
                }}
              >
                {ALIGN_ICONS[k]}
              </button>
            ))}
          </div>
          <Label>{tr('회전')}</Label>
          <div className="edit-menu-row is-text">
            <button onClick={() => (act.rotate(90), close())}>{tr('오른쪽 90°')}</button>
            <button onClick={() => (act.rotate(-90), close())}>{tr('왼쪽 90°')}</button>
            <button onClick={() => (act.rotate(null), close())}>{tr('회전 없음')}</button>
          </div>
          <hr />
          <Item onClose={close} onClick={act.toggleLock}>{p.allLocked ? tr('잠금 해제') : tr('잠금')}</Item>
          <Item onClose={close} onClick={act.reset}>{tr('크기 및 위치 원래대로')}</Item>
        </>
      ) : (
        <>
          <Item onClose={close} icon={<UndoIcon />} shortcut="Ctrl+Z" disabled={!p.canUndo} onClick={act.undo}>
            {tr('실행 취소')}
          </Item>
          <Item onClose={close} icon={<RedoIcon />} shortcut="Ctrl+Y" disabled={!p.canRedo} onClick={act.redo}>
            {tr('다시 실행')}
          </Item>
          <Item onClose={close} shortcut="Ctrl+V" disabled={!p.canPaste} onClick={act.paste}>
            {tr('붙여넣기')}
          </Item>
          <hr />
          <Label>{tr('삽입')}</Label>
          <div className="edit-menu-row is-insert">
            {INSERT_KINDS.map(([k, label]) => (
              <button key={k} onClick={() => (act.insert(k), close())}>
                {label}
              </button>
            ))}
          </div>
          <hr />
          <Item onClose={close} shortcut="Ctrl+A" onClick={act.selectAll}>
            {tr('모두 선택')}
          </Item>
          <Item onClose={close} shortcut="Ctrl+0" onClick={act.zoomFit}>
            {tr('화면에 맞춤 (100%)')}
          </Item>
          <hr />
          <Item onClose={close} check={view.grid} shortcut="Shift+F9" onClick={() => onView({ ...view, grid: !view.grid })}>
            {tr('눈금선 표시')}
          </Item>
          <Item onClose={close} check={view.snapGrid} onClick={() => onView({ ...view, snapGrid: !view.snapGrid })}>
            {tr('눈금에 맞춤')}
          </Item>
          <Item onClose={close} check={view.guides} shortcut="Alt+F9" onClick={() => onView({ ...view, guides: !view.guides })}>
            {tr('스마트 가이드')}
          </Item>
          <Item onClose={close} check={view.rulers} shortcut="Alt+Shift+F9" onClick={() => onView({ ...view, rulers: !view.rulers })}>
            {tr('눈금자')}
          </Item>
          <Item onClose={close} check={view.showHidden} onClick={() => onView({ ...view, showHidden: !view.showHidden })}>
            {tr('숨긴 요소 보기')}
          </Item>
        </>
      )}
    </div>
  );
}
