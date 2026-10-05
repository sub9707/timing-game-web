import type { BlindStyle } from './types';

export type BlindGroup = 'digits' | 'text' | 'graphic';

export const BLIND_GROUPS: [BlindGroup, string][] = [
  ['digits', '가린 숫자'],
  ['text', '텍스트'],
  ['graphic', '그래픽'],
];

export const BLIND_STYLES: { id: BlindStyle; label: string; group: BlindGroup }[] = [
  { id: 'dash', label: '기본', group: 'digits' },
  { id: 'bounce', label: '바운스', group: 'digits' },
  { id: 'shake', label: '떨림', group: 'digits' },
  { id: 'flip', label: '플립', group: 'digits' },
  { id: 'scramble', label: '랜덤 숫자', group: 'digits' },
  { id: 'glitch', label: '글리치', group: 'digits' },
  { id: 'text', label: '고정', group: 'text' },
  { id: 'text-bounce', label: '바운스', group: 'text' },
  { id: 'text-shake', label: '떨림', group: 'text' },
  { id: 'text-wave', label: '물결', group: 'text' },
  { id: 'text-type', label: '타자기', group: 'text' },
  { id: 'text-beat', label: '심장박동', group: 'text' },
  { id: 'spinner', label: '로딩 스피너', group: 'graphic' },
  { id: 'equalizer', label: '이퀄라이저', group: 'graphic' },
  { id: 'radar', label: '레이더', group: 'graphic' },
  { id: 'hidden', label: '완전히 숨김', group: 'graphic' },
];

export const blindGroup = (style: BlindStyle) => BLIND_STYLES.find((b) => b.id === style)?.group ?? 'digits';

/** 스피너 모양 프리셋 */
export const SPINNER_SHAPES: { label: string; w: number; h: number; r: number }[] = [
  { label: '원', w: 100, h: 100, r: 50 },
  { label: '둥근 사각', w: 100, h: 100, r: 22 },
  { label: '사각', w: 100, h: 100, r: 0 },
  { label: '알약', w: 260, h: 70, r: 50 },
  { label: '가로 바', w: 400, h: 40, r: 50 },
];

export const MASK_CHARS = ['-', '?', '•', '*', '✕', '█'];
