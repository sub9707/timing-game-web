import { useEffect, useState } from 'react';
import { getTheme } from './themes';
import type { DesignSetting, Settings } from './types';

const STORAGE_KEY = 'timer-game:settings:v1';

const neon = getTheme('neon');

export const DEFAULT_SETTINGS: Settings = {
  targetMs: 15000,
  tolerancePct: 0,
  blind: false,
  blindAfterMs: 3000,
  showTarget: true,
  mainTitle: 'TIME CHALLENGE',
  subTitle: 'STOP AT THE EXACT MOMENT',
  successText: 'MISSION SUCCESS',
  failText: 'MISSION FAILED',
  theme: neon.id,
  accent: neon.accent,
  text: neon.text,
  bg: structuredClone(neon.bg),
  design: structuredClone(neon.design),
  actionKeys: ['Space'],
  resetKeys: [],
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

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      bg: {
        ...DEFAULT_SETTINGS.bg,
        ...saved.bg,
        gradient: { ...DEFAULT_SETTINGS.bg.gradient, ...saved.bg?.gradient },
      },
      design: mergeDesign(getTheme(saved.theme ?? DEFAULT_SETTINGS.theme).design, saved.design),
      actionKeys: saved.actionKeys?.length ? saved.actionKeys : DEFAULT_SETTINGS.actionKeys,
    };
  } catch {
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

/** 허용 오차(ms). 0% 이면 0 → 1/100초 단위로 정확히 일치해야 성공 */
export const toleranceMs = (s: Settings) => Math.round((s.targetMs * s.tolerancePct) / 100);
