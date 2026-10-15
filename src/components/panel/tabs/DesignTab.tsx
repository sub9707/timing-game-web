// 디자인 탭: 화면 비율 · 템플릿 · 기본 색 · 배경 · 요소별 모양
import { useState } from 'react';
import { fontDef } from '../../../settings/fonts';
import { templateFrom, THEME_EXT, useTemplates, type UserTemplate } from '../../../settings/templates';
import { COLOR_SWATCHES, getTheme, GRADIENT_PRESETS, SOLID_SWATCHES, THEMES } from '../../../settings/themes';
import type { BgMode, CanvasAspect, ResultFxSetting, ThemeId } from '../../../types';
import { BorderBlock, BorderColorBlock, DigitColorBlock, DigitFontBlock, DigitSizeRange, fillMeta, Glow, PlateBlock, TEXT_SWATCHES, TextFxBlock } from '../blocks';
import { ColorField } from '../ColorPicker';
import { usePanel } from '../context';
import { Field, Fold, Group, Hint, Range, Section, Segmented, Sub, TextInput, ThemeColorChip, Toggle } from '../controls';
import { GradientEditor } from '../GradientEditor';
import { ImageField, TemplateCard, ThemeCard } from '../parts';
import { tr } from '../../../i18n';

const ASPECTS: [CanvasAspect, string][] = [
  ['free', tr('창에 맞춤')],
  ['16:9', '16:9'],
  ['9:16', tr('9:16 세로')],
  ['4:3', '4:3'],
  ['1:1', '1:1'],
  ['21:9', '21:9'],
];

const BG_LABEL: Record<BgMode, string> = { solid: tr('단색'), gradient: tr('그라데이션'), image: tr('이미지·동영상'), transparent: tr('투명 (송출용)'), chroma: tr('크로마키') };

export function DesignTab() {
  const { s, d, set, setBg, setDesign, onChange, see, bgImage, act } = usePanel();
  const tpl = useTemplates();
  const [name, setName] = useState('');
  const [tplMsg, setTplMsg] = useState('');

  const applyTheme = (id: ThemeId) => {
    const t = THEMES.find((x) => x.id === id)!;
    act(
      (prev) => ({
        ...prev,
        theme: id,
        accent: t.accent,
        text: t.text,
        design: structuredClone(t.design),
        // 이미지 배경을 쓰는 중이면 이미지는 유지
        bg: prev.bg.mode === 'image' ? { ...structuredClone(t.bg), mode: 'image', imageDim: prev.bg.imageDim, imageBlur: prev.bg.imageBlur } : structuredClone(t.bg),
      }),
      tr('템플릿'),
    );
  };
  const applyUser = (t: UserTemplate) =>
    act(
      (prev) => ({
        ...prev,
        theme: t.theme,
        accent: t.accent,
        text: t.text,
        design: structuredClone(t.design),
        bg: prev.bg.mode === 'image' ? { ...structuredClone(t.bg), mode: 'image', imageDim: prev.bg.imageDim, imageBlur: prev.bg.imageBlur } : structuredClone(t.bg),
      }),
      tr('내 템플릿'),
    );
  const setRfx = (patch: Partial<ResultFxSetting>) => onChange((prev) => ({ ...prev, resultFx: { ...prev.resultFx, ...patch } }));

  return (
    <>
      <Section title={tr('화면 비율')} hint={tr('고정 비율이면 어떤 모니터에서도 배치가 같아요 (남는 곳은 배경)')} aside={see('layout')}>
        <div className="chips">
          {ASPECTS.map(([a, label]) => (
            <button key={a} className={`chip ${s.canvas.aspect === a ? 'is-on' : ''}`} onClick={() => set({ canvas: { aspect: a } })}>
              {label}
            </button>
          ))}
        </div>
        <Hint>{tr('송출 해상도에 맞추세요 — 예: 1920×1080 은 16:9')}</Hint>
      </Section>

      <Section
        title={tr('템플릿')}
        hint={tr('고르면 색·배경·글꼴·테두리가 한 번에 바뀌어요')}
        aside={
          <button className="link-btn" onClick={() => setDesign(structuredClone(getTheme(s.theme).design))}>
            {tr('디자인 되돌리기')}
          </button>
        }
      >
        <div className="theme-grid">
          {THEMES.map((t) => (
            <ThemeCard key={t.id} id={t.id} on={s.theme === t.id} onClick={() => applyTheme(t.id)} />
          ))}
        </div>
        <Sub title={tr('내 템플릿')} aside={<span className="sub-meta">{tpl.templates.length}{tr('개')}</span>}>
          {tpl.templates.length > 0 && (
            <div className="theme-grid">
              {tpl.templates.map((t) => (
                <TemplateCard key={t.id} cardKey={t.id} t={t} on={false} onClick={() => applyUser(t)} onRemove={() => tpl.remove(t.id)} />
              ))}
            </div>
          )}
          <div className="row-tpl">
            <TextInput value={name} placeholder={tr('지금 디자인 이름')} onChange={setName} />
            <button
              className="ghost-btn"
              onClick={() => {
                tpl.add(templateFrom(s, name.trim() || tr('내 템플릿 {0}', tpl.templates.length + 1)));
                setName('');
                setTplMsg(tr('지금 디자인을 저장했어요'));
              }}
            >
              {tr('저장')}
            </button>
          </div>
          <div className="row-2">
            <label className="ghost-btn file-btn">
              {tr('템플릿 파일 가져오기')}
              <input
                type="file"
                accept={`${THEME_EXT},application/json`}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try {
                    const t = await tpl.importFile(f);
                    setTplMsg(tr('{0} 을(를) 가져왔어요', t.name));
                  } catch {
                    setTplMsg(tr('템플릿 파일이 아니에요'));
                  }
                }}
              />
            </label>
            <button className="ghost-btn" disabled={!tpl.templates.length} onClick={() => tpl.templates.forEach((t) => tpl.exportOne(t))}>
              {tr('모두 내보내기')}
            </button>
          </div>
          <Hint>{tplMsg || tr('배경 이미지는 템플릿에 담기지 않아요 · 카드의 × 로 삭제')}</Hint>
        </Sub>
      </Section>

      <Section title={tr('기본 색')}>
        <Field label={tr('포인트 (성공 · 글로우)')}>
          <ColorField value={s.accent} swatches={COLOR_SWATCHES} onChange={(accent) => set({ accent })} />
        </Field>
        <Field label={tr('보조 텍스트')}>
          <ColorField value={s.text} swatches={TEXT_SWATCHES} onChange={(text) => set({ text })} />
        </Field>
        <Field label={tr('성공 색')} aside={<ThemeColorChip on={!s.resultFx.successColor} onClick={() => setRfx({ successColor: '' })} />}>
          <div className={`fill-wrap ${s.resultFx.successColor ? '' : 'is-dimmed'}`}>
            <ColorField value={s.resultFx.successColor || s.accent} swatches={COLOR_SWATCHES} onChange={(successColor) => setRfx({ successColor })} />
          </div>
        </Field>
        <Field label={tr('실패 색')} aside={<ThemeColorChip on={!s.resultFx.failColor} onClick={() => setRfx({ failColor: '' })} />}>
          <div className={`fill-wrap ${s.resultFx.failColor ? '' : 'is-dimmed'}`}>
            <ColorField value={s.resultFx.failColor || '#ff4d6d'} swatches={['#ff4d6d', '#ff3b3b', '#8b8b93', '#3d5afe', '#ff9f1c']} onChange={(failColor) => setRfx({ failColor })} />
          </div>
        </Field>
      </Section>

      <Group title={tr('배경')} meta={BG_LABEL[s.bg.mode]}>
        <Segmented<BgMode>
          value={s.bg.mode}
          onChange={(mode) => setBg({ mode })}
          options={[
            ['solid', tr('단색')],
            ['gradient', tr('그라데이션')],
            ['image', tr('이미지')],
          ]}
        />
        <div className="chips">
          <button className={`chip ${s.bg.mode === 'transparent' ? 'is-on' : ''}`} onClick={() => setBg({ mode: 'transparent' })}>
            {tr('투명 (OBS 송출)')}
          </button>
          <button className={`chip ${s.bg.mode === 'chroma' ? 'is-on' : ''}`} onClick={() => setBg({ mode: 'chroma' })}>
            {tr('크로마키')}
          </button>
        </div>

        {s.bg.mode === 'solid' && <ColorField value={s.bg.solid} swatches={SOLID_SWATCHES} alpha={false} onChange={(solid) => setBg({ solid })} />}

        {s.bg.mode === 'gradient' && <GradientEditor value={s.bg.gradient} onChange={(gradient) => setBg({ gradient })} presets={GRADIENT_PRESETS} />}

        {s.bg.mode === 'image' && (
          <ImageField image={bgImage} imageKey="background" accept="image/*,video/mp4,video/webm">
            <Range label={tr('어둡게')} min={0} max={90} step={1} value={s.bg.imageDim} onChange={(imageDim) => setBg({ imageDim })} suffix="%" />
            <Range label={tr('블러')} min={0} max={30} step={1} value={s.bg.imageBlur} onChange={(imageBlur) => setBg({ imageBlur })} suffix="px" />
          </ImageField>
        )}
        {s.bg.mode === 'image' && <Hint>{tr('사진·움짤(GIF)·동영상(mp4·webm) 모두 돼요 · 동영상은 소리 없이 반복 재생')}</Hint>}

        {s.bg.mode === 'transparent' && <Hint>{tr('OBS 브라우저 소스로 넣으면 뒤 화면이 비쳐 보여요 (일반 브라우저에선 검게 보임)')}</Hint>}
        {s.bg.mode === 'chroma' && (
          <>
            <ColorField value={s.bg.chroma} swatches={['#00b140', '#00ff00', '#0047bb', '#ff00ff']} alpha={false} onChange={(chroma) => setBg({ chroma })} />
            <Hint>{tr('송출 프로그램에서 이 색을 크로마키로 빼세요 · 배경 장식은 꺼져요')}</Hint>
          </>
        )}
        {s.bg.mode !== 'transparent' && s.bg.mode !== 'chroma' && <Toggle label={tr('테마 배경 장식 (움직이는 효과)')} checked={d.bgFx} onChange={(bgFx) => setDesign({ bgFx })} />}
      </Group>

      <Group title={tr('타이머 숫자')} meta={`${fontDef(d.digitFont).label} · ${d.digitScale}% · ${fillMeta(d.digitFill)}`} aside={see('layout')}>
        <Sub title={tr('글꼴')}>
          <DigitFontBlock />
        </Sub>
        <Sub title={tr('크기')}>
          <DigitSizeRange />
        </Sub>
        <Sub title={tr('색')}>
          <DigitColorBlock />
        </Sub>
        <Fold title={tr('숫자 글자 효과')} meta={tr('외곽선·그림자')}>
          <TextFxBlock target="digits" />
        </Fold>
      </Group>

      <Group title={tr('테두리 · 판')} meta={d.borderLines ? tr('{0}줄 · {1}', d.borderLines, fillMeta(d.borderFill)) : tr('테두리 없음')} aside={see('layout')}>
        <Sub title={tr('테두리')}>
          <BorderBlock />
        </Sub>
        {d.borderLines > 0 && (
          <Sub title={tr('테두리 색')}>
            <BorderColorBlock />
          </Sub>
        )}
        <Sub title={tr('판')}>
          <PlateBlock />
        </Sub>
      </Group>

      <Group title={tr('글로우')} meta={tr('빛 번짐 세기')} aside={see('result')}>
        <Glow label={tr('타이틀')} k="glowTitle" />
        <Glow label={tr('타이머')} k="glowDigits" />
        <Glow label={tr('테두리')} k="glowBorder" />
        <Glow label={tr('결과')} k="glowResult" />
      </Group>
    </>
  );
}
