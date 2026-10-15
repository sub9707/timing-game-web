import { useMemo, type CSSProperties } from 'react';
import { fillColor, fillGradient, textFxStyle } from '../../design/design';
import { boxStyle } from '../../design/layout';
import { formatDiff } from '../../game/time';
import type { EditId, GameResult, LabelSetting, Phase, ResultFxSetting, ResultTextStyle, RevealPromptStyle, TextFx, TimeFormat } from '../../types';
import { EditableText, type TextEditProps } from './EditableText';
import { tr } from '../../i18n';

interface Props {
  phase: Phase;
  result: GameResult | null;
  successText: string;
  failText: string;
  revealPrompt: string;
  promptStyle: RevealPromptStyle;
  resultStyle: { success: ResultTextStyle; fail: ResultTextStyle };
  labels: LabelSetting;
  format: TimeFormat;
  textFx?: TextFx;
  /** 화면 편집에서 제자리 텍스트 편집 */
  textEdit?: (id: EditId) => TextEditProps;
  /** 화면 편집: 숨긴 요소 반투명 표시 */
  showHidden?: boolean;
}

/** 사용자 색이면 라벨 색과 글로우 색까지 덮어씀 */
function resultVars(rs: ResultTextStyle, success: boolean): CSSProperties | undefined {
  if (!rs.custom) return undefined;
  const glow = fillColor(rs.fill);
  return {
    [success ? '--success' : '--fail']: glow,
    '--result-color': rs.fill.color,
    '--result-grad': fillGradient(rs.fill),
  } as CSSProperties;
}

export function Result({ phase, result, successText, failText, revealPrompt, promptStyle: ps, resultStyle, labels, format, textFx, textEdit, showHidden }: Props) {
  const rs = result && resultStyle[result.success ? 'success' : 'fail'];
  return (
    <div className="result-slot">
      {/* 배치(이동·배율)는 바깥 상자에 — 안쪽의 등장·숨쉬기 애니메이션과 겹치지 않게 */}
      {phase === 'confirm' && (
        <div className="edit-box" data-edit-id="prompt" style={boxStyle(ps, showHidden)}>
          <EditableText
            as="div"
            className="reveal-prompt"
            style={ps.color ? ({ '--prompt-color': ps.color } as CSSProperties) : undefined}
            text={revealPrompt}
            multiline
            {...textEdit?.('prompt')}
          />
        </div>
      )}
      {phase === 'reveal' && (
        <div className="reveal-suspense" aria-label={tr('결과 공개 중')}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ '--i': i } as CSSProperties} />
          ))}
        </div>
      )}
      {result && (
        <div className="edit-box" data-edit-id={result.success ? 'result-success' : 'result-fail'} style={boxStyle(rs!, showHidden)}>
          <div className={`result ${result.success ? 'is-success' : 'is-fail'}`} style={resultVars(rs!, result.success)}>
            <EditableText
              as="span"
              className={`result-label ${rs!.custom ? `is-custom ${rs!.fill.mode === 'gradient' ? 'is-grad' : ''}` : ''}`}
              style={textFxStyle(textFx)}
              text={result.success ? successText : failText}
              {...textEdit?.(result.success ? 'result-success' : 'result-fail')}
            />
            {labels.showDiff && <span className="result-diff">{result.diffMs === 0 ? labels.perfect : formatDiff(result.diffMs, labels.diffUnit, format)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

const SHAPES: Record<'burst' | 'confetti' | 'stars', number> = { burst: 36, confetti: 56, stars: 28 };

/** 성공 시 타이머 주변으로 퍼지는 파티클 (터짐 · 꽃가루 · 별) */
export function Burst({ fx }: { fx: Pick<ResultFxSetting, 'particles' | 'amount'> }) {
  const kind = fx.particles === 'none' ? 'burst' : fx.particles;
  const count = Math.round((SHAPES[kind] * fx.amount) / 100);
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 38 + Math.random() * 26;
        return {
          '--x': `${Math.cos(angle) * dist}vmin`,
          '--y': `${Math.sin(angle) * dist * 0.62}vmin`,
          // 꽃가루: 가로로 흩어져 아래로 떨어짐
          '--fx': `${(Math.random() - 0.5) * 120}vmin`,
          '--fy': `${30 + Math.random() * 40}vmin`,
          '--rot': `${Math.round(Math.random() * 720 - 360)}deg`,
          '--hue': Math.round(Math.random() * 360),
          '--s': (0.5 + Math.random()).toFixed(2),
          '--d': `${Math.round(Math.random() * (kind === 'confetti' ? 300 : 120))}ms`,
        } as CSSProperties;
      }),
    [count, kind],
  );
  if (fx.particles === 'none' || count === 0) return null;

  return (
    <div className={`burst is-${kind}`} aria-hidden>
      {particles.map((style, i) => (
        <span key={i} style={style} />
      ))}
    </div>
  );
}
