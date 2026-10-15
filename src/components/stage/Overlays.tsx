// 무대 위 오버레이 — 카운트다운 숫자 · 랭킹 화면
import { useEffect, useState } from 'react';
import { formatDiff, formatTime } from '../../game/time';
import type { LeaderboardSetting, RoundRecord, TimeFormat } from '../../types';
import { tr } from '../../i18n';

/** 3·2·1 — 시작 시각(at)부터 초마다 숫자가 바뀜 */
export function Countdown({ at, sec }: { at: number; sec: number }) {
  const [n, setN] = useState(sec);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const left = Math.ceil(sec - (performance.now() - at) / 1000);
      setN(left);
      if (left > 0) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [at, sec]);
  if (n <= 0) return null;
  return (
    <div className="countdown" aria-live="assertive">
      <span key={n}>{n}</span>
    </div>
  );
}

/** 랭킹 화면 — 오차가 작은 순 */
export function Leaderboard({ rows, lb, format }: { rows: RoundRecord[]; lb: LeaderboardSetting; format: TimeFormat }) {
  return (
    <div className="board" role="dialog" aria-label={tr('랭킹')}>
      <div className="board-card">
        <h2 className="board-title">{lb.title}</h2>
        {rows.length === 0 ? (
          <p className="board-empty">{tr('아직 기록이 없어요')}</p>
        ) : (
          <ol className="board-list">
            {rows.map((r, i) => (
              <li key={r.id} className={`board-row ${i < 3 ? `is-top is-${i + 1}` : ''} ${r.success ? '' : 'is-fail'}`}>
                <span className="board-rank">{i + 1}</span>
                <span className="board-name">{r.name || tr('이름 없음')}</span>
                <span className="board-time">{formatTime(r.elapsedMs, format)}</span>
                <span className="board-diff">{formatDiff(r.diffMs, 's', format)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
