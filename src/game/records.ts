// 라운드 기록 · 랭킹 — 이 브라우저에 보관 (저장 파일에도 함께 묶임)
import { useEffect, useState } from 'react';
import type { LeaderboardSetting, RoundRecord } from '../types';
import { formatDiff, formatTime } from './time';
import { tr } from '../i18n';

const KEY = 'timer-game:records';
const PLAYER_KEY = 'timer-game:player';

function read(): RoundRecord[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

let records = read();
let player = (() => {
  try {
    return localStorage.getItem(PLAYER_KEY) ?? '';
  } catch {
    return '';
  }
})();
const listeners = new Set<() => void>();
const emit = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
    localStorage.setItem(PLAYER_KEY, player);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
};

export const getRecords = () => records;
export const getPlayer = () => player;

export const recordsApi = {
  add(r: RoundRecord) {
    records = [...records, r];
    emit();
  },
  update(id: string, patch: Partial<RoundRecord>) {
    records = records.map((r) => (r.id === id ? { ...r, ...patch } : r));
    emit();
  },
  remove(id: string) {
    records = records.filter((r) => r.id !== id);
    emit();
  },
  clear() {
    records = [];
    emit();
  },
  /** 파일 불러오기 */
  replace(list: RoundRecord[]) {
    records = Array.isArray(list) ? list : [];
    emit();
  },
  setPlayer(name: string) {
    player = name;
    emit();
  },
};

/** 기록·참가자 이름 구독 */
export function useRecords() {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return { records, player, ...recordsApi };
}

/** 랭킹 — 오차가 작은 순 (같으면 먼저 한 순) */
export function ranking(list: RoundRecord[], lb: LeaderboardSetting) {
  return list
    .filter((r) => !lb.successOnly || r.success)
    .slice()
    .sort((a, b) => Math.abs(a.diffMs) - Math.abs(b.diffMs) || a.at - b.at)
    .slice(0, Math.max(1, lb.topN));
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 엑셀에서 바로 열리는 CSV (BOM 포함) */
export function toCsv(list: RoundRecord[]) {
  const head = [tr('순번'), tr('시각'), tr('이름'), tr('목표'), tr('기록'), tr('오차'), tr('결과')];
  const rows = list.map((r, i) => [
    i + 1,
    new Date(r.at).toLocaleString(),
    r.name,
    formatTime(r.targetMs),
    formatTime(r.elapsedMs),
    formatDiff(r.diffMs),
    r.success ? (r.cheated ? tr('성공(치트)') : tr('성공')) : tr('실패'),
  ]);
  return '\uFEFF' + [head, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
