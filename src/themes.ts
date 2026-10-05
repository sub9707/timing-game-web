import type { BackgroundSetting, DesignSetting, Fill, ThemeId } from './types';

export interface ThemePreset {
  id: ThemeId;
  name: string;
  accent: string;
  text: string;
  bg: BackgroundSetting;
  design: DesignSetting;
}

const bg = (partial: Partial<BackgroundSetting> & Pick<BackgroundSetting, 'mode'>): BackgroundSetting => ({
  solid: '#0b0b10',
  gradient: { type: 'linear', angle: 135, stops: ['#0b0b10', '#1c1c28'] },
  imageDim: 45,
  imageBlur: 0,
  ...partial,
});

export const solid = (color: string, stops: string[] = [color, color]): Fill => ({ mode: 'solid', color, stops, angle: 180 });
export const gradient = (stops: string[], angle = 180): Fill => ({ mode: 'gradient', color: stops[0], stops, angle });

const design = (partial: Partial<DesignSetting>): DesignSetting => ({
  titleFont: 'pretendard',
  titleWeight: 800,
  titleScale: 100,
  subScale: 100,
  titleItalic: false,
  titleFill: solid('#ffffff'),
  digitFont: 'inter',
  digitWeight: 600,
  digitScale: 100,
  digitItalic: false,
  digitFill: solid('#ffffff'),
  borderLines: 1,
  borderWidth: 2,
  borderGap: 8,
  borderRadius: 28,
  borderStyle: 'solid',
  borderSides: 'all',
  borderFill: solid('#ffffff'),
  frameBg: 100,
  glowTitle: 0,
  glowDigits: 0,
  glowBorder: 0,
  glowResult: 40,
  ...partial,
});

export const THEMES: ThemePreset[] = [
  {
    id: 'neon',
    name: 'Neon',
    accent: '#00e5ff',
    text: '#eafcff',
    bg: bg({ mode: 'gradient', gradient: { type: 'radial', angle: 0, stops: ['#10213f', '#060814', '#000000'] } }),
    design: design({
      titleFont: 'orbitron',
      titleWeight: 800,
      titleFill: solid('#eafcff'),
      digitFont: 'orbitron',
      digitWeight: 500,
      digitFill: solid('#eafcff'),
      borderRadius: 22,
      borderFill: solid('#00e5ff'),
      glowTitle: 60,
      glowDigits: 55,
      glowBorder: 60,
      glowResult: 55,
    }),
  },
  {
    id: 'glass',
    name: 'Glass',
    accent: '#a5b4fc',
    text: '#f8fafc',
    bg: bg({ mode: 'gradient', gradient: { type: 'linear', angle: 135, stops: ['#0f172a', '#3b2a8c', '#0e3a5c'] } }),
    design: design({
      titleFont: 'space',
      titleWeight: 700,
      titleFill: gradient(['#f8fafc', '#c3c9f5']),
      digitFont: 'space',
      digitWeight: 500,
      digitFill: solid('#f8fafc'),
      borderWidth: 1,
      borderRadius: 40,
      borderFill: gradient(['#e0e7ff', '#6366f1'], 135),
      glowResult: 30,
    }),
  },
  {
    id: 'simple',
    name: 'Simple',
    accent: '#111111',
    text: '#111111',
    bg: bg({ mode: 'solid', solid: '#f4f3ef' }),
    design: design({
      titleFont: 'inter',
      titleWeight: 800,
      titleFill: solid('#111111'),
      digitFont: 'inter',
      digitWeight: 200,
      digitScale: 108,
      digitFill: solid('#111111'),
      borderWidth: 1.5,
      borderRadius: 0,
      borderSides: 'y',
      borderFill: solid('#111111'),
      glowResult: 0,
    }),
  },
  {
    id: 'pastel',
    name: 'Pastel',
    accent: '#ff7eb6',
    text: '#5a3d6e',
    bg: bg({ mode: 'gradient', gradient: { type: 'linear', angle: 160, stops: ['#ffd9ec', '#e6dcff', '#d3f0ff'] } }),
    design: design({
      titleFont: 'jua',
      titleWeight: 400,
      titleFill: solid('#5a3d6e'),
      digitFont: 'fredoka',
      digitWeight: 600,
      digitFill: solid('#5a3d6e'),
      borderWidth: 4,
      borderRadius: 56,
      borderFill: solid('#ff7eb6'),
      glowResult: 20,
    }),
  },
  {
    id: 'luxury',
    name: 'Luxury',
    accent: '#d8b45a',
    text: '#f6e7c1',
    bg: bg({ mode: 'gradient', gradient: { type: 'radial', angle: 0, stops: ['#2a1f0c', '#0d0a05', '#000000'] } }),
    design: design({
      titleFont: 'cinzel',
      titleWeight: 700,
      titleFill: gradient(['#fff7dc', '#d8b45a', '#6e5a2d']),
      digitFont: 'cinzel',
      digitWeight: 500,
      digitFill: gradient(['#fff7dc', '#d8b45a', '#6e5a2d']),
      borderLines: 2,
      borderWidth: 1,
      borderGap: 9,
      borderRadius: 2,
      borderFill: solid('#d8b45a'),
      glowTitle: 12,
      glowDigits: 12,
      glowBorder: 20,
      glowResult: 40,
    }),
  },
  {
    id: 'arcade',
    name: 'Arcade',
    accent: '#39ff6a',
    text: '#c9ffd6',
    bg: bg({ mode: 'solid', solid: '#050806' }),
    design: design({
      titleFont: 'press',
      titleWeight: 400,
      titleFill: solid('#39ff6a'),
      digitFont: 'press',
      digitWeight: 400,
      digitFill: solid('#c9ffd6'),
      borderLines: 2,
      borderWidth: 4,
      borderGap: 4,
      borderRadius: 0,
      borderFill: solid('#39ff6a'),
      glowDigits: 40,
      glowBorder: 40,
      glowResult: 40,
    }),
  },
  {
    id: 'stadium',
    name: 'Stadium',
    accent: '#ff3b3b',
    text: '#ffffff',
    bg: bg({ mode: 'gradient', gradient: { type: 'linear', angle: 180, stops: ['#1a1a1d', '#0a0a0b'] } }),
    design: design({
      titleFont: 'inter',
      titleWeight: 900,
      titleItalic: true,
      titleFill: solid('#ffffff'),
      digitFont: 'inter',
      digitWeight: 800,
      digitItalic: true,
      digitFill: solid('#ffffff'),
      borderWidth: 6,
      borderRadius: 14,
      borderSides: 'top',
      borderFill: solid('#ff3b3b'),
      glowDigits: 20,
      glowResult: 50,
    }),
  },
];

export const getTheme = (id: ThemeId) => THEMES.find((t) => t.id === id) ?? THEMES[0];

export const SOLID_SWATCHES = ['#000000', '#0b0b10', '#111827', '#1e1b4b', '#3b0d1f', '#f4f3ef', '#ffffff', '#fde68a'];

export const GRADIENT_PRESETS: string[][] = [
  ['#10213f', '#060814', '#000000'],
  ['#0f172a', '#3b2a8c', '#0e3a5c'],
  ['#ff6a3d', '#c2185b', '#4a148c'],
  ['#ffd9ec', '#e6dcff', '#d3f0ff'],
  ['#0f2027', '#203a43', '#2c5364'],
  ['#2a1f0c', '#0d0a05', '#000000'],
  ['#00c9a7', '#005f73'],
  ['#f8f9fb', '#dfe4ea'],
];

/** 텍스트·테두리용 그라데이션 프리셋 */
export const FILL_PRESETS: string[][] = [
  ['#fff7dc', '#d8b45a', '#6e5a2d'],
  ['#e0e7ff', '#6366f1'],
  ['#00e5ff', '#a855f7'],
  ['#ff7eb6', '#ffd36e'],
  ['#ffffff', '#9ca3af'],
  ['#39ff6a', '#00b3ff'],
  ['#ff3b3b', '#ff9f1c'],
  ['#f8fafc', '#c3c9f5'],
];

export const COLOR_SWATCHES = ['#00e5ff', '#a5b4fc', '#ff7eb6', '#d8b45a', '#39ff6a', '#ff3b3b', '#ffffff', '#111111'];
