// 텍스트 탭: 화면에 나오는 문구와 그 모양
import { useState } from 'react';
import { fontDef } from '../../../settings/fonts';
import type { LabelSetting } from '../../../types';
import { fillMeta, PromptColorSub, ResultColorSub, scaleTo, SubSizeRange, TextFxBlock, TitleColorBlock, TitleFontBlock, TitleSizeRange } from '../blocks';
import { usePanel } from '../context';
import { Field, Fold, NumberInput, PositionPad, Range, Section, Segmented, Sub, TextInput, Toggle } from '../controls';
import { tr } from '../../../i18n';

export function TextTab() {
  const { s, d, set, see, preview, onPreview, setResultStyleOf, setPrompt, onChange } = usePanel();
  const setLabels = (patch: Partial<LabelSetting>) => onChange((prev) => ({ ...prev, labels: { ...prev.labels, ...patch } }));
  const [resultTab, setResultTab] = useState<'success' | 'fail'>('success');
  const rs = s.resultStyle[resultTab];
  const rp = s.revealPromptStyle;

  return (
    <>
      <Section title={tr('타이틀')} aside={see('layout')}>
        <Sub title={tr('문구')}>
          <Field label={tr('메인 타이틀')}>
            <TextInput placeholder={tr('비우면 숨김')} value={s.mainTitle} onChange={(v) => set({ mainTitle: v })} />
          </Field>
          <Field label={tr('서브 타이틀')}>
            <TextInput placeholder={tr('비우면 숨김')} value={s.subTitle} onChange={(v) => set({ subTitle: v })} />
          </Field>
        </Sub>
        <Sub title={tr('글꼴')} aside={<span className="sub-meta">{fontDef(d.titleFont).label}</span>}>
          <TitleFontBlock />
        </Sub>
        <Sub title={tr('크기')}>
          <TitleSizeRange />
          <SubSizeRange />
        </Sub>
        <Sub title={tr('색')} aside={<span className="sub-meta">{fillMeta(d.titleFill)}</span>}>
          <TitleColorBlock />
        </Sub>
        <Fold title={tr('메인 타이틀 글자 효과')} meta={tr('자간·행간·외곽선·그림자')}>
          <TextFxBlock target="title" />
        </Fold>
        <Fold title={tr('서브 타이틀 글자 효과')} meta={tr('자간·행간·외곽선·그림자')}>
          <TextFxBlock target="sub" />
        </Fold>
      </Section>

      <Section title={tr('결과 문구')} aside={see(resultTab === 'fail' ? 'result-fail' : 'result')}>
        <Sub title={tr('문구')}>
          <div className="row-2">
            <Field label={tr('성공')}>
              <TextInput placeholder={tr('성공')} value={s.successText} onChange={(v) => set({ successText: v })} />
            </Field>
            <Field label={tr('실패')}>
              <TextInput placeholder={tr('실패')} value={s.failText} onChange={(v) => set({ failText: v })} />
            </Field>
          </div>
        </Sub>
        <Sub title={tr('스타일')}>
          <Segmented<'success' | 'fail'>
            value={resultTab}
            options={[
              ['success', tr('성공 문구')],
              ['fail', tr('실패 문구')],
            ]}
            onChange={(next) => {
              setResultTab(next);
              // 보는 중이면 화면도 함께 전환
              if (preview === 'result' || preview === 'result-fail') onPreview(next === 'fail' ? 'result-fail' : 'result');
            }}
          />
          <Range
            label={tr('크기')}
            min={40}
            max={250}
            step={5}
            value={rs.w}
            onChange={(v) => setResultStyleOf(resultTab, scaleTo(rs, v))}
            output={<NumberInput value={rs.w} min={20} max={400} decimals={0} suffix="%" onCommit={(v) => setResultStyleOf(resultTab, scaleTo(rs, v))} />}
          />
          <Field label={tr('위치')}>
            <PositionPad x={rs.x} y={rs.y} range={45} wide onChange={(x, y) => setResultStyleOf(resultTab, { x, y })} />
          </Field>
        </Sub>
        <ResultColorSub k={resultTab} />
        <Fold title={tr('결과 문구 글자 효과')} meta={tr('성공·실패 공통')}>
          <TextFxBlock target="result" />
        </Fold>
      </Section>

      <Section title={tr('고정 문구')} hint={tr('타이머 위 라벨과 결과 아래 오차 표시')}>
        <div className="row-2">
          <Field label={tr('목표 시간 라벨')}>
            <TextInput value={s.labels.target} placeholder={tr('비우면 숨김')} onChange={(target) => setLabels({ target })} />
          </Field>
          <Field label={tr('딱 맞췄을 때')}>
            <TextInput value={s.labels.perfect} placeholder="PERFECT" onChange={(perfect) => setLabels({ perfect })} />
          </Field>
        </div>
        <Toggle label={tr('결과 아래 오차 표시')} checked={s.labels.showDiff} onChange={(showDiff) => setLabels({ showDiff })} />
        {s.labels.showDiff && (
          <Segmented<LabelSetting['diffUnit']>
            value={s.labels.diffUnit}
            onChange={(diffUnit) => setLabels({ diffUnit })}
            options={[
              ['s', tr('초 (+1.23s)')],
              ['ms', tr('밀리초 (+1230ms)')],
            ]}
          />
        )}
      </Section>

      <Section
        title={tr('공개 확인 문구')}
        hint={s.blind && s.dramatic ? tr('극적인 결과 공개에서 멈춘 뒤 보여줘요') : tr('연출 탭 › 극적인 결과 공개를 켜면 나와요')}
        aside={see('confirm')}
      >
        <Sub title={tr('문구')}>
          <TextInput placeholder={tr('결과를 공개하시겠습니까?')} value={s.revealPrompt} onChange={(revealPrompt) => set({ revealPrompt })} />
        </Sub>
        <Sub title={tr('스타일')}>
          <Range label={tr('크기')} min={50} max={250} step={5} value={rp.w} onChange={(v) => setPrompt(scaleTo(rp, v))} suffix="%" />
          <Field label={tr('위치')}>
            <PositionPad x={rp.x} y={rp.y} range={45} wide onChange={(x, y) => setPrompt({ x, y })} />
          </Field>
        </Sub>
        <PromptColorSub />
      </Section>
    </>
  );
}
