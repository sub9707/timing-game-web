// 게임 진행 — 대기 → (카운트다운) → 진행 → (확인 · 긴장 · 굴러가기) → 결과
import { useCallback, useEffect, useRef, useState } from 'react';
import { isWithinTolerance } from '../settings/settings';
import type { GameResult, Phase, RoundSetting, Settings, SoundEvent } from '../types';
import { getPlayer, recordsApi } from './records';
import { playSfx, type SfxOptions } from './sfx';
import { quantize } from './time';

/** 버튼 채터링/연타 방지 */
const MIN_RUN_MS = 150;
const MIN_RESULT_MS = 700;
/** 숫자가 목표 시간에 닿은 뒤 성공을 터뜨리기 전 잠깐 멈춤 */
const SETTLE_HOLD_MS = 280;

export type PressKind = 'action' | 'reset' | 'cheat';

const AUTO_CLEAR_KEY = 'timer-game:clear-player';
export const autoClearPlayer = () => {
  try {
    return localStorage.getItem(AUTO_CLEAR_KEY) !== '0';
  } catch {
    return true;
  }
};
export const setAutoClearPlayer = (on: boolean) => {
  try {
    localStorage.setItem(AUTO_CLEAR_KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
};

/** 무작위 목표 시간 (간격 단위로) */
export function pickTarget(r: RoundSetting, fallback: number, prev?: number) {
  const step = Math.max(10, r.randomStepMs);
  const min = Math.min(r.randomMinMs, r.randomMaxMs);
  const max = Math.max(r.randomMinMs, r.randomMaxMs);
  const n = Math.floor((max - min) / step);
  if (n < 0) return fallback;
  // 고를 게 둘 이상이면 직전 목표와 겹치지 않게
  for (;;) {
    const t = min + Math.floor(Math.random() * (n + 1)) * step;
    if (n === 0 || t !== prev) return t;
  }
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function useGame(settings: Settings, opts: { record: boolean }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [startAt, setStartAt] = useState(0);
  const [countdownAt, setCountdownAt] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [round, setRound] = useState(0);
  /** 이번 결과가 극적인 공개를 거쳐 나왔는지 (공개 순간 연출용) */
  const [dramaticHit, setDramaticHit] = useState(false);
  /** 이번 라운드 목표 (무작위 목표면 라운드마다 바뀜) */
  const [targetMs, setTargetMs] = useState(() => (settings.round.randomTarget ? pickTarget(settings.round, settings.targetMs) : settings.targetMs));

  const st = useRef({ phase, startAt, lastAction: 0, settings, result, targetMs, roundId: '', record: opts.record });
  st.current.phase = phase;
  st.current.result = result;
  st.current.startAt = startAt;
  st.current.settings = settings;
  st.current.targetMs = targetMs;
  st.current.record = opts.record;

  const timers = useRef<number[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, Math.max(0, ms)));
  const cancelTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => cancelTimers, []);

  // 목표 시간 설정이 바뀌면 대기 중일 때 바로 반영
  const { randomTarget, randomMinMs, randomMaxMs, randomStepMs } = settings.round;
  useEffect(() => {
    if (st.current.phase !== 'idle') return;
    setTargetMs(randomTarget ? pickTarget(st.current.settings.round, st.current.settings.targetMs) : settings.targetMs);
  }, [settings.targetMs, randomTarget, randomMinMs, randomMaxMs, randomStepMs]);

  const sfx = (e: SoundEvent, o?: SfxOptions) => void playSfx(e, st.current.settings.sound, o);

  /** 대기로 (다음 라운드 목표 정함) */
  const goIdle = useCallback(() => {
    cancelTimers();
    setResult(null);
    setDramaticHit(false);
    setPhase('idle');
    const s = st.current.settings;
    setTargetMs(s.round.randomTarget ? pickTarget(s.round, s.targetMs, st.current.targetMs) : s.targetMs);
  }, []);

  /** 기록 남기기 (치트는 같은 라운드 기록을 고침) */
  const saveRecord = (r: GameResult, cheated: boolean) => {
    if (!st.current.record) return;
    const base = { name: getPlayer(), targetMs: st.current.targetMs, elapsedMs: r.elapsedMs, diffMs: r.diffMs, success: r.success };
    if (cheated && st.current.roundId) {
      recordsApi.update(st.current.roundId, { ...base, cheated: true });
      return;
    }
    st.current.roundId = newId();
    recordsApi.add({ id: st.current.roundId, ...base, at: Date.now() });
    if (autoClearPlayer() && base.name) recordsApi.setPlayer('');
  };

  /** 결과 화면으로. 굴러갈 숫자(fromMs)가 있으면 settle 연출을 먼저 거침 */
  const showResult = useCallback((r: GameResult, dramatic: boolean, cheated = false) => {
    const finish = (hit: boolean) => {
      st.current.lastAction = performance.now();
      setDramaticHit(hit);
      setRound((n) => n + 1);
      setPhase('result');
      sfx(r.success ? 'success' : 'fail');
      saveRecord(r, cheated);
    };
    if (r.fromMs === undefined || r.fromMs === r.elapsedMs) {
      finish(dramatic);
      return;
    }
    setDramaticHit(false);
    setPhase('settle');
    later((r.settleMs ?? 0) + SETTLE_HOLD_MS, () => finish(true));
  }, []);

  /** 진행 시작 (카운트다운이 끝난 시각 t) */
  const begin = (t: number) => {
    st.current.lastAction = t;
    setStartAt(t);
    setPhase('running');
  };

  const press = useCallback(
    (t: number, kind: PressKind) => {
      const c = st.current;
      const s = c.settings;
      const since = t - c.lastAction;

      if (kind === 'cheat') {
        // 실패 화면에서만: 목표 시간으로 굴러간 뒤 성공 처리
        const r = c.result;
        if (c.phase !== 'result' || !r || r.success) return;
        c.lastAction = t;
        const to = s.cheatTargetOn ? s.cheatTargetMs : c.targetMs;
        const next = { elapsedMs: to, diffMs: to - c.targetMs, success: true, fromMs: r.elapsedMs, settleMs: s.cheatSettleMs };
        c.result = next;
        setResult(next);
        showResult(next, true, true);
        return;
      }

      if (kind === 'reset') {
        // 운영자용: 진행 중 취소 또는 결과 화면 리셋
        if (c.phase === 'idle') return;
        c.lastAction = t;
        goIdle();
        return;
      }

      switch (c.phase) {
        case 'idle': {
          c.lastAction = t;
          setResult(null);
          setDramaticHit(false);
          if (s.round.countdown && s.round.countdownSec > 0) {
            // 3·2·1 뒤 정확히 그 시각부터 잼
            const n = Math.round(s.round.countdownSec);
            setCountdownAt(t);
            setPhase('countdown');
            for (let i = n; i >= 1; i--) later(t + (n - i) * 1000 - performance.now(), () => sfx('countdown', { n: i }));
            later(t + n * 1000 - performance.now(), () => {
              sfx('countdown', { n: 0 });
              begin(t + n * 1000);
            });
          } else {
            sfx('start');
            begin(t);
          }
          return;
        }
        case 'countdown':
          return; // 카운트다운 중엔 무시 (리셋 키로 취소)
        case 'running': {
          if (since < MIN_RUN_MS) return;
          c.lastAction = t;
          sfx('stop');
          const target = c.targetMs;
          // 화면에 보이는 단위(1/100 또는 1/1000초)로 판정
          const realMs = quantize(t - c.startAt, s.timeFormat);
          const success = isWithinTolerance({ ...s, targetMs: target }, realMs - target);
          // 성공 시 목표 시간으로 보여주기 옵션 (연출을 켜면 실제 시간에서 굴러감)
          const snap = success && s.snapToTarget;
          const elapsedMs = snap ? target : realMs;
          const next: GameResult = {
            elapsedMs,
            diffMs: elapsedMs - target,
            success,
            ...(snap && s.snapAnimate && { fromMs: realMs, settleMs: s.settleMs }),
          };
          c.result = next;
          setResult(next);
          // 블라인드로 가려진 채 멈췄으면 바로 공개하지 않고 한 번 더 묻기
          if (s.blind && s.dramatic && t - c.startAt >= s.blindAfterMs) {
            setPhase('confirm');
            return;
          }
          showResult(next, false);
          return;
        }
        case 'confirm': {
          if (since < MIN_RESULT_MS) return;
          c.lastAction = t;
          setPhase('reveal');
          sfx('reveal', { durationMs: s.dramaticMs });
          later(s.dramaticMs, () => {
            const r = st.current.result;
            if (r) showResult(r, true);
          });
          return;
        }
        case 'reveal':
        case 'settle':
          return; // 연출 중엔 진행 키 무시 (리셋 키로만 취소)
        default:
          // 리셋 키가 따로 지정돼 있으면 진행 키로는 리셋 불가
          if (s.resetKeys.length > 0 || since < MIN_RESULT_MS) return;
          c.lastAction = t;
          goIdle();
      }
    },
    [showResult, goIdle],
  );

  // 결과 후 자동 리셋
  const autoReset = settings.round.autoResetMs;
  useEffect(() => {
    if (phase !== 'result' || autoReset <= 0) return;
    const id = window.setTimeout(goIdle, autoReset);
    return () => clearTimeout(id);
  }, [phase, autoReset, round, goIdle]);

  return { phase, startAt, countdownAt, result, round, dramaticHit, targetMs, press, goIdle, st };
}

export type GameApi = ReturnType<typeof useGame>;
