import type { CSSProperties } from 'react';
import { FONTS } from './fonts';
import type { DesignSetting, Fill } from './types';

export const fillGradient = (f: Fill) => `linear-gradient(${f.angle}deg, ${f.stops.join(', ')})`;

/** 디자인 설정 → 무대에 거는 CSS 변수와 클래스 */
export function designVars(d: DesignSetting) {
  const tf = FONTS[d.titleFont];
  const df = FONTS[d.digitFont];
  // 숫자 6칸 + 콜론 2칸이 화면 폭의 약 58% 를 차지하도록 폰트별로 자동 계산
  const totalEm = df.digitW * 6 + df.colonW * 2;
  const borderGlowColor = d.borderFill.mode === 'solid' ? d.borderFill.color : d.borderFill.stops[0];

  const style = {
    '--font-title': tf.family,
    '--title-weight': d.titleWeight,
    '--title-style': d.titleItalic ? 'italic' : 'normal',
    '--title-scale': (d.titleScale / 100) * (tf.titleAdj ?? 1),
    '--sub-scale': d.subScale / 100,
    '--title-adj': tf.titleAdj ?? 1,
    '--title-color': d.titleFill.color,
    '--title-grad': fillGradient(d.titleFill),

    '--font-digit': df.family,
    '--digit-weight': d.digitWeight,
    '--digit-style': d.digitItalic ? 'italic' : 'normal',
    '--digit-w': `${df.digitW}em`,
    '--colon-w': `${df.colonW}em`,
    '--digit-size': `calc(min(${(58 / totalEm).toFixed(2)}vw, 26vh) * ${d.digitScale / 100})`,
    '--digit-color': d.digitFill.color,
    '--digit-grad': fillGradient(d.digitFill),

    '--radius': `${d.borderRadius}px`,
    '--frame-bg': d.frameBg / 100,
    '--border-glow': borderGlowColor,
    // 글로우 강도 0~1 (색은 CSS 에서 상태별로 결정)
    '--g-title': d.glowTitle / 100,
    '--g-digits': d.glowDigits / 100,
    '--g-border': d.glowBorder / 100,
    '--g-result': d.glowResult / 100,
  } as CSSProperties;

  const className = [
    d.titleFill.mode === 'gradient' && 'title-grad',
    d.digitFill.mode === 'gradient' && 'digit-grad',
    // 0 이면 필터를 아예 꺼서 렌더 비용 절약
    d.glowTitle > 0 && 'glow-title',
    d.glowDigits > 0 && 'glow-digits',
    d.glowBorder > 0 && 'glow-border',
  ]
    .filter(Boolean)
    .join(' ');

  return { style, className };
}

/** 테두리 줄 하나의 인라인 스타일 */
export function lineStyle(d: DesignSetting, index: number): CSSProperties {
  const w = d.borderWidth;
  const offset = index * (d.borderGap + w);
  const width = d.borderSides === 'all' ? `${w}px` : d.borderSides === 'y' ? `${w}px 0` : `${w}px 0 0`;
  const base: CSSProperties = {
    inset: -offset,
    borderRadius: d.borderRadius ? d.borderRadius + offset : 0,
    borderWidth: width,
  };
  if (d.borderFill.mode === 'gradient') {
    return { ...base, borderStyle: 'solid', borderColor: 'transparent', background: `${fillGradient(d.borderFill)} border-box` };
  }
  return { ...base, borderStyle: d.borderStyle, borderColor: d.borderFill.color };
}
