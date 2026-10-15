export type ThemeId =
  | 'neon'
  | 'simple'
  | 'glass'
  | 'pastel'
  | 'luxury'
  | 'arcade'
  | 'stadium'
  | 'aurora'
  | 'sunset'
  | 'pop'
  | 'sakura'
  | 'ocean'
  | 'noir';

/** transparent: 송출(OBS)용 투명 · chroma: 크로마키 단색 */
export type BgMode = 'solid' | 'gradient' | 'image' | 'transparent' | 'chroma';

/** 기본 글꼴 + 올린 글꼴(custom:<id>) */
export type BuiltinFontId =
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

export type FontId = BuiltinFontId | `custom:${string}`;

/** 직접 올린 글꼴 (파일은 에셋 font:<id> 로 저장) */
export interface CustomFont {
  id: string;
  name: string;
}

export interface GradientStop {
  /** #rrggbb 또는 #rrggbbaa */
  color: string;
  /** 위치 0~100 % */
  pos: number;
}

/** 그라데이션 (배경·텍스트·테두리 공용) */
export interface Gradient {
  /** 선형 · 방사형 · 원뿔형 */
  type: 'linear' | 'radial' | 'conic';
  /** 선형: 방향 각도 · 원뿔형: 시작 각도 */
  angle: number;
  /** 방사형 모양 */
  shape: 'circle' | 'ellipse';
  /** 방사형·원뿔형 중심 (%) */
  cx: number;
  cy: number;
  /** 정지점 구간을 반복 (줄무늬) */
  repeat: boolean;
  stops: GradientStop[];
}

/** 단색 또는 그라데이션 채우기 (텍스트·테두리 공용) */
export interface Fill extends Gradient {
  mode: 'solid' | 'gradient';
  color: string;
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

  /** 글자 효과 (자간·행간·외곽선·그림자) — null 값은 테마 기본 */
  textFx: Record<TextFxTarget, TextFx>;
  /** 테마 배경 장식 애니메이션 */
  bgFx: boolean;
}

export type TextFxTarget = 'title' | 'sub' | 'digits' | 'result';

export interface TextFx {
  /** 자간 em (null = 테마 기본) */
  tracking: number | null;
  /** 행간 배수 (null = 테마 기본) */
  lineHeight: number | null;
  /** 외곽선 두께 px (0 = 없음) */
  stroke: number;
  strokeColor: string;
  /** 그림자 흐림 px (0 = 없음) · 거리 px */
  shadow: number;
  shadowOffset: number;
  shadowColor: string;
}

export type GradientSetting = Gradient;

export interface BackgroundSetting {
  mode: BgMode;
  solid: string;
  gradient: GradientSetting;
  /** 이미지 위 어둡게 (0~90 %) */
  imageDim: number;
  /** 이미지 블러 (px) */
  imageBlur: number;
  /** 크로마키 색 */
  chroma: string;
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

/** 화면 배치: 기본 자리에서의 이동과 가로·세로 배율 (파워포인트처럼 늘이기 가능) */
export interface Box {
  /** 이동 — 화면 폭/높이 대비 % */
  x: number;
  y: number;
  /** 가로·세로 배율 % (100 = 기본) */
  w: number;
  h: number;
  /** 회전 (도, 시계 방향) */
  r: number;
  /** 겹침 순서 (클수록 앞) */
  z: number;
  /** 화면에서 숨김 (자리는 유지) */
  hidden: boolean;
  /** 화면 편집에서 선택·이동 잠금 */
  locked: boolean;
}

/** 화면에서 직접 편집할 수 있는 기본 요소 */
export type BuiltinId = 'title' | 'sub' | 'frame' | 'result-success' | 'result-fail' | 'prompt' | 'hint' | 'player';
/** 기본 요소 + 삽입한 요소(item:<id>) */
export type EditId = BuiltinId | `item:${string}`;

/* ───── 삽입 요소 (파워포인트의 삽입: 텍스트 상자 · 그림 · 도형) ───── */

interface ItemBase extends Box {
  id: string;
  /** 선택 창에 보일 이름 */
  name: string;
  /** 불투명도 % */
  opacity: number;
}

export interface TextItem extends ItemBase {
  type: 'text';
  text: string;
  font: FontId;
  weight: number;
  italic: boolean;
  /** 글자 크기 — 무대 폭 대비 % */
  size: number;
  fill: Fill;
  align: 'left' | 'center' | 'right';
  fx: TextFx;
}

export interface ImageItem extends ItemBase {
  type: 'image';
  /** 에셋 키 (img:<id>) */
  asset: string;
  /** 기본 너비 — 무대 폭 대비 % (높이는 그림 비율) */
  width: number;
  /** 모서리 둥글기 % */
  radius: number;
}

export type ShapeKind = 'rect' | 'ellipse' | 'triangle' | 'line' | 'star';

export interface ShapeItem extends ItemBase {
  type: 'shape';
  shape: ShapeKind;
  /** 기본 너비·높이 — 무대 폭 대비 % */
  width: number;
  height: number;
  fill: Fill;
  /** 윤곽선 px · 색 */
  stroke: number;
  strokeColor: string;
  /** 사각형 모서리 px */
  radius: number;
}

export type Item = TextItem | ImageItem | ShapeItem;

/** 그룹 (Ctrl+G) */
export interface ItemGroup {
  id: string;
  members: EditId[];
}

/** 화면 비율 — free 는 창에 꽉 차게 (예전 방식) */
export type CanvasAspect = 'free' | '16:9' | '9:16' | '4:3' | '1:1' | '21:9';

/** 시간 표시 형식 (ccc 가 있으면 1/1000초까지 판정) */
export type TimeFormat = 'mm:ss:cc' | 'mm:ss.cc' | 'ss.cc' | 'mm:ss.ccc' | 'ss.ccc';

/** 효과음 — default: 기본 소리 · custom: 올린 파일 (에셋 sfx:<이름>) · off */
export type SoundChoice = 'default' | 'custom' | 'off';
export type SoundEvent = 'start' | 'stop' | 'success' | 'fail' | 'reveal' | 'countdown';

export interface SoundSetting {
  enabled: boolean;
  /** 0~100 */
  volume: number;
  events: Record<SoundEvent, SoundChoice>;
}

/** 라운드 진행 옵션 */
export interface RoundSetting {
  /** 시작 전 카운트다운 */
  countdown: boolean;
  countdownSec: number;
  /** 결과 후 자동 리셋 (0 = 끔) */
  autoResetMs: number;
  /** 라운드마다 목표 시간 무작위 */
  randomTarget: boolean;
  randomMinMs: number;
  randomMaxMs: number;
  /** 무작위 간격 (예: 500ms 단위) */
  randomStepMs: number;
}

/** 키보드 외 입력 */
export interface InputSetting {
  /** 화면을 탭(클릭)해서 시작·정지 */
  tap: boolean;
  /** 게임패드 버튼 (A=시작·정지 · B=리셋) */
  gamepad: boolean;
}

/** 결과 연출 */
export interface ResultFxSetting {
  /** 성공 파티클 */
  particles: 'burst' | 'confetti' | 'stars' | 'none';
  /** 파티클 양 % */
  amount: number;
  /** 실패 흔들림 세기 % (0 = 없음) */
  failShake: number;
  /** 성공·실패 색 (비우면 테마) */
  successColor: string;
  failColor: string;
}

/** 화면 고정 문구 */
export interface LabelSetting {
  target: string;
  perfect: string;
  /** 오차 표시 */
  showDiff: boolean;
  diffUnit: 's' | 'ms';
}

/** 랭킹 화면 */
export interface LeaderboardSetting {
  title: string;
  topN: number;
  /** 성공한 기록만 */
  successOnly: boolean;
}

/** 결과 문구(성공/실패 각각) 모양 */
export interface ResultTextStyle extends Box {
  /** false 면 테마 색 (성공 = 포인트 색, 실패 = 빨강) */
  custom: boolean;
  fill: Fill;
}

/** 공개 확인 문구 모양 */
export interface RevealPromptStyle extends Box {
  /** 비우면 테마 포인트 색 */
  color: string;
}

/** 화면 아래 키 안내 — 상태별 문구와 키 아이콘 */
export interface KeyHintSetting {
  /** 앞의 키 아이콘(SPACE 등) 표시 */
  showKey: boolean;
  /** 시작 전 · 진행 중 · 공개 대기(확인·긴장·굴러가기) · 결과 */
  start: string;
  stop: string;
  reveal: string;
  reset: string;
}

export type KeyHintStage = 'start' | 'stop' | 'reveal' | 'reset';

export interface Settings {
  targetMs: number;
  /** 엄격한 판정: 허용 오차를 무시하고 1/100초까지 정확히 멈춰야 성공 (오차 설정값은 보관) */
  strictJudge: boolean;
  /** pct: 목표 시간의 ±% · ms: 성공 구간 양 끝을 직접 지정 */
  toleranceMode: 'pct' | 'ms';
  tolerancePct: number;
  /** 직접 입력: 목표보다 이른 쪽 / 늦은 쪽 허용 ms (목표 시간이 바뀌어도 구간이 함께 이동) */
  toleranceBelowMs: number;
  toleranceAboveMs: number;
  /** 성공하면 실제 멈춘 시간 대신 목표 시간을 보여줌 */
  snapToTarget: boolean;
  /** 목표 시간으로 바로 바꾸지 않고, 실제 시간에서 목표 시간까지 숫자가 굴러가는 연출 */
  snapAnimate: boolean;
  /** 숫자가 목표 시간까지 굴러가는 시간 (ms) */
  settleMs: number;
  /** 치트 키로 성공 처리할 때 숫자가 굴러가는 시간 (ms) */
  cheatSettleMs: number;
  /** 치트로 굴러갈 시간을 따로 지정 (끄면 목표 시간) */
  cheatTargetOn: boolean;
  cheatTargetMs: number;
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
  keyHint: KeyHintSetting;
  /** 타이틀·서브·타이머 박스·화면 아래 키 안내·참가자 이름 배치 (결과·공개 문구는 각 스타일에 있음) */
  layout: { title: Box; sub: Box; frame: Box; hint: Box; player: Box };
  /** 설정 형식 버전 (마이그레이션용) */
  version: number;
  canvas: { aspect: CanvasAspect };
  timeFormat: TimeFormat;
  labels: LabelSetting;
  sound: SoundSetting;
  round: RoundSetting;
  input: InputSetting;
  resultFx: ResultFxSetting;
  leaderboard: LeaderboardSetting;
  /** 참가자 이름 문구 앞뒤 (예: "도전자 · {name}") */
  playerFormat: string;
  /** 삽입한 텍스트·그림·도형 */
  items: Item[];
  groups: ItemGroup[];
  /** 직접 만든 안내선 — 무대 폭/높이 대비 % (왼쪽·위 기준) */
  guides: { x: number[]; y: number[] };
  customFonts: CustomFont[];
  theme: ThemeId;
  accent: string;
  text: string;
  bg: BackgroundSetting;
  design: DesignSetting;
  /** 시작/정지 (리셋 키가 없으면 리셋도) — KeyboardEvent.code */
  actionKeys: string[];
  /** 리셋 전용 (선택). 지정하면 진행 키로는 리셋되지 않음 */
  resetKeys: string[];
  /** 치트 (선택). 실패 화면에서 누르면 숫자가 목표 시간으로 굴러간 뒤 성공 처리 — 화면엔 표시 안 함 */
  cheatKeys: string[];
}

/** confirm: 결과 공개 여부 확인 · reveal: 공개 직전 긴장 연출 (극적인 결과 공개 전용)
 *  settle: 숫자가 실제 시간 → 목표 시간으로 굴러가는 중 (목표 시간 연출 · 치트) */
/** 설정 중 무대에 임시로 띄워 보는 상태 (layout: 상태 그대로, 패널에 가리지 않게만) */
export type StagePreview = 'layout' | 'running' | 'blind' | 'confirm' | 'result' | 'result-fail';

/** countdown: 시작 전 3·2·1 */
export type Phase = 'idle' | 'countdown' | 'running' | 'confirm' | 'reveal' | 'settle' | 'result';

/** 기록 한 줄 */
export interface RoundRecord {
  id: string;
  name: string;
  targetMs: number;
  elapsedMs: number;
  diffMs: number;
  success: boolean;
  /** 치트로 성공 처리됨 */
  cheated?: boolean;
  at: number;
}

export interface GameResult {
  elapsedMs: number;
  diffMs: number;
  success: boolean;
  /** 있으면 결과 공개 전에 이 시간에서 elapsedMs 로 숫자가 굴러감 */
  fromMs?: number;
  /** 굴러가는 시간 (ms) */
  settleMs?: number;
}
