import type { FontId } from './types';

export interface FontDef {
  label: string;
  family: string;
  /** 숫자/콜론 한 칸 폭 (em) — 폰트마다 달라서 흔들림 없는 고정 폭 계산에 사용 */
  digitW: number;
  colonW: number;
  /** 굵기 범위. min === max 면 단일 굵기 */
  weights: [number, number];
  /** 폭이 넓은 폰트는 타이틀을 줄임 */
  titleAdj?: number;
  korean?: boolean;
}

const FALLBACK = "'Pretendard Variable', sans-serif";

export const FONTS: Record<FontId, FontDef> = {
  pretendard: { label: 'Pretendard', family: FALLBACK, digitW: 0.6, colonW: 0.28, weights: [100, 900], korean: true },
  inter: { label: 'Inter', family: `'Inter Variable', ${FALLBACK}`, digitW: 0.62, colonW: 0.3, weights: [100, 900] },
  space: { label: 'Space Grotesk', family: `'Space Grotesk Variable', ${FALLBACK}`, digitW: 0.64, colonW: 0.3, weights: [300, 700] },
  orbitron: { label: 'Orbitron', family: `'Orbitron Variable', ${FALLBACK}`, digitW: 0.8, colonW: 0.36, weights: [400, 900], titleAdj: 0.92 },
  fredoka: { label: 'Fredoka', family: `'Fredoka Variable', ${FALLBACK}`, digitW: 0.6, colonW: 0.3, weights: [300, 700] },
  cinzel: { label: 'Cinzel', family: `'Cinzel Variable', ${FALLBACK}`, digitW: 0.68, colonW: 0.34, weights: [400, 900] },
  press: { label: 'Press Start', family: `'Press Start 2P', ${FALLBACK}`, digitW: 1, colonW: 0.7, weights: [400, 400], titleAdj: 0.62 },
  bebas: { label: 'Bebas Neue', family: `'Bebas Neue', ${FALLBACK}`, digitW: 0.46, colonW: 0.22, weights: [400, 400], titleAdj: 1.15 },
  jua: { label: '주아', family: `'Jua', ${FALLBACK}`, digitW: 0.58, colonW: 0.28, weights: [400, 400], korean: true },
  blackhan: { label: '검은고딕', family: `'Black Han Sans', ${FALLBACK}`, digitW: 0.62, colonW: 0.28, weights: [400, 400], korean: true },
  dohyeon: { label: '도현', family: `'Do Hyeon', ${FALLBACK}`, digitW: 0.52, colonW: 0.26, weights: [400, 400], korean: true },
};

export const FONT_IDS = Object.keys(FONTS) as FontId[];

export const clampWeight = (id: FontId, w: number) => {
  const [min, max] = FONTS[id].weights;
  return Math.min(max, Math.max(min, w));
};
