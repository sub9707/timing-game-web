import type { BlindStyle } from '../types';
import { tr } from '../i18n';

export type BlindGroup = 'digits' | 'text' | 'graphic';

export const BLIND_GROUPS: [BlindGroup, string][] = [
  ['digits', tr('가린 숫자')],
  ['text', tr('텍스트')],
  ['graphic', tr('그래픽')],
];

export const BLIND_STYLES: { id: BlindStyle; label: string; group: BlindGroup }[] = [
  { id: 'dash', label: tr('기본'), group: 'digits' },
  { id: 'bounce', label: tr('바운스'), group: 'digits' },
  { id: 'shake', label: tr('떨림'), group: 'digits' },
  { id: 'flip', label: tr('플립'), group: 'digits' },
  { id: 'scramble', label: tr('랜덤 숫자'), group: 'digits' },
  { id: 'glitch', label: tr('글리치'), group: 'digits' },
  { id: 'text', label: tr('고정'), group: 'text' },
  { id: 'text-bounce', label: tr('바운스'), group: 'text' },
  { id: 'text-shake', label: tr('떨림'), group: 'text' },
  { id: 'text-wave', label: tr('물결'), group: 'text' },
  { id: 'text-type', label: tr('타자기'), group: 'text' },
  { id: 'text-beat', label: tr('심장박동'), group: 'text' },
  { id: 'spinner', label: tr('로딩 스피너'), group: 'graphic' },
  { id: 'equalizer', label: tr('이퀄라이저'), group: 'graphic' },
  { id: 'radar', label: tr('레이더'), group: 'graphic' },
  { id: 'hidden', label: tr('완전히 숨김'), group: 'graphic' },
];

export const blindGroup = (style: BlindStyle) => BLIND_STYLES.find((b) => b.id === style)?.group ?? 'digits';

/** 스피너 모양 프리셋 */
export const SPINNER_SHAPES: { label: string; w: number; h: number; r: number }[] = [
  { label: tr('원'), w: 100, h: 100, r: 50 },
  { label: tr('둥근 사각'), w: 100, h: 100, r: 22 },
  { label: tr('사각'), w: 100, h: 100, r: 0 },
  { label: tr('알약'), w: 260, h: 70, r: 50 },
  { label: tr('가로 바'), w: 400, h: 40, r: 50 },
];

export const MASK_CHARS = ['-', '?', '•', '*', '✕', '█'];
