// 화면 언어 — 한국어 문구를 그대로 키로 쓰고, 영어는 사전에서 찾음 (없으면 한국어)
import { EN } from './en';

export type Lang = 'ko' | 'en';
const KEY = 'timer-game:lang';

function detect(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'ko' || v === 'en') return v;
  } catch {
    /* storage unavailable */
  }
  return typeof navigator !== 'undefined' && !navigator.language?.toLowerCase().startsWith('ko') ? 'en' : 'ko';
}

/** 이 페이지의 언어 (바꾸면 새로고침 — 모듈의 고정 문구까지 한 번에 바뀌도록) */
export const lang: Lang = detect();
if (typeof document !== 'undefined') document.documentElement.lang = lang;

/** 문구 번역 — {0} {1} 자리에 값 */
export function tr(ko: string, ...args: unknown[]): string {
  const s = lang === 'en' ? (EN[ko] ?? ko) : ko;
  return args.length ? s.replace(/\{(\d+)\}/g, (_, i: string) => String(args[Number(i)])) : s;
}

export function setLang(next: Lang) {
  if (next === lang) return;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable */
  }
  location.reload();
}
