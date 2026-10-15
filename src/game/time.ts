import type { TimeFormat } from '../types';

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** 1/100초 단위로 버림 (예전 판정 기준) */
export const toCs = (ms: number) => Math.floor(ms / 10);

/** 형식에 따른 판정·표시 단위 (ms) — 1/1000초 형식이면 1ms, 아니면 10ms */
export const quantum = (fmt: TimeFormat) => (fmt.endsWith('ccc') ? 1 : 10);

/** 화면 표시와 판정 기준을 일치시키도록 버림 */
export const quantize = (ms: number, fmt: TimeFormat) => {
  const q = quantum(fmt);
  return Math.floor(Math.max(0, ms) / q) * q;
};

export const TIME_FORMATS: [TimeFormat, string][] = [
  ['mm:ss:cc', '00:15:00'],
  ['mm:ss.cc', '00:15.00'],
  ['ss.cc', '15.00'],
  ['mm:ss.ccc', '00:15.000'],
  ['ss.ccc', '15.000'],
];

const MAX_MS = 3599999;

/** ms → 형식 문자열 */
export function formatTime(ms: number, fmt: TimeFormat = 'mm:ss:cc') {
  const t = Math.min(quantize(ms, fmt), MAX_MS);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const totalS = Math.floor(t / 1000);
  const cs = Math.floor((t % 1000) / 10);
  const mss = t % 1000;
  switch (fmt) {
    case 'mm:ss.cc':
      return `${pad(m)}:${pad(s)}.${pad(cs)}`;
    case 'ss.cc':
      return `${pad(totalS)}.${pad(cs)}`;
    case 'mm:ss.ccc':
      return `${pad(m)}:${pad(s)}.${pad(mss, 3)}`;
    case 'ss.ccc':
      return `${pad(totalS)}.${pad(mss, 3)}`;
    default:
      return `${pad(m)}:${pad(s)}:${pad(cs)}`;
  }
}

/** 숫자 칸·구분자 칸 수 (글자 크기 자동 계산용) */
export function formatShape(fmt: TimeFormat) {
  const sample = formatTime(0, fmt);
  const digits = sample.replace(/[^0-9]/g, '').length;
  return { digits, seps: sample.length - digits };
}

/** 차이 표시 "+0.12" / "−0.05" / "±0.00" (unit ms 면 "+120ms") */
export function formatDiff(ms: number, unit: 's' | 'ms' = 's', fmt: TimeFormat = 'mm:ss:cc') {
  const sign = ms === 0 ? '±' : ms > 0 ? '+' : '−';
  const a = Math.abs(ms);
  if (unit === 'ms') return `${sign}${Math.round(a)}ms`;
  return `${sign}${(a / 1000).toFixed(quantum(fmt) === 1 ? 3 : 2)}s`;
}
