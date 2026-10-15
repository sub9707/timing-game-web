// 게임 탭: 목표 시간 · 성공 판정 · 표시 · 조작 키
import { TIME_FORMATS } from '../../../game/time';
import { toleranceRange } from '../../../settings/settings';
import type { RoundSetting, Settings, TimeFormat } from '../../../types';
import { KeyHintBlock } from '../blocks';
import { usePanel } from '../context';
import { Field, Hint, NumberInput, Range, SecondsInput, Section, Segmented, Toggle } from '../controls';
import { KeyList } from '../parts';
import { tr } from '../../../i18n';

const TARGET_CHIPS = [5, 10, 15, 19, 30, 60];

export function GameTab() {
  const { s, set, onChange } = usePanel();
  const setRound = (patch: Partial<RoundSetting>) => onChange((prev) => ({ ...prev, round: { ...prev.round, ...patch } }));
  const tol = toleranceRange(s);
  const exact = tol.below === 0 && tol.above === 0;

  /** 한 키는 한 역할만. 진행 키는 최소 1개 유지 */
  const setKeys = (field: 'actionKeys' | 'resetKeys' | 'cheatKeys', keys: string[]) =>
    onChange((prev) => {
      const next = { ...prev, [field]: keys };
      for (const other of ['actionKeys', 'resetKeys', 'cheatKeys'] as const) {
        if (other !== field) next[other] = prev[other].filter((k) => !keys.includes(k));
      }
      if (next.actionKeys.length === 0) return prev;
      return next;
    });

  return (
    <>
      <Section title={tr('목표 시간')} aside={`${(s.targetMs / 1000).toFixed(2)}s`}>
        <SecondsInput valueMs={s.targetMs} onCommit={(ms) => set({ targetMs: ms })} />
        <div className="chips">
          {TARGET_CHIPS.map((sec) => (
            <button key={sec} className={`chip ${s.targetMs === sec * 1000 ? 'is-on' : ''}`} onClick={() => set({ targetMs: sec * 1000 })}>
              {sec}s
            </button>
          ))}
        </div>
        <Toggle label={tr('화면에 목표 시간 표시')} checked={s.showTarget} onChange={(v) => set({ showTarget: v })} />
        <Field label={tr('시간 표시 형식')}>
          <div className="chips">
            {TIME_FORMATS.map(([f, sample]) => (
              <button key={f} className={`chip ${s.timeFormat === f ? 'is-on' : ''}`} onClick={() => set({ timeFormat: f as TimeFormat })}>
                {sample}
              </button>
            ))}
          </div>
        </Field>
        {s.timeFormat.endsWith('ccc') && <Hint>{tr('1/1000초 형식이면 판정도 1/1000초 단위로 해요')}</Hint>}
      </Section>

      <Section title={tr('라운드 진행')}>
        <Toggle label={tr('시작 전 카운트다운')} checked={s.round.countdown} onChange={(countdown) => setRound({ countdown })} />
        {s.round.countdown && (
          <Range label={tr('카운트다운')} min={1} max={10} step={1} value={s.round.countdownSec} onChange={(countdownSec) => setRound({ countdownSec })} suffix={tr('초')} />
        )}
        <Toggle label={tr('결과 후 자동으로 다음 라운드')} checked={s.round.autoResetMs > 0} onChange={(v) => setRound({ autoResetMs: v ? 5000 : 0 })} />
        {s.round.autoResetMs > 0 && (
          <Range
            label={tr('기다리는 시간')}
            min={1}
            max={30}
            step={1}
            value={s.round.autoResetMs / 1000}
            onChange={(v) => setRound({ autoResetMs: v * 1000 })}
            suffix={tr('초')}
          />
        )}
        <Toggle label={tr('라운드마다 목표 시간 무작위')} checked={s.round.randomTarget} onChange={(randomTarget) => setRound({ randomTarget })} />
        {s.round.randomTarget && (
          <>
            <div className="tol-fixed">
              <NumberInput value={s.round.randomMinMs / 1000} min={0.5} max={3599} decimals={1} suffix={tr('초')} onCommit={(v) => setRound({ randomMinMs: Math.round(v * 1000) })} />
              <span>~</span>
              <NumberInput value={s.round.randomMaxMs / 1000} min={0.5} max={3599} decimals={1} suffix={tr('초')} onCommit={(v) => setRound({ randomMaxMs: Math.round(v * 1000) })} />
            </div>
            <Field label={tr('간격')}>
              <div className="chips">
                {[100, 500, 1000, 5000].map((ms) => (
                  <button key={ms} className={`chip ${s.round.randomStepMs === ms ? 'is-on' : ''}`} onClick={() => setRound({ randomStepMs: ms })}>
                    {ms / 1000}{tr('초')}
                  </button>
                ))}
              </div>
            </Field>
            <Hint>{tr('목표 시간 칸 대신 이 범위에서 매 라운드 새로 정해요 (화면의 TARGET 에 표시)')}</Hint>
          </>
        )}
      </Section>

      <Section
        title={tr('성공 판정')}
        hint={tr('얼마나 가까우면 성공으로 칠지 정해요')}
        aside={
          s.strictJudge
            ? tr('엄격')
            : exact
              ? tr('정확히')
              : tol.below === tol.above
                ? `±${(tol.below / 1000).toFixed(2)}s`
                : `−${(tol.below / 1000).toFixed(2)}s / +${(tol.above / 1000).toFixed(2)}s`
        }
      >
        <Toggle label={tr('엄격한 판정 (허용 오차 없이)')} checked={s.strictJudge} onChange={(strictJudge) => set({ strictJudge })} />
        {/* 엄격한 판정이면 허용 오차 설정은 잠금 (값은 보관돼 끄면 다시 적용) */}
        <fieldset className={`tol-controls ${s.strictJudge ? 'is-disabled' : ''}`} disabled={s.strictJudge}>
          <Segmented<Settings['toleranceMode']>
            value={s.toleranceMode}
            options={[
              ['pct', tr('퍼센트')],
              ['ms', tr('직접 입력')],
            ]}
            onChange={(toleranceMode) => set({ toleranceMode })}
          />
          {s.toleranceMode === 'pct' ? (
            <Range
              label={tr('허용 오차')}
              min={0}
              max={10}
              step={0.1}
              value={s.tolerancePct}
              onChange={(v) => set({ tolerancePct: v })}
              output={<NumberInput value={s.tolerancePct} min={0} max={100} decimals={2} suffix="%" onCommit={(v) => set({ tolerancePct: v })} />}
            />
          ) : (
            <div className="tol-fixed">
              <NumberInput
                value={(s.targetMs - s.toleranceBelowMs) / 1000}
                min={0}
                max={s.targetMs / 1000}
                decimals={2}
                fixed
                suffix={tr('초')}
                onCommit={(v) => set({ toleranceBelowMs: Math.max(0, s.targetMs - Math.round(v * 100) * 10) })}
              />
              <span>~</span>
              <NumberInput
                value={(s.targetMs + s.toleranceAboveMs) / 1000}
                min={s.targetMs / 1000}
                max={3599.99}
                decimals={2}
                fixed
                suffix={tr('초')}
                onCommit={(v) => set({ toleranceAboveMs: Math.max(0, Math.round(v * 100) * 10 - s.targetMs) })}
              />
            </div>
          )}
        </fieldset>
        <Hint>
          {s.strictJudge
            ? tr('엄격한 판정 — {0}s 에 1/100초까지 정확히 멈춰야 성공 (허용 오차 무시)', (s.targetMs / 1000).toFixed(2))
            : exact
              ? tr('{0}s 에 정확히 멈춰야 성공', (s.targetMs / 1000).toFixed(2))
              : tr('{0}s ~ {1}s 성공', ((s.targetMs - tol.below) / 1000).toFixed(2), ((s.targetMs + tol.above) / 1000).toFixed(2))}
        </Hint>
      </Section>

      <Section
        title={tr('성공하면 목표 시간으로 표시')}
        hint={s.snapToTarget ? tr('허용 오차 안이면 실제 시간 대신 목표 시간(PERFECT)을 보여줘요') : tr('허용 오차 안이어도 실제로 멈춘 시간을 그대로 보여줘요')}
        toggle={{ checked: s.snapToTarget, onChange: (v) => set({ snapToTarget: v }) }}
      >
        <Toggle label={tr('목표 시간으로 굴러가는 연출')} checked={s.snapAnimate} onChange={(v) => set({ snapAnimate: v })} />
        {s.snapAnimate ? (
          <Range
            label={tr('굴러가는 시간')}
            min={0.5}
            max={5}
            step={0.1}
            value={s.settleMs / 1000}
            onChange={(v) => set({ settleMs: Math.round(v * 1000) })}
            output={<NumberInput value={s.settleMs / 1000} min={0.2} max={15} decimals={1} suffix={tr('초')} onCommit={(v) => set({ settleMs: Math.round(v * 1000) })} />}
          />
        ) : (
          <Hint>{tr('바로 목표 시간을 보여줘요')}</Hint>
        )}
      </Section>

      <Section title={tr('조작 키')} hint={tr('한 키는 한 역할만 맡을 수 있어요')}>
        <div className="key-row">
          <span className="field-label">{tr('시작 · 정지')}</span>
          <KeyList keys={s.actionKeys} min={1} onChange={(k) => setKeys('actionKeys', k)} />
        </div>
        <div className="key-row">
          <span className="field-label">{tr('리셋')}</span>
          <KeyList keys={s.resetKeys} min={0} onChange={(k) => setKeys('resetKeys', k)} />
        </div>
        <Hint>{s.resetKeys.length ? tr('리셋 키로만 결과를 넘길 수 있어요') : tr('리셋 키를 비워두면 시작 키로 리셋')}</Hint>
        <div className="key-row">
          <span className="field-label">{tr('치트')}</span>
          <KeyList keys={s.cheatKeys} min={0} onChange={(k) => setKeys('cheatKeys', k)} />
        </div>
        <Hint>{tr('실패 화면에서 누르면 성공 처리돼요. 화면엔 표시되지 않아요 (연출 탭 › 치트 연출)')}</Hint>
        <Toggle
          label={tr('화면 아래 키 안내 표시')}
          checked={!s.layout.hint.hidden}
          onChange={(v) => onChange((prev) => ({ ...prev, layout: { ...prev.layout, hint: { ...prev.layout.hint, hidden: !v } } }))}
        />
        {!s.layout.hint.hidden && <KeyHintBlock />}
        <Hint>{tr('위치·크기는 화면 편집에서, 문구는 화면에서 더블클릭해도 바꿀 수 있어요')}</Hint>
      </Section>

      <Section title={tr('다른 입력 장치')} hint={tr('USB 빅버튼은 보통 키보드처럼 동작해서 조작 키에 그 키를 넣으면 돼요')}>
        <Toggle label={tr('화면을 클릭해서 시작·정지 (터치 화면은 항상 탭으로 돼요)')} checked={s.input.tap} onChange={(tap) => set({ input: { ...s.input, tap } })} />
        <Toggle label={tr('게임패드 (A 시작·정지 · B 리셋 · Y 치트)')} checked={s.input.gamepad} onChange={(gamepad) => set({ input: { ...s.input, gamepad } })} />
      </Section>
    </>
  );
}
