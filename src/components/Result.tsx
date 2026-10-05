import { useMemo, type CSSProperties } from 'react';
import { fillGradient } from '../design';
import { formatDiff } from '../time';
import type { GameResult, Phase, ResultTextStyle, RevealPromptStyle } from '../types';

interface Props {
  phase: Phase;
  result: GameResult | null;
  successText: string;
  failText: string;
  revealPrompt: string;
  promptStyle: RevealPromptStyle;
  resultStyle: { success: ResultTextStyle; fail: ResultTextStyle };
}

/** 결과 블록 크기·위치, 사용자 색이면 라벨 색과 글로우 색까지 덮어씀 */
function resultVars(rs: ResultTextStyle, success: boolean): CSSProperties {
  const base = { '--result-scale': rs.size / 100, translate: `${rs.x}vw ${rs.y}vh` } as Record<string, string | number>;
  if (!rs.custom) return base as CSSProperties;
  const glow = rs.fill.mode === 'solid' ? rs.fill.color : rs.fill.stops[0];
  return {
    ...base,
    [success ? '--success' : '--fail']: glow,
    '--result-color': rs.fill.color,
    '--result-grad': fillGradient(rs.fill),
  } as CSSProperties;
}

export function Result({ phase, result, successText, failText, revealPrompt, promptStyle: ps, resultStyle }: Props) {
  const rs = result && resultStyle[result.success ? 'success' : 'fail'];
  return (
    <div className="result-slot">
      {phase === 'confirm' && (
        <div
          className="reveal-prompt"
          style={
            {
              '--prompt-scale': ps.size / 100,
              translate: `${ps.x}vw ${ps.y}vh`,
              ...(ps.color && { '--prompt-color': ps.color }),
            } as CSSProperties
          }
        >
          {revealPrompt}
        </div>
      )}
      {phase === 'reveal' && (
        <div className="reveal-suspense" aria-label="결과 공개 중">
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ '--i': i } as CSSProperties} />
          ))}
        </div>
      )}
      {result && (
        <div className={`result ${result.success ? 'is-success' : 'is-fail'}`} style={resultVars(rs!, result.success)}>
          <span className={`result-label ${rs!.custom ? `is-custom ${rs!.fill.mode === 'gradient' ? 'is-grad' : ''}` : ''}`}>
            {result.success ? successText : failText}
          </span>
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
