import { useEffect, useState } from 'react';
import type { HistoryApi } from '../../hooks/useHistory';
import { canPickPath, type DocumentApi } from '../../storage/doc';
import { PACK_EXT } from '../../storage/pack';
import { RedoIcon, UndoIcon } from '../ui/Icons';
import { tr } from '../../i18n';

type Pop = 'recent' | 'history' | null;

/** 패널 맨 위 파일 바 — 파일 이름·상태 · 실행 취소 · 새로 만들기 · 최근 파일 · 불러오기 · 저장 */
export function FileBar({ doc, history }: { doc: DocumentApi; history: HistoryApi }) {
  /** 저장 안 한 변경이 있을 때 한 번 더 확인할 동작 */
  const [confirm, setConfirm] = useState<'open' | 'new' | null>(null);
  const [pop, setPop] = useState<Pop>(null);
  const msg = doc.notice;
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(null), 4000);
    return () => clearTimeout(t);
  }, [confirm]);

  const guard = async (kind: 'open' | 'new', run: () => Promise<unknown>) => {
    if (doc.dirty && doc.name && confirm !== kind) return setConfirm(kind);
    setConfirm(null);
    setPop(null);
    await run();
  };

  const status = !doc.name
    ? tr('새 문서 · 이 브라우저에 임시 저장 중{0}', canPickPath ? '' : tr(' · 이 브라우저는 저장할 때마다 새로 내려받아요'))
    : doc.dirty
      ? tr('저장 안 된 변경 있음')
      : tr('저장됨');
  const steps = [...history.items].reverse();

  return (
    <div className="file-bar">
      <div className="file-info">
        <span className={`file-dot ${doc.name && !doc.dirty ? 'is-saved' : ''}`} aria-hidden />
        <div className="file-text">
          <span className="file-name" title={doc.name ?? undefined}>
            {doc.name ?? tr('제목 없음{0}', PACK_EXT)}
          </span>
          <span className={`file-status ${msg ? (msg.ok ? 'is-ok' : 'is-error') : ''}`}>{msg ? msg.message : status}</span>
        </div>
        <div className="history-btns">
          <button className="history-btn" onClick={history.undo} disabled={!history.canUndo} title={tr('실행 취소 (Ctrl+Z)')} aria-label={tr('실행 취소')}>
            <UndoIcon />
          </button>
          <button
            className={`history-btn is-list ${pop === 'history' ? 'is-on' : ''}`}
            onClick={() => setPop(pop === 'history' ? null : 'history')}
            disabled={!history.canUndo}
            title={tr('실행 취소 기록')}
            aria-label={tr('실행 취소 기록')}
          >
            ▾
          </button>
          <button className="history-btn" onClick={history.redo} disabled={!history.canRedo} title={tr('다시 실행 (Ctrl+Y)')} aria-label={tr('다시 실행')}>
            <RedoIcon />
          </button>
        </div>
      </div>

      {pop === 'history' && (
        <ol className="file-pop">
          <li className="file-pop-head">{tr('고른 단계까지 되돌려요')}</li>
          {steps.map((h, i) => (
            <li key={`${h.at}-${i}`}>
              <button
                onClick={() => {
                  history.undoMany(i + 1);
                  setPop(null);
                }}
              >
                <span>{h.label}</span>
                <time>{new Date(h.at).toLocaleTimeString()}</time>
              </button>
            </li>
          ))}
        </ol>
      )}

      {pop === 'recent' && (
        <ul className="file-pop">
          <li className="file-pop-head">{tr('최근 파일')}</li>
          {doc.recent.length === 0 && <li className="file-pop-empty">{tr('아직 없어요')}</li>}
          {doc.recent.map((r) => (
            <li key={`${r.name}-${r.at}`} className="recent-row">
              <button disabled={!r.handle} onClick={() => guard('open', () => doc.openRecent(r))} title={r.handle ? tr('열기') : tr('이 브라우저에선 바로 열 수 없어요')}>
                <span className="recent-thumb" style={r.thumb ? { backgroundImage: `url(${r.thumb})` } : undefined} />
                <span className="recent-meta">
                  <b>{r.name}</b>
                  <time>{new Date(r.at).toLocaleString()}</time>
                </span>
              </button>
              <button className="recent-del" aria-label={tr('목록에서 지우기')} title={tr('목록에서 지우기')} onClick={() => void doc.removeRecent(r)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="file-actions">
        <button
          className={`file-btn is-ghost ${confirm === 'new' ? 'is-danger' : ''}`}
          onClick={() => guard('new', doc.newDoc)}
          disabled={doc.busy}
          title={tr('새로 만들기 — 기본 설정으로 (이미지·기록도 비움)')}
        >
          {confirm === 'new' ? tr('버리고 새로') : tr('새로')}
        </button>
        <button className={`file-btn is-open ${confirm === 'open' ? 'is-danger' : ''}`} onClick={() => guard('open', doc.open)} disabled={doc.busy} title={tr('불러오기 (Ctrl+O)')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1M3 7v11a2 2 0 0 0 2 2h13l3-8H7l-3 8" />
          </svg>
          {confirm === 'open' ? tr('버리고 열기') : tr('불러오기')}
        </button>
        <button
          className={`file-btn is-ghost is-narrow ${pop === 'recent' ? 'is-on' : ''}`}
          onClick={() => setPop(pop === 'recent' ? null : 'recent')}
          title={tr('최근 파일')}
          aria-label={tr('최근 파일')}
        >
          ▾
        </button>
        <button className="file-btn is-ghost" onClick={doc.saveAs} disabled={doc.busy} title={canPickPath ? tr('다른 이름으로 저장 (Ctrl+Shift+S)') : tr('파일로 내려받기')}>
          {tr('다른 이름')}
        </button>
        <button className="file-btn is-save" onClick={doc.save} disabled={doc.busy} title={doc.name ? tr('저장 (Ctrl+S)') : tr('저장 위치 선택 (Ctrl+S)')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
            <path d="M7 3v5h8V3M7 21v-7h10v7" />
          </svg>
          {doc.name ? tr('저장') : tr('저장…')}
        </button>
      </div>
    </div>
  );
}
