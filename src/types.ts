export type ThemeId = 'neon' | 'simple' | 'glass' | 'pastel' | 'luxury' | 'arcade' | 'stadium';

export type BgMode = 'solid' | 'gradient' | 'image';

export type FontId =
  | 'pretendard'
  | 'inter'
  | 'space'
  | 'orbitron'
  | 'fredoka'
  | 'cinzel'
  | 'press'
  | 'bebas'
  | 'jua'
  | 'blackhan'
  | 'dohyeon';

/** 단색 또는 선형 그라데이션 채우기 (텍스트·테두리 공용) */
export interface Fill {
  mode: 'solid' | 'gradient';
  color: string;
  stops: string[];
  angle: number;
}

export interface DesignSetting {
  titleFont: FontId;
  titleWeight: number;
  /** % (100 = 기본) */
  titleScale: number;
  subScale: number;
  titleItalic: boolean;
  titleFill: Fill;

  digitFont: FontId;
  digitWeight: number;
  digitScale: number;
  digitItalic: boolean;
  digitFill: Fill;

  borderLines: number;
  borderWidth: number;
  borderGap: number;
  borderRadius: number;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  borderSides: 'all' | 'y' | 'top';
  borderFill: Fill;
  /** 타이머 판 배경 불투명도 % */
  frameBg: number;

  /** 글로우 0~100 */
  glowTitle: number;
  glowDigits: number;
  glowBorder: number;
  glowResult: number;
}

export interface GradientSetting {
  type: 'linear' | 'radial';
  angle: number;
  stops: string[];
}

export interface BackgroundSetting {
  mode: BgMode;
  solid: string;
  gradient: GradientSetting;
  /** 이미지 위 어둡게 (0~90 %) */
  imageDim: number;
  /** 이미지 블러 (px) */
  imageBlur: number;
}

export interface Settings {
  targetMs: number;
  tolerancePct: number;
  blind: boolean;
  blindAfterMs: number;
  showTarget: boolean;
  mainTitle: string;
  subTitle: string;
  successText: string;
  failText: string;
  theme: ThemeId;
  accent: string;
  text: string;
  bg: BackgroundSetting;
  design: DesignSetting;
  /** 시작/정지 (리셋 키가 없으면 리셋도) — KeyboardEvent.code */
  actionKeys: string[];
  /** 리셋 전용 (선택). 지정하면 진행 키로는 리셋되지 않음 */
  resetKeys: string[];
}

export type Phase = 'idle' | 'running' | 'result';

export interface GameResult {
  elapsedMs: number;
  diffMs: number;
  success: boolean;
}
