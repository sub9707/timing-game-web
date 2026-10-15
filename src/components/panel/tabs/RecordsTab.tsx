// 기록 탭: 참가자 이름 · 랭킹 화면 · 기록 목록 · CSV 내보내기
import { useState } from 'react';
import { ranking, toCsv, useRecords } from '../../../game/records';
import { formatDiff, formatTime } from '../../../game/time';
import { autoClearPlayer, setAutoClearPlayer } from '../../../game/useGame';
import { downloadBlob } from '../../../storage/download';
import { usePanel } from '../context';
import { Field, Hint, NumberInput, Range, Section, TextInput, Toggle } from '../controls';
import { tr } from '../../../i18n';

export function RecordsTab() {
  const { s, set, onChange, app } = usePanel();
  const { records, player, setPlayer, remove, clear } = useRecords();
  const [autoClear, setAutoClear] = useState(autoClearPlayer);
  const [confirmClear, setConfirmClear] = useState(false);
  const lb = s.leaderboard;
  const fmt = s.timeFormat;
  const top = ranking(records, lb);

  return (
    <>
      <Section title={tr('참가자')} hint={tr('이름을 넣고 시작하면 기록에 이름이 함께 남아요')}>
        <TextInput value={player} placeholder={tr('참가자 이름')} onChange={setPlayer} />
        <Toggle
          label={tr('기록한 뒤 이름 비우기')}
          checked={autoClear}
          onChange={(v) => {
            setAutoClear(v);
            setAutoClearPlayer(v);
          }}
        />
        <Toggle
          label={tr('화면에 참가자 이름 표시')}
          checked={!s.layout.player.hidden}
          onChange={(v) => onChange((prev) => ({ ...prev, layout: { ...prev.layout, player: { ...prev.layout.player, hidden: !v } } }))}
        />
        {!s.layout.player.hidden && (
          <Field label={tr('표시 형식 ({name} 자리에 이름)')}>
            <TextInput value={s.playerFormat} placeholder="{name}" onChange={(playerFormat) => set({ playerFormat })} />
          </Field>
        )}
        <Hint>{tr('위치·크기는 화면 편집에서 바꿀 수 있어요')}</Hint>
      </Section>

      <Section
        title={tr('랭킹 화면')}
        hint={tr('오차가 작은 순서로 보여줘요 · 화면에서 L 키로 열고 닫아요')}
        aside={
          <button className={`chip chip-sm ${app.boardOpen ? 'is-on' : ''}`} onClick={() => app.setBoardOpen(!app.boardOpen)}>
            {app.boardOpen ? tr('랭킹 닫기') : tr('랭킹 보기')}
          </button>
        }
      >
        <Field label={tr('제목')}>
          <TextInput value={lb.title} placeholder="RANKING" onChange={(title) => set({ leaderboard: { ...lb, title } })} />
        </Field>
        <Range
          label={tr('표시 수')}
          min={3}
          max={30}
          step={1}
          value={lb.topN}
          onChange={(topN) => set({ leaderboard: { ...lb, topN } })}
          output={<NumberInput value={lb.topN} min={1} max={100} decimals={0} suffix={tr('명')} onCommit={(topN) => set({ leaderboard: { ...lb, topN } })} />}
        />
        <Toggle label={tr('성공한 기록만')} checked={lb.successOnly} onChange={(successOnly) => set({ leaderboard: { ...lb, successOnly } })} />
      </Section>

      <Section
        title={tr('기록')}
        hint={tr('모두 {0}개 · 성공 {1}개 (설정을 열어 둔 동안의 미리보기는 기록하지 않아요)', records.length, records.filter((r) => r.success).length)}
      >
        {records.length === 0 ? (
          <Hint>{tr('아직 기록이 없어요')}</Hint>
        ) : (
          <ol className="rec-list">
            {[...records].reverse().map((r) => {
              const rank = top.findIndex((t) => t.id === r.id);
              return (
                <li key={r.id} className={`rec-row ${r.success ? 'is-ok' : 'is-fail'}`}>
                  <span className="rec-rank">{rank >= 0 ? rank + 1 : '·'}</span>
                  <span className="rec-name">{r.name || tr('이름 없음')}</span>
                  <span className="rec-time">{formatTime(r.elapsedMs, fmt)}</span>
                  <span className="rec-diff">
                    {formatDiff(r.diffMs, 's', fmt)}
                    {r.cheated ? ' ✱' : ''}
                  </span>
                  <button className="rec-del" aria-label={tr('기록 삭제')} title={tr('이 기록 삭제')} onClick={() => remove(r.id)}>
                    ×
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        <div className="row-2">
          <button
            className="ghost-btn"
            disabled={!records.length}
            onClick={() => downloadBlob(new Blob([toCsv(records)], { type: 'text/csv;charset=utf-8' }), `time-challenge-records-${new Date().toISOString().slice(0, 10)}.csv`)}
          >
            {tr('CSV 내보내기')}
          </button>
          <button
            className={`ghost-btn ${confirmClear ? 'is-danger' : ''}`}
            disabled={!records.length}
            onClick={() => {
              if (!confirmClear) return setConfirmClear(true);
              clear();
              setConfirmClear(false);
            }}
          >
            {confirmClear ? tr('한 번 더 누르면 모두 삭제') : tr('모두 삭제')}
          </button>
        </div>
        <Hint>{tr('✱ 는 치트로 성공 처리된 기록 · 기록은 저장 파일(.tcpack)에도 함께 저장돼요')}</Hint>
      </Section>
    </>
  );
}
