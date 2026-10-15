// 화면 편집 서식 창: 삽입 · 선택 창 · 화면 상태 · 보기 · 여러 개 선택 · 요소 하나의 크기·위치와 디자인
import { useState } from 'react';
import { deleteSelected, groupSelected, hasFormat, pasteFormat, ungroupSelected } from '../../../design/items';
import { canvasRect, editIds, getBox, groupOf, isItemId, itemOf, labelOf, measure, patchBoxes, setBox, setOrder, stackOrder, stageUnit, TEXT_FIELD } from '../../../design/layout';
import type { EditId, StagePreview } from '../../../types';
import { INSERT_KINDS } from '../../editor/EditorMenu';
import { basePerScreenPx } from '../../editor/geometry';
import { EyeIcon, EyeOffIcon, LockIcon } from '../../ui/Icons';
import {
  ArrangeTools,
  BorderBlock,
  BorderColorBlock,
  DigitColorBlock,
  DigitFontBlock,
  DigitSizeRange,
  fillMeta,
  Glow,
  KeyHintBlock,
  PlateBlock,
  PromptColorSub,
  ResultColorSub,
  SubSizeRange,
  TEXT_SWATCHES,
  TitleColorBlock,
  TitleFontBlock,
  TitleSizeRange,
} from '../blocks';
import { ColorField } from '../ColorPicker';
import { usePanel } from '../context';
import { Hint, Section, Segmented, Sub, TextInput, Toggle } from '../controls';
import { ItemProps } from '../ItemProps';
import { BoxFields, type PxInfo } from '../parts';
import { tr } from '../../../i18n';

export const resetBoxes = (ids: EditId[]) => (prev: Parameters<typeof patchBoxes>[0]) => patchBoxes(prev, ids, () => ({ x: 0, y: 0, w: 100, h: 100, r: 0 }));

const PREVIEWS: [StagePreview | 'none', string][] = [
  ['none', tr('대기')],
  ['running', tr('진행 중')],
  ['blind', tr('블라인드')],
  ['result', tr('성공')],
  ['result-fail', tr('실패')],
  ['confirm', tr('공개 문구')],
];

/** 삽입 도구 모음 */
function InsertBar() {
  const { app } = usePanel();
  return (
    <div className="insert-bar">
      {INSERT_KINDS.map(([k, label]) => (
        <button key={k} className="insert-btn" onClick={() => app.insert(k)} title={tr('{0} 삽입', label)}>
          <span className={`insert-ico is-${k}`} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

/** 선택 창 — 앞에 있는 것부터 · 눈(숨기기) · 자물쇠(잠금) · 끌어서 순서 바꾸기 */
function SelectionPane() {
  const { s, act, onSelect, selected } = usePanel();
  const order = stackOrder(s).reverse();
  const [dragId, setDragId] = useState<EditId | null>(null);
  const [overId, setOverId] = useState<EditId | null>(null);

  const drop = (target: EditId) => {
    if (!dragId || dragId === target) return;
    const list = order.filter((id) => id !== dragId);
    list.splice(list.indexOf(target), 0, dragId);
    // 화면 목록은 앞 → 뒤, 저장은 뒤 → 앞
    act((prev) => setOrder(prev, [...list].reverse()), tr('정렬 순서'));
  };

  return (
    <Section title={tr('선택 창')} hint={tr('클릭으로 선택 · 끌어서 앞뒤 순서 바꾸기 · 위에 있을수록 앞')}>
      <div className="sel-pane">
        {order.map((id) => {
          const bx = getBox(s, id);
          const g = groupOf(s, id);
          return (
            <div
              key={id}
              className={`sel-row ${bx.hidden ? 'is-hidden' : ''} ${selected.includes(id) ? 'is-selected' : ''} ${overId === id && dragId !== id ? 'is-over' : ''}`}
              draggable
              onDragStart={(e) => {
                setDragId(id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverId(id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop(id);
                setDragId(null);
                setOverId(null);
              }}
            >
              <span className="sel-grip" aria-hidden>
                ⋮⋮
              </span>
              <button className="sel-name" onClick={(e) => onSelect(e.shiftKey || e.ctrlKey ? [...new Set([...selected, id])] : [id])}>
                {labelOf(s, id)}
                {g && <span className="sel-meta">{tr('그룹')}</span>}
                {!isItemId(id) && (bx.x !== 0 || bx.y !== 0 || bx.w !== 100 || bx.h !== 100 || bx.r !== 0) && <span className="sel-meta">{tr('배치 변경됨')}</span>}
              </button>
              <button
                className={`sel-icon ${bx.locked ? 'is-on' : ''}`}
                title={bx.locked ? tr('잠금 해제') : tr('잠금')}
                aria-label={bx.locked ? tr('잠금 해제') : tr('잠금')}
                onClick={() => act((prev) => setBox(prev, id, { ...getBox(prev, id), locked: !bx.locked }), bx.locked ? tr('잠금 해제') : tr('잠금'))}
              >
                <LockIcon open={!bx.locked} />
              </button>
              <button
                className="sel-icon"
                title={bx.hidden ? tr('보이기') : tr('숨기기')}
                aria-label={bx.hidden ? tr('보이기') : tr('숨기기')}
                onClick={() => act((prev) => setBox(prev, id, { ...getBox(prev, id), hidden: !bx.hidden }), bx.hidden ? tr('보이기') : tr('숨기기'))}
              >
                {bx.hidden ? <EyeOffIcon /> : <EyeIcon />}
              </button>
              {isItemId(id) && (
                <button className="sel-icon is-del" title={tr('삭제')} aria-label={tr('삭제')} onClick={() => act((prev) => deleteSelected(prev, [id]), tr('삭제'))}>
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="row-2">
        <button className="ghost-btn" onClick={() => act((prev) => patchBoxes(prev, editIds(prev), () => ({ hidden: false })), tr('모두 표시'))}>
          {tr('모두 표시')}
        </button>
        <button className="ghost-btn" onClick={() => onSelect(editIds(s).filter((id) => !getBox(s, id).hidden))}>
          {tr('모두 선택')}
        </button>
      </div>
    </Section>
  );
}

/** 보기 옵션 · 줌 */
function ViewOptions() {
  const { s, editView: v, onEditView, app, act } = usePanel();
  const guides = s.guides.x.length + s.guides.y.length;
  return (
    <Section title={tr('보기')} aside={<span className="sub-meta">{Math.round(app.zoom.z * 100)}%</span>}>
      <div className="zoom-row">
        <button className="tool-btn is-lg" onClick={() => app.setZoom({ ...app.zoom, z: Math.max(0.25, app.zoom.z / 1.25) })} aria-label={tr('축소')} title={tr('축소 (Ctrl+-)')}>
          −
        </button>
        <input
          type="range"
          className="zoom-range"
          min={25}
          max={400}
          step={5}
          value={Math.round(app.zoom.z * 100)}
          onChange={(e) => app.setZoom({ ...app.zoom, z: Number(e.target.value) / 100 })}
          aria-label={tr('확대 비율')}
        />
        <button className="tool-btn is-lg" onClick={() => app.setZoom({ ...app.zoom, z: Math.min(4, app.zoom.z * 1.25) })} aria-label={tr('확대')} title={tr('확대 (Ctrl+=)')}>
          +
        </button>
        <button className="ghost-btn" onClick={() => app.setZoom({ z: 1, x: 0, y: 0 })} title="Ctrl+0">
          {tr('맞춤')}
        </button>
      </div>
      <Hint>{tr('Ctrl+휠 확대·축소 · 스페이스+드래그(또는 휠 클릭 드래그)로 이동')}</Hint>
      <Toggle label={tr('눈금자 (Alt+Shift+F9)')} checked={v.rulers} onChange={(rulers) => onEditView({ ...v, rulers })} />
      <Toggle label={tr('눈금선 표시 (Shift+F9)')} checked={v.grid} onChange={(grid) => onEditView({ ...v, grid })} />
      <Toggle label={tr('눈금에 맞춤')} checked={v.snapGrid} onChange={(snapGrid) => onEditView({ ...v, snapGrid })} />
      <Toggle label={tr('스마트 가이드 (Alt+F9)')} checked={v.guides} onChange={(g) => onEditView({ ...v, guides: g })} />
      <Toggle label={tr('숨긴 요소 반투명으로 보기')} checked={v.showHidden} onChange={(showHidden) => onEditView({ ...v, showHidden })} />
      <Segmented<'pct' | 'px'>
        value={v.units}
        onChange={(units) => onEditView({ ...v, units })}
        options={[
          ['pct', tr('단위 %')],
          ['px', tr('단위 px')],
        ]}
      />
      {guides > 0 && (
        <button className="ghost-btn" onClick={() => act((prev) => ({ ...prev, guides: { x: [], y: [] } }), tr('안내선 지우기'))}>
          {tr('안내선')} {guides}{tr('개 모두 지우기')}
        </button>
      )}
      {v.rulers && <Hint>{tr('눈금자에서 끌어 안내선을 만들고, 안내선을 눈금자로 끌어 지워요')}</Hint>}
    </Section>
  );
}

const HELP: [string, string][] = [
  [tr('클릭'), tr('선택 · Shift/Ctrl+클릭 여러 개 · 빈 곳 드래그 영역 선택')],
  [tr('드래그'), tr('이동 · Shift 수평/수직 · Alt 스냅 끄기')],
  [tr('핸들'), tr('크기 · Shift 비율 유지 · Ctrl 가운데 기준 (여러 개도 가능)')],
  [tr('회전 핸들'), tr('Shift 15° 단위 · Alt+←/→ 15°')],
  [tr('방향키'), '1px · Shift 10px'],
  ['Ctrl+C/X/V/D', tr('복사 · 잘라내기 · 붙여넣기 · 복제 (삽입 요소)')],
  ['Ctrl+Shift+C/V', tr('서식 복사 · 붙여넣기')],
  ['Ctrl+G', tr('그룹 · Ctrl+Shift+G 해제')],
  ['Ctrl+Shift+]/[', tr('맨 앞으로 · 맨 뒤로')],
  [tr('더블클릭/Enter'), tr('문구 편집 · Delete 삭제(기본 요소는 숨김)')],
  [tr('Ctrl+휠'), tr('확대·축소 · Ctrl+0 맞춤 · 스페이스+드래그 이동')],
  ['Ctrl+A', tr('모두 선택 · Tab 다음 · Esc 해제')],
  ['Ctrl+Z/Y', tr('실행 취소 · 다시 실행')],
  [tr('우클릭'), tr('메뉴 (삽입·정렬·맞춤·그룹·잠금)')],
  [tr('끌어다 놓기'), tr('그림 파일을 화면에 놓으면 삽입')],
];

/** 요소 하나의 px 환산 (단위 px 일 때) */
function usePx(id: EditId): PxInfo | null {
  const { s, editView, app } = usePanel();
  if (editView.units !== 'px') return null;
  const cr = canvasRect();
  const bpp = basePerScreenPx(s.canvas.aspect, cr, app.zoom.z);
  const u = stageUnit();
  const g = measure(id, getBox(s, id));
  return { perX: u.w * bpp, perY: u.h * bpp, wPx: g ? g.w * bpp : 0, hPx: g ? g.h * bpp : 0 };
}

export function EditPane() {
  const { s, d, set, act, selected, onSelect, preview, onPreview } = usePanel();
  const single = selected.length === 1 ? selected[0] : null;
  const px = usePx(single ?? 'title');

  if (!selected.length) {
    return (
      <>
        <Section title={tr('삽입')} hint={tr('화면을 우클릭해서 그 자리에 넣을 수도 있어요 · 그림 파일은 끌어다 놓기')}>
          <InsertBar />
        </Section>
        <SelectionPane />
        <Section title={tr('화면 상태')} hint={tr('그 상태의 화면을 띄워 놓고 배치해요 (결과·공개 문구는 여기서 띄워야 옮길 수 있어요)')}>
          <div className="chips">
            {PREVIEWS.map(([k, label]) => (
              <button key={k} className={`chip ${(preview ?? 'none') === k || (k === 'none' && preview === 'layout') ? 'is-on' : ''}`} onClick={() => onPreview(k === 'none' ? null : k)}>
                {label}
              </button>
            ))}
          </div>
        </Section>
        <ViewOptions />
        <Section title={tr('조작법')}>
          <ul className="edit-help">
            {HELP.map(([k, v]) => (
              <li key={k}>
                <kbd>{k}</kbd> {v}
              </li>
            ))}
          </ul>
        </Section>
      </>
    );
  }

  if (!single) {
    const grouped = !!groupOf(s, selected[0]) && selected.every((id) => groupOf(s, id)?.id === groupOf(s, selected[0])?.id);
    return (
      <>
        <button className="link-btn edit-back" onClick={() => onSelect([])}>
          {tr('← 선택 창')}
        </button>
        <Section title={grouped ? tr('그룹') : tr('{0}개 선택', selected.length)} hint={selected.map((id) => labelOf(s, id)).join(' · ')}>
          <div className="row-2">
            {grouped ? (
              <button className="ghost-btn" onClick={() => act((prev) => ungroupSelected(prev, selected), tr('그룹 해제'))}>
                {tr('그룹 해제')}
              </button>
            ) : (
              <button className="ghost-btn" onClick={() => act((prev) => groupSelected(prev, selected), tr('그룹'))}>
                {tr('그룹으로 묶기')}
              </button>
            )}
            <button className="ghost-btn" disabled={!hasFormat()} onClick={() => act((prev) => pasteFormat(prev, selected), tr('서식 붙여넣기'))}>
              {tr('서식 붙여넣기')}
            </button>
          </div>
          <ArrangeTools />
          <button
            className="ghost-btn"
            onClick={() => {
              act((prev) => deleteSelected(prev, selected), tr('삭제'));
              onSelect([]);
            }}
          >
            {selected.some(isItemId) ? tr('삭제 (기본 요소는 숨김)') : tr('숨기기')}
          </button>
        </Section>
      </>
    );
  }

  const id = single;
  const field = TEXT_FIELD[id];
  const item = itemOf(s, id);
  return (
    <>
      <button className="link-btn edit-back" onClick={() => onSelect([])}>
        {tr('← 선택 창')}
      </button>
      <Section
        title={tr('크기 및 위치')}
        aside={
          <button className="link-btn" onClick={() => act(resetBoxes([id]), tr('원래대로'))}>
            {tr('원래대로')}
          </button>
        }
      >
        <BoxFields box={getBox(s, id)} px={px} onChange={(b) => act((prev) => setBox(prev, id, b), tr('크기 및 위치'))} />
      </Section>

      <Section title={tr('배치')}>
        <ArrangeTools />
      </Section>

      {item && <ItemProps item={item} />}

      {field && (
        <Section title={tr('문구')} hint={tr('화면에서 더블클릭해도 바로 고칠 수 있어요 · 비우면 숨겨져요')}>
          <TextInput value={s[field]} onChange={(v) => set({ [field]: v })} placeholder={tr('문구 입력')} />
        </Section>
      )}

      {id === 'title' && (
        <>
          <Section title={tr('글꼴')}>
            <TitleFontBlock />
          </Section>
          <Section title={tr('글자 크기')}>
            <TitleSizeRange />
          </Section>
          <Section title={tr('색')} aside={<span className="sub-meta">{fillMeta(d.titleFill)}</span>}>
            <TitleColorBlock />
          </Section>
          <Section title={tr('글로우')}>
            <Glow label={tr('세기')} k="glowTitle" />
          </Section>
        </>
      )}

      {id === 'sub' && (
        <>
          <Section title={tr('글자 크기')} hint={tr('글꼴은 메인 타이틀과 같아요')}>
            <SubSizeRange />
          </Section>
          <Section title={tr('색')} hint={tr('보조 텍스트 색 — 목표 시간·키 안내에도 함께 쓰여요')}>
            <ColorField value={s.text} swatches={TEXT_SWATCHES} onChange={(text) => set({ text })} />
          </Section>
        </>
      )}

      {id === 'frame' && (
        <>
          <Section title={tr('숫자 글꼴')}>
            <DigitFontBlock />
          </Section>
          <Section title={tr('숫자 크기·색')}>
            <DigitSizeRange />
            <DigitColorBlock />
          </Section>
          <Section title={tr('테두리')}>
            <BorderBlock />
            {d.borderLines > 0 && (
              <Sub title={tr('테두리 색')}>
                <BorderColorBlock />
              </Sub>
            )}
          </Section>
          <Section title={tr('판')}>
            <PlateBlock />
            <Toggle label={tr('목표 시간 표시')} checked={s.showTarget} onChange={(v) => set({ showTarget: v })} />
          </Section>
          <Section title={tr('글로우')}>
            <Glow label={tr('숫자')} k="glowDigits" />
            <Glow label={tr('테두리')} k="glowBorder" />
          </Section>
        </>
      )}

      {(id === 'result-success' || id === 'result-fail') && (
        <Section title={tr('모양')}>
          <ResultColorSub k={id === 'result-success' ? 'success' : 'fail'} />
          <Sub title={tr('글로우')}>
            <Glow label={tr('세기')} k="glowResult" />
          </Sub>
        </Section>
      )}

      {id === 'prompt' && (
        <Section title={tr('모양')}>
          <PromptColorSub />
        </Section>
      )}

      {id === 'hint' && (
        <Section title={tr('문구')} hint={tr('화면에서 더블클릭하면 지금 보이는 문구를 바로 고쳐요')}>
          <KeyHintBlock />
        </Section>
      )}

      {id === 'player' && (
        <Section title={tr('참가자 이름')} hint={tr('기록 탭에서 이름을 넣으면 여기에 보여요 · 서브 타이틀 글꼴·색을 따라요')}>
          <TextInput value={s.playerFormat} placeholder="{name}" onChange={(playerFormat) => set({ playerFormat })} />
        </Section>
      )}
    </>
  );
}
