// 화면 언어 — 한국어 문구를 그대로 키로 쓰고, 영어는 사전에서 찾음 (없으면 한국어)
//  · 주소로 언어가 정해짐: / = 한국어, /en/ = 영어 (검색 엔진이 언어별 페이지를 따로 색인)
//  · 첫 화면(/)에 들어온 외국어 브라우저는 /en/ 으로 보냄 (검색 로봇은 그대로 둠)
import { EN } from './en';

export type Lang = 'ko' | 'en';
const KEY = 'timer-game:lang';
const EN_PATH = /\/en(\/(index\.html)?)?$/;
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview/i;

const onEnPath = typeof location !== 'undefined' && EN_PATH.test(location.pathname);

/** 사이트 맨 위 주소 (영어 페이지면 한 단계 위) */
const root = typeof location !== 'undefined' ? new URL(onEnPath && !location.pathname.endsWith('/en') ? '../' : './', location.href) : null;

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'ko' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

function detect(): Lang {
  if (onEnPath) return 'en';
  if (typeof navigator === 'undefined') return 'ko';
  const pref = stored() ?? (BOT.test(navigator.userAgent) || navigator.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en');
  if (pref === 'en' && root) {
    // 영어 주소로 옮김 (송출 창 등 주소 뒤 값은 그대로)
    location.replace(new URL(`en/${location.search}${location.hash}`, root).href);
  }
  return 'ko';
}

/** 이 페이지의 언어 (바꾸면 다른 주소로 이동 — 모듈의 고정 문구까지 한 번에 바뀌도록) */
export const lang: Lang = detect();
if (typeof document !== 'undefined') document.documentElement.lang = lang;

/** 문구 번역 — {0} {1} 자리에 값 */
export function tr(ko: string, ...args: unknown[]): string {
  const s = lang === 'en' ? (EN[ko] ?? ko) : ko;
  return args.length ? s.replace(/\{(\d+)\}/g, (_, i: string) => String(args[Number(i)])) : s;
}

/** 사이트 맨 위 기준 주소 (영어 페이지에서도 같은 파일) · 정책 문서는 영어면 영어 부분으로 */
export function rootHref(path: string, doc = false) {
  const href = root ? new URL(path, root).href : path;
  return doc && lang === 'en' ? `${href}#en` : href;
}

export function setLang(next: Lang) {
  if (next === lang) return;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable */
  }
  location.href = rootHref(next === 'en' ? 'en/' : './');
}
