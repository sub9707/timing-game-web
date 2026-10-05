import { useLayoutEffect, useState } from 'react';
import { formatTime } from '../time';
import type { Phase } from '../types';

interface DigitsProps {
  ms: number;
  masked?: boolean;
  className?: string;
}

/** 숫자마다 고정 폭 칸을 줘서 폰트와 상관없이 흔들림 없이 표시 */
export function Digits({ ms, masked, className = '' }: DigitsProps) {
  return (
    <div className={`digits ${masked ? 'is-masked' : ''} ${className}`} aria-label={formatTime(ms)}>
      {formatTime(ms)
        .split('')
        .map((c, i) =>
          c === ':' ? (
            <span key={i} className="colon">
              :
            </span>
          ) : (
            <span key={i} className="digit">
              {masked ? '-' : c}
            </span>
          ),
        )}
    </div>
  );
}

interface LiveTimerProps {
  phase: Phase;
  startAt: number;
  stoppedMs: number;
  blind: boolean;
  blindAfterMs: number;
}

export function LiveTimer({ phase, startAt, stoppedMs, blind, blindAfterMs }: LiveTimerProps) {
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

  const ms = phase === 'idle' ? 0 : phase === 'running' ? elapsed : stoppedMs;
  const masked = phase === 'running' && blind && elapsed >= blindAfterMs;

  return <Digits ms={ms} masked={masked} />;
}
