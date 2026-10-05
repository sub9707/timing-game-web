import { useMemo, type CSSProperties } from 'react';
import { formatDiff } from '../time';
import type { GameResult } from '../types';

interface Props {
  result: GameResult | null;
  successText: string;
  failText: string;
}

export function Result({ result, successText, failText }: Props) {
  return (
    <div className="result-slot">
      {result && (
        <div className={`result ${result.success ? 'is-success' : 'is-fail'}`}>
          <span className="result-label">{result.success ? successText : failText}</span>
          <span className="result-diff">{result.diffMs === 0 ? 'PERFECT' : `${formatDiff(result.diffMs)}s`}</span>
        </div>
      )}
    </div>
  );
}

/** 성공 시 타이머 주변으로 퍼지는 파티클 */
export function Burst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 38 + Math.random() * 26;
        return {
          '--x': `${Math.cos(angle) * dist}vmin`,
          '--y': `${Math.sin(angle) * dist * 0.62}vmin`,
          '--s': (0.5 + Math.random()).toFixed(2),
          '--d': `${Math.round(Math.random() * 120)}ms`,
        } as CSSProperties;
      }),
    [],
  );

  return (
    <div className="burst" aria-hidden>
      {particles.map((style, i) => (
        <span key={i} style={style} />
      ))}
    </div>
  );
}
