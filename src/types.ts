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

export type BlindStyle =
  // 가린 숫자
  | 'dash'
  | 'bounce'
  | 'shake'
  | 'flip'
  | 'scramble'
  | 'glitch'
  // 텍스트
  | 'text'
  | 'text-bounce'
  | 'text-shake'
  | 'text-wave'
  | 'text-type'
  | 'text-beat'
  // 그래픽
  | 'spinner'
  | 'equalizer'
  | 'radar'
  | 'hidden';

/** 블라인드(가림) 연출 */
export interface BlindSetting {
  style: BlindStyle;
  /** 숫자 가림 문자 */
  maskChar: string;
  /** 텍스트 연출에 쓸 문구 */
  text: string;
  /** 애니메이션 속도 % (100 = 기본) */
  speed: number;
  /** 타이머 박스 테두리를 도는 글로우 (모든 연출과 함께 사용) */
  orbit: boolean;
  /** 스피너 크기 % */
  spinnerSize: number;
  /** 스피너 모양: 너비·높이(기본 크기 대비 %), 모서리(짧은 변 대비 %, 50 = 원/알약), 선 두께 % */
  spinnerW: number;
  spinnerH: number;
  spinnerRadius: number;
  spinnerThick: number;
  /** 스피너 가운데 이미지: 크기(스피너 대비 %), 위치(스피너 대비 % 이동), 원형 자르기 */
  imageSize: number;
  imageX: number;
  imageY: number;
  imageRound: boolean;
}

/** 결과 문구(성공/실패 각각) 모양 */
export interface ResultTextStyle {
  /** false 면 테마 색 (성공 = 포인트 색, 실패 = 빨강) */
  custom: boolean;
  fill: Fill;
  /** 크기 % (100 = 기본) */
  size: number;
  /** 기본 자리에서 이동 — 화면 폭/높이 대비 % */
  x: number;
  y: number;
}

/** 공개 확인 문구 모양 */
export interface RevealPromptStyle {
  /** 크기 % (100 = 기본) */
  size: number;
  /** 비우면 테마 포인트 색 */
  color: string;
  /** 기본 자리(결과 문구 자리)에서 이동 — 화면 폭/높이 대비 % */
  x: number;
  y: number;
}

export interface Settings {
  targetMs: number;
  /** pct: 목표 시간의 ±% · ms: 성공 구간 양 끝을 직접 지정 */
  toleranceMode: 'pct' | 'ms';
  tolerancePct: number;
  /** 직접 입력: 목표보다 이른 쪽 / 늦은 쪽 허용 ms (목표 시간이 바뀌어도 구간이 함께 이동) */
  toleranceBelowMs: number;
  toleranceAboveMs: number;
  /** 성공하면 실제 멈춘 시간 대신 목표 시간을 보여줌 */
  snapToTarget: boolean;
  blind: boolean;
  blindAfterMs: number;
  blindFx: BlindSetting;
  /** 극적인 결과 공개: 블라인드 상태에서 멈추면 공개 확인 → 긴장 연출 → 결과 */
  dramatic: boolean;
  /** 긴장 연출 시간 (ms) */
  dramaticMs: number;
  revealPrompt: string;
  revealPromptStyle: RevealPromptStyle;
  showTarget: boolean;
  mainTitle: string;
  subTitle: string;
  successText: string;
  failText: string;
  resultStyle: { success: ResultTextStyle; fail: ResultTextStyle };
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

/** confirm: 결과 공개 여부 확인 · reveal: 공개 직전 긴장 연출 (극적인 결과 공개 전용) */
/** 설정 중 무대에 임시로 띄워 보는 상태 (layout: 상태 그대로, 패널에 가리지 않게만) */
export type StagePreview = 'layout' | 'blind' | 'confirm' | 'result' | 'result-fail';

export type Phase = 'idle' | 'running' | 'confirm' | 'reveal' | 'result';

export interface GameResult {
  elapsedMs: number;
  diffMs: number;
  success: boolean;
}
