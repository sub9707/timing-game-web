import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ASSET_LABELS, onAssetChange, putAsset } from '../storage/assets';
import type { Settings } from '../types';
import { tr } from '../i18n';

const MAX = 100;
/** 이 시간 안에 이어지는 변경(슬라이더·색 드래그·타이핑)은 한 단계로 묶음 */
const GROUP_MS = 600;

type Entry<T> =
  | { kind: 'value'; value: T; label: string; at: number }
  | { kind: 'asset'; key: string; before: Blob | null; after: Blob | null; label: string; at: number };

export interface HistoryItem {
  label: string;
  at: number;
}

/**
 * 실행 취소 · 다시 실행 — 설정 변경과 이미지(에셋) 변경을 자동으로 기록
 *  · 연속 변경은 한 단계로 묶음 (멈춘 뒤 다음 변경이 새 단계)
 *  · mark(label): 다음 변경을 무조건 새 단계로 + 이름 (버튼·메뉴처럼 딱 떨어지는 동작 직전)
 *  · reset(next): 파일 불러오기·새 문서처럼 기록을 처음부터
 */
export function useHistory<T>(value: T, setValue: Dispatch<SetStateAction<T>>) {
  const past = useRef<Entry<T>[]>([]);
  const future = useRef<Entry<T>[]>([]);
  /** 마지막으로 확정된 값 (다음 단계의 되돌릴 지점) */
  const prev = useRef(value);
  const lastAt = useRef(0);
  const breakNext = useRef(false);
  const nextLabel = useRef<string | null>(null);
  const [, bump] = useState(0);

  const push = (e: Entry<T>) => {
    past.current = [...past.current.slice(-(MAX - 1)), e];
    future.current = [];
    bump((n) => n + 1);
  };

  useEffect(() => {
    if (value === prev.current) return;
    const now = performance.now();
    if (breakNext.current || now - lastAt.current > GROUP_MS) {
      push({ kind: 'value', value: prev.current, label: nextLabel.current ?? tr('설정 변경'), at: Date.now() });
      breakNext.current = false;
      nextLabel.current = null;
    }
    lastAt.current = now;
    prev.current = value;
  }, [value]);

  // 사용자가 바꾼 이미지·글꼴·효과음도 한 단계
  useEffect(
    () =>
      onAssetChange((c) => {
        if (c.source !== 'user') return;
        lastAt.current = 0;
        push({ kind: 'asset', key: c.key, before: c.before, after: c.after, label: tr('{0} 변경', ASSET_LABELS[c.key] ?? (c.key.startsWith('font:') ? tr('글꼴') : tr('그림'))), at: Date.now() });
      }),
    [],
  );

  const step = useCallback(
    (from: { current: Entry<T>[] }, to: { current: Entry<T>[] }, redo: boolean) => {
      const e = from.current.pop();
      if (!e) return;
      if (e.kind === 'value') {
        to.current.push({ ...e, value: prev.current });
        // 바로 이어서 여러 번 불러도 맞도록 확정 값을 즉시 갱신 (effect 는 같은 값이라 기록 안 함)
        prev.current = e.value;
        setValue(e.value);
      } else {
        to.current.push(e);
        void putAsset(e.key, redo ? e.after : e.before, 'history');
      }
      lastAt.current = 0; // 되돌린 뒤의 변경은 새 단계
      bump((n) => n + 1);
    },
    [setValue],
  );

  const undo = useCallback(() => step(past, future, false), [step]);
  const redo = useCallback(() => step(future, past, true), [step]);
  /** n 단계 되돌리기 (기록 목록에서 고르기) */
  const undoMany = useCallback(
    (n: number) => {
      for (let i = 0; i < n; i++) step(past, future, false);
    },
    [step],
  );
  const mark = useCallback((label?: string) => {
    breakNext.current = true;
    if (label) nextLabel.current = label;
  }, []);
  const reset = useCallback((next?: T) => {
    past.current = [];
    future.current = [];
    if (next !== undefined) prev.current = next;
    bump((n) => n + 1);
  }, []);

  return {
    undo,
    redo,
    undoMany,
    mark,
    reset,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    /** 되돌릴 수 있는 단계 (최근이 마지막) */
    items: past.current.map((e): HistoryItem => ({ label: e.label, at: e.at })),
  };
}

export type HistoryApi = ReturnType<typeof useHistory<Settings>>;
