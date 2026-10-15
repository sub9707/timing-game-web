import { useCallback, useEffect, useRef, useState } from 'react';
import { BLIND_STYLES } from '../game/blind';
import { lang } from '../i18n';
import { normalizeGradient } from '../design/gradient';
import { DEFAULT_BOX } from '../design/layout';
import { defaultTextFx, getTheme, gradient, NO_TEXT_FX, THEMES } from './themes';
import type { Box, DesignSetting, Fill, Item, ResultTextStyle, Settings, TextFxTarget } from '../types';

const STORAGE_KEY = 'timer-game:settings:v1';

/** 설정 형식 버전 — 구조가 바뀌면 올리고 MIGRATIONS 에 변환 추가 */
export const SETTINGS_VERSION = 2;

const neon = getTheme('neon');

export const DEFAULT_SETTINGS: Settings = {
  targetMs: 15000,
  strictJudge: false,
  toleranceMode: 'pct',
  tolerancePct: 0,
  toleranceBelowMs: 0,
  toleranceAboveMs: 0,
  snapToTarget: false,
  snapAnimate: true,
  settleMs: 1500,
  cheatSettleMs: 1500,
  cheatTargetOn: false,
  cheatTargetMs: 15000,
  blind: false,
  blindAfterMs: 3000,
  dramatic: false,
  dramaticMs: 3000,
  revealPrompt: lang === 'en' ? 'Reveal the result?' : '결과를 공개하시겠습니까?',
  revealPromptStyle: { color: '', ...DEFAULT_BOX },
  blindFx: {
    style: 'dash',
    maskChar: '-',
    text: 'GUESS!',
    speed: 100,
    orbit: false,
    spinnerSize: 100,
    spinnerW: 100,
    spinnerH: 100,
    spinnerRadius: 50,
    spinnerThick: 100,
    imageSize: 60,
    imageX: 0,
    imageY: 0,
    imageRound: true,
  },
  showTarget: true,
  mainTitle: 'STOPIA TIME CHALLENGE',
  subTitle: 'STOP AT THE EXACT MOMENT',
  successText: 'MISSION SUCCESS',
  failText: 'MISSION FAILED',
  resultStyle: {
    success: { custom: false, fill: { ...gradient(['#00e5ff', '#a855f7'], 90), mode: 'solid' }, ...DEFAULT_BOX },
    fail: { custom: false, fill: { ...gradient(['#ff4d6d', '#ff9f1c'], 90), mode: 'solid' }, ...DEFAULT_BOX },
  },
  keyHint: { showKey: true, start: 'START', stop: 'STOP', reveal: 'REVEAL', reset: 'RESET' },
  layout: { title: { ...DEFAULT_BOX }, sub: { ...DEFAULT_BOX }, frame: { ...DEFAULT_BOX }, hint: { ...DEFAULT_BOX }, player: { ...DEFAULT_BOX, hidden: true } },
  version: SETTINGS_VERSION,
  canvas: { aspect: 'free' },
  timeFormat: 'mm:ss:cc',
  labels: { target: 'TARGET', perfect: 'PERFECT', showDiff: true, diffUnit: 's' },
  sound: {
    enabled: false,
    volume: 70,
    events: { start: 'default', stop: 'default', success: 'default', fail: 'default', reveal: 'default', countdown: 'default' },
  },
  round: { countdown: false, countdownSec: 3, autoResetMs: 0, randomTarget: false, randomMinMs: 5000, randomMaxMs: 20000, randomStepMs: 1000 },
  input: { tap: false, gamepad: true },
  resultFx: { particles: 'burst', amount: 100, failShake: 100, successColor: '', failColor: '' },
  leaderboard: { title: 'RANKING', topN: 10, successOnly: false },
  playerFormat: '{name}',
  items: [],
  groups: [],
  guides: { x: [], y: [] },
  customFonts: [],
  theme: neon.id,
  accent: neon.accent,
  text: neon.text,
  bg: structuredClone(neon.bg),
  design: structuredClone(neon.design),
  actionKeys: ['Space'],
  resetKeys: [],
  cheatKeys: [],
};

/** 채우기 저장값 병합 (예전 문자열 정지점 → 위치 있는 정지점) */
function mergeFill(base: Fill, saved?: Partial<Fill>): Fill {
  if (!saved) return structuredClone(base);
  return { ...base, ...saved, ...normalizeGradient(saved, base), mode: saved.mode ?? base.mode, color: saved.color ?? base.color };
}

/** 저장된 값이 없는 항목은 테마 기본값으로 채움 (이전 버전 저장값 호환) */
function mergeDesign(base: DesignSetting, saved?: Partial<DesignSetting>): DesignSetting {
  const d = structuredClone(base);
  if (!saved) return d;
  return {
    ...d,
    ...saved,
    titleFill: mergeFill(d.titleFill, saved.titleFill),
    digitFill: mergeFill(d.digitFill, saved.digitFill),
    borderFill: mergeFill(d.borderFill, saved.borderFill),
    textFx: Object.fromEntries(
      (Object.keys(defaultTextFx()) as TextFxTarget[]).map((k) => [k, { ...NO_TEXT_FX, ...d.textFx?.[k], ...saved.textFx?.[k] }]),
    ) as DesignSetting['textFx'],
  };
}

/** 버전별 변환 (from → from+1). 새 항목은 기본값 병합으로 채워지므로 구조가 바뀔 때만 추가 */
const MIGRATIONS: Record<number, (s: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 → v2: 삽입 요소·캔버스 등 추가 (기본값으로 채움), 배치 단위가 화면 → 무대 기준으로 바뀜 (값은 그대로)
  1: (s) => s,
};

function migrate(saved: Partial<Settings>): Partial<Settings> {
  let v = typeof saved.version === 'number' ? saved.version : 1;
  let out = saved as Record<string, unknown>;
  while (v < SETTINGS_VERSION) {
    out = MIGRATIONS[v]?.(out) ?? out;
    v += 1;
  }
  return out as Partial<Settings>;
}

/** 삽입 요소 정리 (알 수 없는 종류는 버림) */
const normalizeItems = (items: unknown): Item[] =>
  Array.isArray(items)
    ? (items.filter((i) => i && typeof i === 'object' && ['text', 'image', 'shape'].includes((i as Item).type)) as Item[]).map((i) => ({ ...DEFAULT_BOX, ...i }))
    : [];

/** 예전 균일 크기(size) → 가로·세로 배율 */
function legacySize<T extends { w: number; h: number }>(saved: Partial<T> & { size?: number }): Partial<T> {
  const { size, ...rest } = saved;
  return (size !== undefined && rest.w === undefined ? { ...rest, w: size, h: size } : rest) as Partial<T>;
}

function mergeResultStyle(base: ResultTextStyle, saved?: Partial<ResultTextStyle>): ResultTextStyle {
  return { ...base, ...legacySize(saved ?? {}), fill: mergeFill(base.fill, saved?.fill) };
}

const mergeBox = (saved?: Partial<Box>): Box => ({ ...DEFAULT_BOX, ...saved });

/** 부분 저장값을 기본값과 병합해 완전한 Settings 로 만듦 (localStorage · 가져오기 공용) */
export function normalizeSettings(saved: Partial<Settings>): Settings {
  saved = migrate(saved);
  // 이전 버전의 ±고정값 → 양 끝 값으로
  const legacyFixed = (saved as { toleranceFixedMs?: number }).toleranceFixedMs;
  if (legacyFixed !== undefined) {
    saved = { toleranceBelowMs: legacyFixed, toleranceAboveMs: legacyFixed, ...saved };
    delete (saved as { toleranceFixedMs?: number }).toleranceFixedMs;
  }
  // 치트 연출 시간이 따로 생기기 전엔 목표 시간 연출 시간을 같이 썼음
  if (saved.cheatSettleMs === undefined && saved.settleMs !== undefined) {
    saved = { ...saved, cheatSettleMs: saved.settleMs };
  }
  const theme = THEMES.some((t) => t.id === saved.theme) ? saved.theme! : DEFAULT_SETTINGS.theme;
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    theme,
    bg: {
      ...DEFAULT_SETTINGS.bg,
      ...saved.bg,
      gradient: normalizeGradient(saved.bg?.gradient, DEFAULT_SETTINGS.bg.gradient),
    },
    design: mergeDesign(getTheme(theme).design, saved.design),
    revealPromptStyle: { ...DEFAULT_SETTINGS.revealPromptStyle, ...legacySize(saved.revealPromptStyle ?? {}) },
    keyHint: { ...DEFAULT_SETTINGS.keyHint, ...saved.keyHint },
    layout: {
      title: mergeBox(saved.layout?.title),
      sub: mergeBox(saved.layout?.sub),
      frame: mergeBox(saved.layout?.frame),
      hint: mergeBox(saved.layout?.hint),
      // 참가자 이름은 기본으로 숨김 (기록 탭에서 켬)
      player: mergeBox({ hidden: true, ...saved.layout?.player }),
    },
    version: SETTINGS_VERSION,
    canvas: { ...DEFAULT_SETTINGS.canvas, ...saved.canvas },
    labels: { ...DEFAULT_SETTINGS.labels, ...saved.labels },
    sound: { ...DEFAULT_SETTINGS.sound, ...saved.sound, events: { ...DEFAULT_SETTINGS.sound.events, ...saved.sound?.events } },
    round: { ...DEFAULT_SETTINGS.round, ...saved.round },
    input: { ...DEFAULT_SETTINGS.input, ...saved.input },
    resultFx: { ...DEFAULT_SETTINGS.resultFx, ...saved.resultFx },
    leaderboard: { ...DEFAULT_SETTINGS.leaderboard, ...saved.leaderboard },
    items: normalizeItems(saved.items),
    groups: Array.isArray(saved.groups) ? saved.groups : [],
    guides: { x: saved.guides?.x ?? [], y: saved.guides?.y ?? [] },
    customFonts: Array.isArray(saved.customFonts) ? saved.customFonts : [],
    resultStyle: {
      success: mergeResultStyle(DEFAULT_SETTINGS.resultStyle.success, saved.resultStyle?.success),
      fail: mergeResultStyle(DEFAULT_SETTINGS.resultStyle.fail, saved.resultStyle?.fail),
    },
    blindFx: {
      ...DEFAULT_SETTINGS.blindFx,
      ...saved.blindFx,
      style: BLIND_STYLES.some((b) => b.id === saved.blindFx?.style) ? saved.blindFx!.style : DEFAULT_SETTINGS.blindFx.style,
    },
    actionKeys: saved.actionKeys?.length ? saved.actionKeys : DEFAULT_SETTINGS.actionKeys,
    resetKeys: saved.resetKeys ?? DEFAULT_SETTINGS.resetKeys,
    cheatKeys: saved.cheatKeys ?? DEFAULT_SETTINGS.cheatKeys,
  };
}

function load(): Settings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return normalizeSettings(JSON.parse(raw) as Partial<Settings>);
  } catch {
    // 읽지 못한 저장값은 기본값으로 덮어쓰기 전에 따로 보관
    try {
      if (raw) localStorage.setItem(`${STORAGE_KEY}:unreadable`, raw);
    } catch {
      /* storage unavailable */
    }
    return DEFAULT_SETTINGS;
  }
}

/** 연속 변경(드래그·슬라이더)이 멈춘 뒤 한 번만 저장 */
const SAVE_DELAY_MS = 600;

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);
  /** 마지막으로 저장한 시각 — 바뀔 때마다 저장 알림 */
  const [savedAt, setSavedAt] = useState(0);
  const latest = useRef(settings);
  latest.current = settings;
  /** 마지막으로 저장한(또는 불러온) 값 — 같으면 저장할 것 없음 */
  const saved = useRef(settings);

  const flush = useCallback(() => {
    if (latest.current === saved.current) return;
    saved.current = latest.current;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current));
      setSavedAt(Date.now());
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    if (settings === saved.current) return;
    const t = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [settings, flush]);

  // 창을 닫거나 탭을 옮기면 기다리지 않고 바로 저장
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flush]);

  return [settings, setSettings, savedAt] as const;
}

/** 허용 오차(ms) — 목표보다 이른 쪽(below)·늦은 쪽(above). 둘 다 0 이면 1/100초 단위로 정확히 일치해야 성공 */
export function toleranceRange(s: Settings) {
  if (s.strictJudge) return { below: 0, above: 0 };
  if (s.toleranceMode === 'ms') return { below: s.toleranceBelowMs, above: s.toleranceAboveMs };
  const t = Math.round((s.targetMs * s.tolerancePct) / 100);
  return { below: t, above: t };
}

export function isWithinTolerance(s: Settings, diffMs: number) {
  const { below, above } = toleranceRange(s);
  return diffMs >= -below && diffMs <= above;
}
