import { useEffect, useState } from 'react';

const SHOW_MS = 1600;
/** 오류는 더 오래 */
const ERROR_MS = 5000;

/** 왼쪽 아래 작은 저장 알림 — 임시 저장·파일 저장될 때마다 잠깐 */
export function SavedBadge({ at: savedAt, message, tone = 'ok' }: { at: number; message: string; tone?: 'ok' | 'error' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!savedAt) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), tone === 'error' ? ERROR_MS : SHOW_MS);
    return () => clearTimeout(t);
  }, [savedAt, tone]);

  return (
    <div className={`saved-badge ${visible ? 'is-on' : ''} ${tone === 'error' ? 'is-error' : ''}`} role="status" aria-live="polite">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
      {message}
    </div>
  );
}
