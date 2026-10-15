// 잠금 모드 — PIN 을 알아야 설정·편집을 열 수 있음 (행사 중 관객이 건드리지 못하게)
import { useCallback, useState } from 'react';

const KEY = 'timer-game:lock';

interface LockState {
  hash: string | null;
  locked: boolean;
}

const read = (): LockState => {
  try {
    return { hash: null, locked: false, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { hash: null, locked: false };
  }
};

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`timer-game:${text}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function useLock() {
  const [state, setState] = useState<LockState>(read);
  const save = (next: LockState) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  /** PIN 정하고 바로 잠그기 */
  const lockWith = useCallback(async (pin: string) => save({ hash: await sha256(pin), locked: true }), []);
  /** 맞으면 풀림 */
  const unlock = useCallback(
    async (pin: string) => {
      if (!state.hash || (await sha256(pin)) === state.hash) {
        save({ ...state, locked: false });
        return true;
      }
      return false;
    },
    [state],
  );
  /** 같은 PIN 으로 다시 잠그기 */
  const relock = useCallback(() => {
    if (state.hash) save({ ...state, locked: true });
  }, [state]);
  /** PIN 지우기 (풀린 상태에서만) */
  const forget = useCallback(() => save({ hash: null, locked: false }), []);

  return { locked: state.locked, hasPin: !!state.hash, lockWith, unlock, relock, forget };
}

export type LockApi = ReturnType<typeof useLock>;
