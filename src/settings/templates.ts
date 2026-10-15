// 내 템플릿 — 지금 디자인(색·배경·글꼴·테두리)을 저장해 두고 다시 적용 · .stopiatheme 파일로 주고받기
import { useEffect, useState } from 'react';
import { uid } from '../design/layout';
import { downloadBlob } from '../storage/download';
import type { BackgroundSetting, DesignSetting, Settings, ThemeId } from '../types';
import { normalizeSettings } from './settings';

const KEY = 'timer-game:templates';
export const THEME_EXT = '.stopiatheme';
/** 이름 바꾸기 전 확장자 — 계속 가져올 수 있음 */
export const OLD_THEME_EXT = '.tctheme';
const FORMAT = 'stopia-theme';
const OLD_FORMATS = ['time-challenge-theme'];

export interface UserTemplate {
  id: string;
  name: string;
  /** 장식(배경 효과 등)을 빌려 올 기본 테마 */
  theme: ThemeId;
  accent: string;
  text: string;
  bg: BackgroundSetting;
  design: DesignSetting;
}

const read = (): UserTemplate[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

let list = read();
const listeners = new Set<() => void>();
const emit = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
};

/** 설정에서 템플릿 만들기 (배경 이미지는 담지 않음 — 이미지 배경이면 그라데이션으로) */
export function templateFrom(s: Settings, name: string): UserTemplate {
  return {
    id: uid(),
    name,
    theme: s.theme,
    accent: s.accent,
    text: s.text,
    bg: structuredClone({ ...s.bg, mode: s.bg.mode === 'image' ? 'gradient' : s.bg.mode }),
    design: structuredClone(s.design),
  };
}

export function useTemplates() {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return {
    templates: list,
    add(t: UserTemplate) {
      list = [...list, t];
      emit();
    },
    remove(id: string) {
      list = list.filter((t) => t.id !== id);
      emit();
    },
    exportOne(t: UserTemplate) {
      downloadBlob(new Blob([JSON.stringify({ format: FORMAT, version: 1, template: t }, null, 2)], { type: 'application/json' }), `${t.name}${THEME_EXT}`);
    },
    /** 파일에서 가져오기 (잘못된 파일이면 throw) */
    async importFile(file: File) {
      const data = JSON.parse(await file.text()) as { format?: string; template?: Partial<UserTemplate> };
      if ((data.format !== FORMAT && !OLD_FORMATS.includes(data.format ?? '')) || !data.template) throw new Error('not a theme file');
      const t = data.template;
      // 설정 정규화를 거쳐 빠진 항목은 기본값으로
      const s = normalizeSettings({ theme: t.theme, accent: t.accent, text: t.text, bg: t.bg, design: t.design });
      const tpl: UserTemplate = { id: uid(), name: t.name || file.name.replace(/\.[^.]+$/, ''), theme: s.theme, accent: s.accent, text: s.text, bg: s.bg, design: s.design };
      list = [...list, tpl];
      emit();
      return tpl;
    },
  };
}
