const pad = (n: number) => String(n).padStart(2, '0');

/** 1/100초 단위로 버림 (화면 표시와 판정 기준을 일치시킴) */
export const toCs = (ms: number) => Math.floor(ms / 10);

/** ms → "MM:SS:CC" */
export function formatTime(ms: number) {
  const cs = Math.min(toCs(Math.max(0, ms)), 59 * 6000 + 5999);
  const m = Math.floor(cs / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${pad(m)}:${pad(s)}:${pad(cs % 100)}`;
}

/** 차이 표시 "+0.12" / "−0.05" / "±0.00" */
export function formatDiff(ms: number) {
  const cs = Math.abs(ms) / 10;
  const sign = ms === 0 ? '±' : ms > 0 ? '+' : '−';
  return `${sign}${(cs / 100).toFixed(2)}`;
}
