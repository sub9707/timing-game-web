import { useEffect, useState } from 'react';
import { BLIND_STYLES } from './blind';
import { getTheme, THEMES } from './themes';
import type { DesignSetting, ResultTextStyle, Settings } from './types';

const STORAGE_KEY = 'timer-game:settings:v1';

const neon = getTheme('neon');

export const DEFAULT_SETTINGS: Settings = {
  targetMs: 15000,
  toleranceMode: 'pct',
  tolerancePct: 0,
  toleranceBelowMs: 0,
  toleranceAboveMs: 0,
  snapToTarget: false,
  snapAnimate: true,
  settleMs: 1500,
  cheatSettleMs: 1500,
  blind: false,
  blindAfterMs: 3000,
  dramatic: false,
  dramaticMs: 3000,
  revealPrompt: '결과를 공개하시겠습니까?',
  revealPromptStyle: { size: 100, color: '', x: 0, y: 0 },
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
  mainTitle: 'TIME CHALLENGE',
  subTitle: 'STOP AT THE EXACT MOMENT',
  successText: 'MISSION SUCCESS',
  failText: 'MISSION FAILED',
  resultStyle: {
    success: { custom: false, fill: { mode: 'solid', color: '#00e5ff', stops: ['#00e5ff', '#a855f7'], angle: 90 }, size: 100, x: 0, y: 0 },
    fail: { custom: false, fill: { mode: 'solid', color: '#ff4d6d', stops: ['#ff4d6d', '#ff9f1c'], angle: 90 }, size: 100, x: 0, y: 0 },
  },
  theme: neon.id,
  accent: neon.accent,
  text: neon.text,
  bg: structuredClone(neon.bg),
  design: structuredClone(neon.design),
  actionKeys: ['Space'],
  resetKeys: [],
  cheatKeys: [],
};

/** 저장된 값이 없는 항목은 테마 기본값으로 채움 (이전 버전 저장값 호환) */
function mergeDesign(base: DesignSetting, saved?: Partial<DesignSetting>): DesignSetting {
  const d = structuredClone(base);
  if (!saved) return d;
  return {
    ...d,
    ...saved,
    titleFill: { ...d.titleFill, ...saved.titleFill },
    digitFill: { ...d.digitFill, ...saved.digitFill },
    borderFill: { ...d.borderFill, ...saved.borderFill },
  };
}

function mergeResultStyle(base: ResultTextStyle, saved?: Partial<ResultTextStyle>): ResultTextStyle {
  return { ...base, ...saved, fill: { ...base.fill, ...saved?.fill } };
}

/** 부분 저장값을 기본값과 병합해 완전한 Settings 로 만듦 (localStorage · 가져오기 공용) */
export function normalizeSettings(saved: Partial<Settings>): Settings {
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
      gradient: { ...DEFAULT_SETTINGS.bg.gradient, ...saved.bg?.gradient },
    },
    design: mergeDesign(getTheme(theme).design, saved.design),
    revealPromptStyle: { ...DEFAULT_SETTINGS.revealPromptStyle, ...saved.revealPromptStyle },
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

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable */
    }
  }, [settings]);

  return [settings, setSettings] as const;
}

/** 허용 오차(ms) — 목표보다 이른 쪽(below)·늦은 쪽(above). 둘 다 0 이면 1/100초 단위로 정확히 일치해야 성공 */
export function toleranceRange(s: Settings) {
  if (s.toleranceMode === 'ms') return { below: s.toleranceBelowMs, above: s.toleranceAboveMs };
  const t = Math.round((s.targetMs * s.tolerancePct) / 100);
  return { below: t, above: t };
}

export function isWithinTolerance(s: Settings, diffMs: number) {
  const { below, above } = toleranceRange(s);
  return diffMs >= -below && diffMs <= above;
}
