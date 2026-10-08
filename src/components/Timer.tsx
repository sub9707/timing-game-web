import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { blindGroup } from '../blind';
import { formatTime } from '../time';
import type { BlindSetting, Phase } from '../types';

interface DigitsProps {
  ms: number;
  /** 가림 문자 (숫자 칸마다 다르게 하려면 배열) */
  mask?: string | string[];
  className?: string;
}

/** 숫자마다 고정 폭 칸을 줘서 폰트와 상관없이 흔들림 없이 표시 */
export function Digits({ ms, mask, className = '' }: DigitsProps) {
  let n = 0;
  return (
    <div className={`digits ${mask !== undefined ? 'is-masked' : ''} ${className}`} aria-label={mask !== undefined ? undefined : formatTime(ms)}>
      {formatTime(ms)
        .split('')
        .map((c, i) => {
          if (c === ':') {
            return (
              <span key={i} className="colon">
                :
              </span>
            );
          }
          const j = n++;
          return (
            <span key={i} className="digit" style={{ '--i': j } as CSSProperties}>
              {mask === undefined ? c : Array.isArray(mask) ? mask[j] : mask}
            </span>
          );
        })}
    </div>
  );
}

interface LiveTimerProps {
  phase: Phase;
  startAt: number;
  stoppedMs: number;
  /** settle 단계: 이 시간에서 stoppedMs 까지 settleMs 동안 숫자가 굴러감 */
  fromMs?: number;
  settleMs: number;
  blind: boolean;
  blindAfterMs: number;
  blindFx: BlindSetting;
  blindImageUrl: string | null;
  /** 설정 미리보기: 상태와 무관하게 가림 연출 표시 */
  forceBlind?: boolean;
}

/** 처음 잠깐 머뭇거리다 가속 → 목표에 천천히 안착 */
function settleEase(p: number) {
  const t = Math.max(0, (p - 0.12) / 0.88);
  return 1 - Math.pow(1 - t, 4);
}

export function LiveTimer({ phase, startAt, stoppedMs, fromMs, settleMs, blind, blindAfterMs, blindFx, blindImageUrl, forceBlind }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useLayoutEffect(() => {
    if (phase !== 'running') return;
    let raf = 0;
    const tick = () => {
      setElapsed(performance.now() - startAt);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [phase, startAt]);

  const [settling, setSettling] = useState(0);
  const settleFrom = fromMs ?? stoppedMs;
  useLayoutEffect(() => {
    if (phase !== 'settle') return;
    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / Math.max(1, settleMs));
      setSettling(settleFrom + (stoppedMs - settleFrom) * settleEase(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [phase, settleFrom, stoppedMs, settleMs]);

  const ms = phase === 'idle' ? 0 : phase === 'running' ? elapsed : phase === 'settle' ? Math.round(settling / 10) * 10 : stoppedMs;
  const hidden = forceBlind || phase === 'confirm' || phase === 'reveal' || (phase === 'running' && blind && elapsed >= blindAfterMs);
  if (hidden) return <BlindView fx={blindFx} imageUrl={blindImageUrl} />;

  return (
    <div className={`live ${phase === 'settle' ? 'is-settling' : ''}`}>
      <Digits ms={ms} className="live-digits" />
    </div>
  );
}

/* ───────── 블라인드 연출 ───────── */

const randomDigits = () => Array.from({ length: 6 }, () => String(Math.floor(Math.random() * 10)));

/** 일정 간격으로 의미 없는 숫자를 굴림 (실제 시간과 무관) */
function useScramble(on: boolean, speed: number) {
  const [digits, setDigits] = useState(randomDigits);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setDigits(randomDigits()), 80 / (speed / 100));
    return () => clearInterval(id);
  }, [on, speed]);
  return digits;
}

/** 타자기: 한 글자씩 쓰고 → 잠깐 멈춤 → 지우기 반복. 반환값은 보이는 글자 수 */
function useTyping(on: boolean, length: number, speed: number) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!on) return;
    const step = 110 / (speed / 100);
    const hold = 10; // 다 쓴 뒤 멈추는 틱 수
    const cycle = length * 2 + hold * 2;
    let t = 0;
    const id = setInterval(() => {
      t = (t + 1) % cycle;
      setCount(t <= length ? t : t <= length + hold ? length : t <= length * 2 + hold ? length * 2 + hold - t : 0);
    }, step);
    return () => clearInterval(id);
  }, [on, length, speed]);
  return count;
}

const EQ_BARS = 13;
// 레이더 표적 (각도°, 중심에서 거리 %)
const RADAR_BLIPS: [number, number][] = [
  [48, 30],
  [150, 38],
  [255, 22],
  [320, 34],
];

interface BlindViewProps {
  fx: BlindSetting;
  imageUrl: string | null;
}

/** 진행 중 가려진 타이머. 설정 패널 미리보기에서도 그대로 사용 */
export function BlindView({ fx, imageUrl }: BlindViewProps) {
  const group = blindGroup(fx.style);
  const chars = Array.from(fx.text || ' ');
  const scramble = useScramble(fx.style === 'scramble', fx.speed);
  const typed = useTyping(fx.style === 'text-type', chars.length, fx.speed);

  const vars = {
    '--blind-speed': fx.speed / 100,
    '--spinner-size': fx.spinnerSize / 100,
    '--spinner-w': fx.spinnerW / 100,
    '--spinner-h': fx.spinnerH / 100,
    '--spinner-r': fx.spinnerRadius / 100,
    '--spinner-t': fx.spinnerThick / 100,
    '--n': chars.length,
  } as CSSProperties;

  return (
    <>
      {fx.orbit && <span className="blind-orbit" style={vars} aria-hidden />}
      <div className={`live is-blind fx-${fx.style}`} style={vars} aria-label="가려진 시간">
        <Digits
          ms={0}
          mask={group !== 'digits' ? ' ' : fx.style === 'scramble' ? scramble : fx.maskChar}
          className={`live-digits ${group !== 'digits' ? 'is-veiled' : ''}`}
        />

        {group === 'text' && (
          <div className="blind-layer" aria-hidden>
            <span className="blind-text">
              {chars.map((c, i) => (
                <span key={i} className={`ch ${fx.style === 'text-type' && i >= typed ? 'is-off' : ''}`} style={{ '--i': i } as CSSProperties}>
                  {c === ' ' ? ' ' : c}
                  {fx.style === 'text-type' && i === typed - 1 && <span className="caret" />}
                </span>
              ))}
              {fx.style === 'text-type' && typed === 0 && <span className="caret is-start" />}
            </span>
          </div>
        )}

        {fx.style === 'spinner' && (
          <div className="blind-layer" aria-hidden>
            <div className="blind-spinner">
              <span className="spinner-track" />
              <span className="spinner-ring" />
              {imageUrl && (
                <img
                  className={`spinner-image ${fx.imageRound ? 'is-round' : ''}`}
                  src={imageUrl}
                  alt=""
                  draggable={false}
                  style={{ '--img': fx.imageSize / 100, left: `${50 + fx.imageX}%`, top: `${50 + fx.imageY}%` } as CSSProperties}
                />
              )}
            </div>
          </div>
        )}

        {fx.style === 'equalizer' && (
          <div className="blind-layer" aria-hidden>
            <div className="blind-eq">
              {Array.from({ length: EQ_BARS }, (_, i) => (
                // 막대마다 주기를 다르게 해서 불규칙하게 보이도록
                <span key={i} style={{ '--d': `${0.38 + ((i * 7) % 5) * 0.09}s`, '--i': i } as CSSProperties} />
              ))}
            </div>
          </div>
        )}

        {fx.style === 'radar' && (
          <div className="blind-layer" aria-hidden>
            <div className="blind-radar">
              <span className="radar-sweep" />
              {RADAR_BLIPS.map(([deg, r]) => {
                const rad = (deg * Math.PI) / 180;
                return (
                  <span
                    key={deg}
                    className="radar-blip"
                    style={{ left: `${50 + r * Math.sin(rad)}%`, top: `${50 - r * Math.cos(rad)}%`, '--at': deg / 360 } as CSSProperties}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
