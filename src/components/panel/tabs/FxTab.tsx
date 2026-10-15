// 연출 탭: 블라인드 · 극적인 결과 공개 · 치트 연출
import type { CSSProperties } from 'react';
import { designVars } from '../../../design/design';
import { BLIND_GROUPS, BLIND_STYLES, blindGroup, MASK_CHARS, SPINNER_SHAPES } from '../../../game/blind';
import { keyLabel } from '../../../game/keys';
import { playSfx, SOUND_EVENTS } from '../../../game/sfx';
import { putAsset } from '../../../storage/assets';
import type { ResultFxSetting, SoundChoice, SoundEvent, SoundSetting } from '../../../types';
import { backgroundCss } from '../../stage/Background';
import { BlindView } from '../../stage/Timer';
import { usePanel } from '../context';
import { Field, Fold, Hint, NumberInput, PositionPad, Range, SecondsInput, Section, Segmented, Sub, TextInput, Toggle } from '../controls';
import { ImageField } from '../parts';
import { tr } from '../../../i18n';

export function FxTab() {
  const { s, d, set, setBlind, see, bgImage, blindImage, onChange } = usePanel();
  const fx = s.blindFx;
  const setSound = (patch: Partial<SoundSetting>) => onChange((prev) => ({ ...prev, sound: { ...prev.sound, ...patch } }));
  const setEvent = (e: SoundEvent, c: SoundChoice) => onChange((prev) => ({ ...prev, sound: { ...prev.sound, events: { ...prev.sound.events, [e]: c } } }));
  const setRfx = (patch: Partial<ResultFxSetting>) => onChange((prev) => ({ ...prev, resultFx: { ...prev.resultFx, ...patch } }));

  return (
    <>
      <Section title={tr('블라인드')} hint={tr('진행 중 시간을 가려서 감으로 맞추게 해요')} toggle={{ checked: s.blind, onChange: (blind) => set({ blind }) }} aside={see('blind')}>
        <Sub title={tr('가림 시점')}>
          <Range
            label={tr('가림 시작')}
            min={0}
            max={Math.max(1, Math.floor(s.targetMs / 1000))}
            step={0.5}
            value={s.blindAfterMs / 1000}
            onChange={(v) => set({ blindAfterMs: v * 1000 })}
            suffix={tr('s 후')}
          />
        </Sub>

        <Sub title={tr('가림 스타일')}>
          <div
            className="blind-preview"
            style={
              {
                // 패널은 .app 바깥이라 미리보기에 필요한 테마 변수를 직접 줌
                ...designVars(d).style,
                '--accent': s.accent,
                '--text': s.text,
                background: s.bg.mode === 'image' && bgImage.url ? `center / cover url(${bgImage.url})` : backgroundCss(s.bg),
              } as CSSProperties
            }
          >
            <div className="blind-preview-frame">
              <BlindView fx={fx} imageUrl={blindImage.url} />
            </div>
          </div>
          {BLIND_GROUPS.map(([group, label]) => (
            <Field key={group} label={label}>
              <div className="chips">
                {BLIND_STYLES.filter((b) => b.group === group).map((b) => (
                  <button key={b.id} className={`chip ${fx.style === b.id ? 'is-on' : ''}`} onClick={() => setBlind({ style: b.id })}>
                    {b.label}
                  </button>
                ))}
              </div>
            </Field>
          ))}
        </Sub>

        <Sub title={tr('효과 옵션')} aside={<span className="sub-meta">{BLIND_STYLES.find((b) => b.id === fx.style)?.label}</span>}>
          {blindGroup(fx.style) === 'digits' && fx.style !== 'scramble' && (
            <Field label={tr('가림 문자')}>
              <div className="chips">
                {MASK_CHARS.map((c) => (
                  <button key={c} className={`chip mask-chip ${fx.maskChar === c ? 'is-on' : ''}`} onClick={() => setBlind({ maskChar: c })}>
                    {c}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {blindGroup(fx.style) === 'text' && (
            <Field label={tr('가림 문구')}>
              <TextInput placeholder={tr('가림 문구')} value={fx.text} onChange={(text) => setBlind({ text })} />
            </Field>
          )}

          {fx.style === 'spinner' && (
            <>
              <Field label={tr('모양')}>
                <div className="chips">
                  {SPINNER_SHAPES.map((sh) => (
                    <button
                      key={sh.label}
                      className={`chip ${fx.spinnerW === sh.w && fx.spinnerH === sh.h && fx.spinnerRadius === sh.r ? 'is-on' : ''}`}
                      onClick={() => setBlind({ spinnerW: sh.w, spinnerH: sh.h, spinnerRadius: sh.r })}
                    >
                      {sh.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Fold title={tr('크기 · 모양 세부')} meta={`${fx.spinnerSize}%`}>
                <Range label={tr('크기')} min={40} max={200} step={5} value={fx.spinnerSize} onChange={(spinnerSize) => setBlind({ spinnerSize })} suffix="%" />
                <Range
                  label={tr('너비')}
                  min={20}
                  max={500}
                  step={5}
                  value={fx.spinnerW}
                  onChange={(spinnerW) => setBlind({ spinnerW })}
                  output={<NumberInput value={fx.spinnerW} min={10} max={800} decimals={0} suffix="%" onCommit={(spinnerW) => setBlind({ spinnerW })} />}
                />
                <Range
                  label={tr('높이')}
                  min={20}
                  max={200}
                  step={5}
                  value={fx.spinnerH}
                  onChange={(spinnerH) => setBlind({ spinnerH })}
                  output={<NumberInput value={fx.spinnerH} min={10} max={400} decimals={0} suffix="%" onCommit={(spinnerH) => setBlind({ spinnerH })} />}
                />
                <Range
                  label={tr('모서리')}
                  min={0}
                  max={50}
                  step={1}
                  value={fx.spinnerRadius}
                  onChange={(spinnerRadius) => setBlind({ spinnerRadius })}
                  output={<NumberInput value={fx.spinnerRadius} min={0} max={50} decimals={0} suffix="%" onCommit={(spinnerRadius) => setBlind({ spinnerRadius })} />}
                />
                <Range label={tr('두께')} min={20} max={400} step={10} value={fx.spinnerThick} onChange={(spinnerThick) => setBlind({ spinnerThick })} suffix="%" />
                <Hint>{tr('모서리 50% = 원·알약, 0% = 사각')}</Hint>
              </Fold>
              <Fold title={tr('가운데 이미지')} meta={blindImage.url ? tr('사용 중') : tr('없음')}>
                <ImageField image={blindImage} imageKey="blindImage" small>
                  <Range label={tr('크기')} min={10} max={150} step={1} value={fx.imageSize} onChange={(imageSize) => setBlind({ imageSize })} suffix="%" />
                  <Field label={tr('위치')}>
                    <PositionPad x={fx.imageX} y={fx.imageY} range={50} onChange={(imageX, imageY) => setBlind({ imageX, imageY })} />
                  </Field>
                  <Toggle label={tr('스피너 모양대로 자르기')} checked={fx.imageRound} onChange={(imageRound) => setBlind({ imageRound })} />
                </ImageField>
              </Fold>
            </>
          )}

          {fx.style !== 'dash' && fx.style !== 'hidden' && fx.style !== 'text' && (
            <Range label={tr('속도')} min={25} max={300} step={5} value={fx.speed} onChange={(speed) => setBlind({ speed })} suffix="%" />
          )}
          <Toggle label={tr('테두리 글로우 스피너')} checked={fx.orbit} onChange={(orbit) => setBlind({ orbit })} />
        </Sub>
      </Section>

      <Section
        title={tr('극적인 결과 공개')}
        hint={s.blind ? tr('가려진 채 멈추면 한 번 더 눌러야 떨림 연출 뒤 공개돼요') : tr('블라인드를 켜야 쓸 수 있어요')}
        toggle={{ checked: s.blind && s.dramatic, disabled: !s.blind, onChange: (dramatic) => set({ dramatic }) }}
        aside={see('confirm')}
      >
        <Range
          label={tr('떨림 시간')}
          min={0.5}
          max={15}
          step={0.5}
          value={s.dramaticMs / 1000}
          onChange={(v) => set({ dramaticMs: v * 1000 })}
          output={<NumberInput value={s.dramaticMs / 1000} min={0.5} max={60} decimals={1} suffix={tr('초')} onCommit={(v) => set({ dramaticMs: v * 1000 })} />}
        />
        <Hint>{tr('공개 확인 문구는 텍스트 탭에서 바꿀 수 있어요')}</Hint>
      </Section>

      <Section title={tr('효과음')} hint={tr('기본 소리는 파일 없이 만들어져요 · 원하는 소리 파일을 올릴 수도 있어요')} toggle={{ checked: s.sound.enabled, onChange: (enabled) => setSound({ enabled }) }}>
        <Range label={tr('음량')} min={0} max={100} step={5} value={s.sound.volume} onChange={(volume) => setSound({ volume })} suffix="%" />
        {SOUND_EVENTS.map(([e, label]) => (
          <div key={e} className="sfx-row">
            <span className="field-label">{label}</span>
            <Segmented<SoundChoice>
              value={s.sound.events[e]}
              onChange={(c) => setEvent(e, c)}
              options={[
                ['default', tr('기본')],
                ['custom', tr('파일')],
                ['off', tr('끔')],
              ]}
            />
            {s.sound.events[e] === 'custom' && (
              <label className="chip chip-sm file-chip" title={tr('소리 파일 올리기 (mp3·wav·ogg)')}>
                {tr('올리기')}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    if (f) void putAsset(`sfx:${e}`, f);
                    ev.target.value = '';
                  }}
                />
              </label>
            )}
            <button className="chip chip-sm" title={tr('미리 듣기')} onClick={() => void playSfx(e, { ...s.sound, enabled: true }, { durationMs: 1500, n: 3 })}>
              ▶
            </button>
          </div>
        ))}
        <Hint>{tr('\'파일\' 을 고르고 올리지 않으면 기본 소리가 나요 · 올린 소리는 저장 파일에 함께 들어가요')}</Hint>
      </Section>

      <Section title={tr('결과 연출')}>
        <Field label={tr('성공 파티클')}>
          <Segmented<ResultFxSetting['particles']>
            value={s.resultFx.particles}
            onChange={(particles) => setRfx({ particles })}
            options={[
              ['burst', tr('터짐')],
              ['confetti', tr('꽃가루')],
              ['stars', tr('별')],
              ['none', tr('없음')],
            ]}
          />
        </Field>
        {s.resultFx.particles !== 'none' && (
          <Range label={tr('파티클 양')} min={20} max={300} step={10} value={s.resultFx.amount} onChange={(amount) => setRfx({ amount })} suffix="%" />
        )}
        <Range label={tr('실패 흔들림')} min={0} max={300} step={10} value={s.resultFx.failShake} onChange={(failShake) => setRfx({ failShake })} suffix="%" />
        <Hint>{tr('성공·실패 색은 디자인 탭 › 기본 색에서 바꿀 수 있어요')}</Hint>
      </Section>

      <Section title={tr('치트 연출')} hint={tr('실패 화면에서 치트 키를 누르면 성공으로 바꿔요')} aside={s.cheatKeys.length ? s.cheatKeys.map(keyLabel).join('·') : tr('키 없음')}>
        <Range
          label={tr('굴러가는 시간')}
          min={0.5}
          max={5}
          step={0.1}
          value={s.cheatSettleMs / 1000}
          onChange={(v) => set({ cheatSettleMs: Math.round(v * 1000) })}
          output={<NumberInput value={s.cheatSettleMs / 1000} min={0.2} max={15} decimals={1} suffix={tr('초')} onCommit={(v) => set({ cheatSettleMs: Math.round(v * 1000) })} />}
        />
        <Toggle label={tr('치트 목표 시간 따로 지정')} checked={s.cheatTargetOn} onChange={(v) => set({ cheatTargetOn: v })} />
        {s.cheatTargetOn && <SecondsInput valueMs={s.cheatTargetMs} onCommit={(ms) => set({ cheatTargetMs: ms })} />}
        <Hint>
          {s.cheatKeys.length
            ? tr('멈춘 시간에서 {0}s 로 굴러간 뒤 성공 처리돼요', ((s.cheatTargetOn ? s.cheatTargetMs : s.targetMs) / 1000).toFixed(2))
            : tr('게임 탭 › 조작 키에서 치트 키를 지정해야 쓸 수 있어요')}
        </Hint>
      </Section>
    </>
  );
}
