// 설정 패널 공용 컨트롤
import { useEffect, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { setPanelGesture } from '../../hooks/panelGesture';
import { EyeIcon, EyeOffIcon } from '../ui/Icons';
import { tr } from '../../i18n';

/* ───────── 레이아웃 ───────── */

interface SectionToggle {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

/** 카드 한 장. toggle 이 있으면 제목 옆 스위치로 켜고, 켜졌을 때만 내용(과 aside)을 보여줌 */
export function Section({
  title,
  hint,
  aside,
  toggle,
  children,
}: {
  title: string;
  hint?: ReactNode;
  aside?: ReactNode;
  toggle?: SectionToggle;
  children: ReactNode;
}) {
  const on = !toggle || toggle.checked;
  return (
    <section className={`card ${on ? '' : 'is-off'}`}>
      <div className="card-head">
        <div className="card-title">
          <h3>{title}</h3>
          {hint && <p className="card-hint">{hint}</p>}
        </div>
        {on && aside && <span className="card-aside">{aside}</span>}
        {toggle && (
          <label className={`toggle ${toggle.disabled ? 'is-disabled' : ''}`} aria-label={title}>
            <input type="checkbox" checked={toggle.checked} disabled={toggle.disabled} onChange={(e) => toggle.onChange(e.target.checked)} />
            <i aria-hidden />
          </label>
        )}
      </div>
      {on && <div className="card-body">{children}</div>}
    </section>
  );
}

/** 접히는 카드. 접혀 있어도 meta 로 현재 값을 요약해 보여줌 */
export function Group({ title, meta, aside, defaultOpen, children }: { title: string; meta?: ReactNode; aside?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="card card-fold" open={defaultOpen}>
      <summary className="card-head">
        <div className="card-title">
          <h3>{title}</h3>
          {meta && <p className="card-hint">{meta}</p>}
        </div>
        {aside && <span className="card-aside">{aside}</span>}
        <Chevron />
      </summary>
      <div className="card-body">{children}</div>
    </details>
  );
}

/** 카드 안의 소제목 묶음 — 기능 단위로 나눠 간격·구분선을 줌 */
export function Sub({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="sub">
      <div className="sub-head">
        <span className="sub-label">{title}</span>
        {aside}
      </div>
      <div className="sub-body">{children}</div>
    </div>
  );
}

/** 라벨 + 내용 한 묶음 (aside 는 라벨 오른쪽) */
export function Field({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <div className="label-row">
        <Label>{label}</Label>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** 카드 안의 접히는 상세 설정 */
export function Fold({ title, meta, defaultOpen, children }: { title: string; meta?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="fold" open={defaultOpen}>
      <summary>
        <span className="fold-title">{title}</span>
        {meta && <span className="fold-meta">{meta}</span>}
        <Chevron />
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

export const Chevron = () => (
  <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const Label = ({ children }: { children: ReactNode }) => <span className="field-label">{children}</span>;

export const Hint = ({ children }: { children: ReactNode }) => <p className="hint-text">{children}</p>;

export function ThemeColorChip({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className={`chip chip-sm ${on ? 'is-on' : ''}`} onClick={onClick}>
      {tr('테마 색')}
    </button>
  );
}

/** 화면 미리보기 토글 — 켜져 있으면 끄기(눈 사선), 꺼져 있으면 켜기(눈) */
export function PreviewToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      className={`preview-btn ${on ? 'is-on' : ''}`}
      aria-pressed={on}
      onClick={(e) => {
        // Group(summary) 안에서 눌러도 접힘/펼침이 바뀌지 않도록
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      {on ? <EyeOffIcon /> : <EyeIcon />}
      {on ? tr('미리보기 끄기') : tr('미리보기')}
    </button>
  );
}

/* ───────── 입력 ───────── */

export function SecondsInput({ valueMs, onCommit }: { valueMs: number; onCommit: (ms: number) => void }) {
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
      <span>{tr('초')}</span>
    </div>
  );
}

export function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="text-input" type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

export function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
  suffix,
  output,
}: {
  label?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  /** 기본 숫자 표시 대신 렌더 (예: 직접 입력 필드) */
  output?: ReactNode;
}) {
  // 끄는 동안엔 자기 값으로 움직이고 패널 전체는 멈춤 (놓으면 다시 설정값을 따름)
  const [live, setLive] = useState<number | null>(null);
  const v = live ?? value;
  const end = () => {
    if (live === null) return;
    setLive(null);
    setPanelGesture(false);
  };
  const pct = Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  return (
    <div className="range">
      {label && <span className="field-label">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        style={{ '--pct': `${pct}%` } as CSSProperties}
        onPointerDown={() => {
          setLive(value);
          setPanelGesture(true);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onBlur={end}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (live !== null) setLive(n);
          onChange(n);
        }}
      />
      {output ?? (
        <output>
          {Number.isInteger(step) ? v : v.toFixed(1)}
          {suffix}
        </output>
      )}
    </div>
  );
}

/** 입력 중엔 자유롭게, blur/Enter 시 범위·자릿수 맞춰 반영 */
export function NumberInput({
  value,
  min,
  max,
  decimals,
  fixed,
  suffix,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  decimals: number;
  /** 소수 자릿수 고정 표시 (0.10) — 아니면 불필요한 0 제거 (0.1) */
  fixed?: boolean;
  suffix?: string;
  onCommit: (v: number) => void;
}) {
  const format = (v: number) => (fixed ? v.toFixed(decimals) : String(Number(v.toFixed(decimals))));
  const [draft, setDraft] = useState(format(value));
  useEffect(() => setDraft(format(value)), [value]);

  const commit = () => {
    const v = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(v)) return setDraft(format(value));
    const next = Number(Math.min(max, Math.max(min, v)).toFixed(decimals));
    onCommit(next);
    setDraft(format(next));
  };

  return (
    <label className="num-input">
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={1 / 10 ** decimals}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {suffix && <span>{suffix}</span>}
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
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

/** 위치 조절: 패드 드래그 · 방향키(Shift 는 5칸) · 수치 입력. 값은 -range ~ range (%) */
export function PositionPad({
  x,
  y,
  range,
  wide,
  onChange,
}: {
  x: number;
  y: number;
  range: number;
  /** 화면 비율(16:9) 패드 — 화면 기준 위치일 때 */
  wide?: boolean;
  onChange: (x: number, y: number) => void;
}) {
  const clamp = (v: number) => Math.round(Math.min(range, Math.max(-range, v)));
  const toPct = (v: number) => `${((clamp(v) + range) / (range * 2)) * 100}%`;

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onChange(clamp(((e.clientX - r.left) / r.width) * 2 * range - range), clamp(((e.clientY - r.top) / r.height) * 2 * range - range));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 5 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    onChange(clamp(x + d[0]), clamp(y + d[1]));
  };

  return (
    <div className="pos">
      <div
        className={`pos-pad ${wide ? 'is-wide' : ''}`}
        tabIndex={0}
        role="slider"
        aria-label={tr('위치')}
        aria-valuetext={tr('가로 {0}%, 세로 {1}%', x, y)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
        onKeyDown={onKey}
      >
        <span className="pos-dot" style={{ left: toPct(x), top: toPct(y) }} />
      </div>
      <div className="pos-fields">
        <div className="pos-field">
          <span>{tr('가로')}</span>
          <NumberInput value={x} min={-range} max={range} decimals={0} suffix="%" onCommit={(v) => onChange(v, y)} />
        </div>
        <div className="pos-field">
          <span>{tr('세로')}</span>
          <NumberInput value={y} min={-range} max={range} decimals={0} suffix="%" onCommit={(v) => onChange(x, v)} />
        </div>
        <button className="ghost-btn pos-reset" onClick={() => onChange(0, 0)} disabled={x === 0 && y === 0}>
          {tr('가운데')}
        </button>
      </div>
    </div>
  );
}

/** 드래그 영역의 포인터 → 0~1 비율. freezePanel 이면 끄는 동안 패널 전체를 다시 그리지 않음 */
export function dragHandlers(onMove: (fx: number, fy: number) => void, onEnd?: () => void, freezePanel = false) {
  const c = (v: number) => Math.min(1, Math.max(0, v));
  const move = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onMove(c((e.clientX - r.left) / r.width), c((e.clientY - r.top) / r.height));
  };
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (freezePanel) setPanelGesture(true);
      move(e);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e);
    },
    onPointerUp: () => {
      if (freezePanel) setPanelGesture(false);
      onEnd?.();
    },
    onPointerCancel: () => {
      if (freezePanel) setPanelGesture(false);
    },
  };
}
