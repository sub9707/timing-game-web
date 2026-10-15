import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { alphaOf, withAlpha } from '../../design/color';
import { colorAt, evenStops, gradientCss, MAX_STOPS, MIN_STOPS, sortStops, stopsBarCss } from '../../design/gradient';
import type { Fill, Gradient } from '../../types';
import { ColorField } from './ColorPicker';
import { Field, NumberInput, PositionPad, Range, Segmented, Sub, Toggle } from './controls';
import { PlusIcon } from '../ui/Icons';
import { tr } from '../../i18n';

/** 선형: 시작 칸 → 반대쪽으로 흐르는 방향 (3×3 배치, 가운데 없음) */
const LINEAR_DIRS: (number | null)[] = [135, 180, 225, 90, null, 270, 45, 0, 315];
/** 방사형·원뿔형: 중심 위치 (3×3) */
const CENTERS: [number, number][] = [0, 50, 100].flatMap((cy) => [0, 50, 100].map((cx) => [cx, cy] as [number, number]));

const TYPE_LABEL: Record<Gradient['type'], string> = { linear: tr('선형'), radial: tr('방사형'), conic: tr('원뿔형') };

/** 그라데이션 편집기 (배경·텍스트·테두리 공용) — 파워포인트의 그라데이션 채우기와 같은 구성 */
export function GradientEditor<G extends Gradient>({
  value: g,
  onChange,
  presets,
  previewHeight,
}: {
  value: G;
  onChange: (g: G) => void;
  /** 색 목록이면 현재 종류·방향을 유지하고 색만, Gradient 면 통째로 적용 */
  presets?: (string[] | Gradient)[];
  previewHeight?: number;
}) {
  const set = (patch: Partial<Gradient>) => onChange({ ...g, ...patch });
  const [sel, setSel] = useState(0);
  const cur = Math.min(sel, g.stops.length - 1);
  const stop = g.stops[cur];

  const setStop = (patch: Partial<Gradient['stops'][number]>) => set({ stops: g.stops.map((s, i) => (i === cur ? { ...s, ...patch } : s)) });

  const addStop = (pos?: number) => {
    if (g.stops.length >= MAX_STOPS) return;
    // 위치를 안 주면 선택한 정지점과 다음 정지점 사이 (끝이면 앞쪽 사이)
    if (pos === undefined) {
      const sorted = sortStops(g.stops);
      const k = sorted.indexOf(stop);
      const a = sorted[k === sorted.length - 1 ? k - 1 : k];
      const b = sorted[k === sorted.length - 1 ? k : k + 1];
      pos = Math.round((a.pos + b.pos) / 2);
    }
    set({ stops: [...g.stops, { color: colorAt(g.stops, pos), pos }] });
    setSel(g.stops.length);
  };

  const removeStop = () => {
    if (g.stops.length <= MIN_STOPS) return;
    set({ stops: g.stops.filter((_, i) => i !== cur) });
    setSel(Math.max(0, cur - 1));
  };

  /* 정지점 막대 */
  const track = useRef<HTMLDivElement>(null);
  const posFrom = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    return Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
  };

  const thumbs = g.type === 'linear' ? LINEAR_DIRS : CENTERS;

  return (
    <div className="grad-editor">
      <div className="gradient-preview" style={{ height: previewHeight }}>
        <span style={{ background: gradientCss(g) }} />
      </div>

      <Sub title={tr('종류')}>
        <Segmented<Gradient['type']>
          value={g.type}
          onChange={(type) => set({ type })}
          options={(['linear', 'radial', 'conic'] as const).map((t) => [t, TYPE_LABEL[t]])}
        />
        {g.type === 'radial' && (
          <Segmented<Gradient['shape']>
            value={g.shape}
            onChange={(shape) => set({ shape })}
            options={[
              ['circle', tr('원')],
              ['ellipse', tr('타원')],
            ]}
          />
        )}
      </Sub>

      <Sub title={g.type === 'linear' ? tr('방향') : tr('중심')}>
        <div className="dir-grid">
          {thumbs.map((t, i) => {
            if (t === null) return <span key={i} className="dir-cell is-empty" aria-hidden />;
            const patch: Partial<Gradient> = typeof t === 'number' ? { angle: t } : { cx: t[0], cy: t[1] };
            const on = typeof t === 'number' ? g.angle === t : g.cx === t[0] && g.cy === t[1];
            return (
              <button
                key={i}
                className={`dir-cell ${on ? 'is-on' : ''}`}
                style={{ background: gradientCss({ ...g, ...patch, repeat: false }) }}
                onClick={() => set(patch)}
                aria-label={typeof t === 'number' ? tr('{0}도', t) : tr('중심 {0}% {1}%', t[0], t[1])}
              />
            );
          })}
        </div>
        {g.type !== 'radial' && (
          <Range
            label={tr('각도')}
            min={0}
            max={360}
            step={1}
            value={g.angle}
            onChange={(angle) => set({ angle })}
            output={<NumberInput value={g.angle} min={0} max={360} decimals={0} suffix="°" onCommit={(angle) => set({ angle })} />}
          />
        )}
        {g.type !== 'linear' && (
          <Field label={tr('중심 세부 위치')}>
            <PositionPad x={g.cx - 50} y={g.cy - 50} range={60} onChange={(x, y) => set({ cx: x + 50, cy: y + 50 })} />
          </Field>
        )}
      </Sub>

      <Sub
        title={tr('그라데이션 정지점')}
        aside={
          <span className="stop-tools">
            <span className="stop-count">
              {g.stops.length}/{MAX_STOPS}
            </span>
            <button className="tool-btn" onClick={() => addStop()} disabled={g.stops.length >= MAX_STOPS} aria-label={tr('정지점 추가')} title={tr('정지점 추가')}>
              <PlusIcon />
            </button>
            <button className="tool-btn" onClick={removeStop} disabled={g.stops.length <= MIN_STOPS} aria-label={tr('정지점 삭제')} title={tr('정지점 삭제')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M5 12h14" />
              </svg>
            </button>
            <button
              className="tool-btn"
              onClick={() => set({ stops: g.stops.map((s) => ({ ...s, pos: 100 - s.pos })) })}
              aria-label={tr('방향 뒤집기')}
              title={tr('색 순서 뒤집기')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 8h16l-4-4M20 16H4l4 4" />
              </svg>
            </button>
          </span>
        }
      >
        <div
          className="stop-track"
          ref={track}
          onPointerDown={(e) => {
            // 빈 곳을 누르면 그 위치에 정지점 추가
            if (e.target === e.currentTarget) addStop(posFrom(e));
          }}
          title={tr('빈 곳을 눌러 정지점 추가')}
        >
          <span className="stop-track-fill" style={{ background: stopsBarCss(g.stops) }} />
          {g.stops.map((s, i) => (
            <button
              key={i}
              className={`stop-handle ${i === cur ? 'is-on' : ''}`}
              style={{ left: `${s.pos}%`, '--c': s.color } as CSSProperties}
              aria-label={tr('정지점 {0}, 위치 {1}%', i + 1, s.pos)}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                setSel(i);
              }}
              onPointerMove={(e) => {
                if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                const pos = posFrom(e);
                if (pos !== s.pos) set({ stops: g.stops.map((x, j) => (j === i ? { ...x, pos } : x)) });
              }}
              onKeyDown={(e) => {
                const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
                if (d) {
                  e.preventDefault();
                  setSel(i);
                  set({ stops: g.stops.map((x, j) => (j === i ? { ...x, pos: Math.min(100, Math.max(0, x.pos + d * (e.shiftKey ? 10 : 1))) } : x)) });
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                  removeStop();
                }
              }}
              onFocus={() => setSel(i)}
            />
          ))}
        </div>

        <div className="stop-edit">
          <Range
            label={tr('위치')}
            min={0}
            max={100}
            step={1}
            value={stop.pos}
            onChange={(pos) => setStop({ pos })}
            output={<NumberInput value={stop.pos} min={0} max={100} decimals={0} suffix="%" onCommit={(pos) => setStop({ pos })} />}
          />
          <Range
            label={tr('투명도')}
            min={0}
            max={100}
            step={1}
            value={Math.round((1 - alphaOf(stop.color)) * 100)}
            onChange={(t) => setStop({ color: withAlpha(stop.color, 1 - t / 100) })}
            suffix="%"
          />
          <Field label={tr('정지점 {0} 색', cur + 1)}>
            <ColorField value={stop.color} onChange={(color) => setStop({ color })} />
          </Field>
        </div>
      </Sub>

      <Sub title={tr('기타')}>
        <Toggle label={tr('반복 (줄무늬)')} checked={g.repeat} onChange={(repeat) => set({ repeat })} />
        {presets && (
          <div className="swatches">
            {presets.map((p, i) => {
              const apply: Partial<Gradient> = Array.isArray(p) ? { stops: evenStops(p) } : structuredClone(p);
              return (
                <button
                  key={i}
                  className="swatch swatch-wide"
                  style={{ background: gradientCss({ ...g, ...apply, repeat: Array.isArray(p) ? false : !!apply.repeat }) }}
                  onClick={() => {
                    set(apply);
                    setSel(0);
                  }}
                  aria-label={tr('그라데이션 프리셋')}
                />
              );
            })}
          </div>
        )}
      </Sub>
    </div>
  );
}

/** 단색 / 그라데이션 채우기 편집 (텍스트·테두리 공용) */
export function FillField({ value: f, onChange, swatches, presets }: { value: Fill; onChange: (f: Fill) => void; swatches: string[]; presets: string[][] }) {
  const set = (patch: Partial<Fill>) => onChange({ ...f, ...patch });
  // 단색에서 처음 전환하면 같은 색 두 개라 변화가 안 보이므로 기본 대비색을 채움
  const toGradient = () =>
    set(f.stops.every((s) => s.color === f.stops[0].color) ? { mode: 'gradient', stops: evenStops([f.color, '#8a8a8a']) } : { mode: 'gradient' });

  return (
    <>
      <Segmented<Fill['mode']>
        value={f.mode}
        onChange={(mode) => (mode === 'gradient' ? toGradient() : set({ mode }))}
        options={[
          ['solid', tr('단색')],
          ['gradient', tr('그라데이션')],
        ]}
      />
      {f.mode === 'solid' ? (
        <ColorField value={f.color} swatches={swatches} onChange={(color) => set({ color })} />
      ) : (
        <GradientEditor value={f} onChange={onChange} presets={presets} previewHeight={36} />
      )}
    </>
  );
}
