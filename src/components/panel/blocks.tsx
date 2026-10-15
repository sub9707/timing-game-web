// 요소별 디자인 블록 — 탭과 화면 편집 서식 창에서 함께 씀
import { alignBoxes, getBox, normDeg, patchBoxes, reorder, type AlignKind, type OrderKind } from '../../design/layout';
import { clampWeight } from '../../settings/fonts';
import { COLOR_SWATCHES, FILL_PRESETS } from '../../settings/themes';
import { allFontIds } from '../../settings/fonts';
import type { Box, DesignSetting, Fill, FontId, KeyHintStage, TextFx, TextFxTarget } from '../../types';
import { ALIGN_LABEL } from '../editor/StageEditor';
import { ALIGN_ICONS, EyeOffIcon, ORDER_ICONS, RotateIcon } from '../ui/Icons';
import { ColorField } from './ColorPicker';
import { usePanel } from './context';
import { Field, NumberInput, Range, Segmented, Sub, TextInput, ThemeColorChip, Toggle } from './controls';
import { FillField } from './GradientEditor';
import { FontPicker, WeightRange } from './parts';
import { tr } from '../../i18n';

export const TEXT_SWATCHES = ['#ffffff', '#f6e7c1', '#eafcff', '#e8fff8', '#ffe3f4', '#111111', '#5a3d6e', '#7a3355', '#c9ffd6'];

export const fillMeta = (f: Fill) => (f.mode === 'solid' ? f.color.toUpperCase() : tr('그라데이션 {0}색', f.stops.length));

/** 균일 크기 슬라이더: 가로를 v 로, 세로는 비율 유지 */
export const scaleTo = (b: Box, v: number) => ({ w: v, h: Math.round(((b.h * v) / (b.w || 1)) * 10) / 10 });

/* ───── 타이틀 ───── */

export function TitleFontBlock() {
  const { s, d, onChange, setDesign, app } = usePanel();
  // 글꼴을 바꾸면 굵기를 그 글꼴 범위로 (최신 값 기준이라 메모된 FontPicker 에서도 안전)
  const pick = (titleFont: FontId) =>
    onChange((prev) => ({ ...prev, design: { ...prev.design, titleFont, titleWeight: clampWeight(titleFont, prev.design.titleWeight) } }));
  const upload = async (f: File) => {
    const id = await app.addFont(f);
    if (id) pick(id);
  };
  return (
    <>
      <FontPicker value={d.titleFont} sample={tr('가Aa')} onChange={pick} fonts={allFontIds(s.customFonts)} onUpload={upload} />
      <WeightRange font={d.titleFont} value={d.titleWeight} onChange={(titleWeight) => setDesign({ titleWeight })} />
      <Toggle label={tr('기울임')} checked={d.titleItalic} onChange={(titleItalic) => setDesign({ titleItalic })} />
    </>
  );
}

export function TitleSizeRange() {
  const { d, setDesign } = usePanel();
  return <Range label={tr('메인')} min={40} max={180} step={5} value={d.titleScale} onChange={(titleScale) => setDesign({ titleScale })} suffix="%" />;
}

export function SubSizeRange() {
  const { d, setDesign } = usePanel();
  return <Range label={tr('서브')} min={50} max={200} step={5} value={d.subScale} onChange={(subScale) => setDesign({ subScale })} suffix="%" />;
}

export function TitleColorBlock() {
  const { d, setDesign } = usePanel();
  return <FillField value={d.titleFill} swatches={COLOR_SWATCHES} presets={FILL_PRESETS} onChange={(titleFill) => setDesign({ titleFill })} />;
}

/* ───── 타이머 숫자 ───── */

export function DigitFontBlock() {
  const { s, d, onChange, setDesign, app } = usePanel();
  const pick = (digitFont: FontId) =>
    onChange((prev) => ({ ...prev, design: { ...prev.design, digitFont, digitWeight: clampWeight(digitFont, prev.design.digitWeight) } }));
  const upload = async (f: File) => {
    const id = await app.addFont(f);
    if (id) pick(id);
  };
  return (
    <>
      <FontPicker value={d.digitFont} sample="12" onChange={pick} fonts={allFontIds(s.customFonts)} onUpload={upload} />
      <WeightRange font={d.digitFont} value={d.digitWeight} onChange={(digitWeight) => setDesign({ digitWeight })} />
      <Toggle label={tr('기울임')} checked={d.digitItalic} onChange={(digitItalic) => setDesign({ digitItalic })} />
    </>
  );
}

export function DigitSizeRange() {
  const { d, setDesign } = usePanel();
  return <Range label={tr('크기')} min={50} max={140} step={5} value={d.digitScale} onChange={(digitScale) => setDesign({ digitScale })} suffix="%" />;
}

export function DigitColorBlock() {
  const { d, setDesign } = usePanel();
  return <FillField value={d.digitFill} swatches={COLOR_SWATCHES} presets={FILL_PRESETS} onChange={(digitFill) => setDesign({ digitFill })} />;
}

/* ───── 테두리 · 판 ───── */

export function BorderBlock() {
  const { d, setDesign } = usePanel();
  return (
    <>
      <Segmented<string>
        value={String(d.borderLines)}
        onChange={(v) => setDesign({ borderLines: Number(v) })}
        options={[
          ['0', tr('없음')],
          ['1', tr('1줄')],
          ['2', tr('2줄')],
          ['3', tr('3줄')],
        ]}
      />
      {d.borderLines > 0 && (
        <>
          <Range label={tr('두께')} min={0.5} max={12} step={0.5} value={d.borderWidth} onChange={(borderWidth) => setDesign({ borderWidth })} suffix="px" />
          {d.borderLines > 1 && <Range label={tr('간격')} min={2} max={30} step={1} value={d.borderGap} onChange={(borderGap) => setDesign({ borderGap })} suffix="px" />}
          <Field label={tr('위치')}>
            <Segmented<DesignSetting['borderSides']>
              value={d.borderSides}
              onChange={(borderSides) => setDesign({ borderSides })}
              options={[
                ['all', tr('전체')],
                ['y', tr('위·아래')],
                ['top', tr('위')],
              ]}
            />
          </Field>
          {d.borderFill.mode === 'solid' && (
            <Field label={tr('선 모양')}>
              <Segmented<DesignSetting['borderStyle']>
                value={d.borderStyle}
                onChange={(borderStyle) => setDesign({ borderStyle })}
                options={[
                  ['solid', tr('실선')],
                  ['dashed', tr('대시')],
                  ['dotted', tr('점선')],
                ]}
              />
            </Field>
          )}
        </>
      )}
    </>
  );
}

export function BorderColorBlock() {
  const { d, setDesign } = usePanel();
  return <FillField value={d.borderFill} swatches={COLOR_SWATCHES} presets={FILL_PRESETS} onChange={(borderFill) => setDesign({ borderFill })} />;
}

export function PlateBlock() {
  const { d, setDesign } = usePanel();
  return (
    <>
      <Range label={tr('모서리')} min={0} max={80} step={1} value={d.borderRadius} onChange={(borderRadius) => setDesign({ borderRadius })} suffix="px" />
      <Range label={tr('판 배경')} min={0} max={100} step={5} value={d.frameBg} onChange={(frameBg) => setDesign({ frameBg })} suffix="%" />
    </>
  );
}

/* ───── 결과 · 공개 문구 · 키 안내 ───── */

export function ResultColorSub({ k }: { k: 'success' | 'fail' }) {
  const { s, setResultStyleOf } = usePanel();
  const st = s.resultStyle[k];
  return (
    <Sub title={tr('색')} aside={<ThemeColorChip on={!st.custom} onClick={() => setResultStyleOf(k, { custom: false })} />}>
      <div className={`fill-wrap ${st.custom ? '' : 'is-dimmed'}`}>
        <FillField value={st.fill} swatches={COLOR_SWATCHES} presets={FILL_PRESETS} onChange={(fill) => setResultStyleOf(k, { fill, custom: true })} />
      </div>
    </Sub>
  );
}

export function PromptColorSub() {
  const { s, setPrompt } = usePanel();
  const rp = s.revealPromptStyle;
  return (
    <Sub title={tr('색')} aside={<ThemeColorChip on={!rp.color} onClick={() => setPrompt({ color: '' })} />}>
      <div className={`fill-wrap ${rp.color ? '' : 'is-dimmed'}`}>
        <ColorField value={rp.color || s.accent} swatches={COLOR_SWATCHES} onChange={(color) => setPrompt({ color })} />
      </div>
    </Sub>
  );
}

const HINT_STAGES: [KeyHintStage, string][] = [
  ['start', tr('시작 전')],
  ['stop', tr('진행 중')],
  ['reveal', tr('공개 대기')],
  ['reset', tr('결과')],
];

/** 화면 아래 키 안내: 키 아이콘 표시 · 상태별 문구 */
export function KeyHintBlock() {
  const { s, setKeyHint } = usePanel();
  return (
    <>
      <Toggle label={tr('키 아이콘 표시')} checked={s.keyHint.showKey} onChange={(showKey) => setKeyHint({ showKey })} />
      <div className="row-2">
        {HINT_STAGES.map(([k, label]) => (
          <Field key={k} label={label}>
            <TextInput value={s.keyHint[k]} placeholder={tr('비우면 문구 없음')} onChange={(v) => setKeyHint({ [k]: v })} />
          </Field>
        ))}
      </div>
    </>
  );
}

export function Glow({ label, k }: { label: string; k: 'glowTitle' | 'glowDigits' | 'glowBorder' | 'glowResult' }) {
  const { d, setDesign } = usePanel();
  return <Range label={label} min={0} max={100} step={5} value={d[k]} onChange={(v) => setDesign({ [k]: v })} />;
}

/* ───── 화면 편집: 맞춤 · 정렬 · 회전 · 잠금/숨김 ───── */

export function ArrangeTools() {
  const { s, selected, act, onSelect } = usePanel();
  const allLocked = selected.length > 0 && selected.every((id) => getBox(s, id).locked);
  return (
    <>
      <Sub title={selected.length > 1 ? tr('맞춤 (선택한 개체 기준)') : tr('맞춤 (화면 기준)')}>
        <div className="tool-row">
          {(['left', 'center', 'right', 'top', 'middle', 'bottom', 'dist-h', 'dist-v'] as AlignKind[]).map((k) => (
            <button
              key={k}
              className="tool-btn is-lg"
              title={ALIGN_LABEL[k]}
              aria-label={ALIGN_LABEL[k]}
              disabled={k.startsWith('dist') && selected.length < 3}
              onClick={() => act((prev) => alignBoxes(prev, selected, k))}
            >
              {ALIGN_ICONS[k]}
            </button>
          ))}
        </div>
      </Sub>
      <Sub title={tr('정렬 순서')}>
        <div className="tool-row">
          {(
            [
              ['front', tr('맨 앞으로 가져오기 (Ctrl+Shift+])')],
              ['forward', tr('앞으로 가져오기 (Ctrl+])')],
              ['backward', tr('뒤로 보내기 (Ctrl+[)')],
              ['back', tr('맨 뒤로 보내기 (Ctrl+Shift+[)')],
            ] as [OrderKind, string][]
          ).map(([k, label]) => (
            <button key={k} className="tool-btn is-lg" title={label} aria-label={label} onClick={() => act((prev) => reorder(prev, selected, k))}>
              {ORDER_ICONS[k]}
            </button>
          ))}
          <span className="tool-sep" />
          <button
            className="tool-btn is-lg"
            title={tr('왼쪽으로 90° 회전')}
            aria-label={tr('왼쪽으로 90° 회전')}
            onClick={() => act((prev) => patchBoxes(prev, selected, (bx) => ({ r: normDeg(bx.r - 90) })))}
          >
            <RotateIcon dir={-1} />
          </button>
          <button
            className="tool-btn is-lg"
            title={tr('오른쪽으로 90° 회전')}
            aria-label={tr('오른쪽으로 90° 회전')}
            onClick={() => act((prev) => patchBoxes(prev, selected, (bx) => ({ r: normDeg(bx.r + 90) })))}
          >
            <RotateIcon dir={1} />
          </button>
        </div>
      </Sub>
      <Sub title={tr('표시')}>
        <Toggle label={tr('잠금 (화면에서 움직이지 않게)')} checked={allLocked} onChange={(locked) => act((prev) => patchBoxes(prev, selected, () => ({ locked })))} />
        <button
          className="ghost-btn with-icon"
          onClick={() => {
            act((prev) => patchBoxes(prev, selected, () => ({ hidden: true })));
            onSelect([]);
          }}
        >
          <EyeOffIcon />
          {tr('화면에서 숨기기')}
        </button>
      </Sub>
    </>
  );
}

/* ───── 글자 효과 (자간 · 행간 · 외곽선 · 그림자) ───── */

/** 값만 받는 편집 칸 — 기본 요소와 텍스트 상자에서 함께 씀 */
export function TextFxFields({ value: fx, onChange, digits }: { value: TextFx; onChange: (fx: TextFx) => void; digits?: boolean }) {
  const set = (patch: Partial<TextFx>) => onChange({ ...fx, ...patch });
  return (
    <>
      {!digits && (
        <>
          <Toggle label={tr('자간 직접 지정')} checked={fx.tracking !== null} onChange={(v) => set({ tracking: v ? 0 : null })} />
          {fx.tracking !== null && (
            <Range
              label={tr('자간')}
              min={-0.2}
              max={1}
              step={0.01}
              value={fx.tracking}
              onChange={(tracking) => set({ tracking })}
              output={<NumberInput value={fx.tracking} min={-1} max={3} decimals={2} suffix="em" onCommit={(tracking) => set({ tracking })} />}
            />
          )}
          <Toggle label={tr('행간 직접 지정')} checked={fx.lineHeight !== null} onChange={(v) => set({ lineHeight: v ? 1.2 : null })} />
          {fx.lineHeight !== null && <Range label={tr('행간')} min={0.6} max={2.5} step={0.05} value={fx.lineHeight} onChange={(lineHeight) => set({ lineHeight })} />}
        </>
      )}
      <Range label={tr('외곽선')} min={0} max={12} step={0.5} value={fx.stroke} onChange={(stroke) => set({ stroke })} suffix="px" />
      {fx.stroke > 0 && <ColorField value={fx.strokeColor} swatches={['#000000', '#ffffff', '#111111', '#00e5ff', '#ff2e88']} onChange={(strokeColor) => set({ strokeColor })} />}
      <Range label={tr('그림자 흐림')} min={0} max={40} step={1} value={fx.shadow} onChange={(shadow) => set({ shadow })} suffix="px" />
      <Range label={tr('그림자 거리')} min={0} max={20} step={1} value={fx.shadowOffset} onChange={(shadowOffset) => set({ shadowOffset })} suffix="px" />
      {(fx.shadow > 0 || fx.shadowOffset > 0) && (
        <ColorField value={fx.shadowColor} swatches={['#000000aa', '#00000066', '#ffffff88', '#00e5ff99']} onChange={(shadowColor) => set({ shadowColor })} />
      )}
    </>
  );
}

/** 디자인의 글자 효과 (타이틀 · 서브 · 숫자 · 결과) */
export function TextFxBlock({ target }: { target: TextFxTarget }) {
  const { d, onChange } = usePanel();
  return (
    <TextFxFields
      value={d.textFx[target]}
      digits={target === 'digits'}
      onChange={(fx) => onChange((prev) => ({ ...prev, design: { ...prev.design, textFx: { ...prev.design.textFx, [target]: fx } } }))}
    />
  );
}
