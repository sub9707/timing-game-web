import { memo, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent } from 'react';
import { hsvToRgb, PALETTE_ROWS, parseHex, rgbToHsv, sameColor, toHex, withAlpha, type Hsva } from '../../design/color';
import { dragHandlers, NumberInput } from './controls';
import { tr } from '../../i18n';

/* ───────── 최근 사용한 색 (이 브라우저에만 저장) ───────── */

const RECENT_KEY = 'timer-game:recent-colors';
const RECENT_MAX = 11;

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((c) => typeof c === 'string' && parseHex(c)).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

let recent = readRecent();
const listeners = new Set<() => void>();

function pushRecent(color: string) {
  recent = [color, ...recent.filter((c) => !sameColor(c, color))].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const useRecent = () => useSyncExternalStore(subscribe, () => recent);

/* ───────── 색 견본 ───────── */

/** 투명도가 보이도록 체크무늬 위에 색을 얹음 */
export const swatchBg = (color: string) => `linear-gradient(${color}, ${color}), var(--checker)`;

/* ───────── 색 필드: 현재 색 + HEX + 추천 색, 누르면 전체 색 선택기 ───────── */

export function ColorField({
  value,
  swatches = [],
  alpha = true,
  onChange,
}: {
  value: string;
  swatches?: string[];
  /** 투명도 조절 허용 */
  alpha?: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const openedWith = useRef(value);

  const toggle = () => {
    if (open && !sameColor(openedWith.current, value)) pushRecent(value);
    openedWith.current = value;
    setOpen(!open);
  };

  return (
    <div className={`color-field ${open ? 'is-open' : ''}`}>
      <div className="color-row">
        <button className="color-current" style={{ background: swatchBg(value) }} onClick={toggle} aria-label={tr('색 선택기 열기')} aria-expanded={open} />
        <HexInput value={value} alpha={alpha} onCommit={onChange} />
        <button className={`chip chip-sm more-colors ${open ? 'is-on' : ''}`} onClick={toggle}>
          {open ? tr('닫기') : tr('더 많은 색')}
        </button>
      </div>
      {swatches.length > 0 && (
        <div className="swatches">
          {swatches.map((c) => (
            <button
              key={c}
              className={`swatch ${sameColor(c, value) ? 'is-on' : ''}`}
              style={{ background: swatchBg(c) }}
              onClick={() => onChange(alpha ? c : withAlpha(c, 1))}
              aria-label={c}
            />
          ))}
        </div>
      )}
      {open && <ColorPicker value={value} alpha={alpha} onChange={onChange} />}
    </div>
  );
}

function HexInput({ value, alpha, onCommit }: { value: string; alpha: boolean; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value.toUpperCase());
  useEffect(() => setDraft(value.toUpperCase()), [value]);

  const commit = () => {
    const rgba = parseHex(draft);
    if (!rgba) return setDraft(value.toUpperCase());
    const next = toHex(alpha ? rgba : { ...rgba, a: 1 });
    onCommit(next);
    setDraft(next.toUpperCase());
  };

  return (
    <input
      className="hex-input"
      type="text"
      spellCheck={false}
      maxLength={9}
      value={draft}
      aria-label={tr('HEX 색 코드')}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

/* ───────── 전체 색 선택기 ───────── */

const toHsv = (c: string): Hsva => rgbToHsv(parseHex(c) ?? { r: 255, g: 255, b: 255, a: 1 });

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

export function ColorPicker({ value, alpha = true, onChange }: { value: string; alpha?: boolean; onChange: (v: string) => void }) {
  const [hsv, setHsv] = useState(() => toHsv(value));
  // 채도 0 일 때 색상(hue)이 날아가지 않도록 내부 HSV 를 유지하고, 밖에서 바뀐 경우에만 동기화
  const emitted = useRef(value);
  useEffect(() => {
    if (!sameColor(value, emitted.current)) {
      emitted.current = value;
      setHsv(toHsv(value));
    }
  }, [value]);

  const emit = (next: Hsva) => {
    hsvRef.current = next;
    setHsv(next);
    const hex = toHex(hsvToRgb(next));
    emitted.current = hex;
    onChange(hex);
  };
  const pick = (c: string) => {
    const next = toHsv(c);
    emit(alpha ? next : { ...next, a: 1 });
  };

  const recentColors = useRecent();
  // 메모된 팔레트가 항상 최신 값으로 고르도록
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const EyeDropper = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;

  const hueColor = toHex(hsvToRgb({ h: hsv.h, s: 1, v: 1, a: 1 }));
  const opaque = toHex(hsvToRgb({ ...hsv, a: 1 }));

  const keyStep = (e: KeyboardEvent, apply: (d: number) => void) => {
    const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    if (!d) return;
    e.preventDefault();
    apply(d * (e.shiftKey ? 10 : 1));
  };
  const c01 = (v: number) => Math.min(1, Math.max(0, v));

  return (
    <div className="picker">
      <div
        className="picker-sv"
        style={{ '--hue': hueColor } as CSSProperties}
        tabIndex={0}
        role="slider"
        aria-label={tr('채도·명도')}
        aria-valuetext={tr('채도 {0}%, 명도 {1}%', Math.round(hsv.s * 100), Math.round(hsv.v * 100))}
        {...dragHandlers((fx, fy) => emit({ ...hsvRef.current, s: fx, v: 1 - fy }), undefined, true)}
        onKeyDown={(e) => {
          const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
          if (!d) return;
          e.preventDefault();
          const k = e.shiftKey ? 0.1 : 0.01;
          emit({ ...hsv, s: c01(hsv.s + d[0] * k), v: c01(hsv.v + d[1] * k) });
        }}
      >
        <span className="picker-dot" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: opaque }} />
      </div>

      <div className="picker-sliders">
        <div className="picker-bars">
          <div
            className="picker-bar picker-hue"
            tabIndex={0}
            role="slider"
            aria-label={tr('색상')}
            aria-valuenow={Math.round(hsv.h)}
            {...dragHandlers((fx) => emit({ ...hsvRef.current, h: fx * 360 }), undefined, true)}
            onKeyDown={(e) => keyStep(e, (d) => emit({ ...hsv, h: (hsv.h + d + 360) % 360 }))}
          >
            <span className="picker-knob" style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }} />
          </div>
          {alpha && (
            <div
              className="picker-bar picker-alpha"
              style={{ '--opaque': opaque } as CSSProperties}
              tabIndex={0}
              role="slider"
              aria-label={tr('불투명도')}
              aria-valuenow={Math.round(hsv.a * 100)}
              {...dragHandlers((fx) => emit({ ...hsvRef.current, a: Math.round(fx * 100) / 100 }), undefined, true)}
              onKeyDown={(e) => keyStep(e, (d) => emit({ ...hsv, a: c01(Math.round(hsv.a * 100 + d) / 100) }))}
            >
              <span className="picker-knob" style={{ left: `${hsv.a * 100}%`, background: swatchBg(toHex(hsvToRgb(hsv))) }} />
            </div>
          )}
        </div>
        {EyeDropper && (
          <button
            className="picker-eyedrop"
            aria-label={tr('화면에서 색 추출')}
            title={tr('화면에서 색 추출')}
            onClick={() =>
              new EyeDropper()
                .open()
                .then((r) => pick(r.sRGBHex))
                .catch(() => undefined)
            }
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m2 22 1-1h3l9-9M3 21v-3l9-9M15 6l3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
            </svg>
          </button>
        )}
      </div>

      <div className="picker-values">
        {(['r', 'g', 'b'] as const).map((ch) => {
          const rgb = hsvToRgb(hsv);
          return (
            <div key={ch} className="picker-value">
              <NumberInput
                value={Math.round(rgb[ch])}
                min={0}
                max={255}
                decimals={0}
                onCommit={(v) => emit(rgbToHsv({ ...rgb, [ch]: v }))}
              />
              <span>{ch.toUpperCase()}</span>
            </div>
          );
        })}
        {alpha && (
          <div className="picker-value">
            <NumberInput value={Math.round(hsv.a * 100)} min={0} max={100} decimals={0} onCommit={(v) => emit({ ...hsv, a: v / 100 })} />
            <span>{tr('불투명도 %')}</span>
          </div>
        )}
      </div>

      <Palette current={opaque} onPick={(c) => pickRef.current(withAlpha(c, hsvRef.current.a))} />

      {recentColors.length > 0 && (
        <div className="picker-recent">
          <span className="field-label">{tr('최근 사용')}</span>
          <div className="palette-row">
            {recentColors.map((c) => (
              <button key={c} className="palette-cell" style={{ background: swatchBg(c) }} onClick={() => pick(c)} aria-label={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 77칸 팔레트 — 선택 표시가 바뀔 때만 다시 그림 (드래그 중 매 프레임 그리지 않게) */
const Palette = memo(
  function Palette({ current, onPick }: { current: string; onPick: (c: string) => void }) {
    return (
      <div className="palette" role="group" aria-label={tr('팔레트')}>
        {PALETTE_ROWS.map((row, i) => (
          <div key={i} className={`palette-row ${i === 0 ? 'is-gray' : ''}`}>
            {row.map((c) => (
              <button key={c} className={`palette-cell ${sameColor(c, current) ? 'is-on' : ''}`} style={{ background: c }} onClick={() => onPick(c)} aria-label={c} />
            ))}
          </div>
        ))}
      </div>
    );
  },
  (a, b) => a.current === b.current || (!PALETTE_SET.has(a.current.toLowerCase()) && !PALETTE_SET.has(b.current.toLowerCase())),
);
const PALETTE_SET = new Set(PALETTE_ROWS.flat().map((c) => c.toLowerCase()));
