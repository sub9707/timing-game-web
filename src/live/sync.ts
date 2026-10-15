// 송출 창 — 운영자 창(메인)이 상태를 보내고, 송출 창은 받아서 무대만 그림 (같은 브라우저 안 BroadcastChannel)
import { useEffect, useRef, useState } from 'react';
import { notifyAsset, onAssetChange } from '../storage/assets';
import type { GameResult, Phase, RoundRecord, Settings } from '../types';

const CHANNEL = 'timer-game:live';

export const isOutputWindow = new URLSearchParams(location.search).has('output');

/** 시각은 창마다 기준이 달라서 공통 기준(timeOrigin + now)으로 주고받음 */
const toEpoch = (t: number) => performance.timeOrigin + t;
const fromEpoch = (e: number) => e - performance.timeOrigin;

/** 무대를 그리는 데 필요한 전부 (시각은 이 창 기준 performance.now) */
export interface LiveState {
  settings: Settings;
  phase: Phase;
  realPhase: Phase;
  result: GameResult | null;
  startAt: number;
  countdownAt: number;
  round: number;
  dramaticHit: boolean;
  targetMs: number;
  forceBlind: boolean;
  player: string;
  board: RoundRecord[] | null;
}

type Wire = Omit<LiveState, 'startAt' | 'countdownAt'> & { startEpoch: number; countdownEpoch: number };

export type PressKind = 'action' | 'reset' | 'cheat';

type Msg = { type: 'state'; snap: Wire } | { type: 'hello' } | { type: 'bye' } | { type: 'press'; kind: PressKind } | { type: 'asset'; key: string };

export function openOutputWindow() {
  const url = new URL(location.href);
  url.searchParams.set('output', '1');
  window.open(url.toString(), 'stopia-output', 'popup,width=1280,height=720');
}

/** 메인 창: 상태를 보내고, 송출 창 연결 수와 송출 창에서 누른 키를 받음 */
export function usePublisher(state: LiveState, onPress: (kind: PressKind) => void) {
  const ch = useRef<BroadcastChannel | null>(null);
  const [outputs, setOutputs] = useState(0);
  const press = useRef(onPress);
  press.current = onPress;
  const latest = useRef(state);
  latest.current = state;

  const send = () => {
    const { startAt, countdownAt, ...rest } = latest.current;
    ch.current?.postMessage({ type: 'state', snap: { ...rest, startEpoch: toEpoch(startAt), countdownEpoch: toEpoch(countdownAt) } } satisfies Msg);
  };

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const c = new BroadcastChannel(CHANNEL);
    ch.current = c;
    c.onmessage = (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (m.type === 'hello') {
        setOutputs((n) => n + 1);
        send();
      } else if (m.type === 'bye') setOutputs((n) => Math.max(0, n - 1));
      else if (m.type === 'press') press.current(m.kind);
    };
    // 이미지가 바뀌면 송출 창도 다시 읽게
    const off = onAssetChange((a) => {
      if (a.source !== 'remote') c.postMessage({ type: 'asset', key: a.key } satisfies Msg);
    });
    return () => {
      off();
      c.close();
      ch.current = null;
    };
  }, []);

  // 그릴 때마다 (송출 창이 있을 때만) 최신 상태 전송
  useEffect(() => {
    if (outputs > 0) send();
  });

  return { outputs };
}

/** 송출 창: 최신 상태를 받고, 여기서 누른 키는 메인으로 보냄 */
export function useSubscriber() {
  const [snap, setSnap] = useState<LiveState | null>(null);
  const ch = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    const c = new BroadcastChannel(CHANNEL);
    ch.current = c;
    c.onmessage = (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (m.type === 'state') {
        const { startEpoch, countdownEpoch, ...rest } = m.snap;
        setSnap({ ...rest, startAt: fromEpoch(startEpoch), countdownAt: fromEpoch(countdownEpoch) });
      } else if (m.type === 'asset') notifyAsset(m.key);
    };
    c.postMessage({ type: 'hello' } satisfies Msg);
    const bye = () => c.postMessage({ type: 'bye' } satisfies Msg);
    window.addEventListener('pagehide', bye);
    return () => {
      bye();
      window.removeEventListener('pagehide', bye);
      c.close();
    };
  }, []);
  return {
    snap,
    press: (kind: PressKind) => ch.current?.postMessage({ type: 'press', kind } satisfies Msg),
  };
}
