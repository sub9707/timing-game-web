// 방문·이용 통계 (Google Analytics 4) — .env 의 VITE_GA_ID 가 있을 때 배포 화면에서만
//  · 개발 서버 · 송출 창은 집계하지 않음 (송출 창까지 세면 방문이 두 배로 잡힘)
//  · 참가자 이름 같은 개인 정보는 절대 보내지 않음 — 횟수·성공 여부 같은 숫자만
import { useEffect, useRef } from 'react';
import { CONSENT_DEFAULT } from './consentRegions';
import type { GameResult, Phase } from './types';

const GA_ID = import.meta.env.VITE_GA_ID?.trim() ?? '';

type Gtag = (...args: unknown[]) => void;
let gtag: Gtag | null = null;

export function initAnalytics() {
  if (gtag || !GA_ID || import.meta.env.DEV) return;
  if (new URLSearchParams(location.search).has('output')) return;
  const w = window as unknown as { dataLayer: unknown[] };
  w.dataLayer = w.dataLayer || [];
  // gtag 는 arguments 객체를 그대로 넣어야 동작함
  gtag = function () {
    w.dataLayer.push(arguments);
  };
  gtag('consent', 'default', CONSENT_DEFAULT);
  gtag('js', new Date());
  gtag('config', GA_ID);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

/** 이벤트 보내기 (설정 안 됐으면 아무것도 안 함) */
export function track(name: string, params?: Record<string, string | number | boolean>) {
  gtag?.('event', name, params);
}

/** 게임 시작·결과 집계 (설정 미리보기 중엔 세지 않음) */
export function useGameAnalytics(phase: Phase, result: GameResult | null, targetMs: number, opts: { enabled: boolean; blind: boolean }) {
  const prev = useRef(phase);
  useEffect(() => {
    const from = prev.current;
    prev.current = phase;
    if (!opts.enabled || from === phase) return;
    const target_s = Math.round(targetMs / 10) / 100;
    if (phase === 'running' && (from === 'idle' || from === 'countdown')) track('game_start', { target_s, blind: opts.blind });
    if (phase === 'result' && result)
      track('round_result', { target_s, success: result.success, diff_ms: Math.round(Math.abs(result.diffMs) / 10) * 10, blind: opts.blind });
  }, [phase]);
}
