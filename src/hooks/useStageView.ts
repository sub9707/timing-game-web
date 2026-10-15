import { useEffect, useRef } from 'react';
import type { StageView } from '../components/stage/Stage';
import type { GameApi } from '../game/useGame';
import type { GameResult, Phase, StagePreview } from '../types';

/** 미리보기 '진행 중' 화면에 보일 시간 */
const PREVIEW_RUNNING_MS = 7420;

/**
 * 무대에 그릴 상태 — 설정 중 미리보기(pv)는 실제 게임 상태 대신 화면에만 반영
 * (게임은 대기 상태 그대로, 송출 창도 이 상태를 받음)
 */
export function useStageView(game: GameApi, pv: StagePreview | null) {
  const previewStart = useRef(0);
  useEffect(() => {
    if (pv === 'running') previewStart.current = performance.now() - PREVIEW_RUNNING_MS;
  }, [pv]);

  const phase: Phase = pv === 'confirm' ? 'confirm' : pv === 'result' || pv === 'result-fail' ? 'result' : pv === 'running' ? 'running' : game.phase;
  const result: GameResult | null =
    pv === 'result'
      ? { elapsedMs: game.targetMs, diffMs: 0, success: true }
      : pv === 'result-fail'
        ? { elapsedMs: game.targetMs + 1230, diffMs: 1230, success: false }
        : game.result;

  const view: StageView = {
    phase,
    result,
    startAt: pv === 'running' ? previewStart.current || performance.now() - PREVIEW_RUNNING_MS : game.startAt,
    countdownAt: game.countdownAt,
    round: game.round,
    dramaticHit: game.dramaticHit && !pv,
    targetMs: game.targetMs,
    realPhase: pv ? 'idle' : game.phase,
    forceBlind: pv === 'blind',
  };

  /** 지금 화면에 보이는 단계 (이벤트 처리기에서 읽음) */
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  return { view, phaseRef };
}
