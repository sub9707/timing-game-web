import { useEffect, useState } from 'react';
import { loadAsset, onAssetChange } from '../storage/assets';
import type { BuiltinFontId, CustomFont, FontId } from '../types';
import { tr } from '../i18n';

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

export const FONTS: Record<BuiltinFontId, FontDef> = {
  pretendard: { label: 'Pretendard', family: FALLBACK, digitW: 0.6, colonW: 0.28, weights: [100, 900], korean: true },
  inter: { label: 'Inter', family: `'Inter Variable', ${FALLBACK}`, digitW: 0.62, colonW: 0.3, weights: [100, 900] },
  space: { label: 'Space Grotesk', family: `'Space Grotesk Variable', ${FALLBACK}`, digitW: 0.64, colonW: 0.3, weights: [300, 700] },
  orbitron: { label: 'Orbitron', family: `'Orbitron Variable', ${FALLBACK}`, digitW: 0.8, colonW: 0.36, weights: [400, 900], titleAdj: 0.92 },
  fredoka: { label: 'Fredoka', family: `'Fredoka Variable', ${FALLBACK}`, digitW: 0.6, colonW: 0.3, weights: [300, 700] },
  cinzel: { label: 'Cinzel', family: `'Cinzel Variable', ${FALLBACK}`, digitW: 0.68, colonW: 0.34, weights: [400, 900] },
  press: { label: 'Press Start', family: `'Press Start 2P', ${FALLBACK}`, digitW: 1, colonW: 0.7, weights: [400, 400], titleAdj: 0.62 },
  bebas: { label: 'Bebas Neue', family: `'Bebas Neue', ${FALLBACK}`, digitW: 0.46, colonW: 0.22, weights: [400, 400], titleAdj: 1.15 },
  jua: { label: tr('주아'), family: `'Jua', ${FALLBACK}`, digitW: 0.58, colonW: 0.28, weights: [400, 400], korean: true },
  blackhan: { label: tr('검은고딕'), family: `'Black Han Sans', ${FALLBACK}`, digitW: 0.62, colonW: 0.28, weights: [400, 400], korean: true },
  dohyeon: { label: tr('도현'), family: `'Do Hyeon', ${FALLBACK}`, digitW: 0.52, colonW: 0.26, weights: [400, 400], korean: true },
};

export const FONT_IDS = Object.keys(FONTS) as BuiltinFontId[];

/* ───── 직접 올린 글꼴 ───── */

let customs: CustomFont[] = [];
export const customFamily = (id: string) => `'tc-font-${id}', ${FALLBACK}`;

/** 글꼴 정보 (올린 글꼴은 일반적인 숫자 폭으로 계산) */
export function fontDef(id: FontId): FontDef {
  if (id.startsWith('custom:')) {
    const key = id.slice(7);
    const f = customs.find((c) => c.id === key);
    return { label: f?.name ?? tr('올린 글꼴'), family: customFamily(key), digitW: 0.62, colonW: 0.3, weights: [100, 900] };
  }
  return FONTS[id as BuiltinFontId] ?? FONTS.pretendard;
}

/** 글꼴 선택 목록 (기본 + 올린 글꼴) */
export const allFontIds = (list: CustomFont[]): FontId[] => [...FONT_IDS, ...list.map((c): FontId => `custom:${c.id}`)];

export const clampWeight = (id: FontId, w: number) => {
  const [min, max] = fontDef(id).weights;
  return Math.min(max, Math.max(min, w));
};

/** 설정의 올린 글꼴을 문서에 등록 (font:<id> 에셋에서 읽음). 등록될 때마다 버전이 올라 다시 그림 */
export function useCustomFonts(list: CustomFont[]) {
  const [ver, setVer] = useState(0);
  customs = list;
  const key = list.map((c) => c.id).join(',');
  useEffect(() => {
    let alive = true;
    const added: FontFace[] = [];
    const load = async () => {
      for (const c of list) {
        const blob = await loadAsset(`font:${c.id}`);
        if (!blob || !alive) continue;
        try {
          const face = new FontFace(`tc-font-${c.id}`, await blob.arrayBuffer());
          await face.load();
          document.fonts.add(face);
          added.push(face);
        } catch {
          /* 읽을 수 없는 글꼴 파일 */
        }
      }
      if (alive) setVer((v) => v + 1);
    };
    void load();
    const off = onAssetChange((c) => c.key.startsWith('font:') && void load());
    return () => {
      alive = false;
      off();
      added.forEach((f) => document.fonts.delete(f));
    };
  }, [key]);
  return ver;
}
