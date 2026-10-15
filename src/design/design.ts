import type { CSSProperties } from 'react';
import { formatShape } from '../game/time';
import { fontDef } from '../settings/fonts';
import { firstColor, gradientCss } from './gradient';
import type { DesignSetting, Fill, TextFx, TimeFormat } from '../types';

export const fillGradient = (f: Fill) => gradientCss(f);
/** 글로우처럼 한 색이 필요할 때 */
export const fillColor = (f: Fill) => (f.mode === 'solid' ? f.color : firstColor(f));

/** 글자 효과 → 인라인 스타일 (인라인이라 테마 기본 자간·그림자보다 우선) */
export function textFxStyle(fx: TextFx | undefined): CSSProperties {
  if (!fx) return {};
  const out: CSSProperties = {};
  if (fx.tracking !== null) out.letterSpacing = `${fx.tracking}em`;
  if (fx.lineHeight !== null) out.lineHeight = fx.lineHeight;
  if (fx.stroke > 0) {
    out.WebkitTextStroke = `${fx.stroke}px ${fx.strokeColor}`;
    out.paintOrder = 'stroke fill';
  }
  if (fx.shadow > 0 || fx.shadowOffset > 0) out.textShadow = `${fx.shadowOffset}px ${fx.shadowOffset}px ${fx.shadow}px ${fx.shadowColor}`;
  return out;
}

/** 디자인 설정 → 무대에 거는 CSS 변수와 클래스 */
export function designVars(d: DesignSetting, fmt: TimeFormat = 'mm:ss:cc') {
  const tf = fontDef(d.titleFont);
  const df = fontDef(d.digitFont);
  // 숫자 칸 + 구분자 칸이 무대 폭(광고 제외)의 약 70% 를 차지하도록 폰트·형식별로 자동 계산
  const shape = formatShape(fmt);
  const totalEm = df.digitW * shape.digits + df.colonW * shape.seps;
  const borderGlowColor = fillColor(d.borderFill);
  const dfx = d.textFx?.digits;

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
    '--digit-size': `calc(min(${(70 / totalEm).toFixed(2)}cqw, 32cqh) * ${d.digitScale / 100})`,
    '--digit-color': d.digitFill.color,
    '--digit-grad': fillGradient(d.digitFill),
    // 숫자 외곽선·그림자 (숫자는 칸마다 고정 폭이라 자간은 없음)
    '--digit-stroke': dfx && dfx.stroke > 0 ? `${dfx.stroke}px ${dfx.strokeColor}` : '0 transparent',
    '--digit-shadow': dfx && (dfx.shadow > 0 || dfx.shadowOffset > 0) ? `${dfx.shadowOffset}px ${dfx.shadowOffset}px ${dfx.shadow}px ${dfx.shadowColor}` : 'none',

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
    !d.bgFx && 'no-bgfx',
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
