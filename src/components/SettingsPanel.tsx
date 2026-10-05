import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { fillGradient } from '../design';
import { clampWeight, FONT_IDS, FONTS } from '../fonts';
import { keyLabel, RESERVED_KEYS } from '../keys';
import { DEFAULT_SETTINGS, toleranceMs } from '../settings';
import { COLOR_SWATCHES, FILL_PRESETS, getTheme, GRADIENT_PRESETS, SOLID_SWATCHES, THEMES } from '../themes';
import type { BackgroundSetting, BgMode, DesignSetting, Fill, FontId, Settings, ThemeId } from '../types';
import { backgroundCss, gradientCss } from './Background';
import { CloseIcon, EyeOffIcon, ImageIcon, PlusIcon } from './Icons';

interface Props {
  open: boolean;
  settings: Settings;
  onChange: (updater: (s: Settings) => Settings) => void;
  imageUrl: string | null;
  onImage: (file: File) => void;
  onClearImage: () => void;
  onClose: () => void;
}

const TARGET_CHIPS = [5, 10, 15, 19, 30, 60];

export function SettingsPanel({ open, settings: s, onChange, imageUrl, onImage, onClearImage, onClose }: Props) {
  const set = (patch: Partial<Settings>) => onChange((prev) => ({ ...prev, ...patch }));
  const setBg = (patch: Partial<BackgroundSetting>) => onChange((prev) => ({ ...prev, bg: { ...prev.bg, ...patch } }));
  const setGradient = (patch: Partial<BackgroundSetting['gradient']>) =>
    onChange((prev) => ({ ...prev, bg: { ...prev.bg, gradient: { ...prev.bg.gradient, ...patch } } }));

  const setDesign = (patch: Partial<DesignSetting>) => onChange((prev) => ({ ...prev, design: { ...prev.design, ...patch } }));
  const d = s.design;

  const applyTheme = (id: ThemeId) => {
    const t = THEMES.find((x) => x.id === id)!;
    onChange((prev) => ({
      ...prev,
      theme: id,
      accent: t.accent,
      text: t.text,
      design: structuredClone(t.design),
      // 이미지 배경을 쓰는 중이면 이미지는 유지
      bg: prev.bg.mode === 'image' ? { ...structuredClone(t.bg), mode: 'image', imageDim: prev.bg.imageDim, imageBlur: prev.bg.imageBlur } : structuredClone(t.bg),
    }));
  };

  /** 한 키는 한 역할만. 진행 키는 최소 1개 유지 */
  const setKeys = (field: 'actionKeys' | 'resetKeys', keys: string[]) =>
    onChange((prev) => {
      const other = field === 'actionKeys' ? 'resetKeys' : 'actionKeys';
      const otherKeys = prev[other].filter((k) => !keys.includes(k));
      if (other === 'actionKeys' && otherKeys.length === 0) return prev;
      return { ...prev, [field]: keys, [other]: otherKeys };
    });

  const tol = toleranceMs(s);
  const [tab, setTab] = useState<'game' | 'design'>('game');
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    if (!open) setConfirmReset(false);
  }, [open]);

  return (
    <>
      <div className={`scrim ${open ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`panel ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open}>
        <header className="panel-head">
          <div className="tabs" style={{ '--i': tab === 'game' ? 0 : 1 } as CSSProperties}>
            <span className="tabs-thumb" aria-hidden />
            <button className={tab === 'game' ? 'is-on' : ''} onClick={() => setTab('game')}>
              게임
            </button>
            <button className={tab === 'design' ? 'is-on' : ''} onClick={() => setTab('design')}>
              디자인
            </button>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <CloseIcon />
          </button>
        </header>

        <div className="panel-body" key={tab}>
          {tab === 'game' && (
            <>
          <Section title="목표 시간">
            <SecondsInput valueMs={s.targetMs} onCommit={(ms) => set({ targetMs: ms })} />
            <div className="chips">
              {TARGET_CHIPS.map((sec) => (
                <button key={sec} className={`chip ${s.targetMs === sec * 1000 ? 'is-on' : ''}`} onClick={() => set({ targetMs: sec * 1000 })}>
                  {sec}s
                </button>
              ))}
            </div>
          </Section>

          <Section title="허용 오차" aside={s.tolerancePct === 0 ? '정확히' : `±${(tol / 1000).toFixed(2)}s`}>
            <Range min={0} max={10} step={0.1} value={s.tolerancePct} onChange={(v) => set({ tolerancePct: v })} suffix="%" />
            <p className="hint-text">
              {s.tolerancePct === 0
                ? `${(s.targetMs / 1000).toFixed(2)}s 에 정확히 멈춰야 성공`
                : `${((s.targetMs - tol) / 1000).toFixed(2)}s ~ ${((s.targetMs + tol) / 1000).toFixed(2)}s 성공`}
            </p>
          </Section>

          <Section title="조작 키">
            <div className="key-row">
              <span className="field-label">시작 · 정지</span>
              <KeyList keys={s.actionKeys} min={1} onChange={(k) => setKeys('actionKeys', k)} />
            </div>
            <div className="key-row">
              <span className="field-label">리셋</span>
              <KeyList keys={s.resetKeys} min={0} onChange={(k) => setKeys('resetKeys', k)} />
            </div>
            <p className="hint-text">{s.resetKeys.length ? '리셋 키로만 결과를 넘길 수 있어요' : '비워두면 시작 키로 리셋'}</p>
          </Section>

          <Section title="타이머">
            <Toggle label="목표 시간 표시" checked={s.showTarget} onChange={(v) => set({ showTarget: v })} />
            <Toggle
              label={
                <span className="with-icon">
                  <EyeOffIcon /> 블라인드
                </span>
              }
              checked={s.blind}
              onChange={(v) => set({ blind: v })}
            />
            {s.blind && (
              <Range
                min={0}
                max={Math.max(1, Math.floor(s.targetMs / 1000))}
                step={0.5}
                value={s.blindAfterMs / 1000}
                onChange={(v) => set({ blindAfterMs: v * 1000 })}
                suffix="s 후 숨김"
              />
            )}
          </Section>

          <Section title="문구">
            <TextInput placeholder="메인 타이틀" value={s.mainTitle} onChange={(v) => set({ mainTitle: v })} />
            <TextInput placeholder="서브 타이틀" value={s.subTitle} onChange={(v) => set({ subTitle: v })} />
          </Section>

          <Section title="결과 문구">
            <div className="row-2">
              <TextInput placeholder="성공" value={s.successText} onChange={(v) => set({ successText: v })} />
              <TextInput placeholder="실패" value={s.failText} onChange={(v) => set({ failText: v })} />
            </div>
          </Section>
            </>
          )}

          {tab === 'design' && (
            <>
          <Section
            title="테마"
            aside={
              <button className="link-btn" onClick={() => setDesign(structuredClone(getTheme(s.theme).design))}>
                디자인 되돌리기
              </button>
            }
          >
            <div className="theme-grid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-card theme-${t.id} ${s.theme === t.id ? 'is-on' : ''}`}
                  style={
                    {
                      background: backgroundCss(t.bg),
                      '--accent': t.design.borderFill.mode === 'solid' ? t.design.borderFill.color : t.design.borderFill.stops[1],
                      '--text': t.design.digitFill.color,
                      '--font-digit': FONTS[t.design.digitFont].family,
                      '--digit-weight': t.design.digitWeight,
                    } as CSSProperties
                  }
                  onClick={() => applyTheme(t.id)}
                >
                  <span className="tc-frame">
                    <span className="tc-digits">00:15</span>
                  </span>
                  <span className="tc-name">{t.name}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="배경">
            <Segmented<BgMode>
              value={s.bg.mode}
              onChange={(mode) => setBg({ mode })}
              options={[
                ['solid', '단색'],
                ['gradient', '그라데이션'],
                ['image', '이미지'],
              ]}
            />

            {s.bg.mode === 'solid' && (
              <ColorField value={s.bg.solid} swatches={SOLID_SWATCHES} onChange={(solid) => setBg({ solid })} />
            )}

            {s.bg.mode === 'gradient' && (
              <>
                <div className="gradient-preview" style={{ background: gradientCss(s.bg.gradient) }} />
                <Segmented<'linear' | 'radial'>
                  value={s.bg.gradient.type}
                  onChange={(type) => setGradient({ type })}
                  options={[
                    ['linear', '선형'],
                    ['radial', '원형'],
                  ]}
                />
                {s.bg.gradient.type === 'linear' && (
                  <Range min={0} max={360} step={5} value={s.bg.gradient.angle} onChange={(angle) => setGradient({ angle })} suffix="°" />
                )}
                <StopsEditor stops={s.bg.gradient.stops} onChange={(stops) => setGradient({ stops })} />
                <div className="swatches">
                  {GRADIENT_PRESETS.map((stops, i) => (
                    <button
                      key={i}
                      className="swatch swatch-wide"
                      style={{ background: `linear-gradient(135deg, ${stops.join(', ')})` }}
                      onClick={() => setGradient({ stops: [...stops] })}
                      aria-label="그라데이션 프리셋"
                    />
                  ))}
                </div>
              </>
            )}

            {s.bg.mode === 'image' && (
              <>
                <label className={`dropzone ${imageUrl ? 'has-image' : ''}`} style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onImage(f);
                      e.target.value = '';
                    }}
                  />
                  {!imageUrl && (
                    <span className="dropzone-empty">
                      <ImageIcon />
                      이미지 선택
                    </span>
                  )}
                </label>
                {imageUrl && (
                  <>
                    <Range label="어둡게" min={0} max={90} step={1} value={s.bg.imageDim} onChange={(imageDim) => setBg({ imageDim })} suffix="%" />
                    <Range label="블러" min={0} max={30} step={1} value={s.bg.imageBlur} onChange={(imageBlur) => setBg({ imageBlur })} suffix="px" />
                    <button className="ghost-btn" onClick={onClearImage}>
                      이미지 삭제
                    </button>
                  </>
                )}
              </>
            )}
          </Section>

          <Section title="색상">
            <Label>포인트 (성공 · 글로우)</Label>
            <ColorField value={s.accent} swatches={COLOR_SWATCHES} onChange={(accent) => set({ accent })} />
            <Label>보조 텍스트</Label>
            <ColorField value={s.text} swatches={['#ffffff', '#f6e7c1', '#eafcff', '#111111', '#5a3d6e', '#c9ffd6']} onChange={(text) => set({ text })} />
          </Section>

          <Group title="타이틀">
            <FontPicker value={d.titleFont} sample="가Aa" onChange={(titleFont) => setDesign({ titleFont, titleWeight: clampWeight(titleFont, d.titleWeight) })} />
            <WeightRange font={d.titleFont} value={d.titleWeight} onChange={(titleWeight) => setDesign({ titleWeight })} />
            <Range label="메인 크기" min={40} max={180} step={5} value={d.titleScale} onChange={(titleScale) => setDesign({ titleScale })} suffix="%" />
            <Range label="서브 크기" min={50} max={200} step={5} value={d.subScale} onChange={(subScale) => setDesign({ subScale })} suffix="%" />
            <Toggle label="기울임" checked={d.titleItalic} onChange={(titleItalic) => setDesign({ titleItalic })} />
            <FillField value={d.titleFill} onChange={(titleFill) => setDesign({ titleFill })} />
          </Group>

          <Group title="타이머 숫자">
            <FontPicker value={d.digitFont} sample="12" onChange={(digitFont) => setDesign({ digitFont, digitWeight: clampWeight(digitFont, d.digitWeight) })} />
            <WeightRange font={d.digitFont} value={d.digitWeight} onChange={(digitWeight) => setDesign({ digitWeight })} />
            <Range label="크기" min={50} max={140} step={5} value={d.digitScale} onChange={(digitScale) => setDesign({ digitScale })} suffix="%" />
            <Toggle label="기울임" checked={d.digitItalic} onChange={(digitItalic) => setDesign({ digitItalic })} />
            <FillField value={d.digitFill} onChange={(digitFill) => setDesign({ digitFill })} />
          </Group>

          <Group title="테두리">
            <Segmented<string>
              value={String(d.borderLines)}
              onChange={(v) => setDesign({ borderLines: Number(v) })}
              options={[
                ['0', '없음'],
                ['1', '1줄'],
                ['2', '2줄'],
                ['3', '3줄'],
              ]}
            />
            {d.borderLines > 0 && (
              <>
                <Range label="두께" min={0.5} max={12} step={0.5} value={d.borderWidth} onChange={(borderWidth) => setDesign({ borderWidth })} suffix="px" />
                {d.borderLines > 1 && (
                  <Range label="간격" min={2} max={30} step={1} value={d.borderGap} onChange={(borderGap) => setDesign({ borderGap })} suffix="px" />
                )}
                <Segmented<DesignSetting['borderSides']>
                  value={d.borderSides}
                  onChange={(borderSides) => setDesign({ borderSides })}
                  options={[
                    ['all', '전체'],
                    ['y', '위·아래'],
                    ['top', '위'],
                  ]}
                />
                {d.borderFill.mode === 'solid' && (
                  <Segmented<DesignSetting['borderStyle']>
                    value={d.borderStyle}
                    onChange={(borderStyle) => setDesign({ borderStyle })}
                    options={[
                      ['solid', '실선'],
                      ['dashed', '대시'],
                      ['dotted', '점선'],
                    ]}
                  />
                )}
                <FillField value={d.borderFill} onChange={(borderFill) => setDesign({ borderFill })} />
              </>
            )}
            <Range label="모서리" min={0} max={80} step={1} value={d.borderRadius} onChange={(borderRadius) => setDesign({ borderRadius })} suffix="px" />
            <Range label="판 배경" min={0} max={100} step={5} value={d.frameBg} onChange={(frameBg) => setDesign({ frameBg })} suffix="%" />
          </Group>

          <Group title="글로우">
            <Range label="타이틀" min={0} max={100} step={5} value={d.glowTitle} onChange={(glowTitle) => setDesign({ glowTitle })} />
            <Range label="타이머" min={0} max={100} step={5} value={d.glowDigits} onChange={(glowDigits) => setDesign({ glowDigits })} />
            <Range label="테두리" min={0} max={100} step={5} value={d.glowBorder} onChange={(glowBorder) => setDesign({ glowBorder })} />
            <Range label="결과" min={0} max={100} step={5} value={d.glowResult} onChange={(glowResult) => setDesign({ glowResult })} />
          </Group>
            </>
          )}
        </div>

        <footer className="panel-foot">
          <button
            className={`ghost-btn ${confirmReset ? 'is-danger' : ''}`}
            onClick={() => {
              if (!confirmReset) return setConfirmReset(true);
              onChange(() => structuredClone(DEFAULT_SETTINGS));
              setConfirmReset(false);
            }}
          >
            {confirmReset ? '한 번 더 누르면 초기화' : '초기화'}
          </button>
          <button className="primary-btn" onClick={onClose}>
            완료
          </button>
        </footer>
      </aside>
    </>
  );
}

/* ───────── controls ───────── */

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h3>{title}</h3>
        {aside && <span className="section-aside">{aside}</span>}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

const Label = ({ children }: { children: ReactNode }) => <span className="field-label">{children}</span>;

function SecondsInput({ valueMs, onCommit }: { valueMs: number; onCommit: (ms: number) => void }) {
  const [draft, setDraft] = useState((valueMs / 1000).toFixed(2));
  useEffect(() => setDraft((valueMs / 1000).toFixed(2)), [valueMs]);

  const commit = () => {
    const v = Number(draft);
    if (!Number.isFinite(v) || v <= 0) return setDraft((valueMs / 1000).toFixed(2));
    const ms = Math.round(Math.min(v, 3599.99) * 100) * 10;
    onCommit(ms);
    setDraft((ms / 1000).toFixed(2));
  };

  return (
    <div className="seconds-input">
      <input
        type="number"
        inputMode="decimal"
        min={0.01}
        max={3599.99}
        step={0.01}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <span>초</span>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="text-input" type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
  suffix,
}: {
  label?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="range">
      {label && <span className="field-label">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--pct': `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output>
        {Number.isInteger(step) ? value : value.toFixed(1)}
        {suffix}
      </output>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
    </label>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const idx = options.findIndex(([v]) => v === value);
  return (
    <div className="segmented" style={{ '--n': options.length, '--i': idx } as CSSProperties}>
      <span className="segmented-thumb" aria-hidden />
      {options.map(([v, label]) => (
        <button key={v} className={v === value ? 'is-on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function ColorField({ value, swatches, onChange }: { value: string; swatches: string[]; onChange: (v: string) => void }) {
  return (
    <div className="color-field">
      <label className="color-current" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
      <div className="swatches">
        {swatches.map((c) => (
          <button
            key={c}
            className={`swatch ${c.toLowerCase() === value.toLowerCase() ? 'is-on' : ''}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={c}
          />
        ))}
      </div>
    </div>
  );
}

function KeyList({ keys, min, onChange }: { keys: string[]; min: number; onChange: (keys: string[]) => void }) {
  const [capturing, setCapturing] = useState(false);

  return (
    <div className="keys">
      {keys.map((k) => (
        <span key={k} className="keycap">
          {keyLabel(k)}
          {keys.length > min && (
            <button className="keycap-remove" aria-label="제거" onClick={() => onChange(keys.filter((x) => x !== k))}>
              ×
            </button>
          )}
        </span>
      ))}
      {keys.length < 4 && (
        <button
          className={`key-add ${capturing ? 'is-capturing' : ''}`}
          data-key-capture
          aria-label="키 추가"
          onClick={() => setCapturing(true)}
          onBlur={() => setCapturing(false)}
          onKeyDown={(e) => {
            if (!capturing) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.repeat || RESERVED_KEYS.includes(e.code)) return;
            if (e.key !== 'Escape' && !keys.includes(e.code)) onChange([...keys, e.code]);
            setCapturing(false);
          }}
        >
          {capturing ? '키 입력…' : <PlusIcon />}
        </button>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary>
        {title}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

function FontPicker({ value, sample, onChange }: { value: FontId; sample: string; onChange: (id: FontId) => void }) {
  return (
    <div className="font-grid">
      {FONT_IDS.map((id) => (
        <button key={id} className={`font-chip ${id === value ? 'is-on' : ''}`} onClick={() => onChange(id)}>
          <span className="font-sample" style={{ fontFamily: FONTS[id].family }}>
            {sample}
          </span>
          <span className="font-name">{FONTS[id].label}</span>
        </button>
      ))}
    </div>
  );
}

function WeightRange({ font, value, onChange }: { font: FontId; value: number; onChange: (v: number) => void }) {
  const [min, max] = FONTS[font].weights;
  if (min === max) return null;
  return <Range label="굵기" min={min} max={max} step={100} value={value} onChange={onChange} />;
}

function StopsEditor({ stops, onChange }: { stops: string[]; onChange: (stops: string[]) => void }) {
  return (
    <div className="stops">
      {stops.map((c, i) => (
        <div key={i} className="stop">
          <input type="color" value={c} onChange={(e) => onChange(stops.map((x, j) => (j === i ? e.target.value : x)))} />
          {stops.length > 2 && (
            <button className="stop-remove" aria-label="색 제거" onClick={() => onChange(stops.filter((_, j) => j !== i))}>
              ×
            </button>
          )}
        </div>
      ))}
      {stops.length < 4 && (
        <button className="stop-add" aria-label="색 추가" onClick={() => onChange([...stops, stops.at(-1)!])}>
          <PlusIcon />
        </button>
      )}
    </div>
  );
}

/** 단색 / 그라데이션 채우기 편집 (텍스트·테두리 공용) */
function FillField({ value: f, onChange }: { value: Fill; onChange: (f: Fill) => void }) {
  const set = (patch: Partial<Fill>) => onChange({ ...f, ...patch });
  // 단색에서 처음 전환하면 같은 색 두 개라 변화가 안 보이므로 기본 대비색을 채움
  const toGradient = () =>
    set(f.stops.every((c) => c === f.stops[0]) ? { mode: 'gradient', stops: [f.color, '#8a8a8a'] } : { mode: 'gradient' });

  return (
    <>
      <Segmented<Fill['mode']>
        value={f.mode}
        onChange={(mode) => (mode === 'gradient' ? toGradient() : set({ mode }))}
        options={[
          ['solid', '단색'],
          ['gradient', '그라데이션'],
        ]}
      />
      {f.mode === 'solid' ? (
        <ColorField value={f.color} swatches={COLOR_SWATCHES} onChange={(color) => set({ color })} />
      ) : (
        <>
          <div className="gradient-preview is-thin" style={{ background: fillGradient(f) }} />
          <Range label="각도" min={0} max={360} step={5} value={f.angle} onChange={(angle) => set({ angle })} suffix="°" />
          <StopsEditor stops={f.stops} onChange={(stops) => set({ stops })} />
          <div className="swatches">
            {FILL_PRESETS.map((stops, i) => (
              <button
                key={i}
                className="swatch swatch-wide"
                style={{ background: `linear-gradient(135deg, ${stops.join(', ')})` }}
                onClick={() => set({ stops: [...stops] })}
                aria-label="그라데이션 프리셋"
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
