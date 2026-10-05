import { useEffect, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { downloadImage, exportSettings, importSettings } from '../backup';
import { BLIND_GROUPS, BLIND_STYLES, blindGroup, MASK_CHARS, SPINNER_SHAPES } from '../blind';
import { fillGradient } from '../design';
import type { ImageKey, useStoredImage } from '../imageStore';
import { clampWeight, FONT_IDS, FONTS } from '../fonts';
import { keyLabel, RESERVED_KEYS } from '../keys';
import { DEFAULT_SETTINGS, toleranceMs } from '../settings';
import { COLOR_SWATCHES, FILL_PRESETS, getTheme, GRADIENT_PRESETS, SOLID_SWATCHES, THEMES } from '../themes';
import type { BackgroundSetting, BgMode, BlindSetting, StagePreview, DesignSetting, Fill, FontId, Settings, ThemeId } from '../types';
import { backgroundCss, gradientCss } from './Background';
import { CloseIcon, EyeIcon, EyeOffIcon, ImageIcon, PlusIcon } from './Icons';
import { BlindView } from './Timer';

type StoredImage = ReturnType<typeof useStoredImage>;

interface Props {
  open: boolean;
  settings: Settings;
  onChange: (updater: (s: Settings) => Settings) => void;
  bgImage: StoredImage;
  blindImage: StoredImage;
  preview: StagePreview | null;
  onPreview: (p: StagePreview | null) => void;
  onClose: () => void;
}

const TARGET_CHIPS = [5, 10, 15, 19, 30, 60];

type Tab = 'game' | 'fx' | 'design';
const TABS: [Tab, string][] = [
  ['game', '게임'],
  ['fx', '연출'],
  ['design', '디자인'],
];

export function SettingsPanel({ open, settings: s, onChange, bgImage, blindImage, preview, onPreview, onClose }: Props) {
  const set = (patch: Partial<Settings>) => onChange((prev) => ({ ...prev, ...patch }));
  const setBg = (patch: Partial<BackgroundSetting>) => onChange((prev) => ({ ...prev, bg: { ...prev.bg, ...patch } }));
  const setGradient = (patch: Partial<BackgroundSetting['gradient']>) =>
    onChange((prev) => ({ ...prev, bg: { ...prev.bg, gradient: { ...prev.bg.gradient, ...patch } } }));

  const setBlind = (patch: Partial<BlindSetting>) => onChange((prev) => ({ ...prev, blindFx: { ...prev.blindFx, ...patch } }));
  const fx = s.blindFx;
  const setPrompt = (patch: Partial<Settings['revealPromptStyle']>) =>
    onChange((prev) => ({ ...prev, revealPromptStyle: { ...prev.revealPromptStyle, ...patch } }));
  const rp = s.revealPromptStyle;

  const setDesign = (patch: Partial<DesignSetting>) => onChange((prev) => ({ ...prev, design: { ...prev.design, ...patch } }));
  const d = s.design;

  const applyTheme = (id: ThemeId) => {
    const t = THEMES.find((x) => x.id === id)!;
    onChange((prev) => ({
      ...prev,
      theme: id,
      accent: t.accent,
      text: t.text,
      design: structuredClone(t.design),
      // 이미지 배경을 쓰는 중이면 이미지는 유지
      bg: prev.bg.mode === 'image' ? { ...structuredClone(t.bg), mode: 'image', imageDim: prev.bg.imageDim, imageBlur: prev.bg.imageBlur } : structuredClone(t.bg),
    }));
  };

  /** 한 키는 한 역할만. 진행 키는 최소 1개 유지 */
  const setKeys = (field: 'actionKeys' | 'resetKeys', keys: string[]) =>
    onChange((prev) => {
      const other = field === 'actionKeys' ? 'resetKeys' : 'actionKeys';
      const otherKeys = prev[other].filter((k) => !keys.includes(k));
      if (other === 'actionKeys' && otherKeys.length === 0) return prev;
      return { ...prev, [field]: keys, [other]: otherKeys };
    });

  /** 이 섹션 상태를 무대에 띄워 보기 (한 번에 하나) */
  const see = (mode: StagePreview) => <PreviewToggle on={preview === mode} onToggle={() => onPreview(preview === mode ? null : mode)} />;

  const [resultTab, setResultTab] = useState<'success' | 'fail'>('success');
  const rs = s.resultStyle[resultTab];
  const setResultStyle = (patch: Partial<Settings['resultStyle']['success']>) =>
    onChange((prev) => ({ ...prev, resultStyle: { ...prev.resultStyle, [resultTab]: { ...prev.resultStyle[resultTab], ...patch } } }));

  const tol = toleranceMs(s);
  const [tab, setTab] = useState<Tab>('game');
  const [confirmReset, setConfirmReset] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  useEffect(() => {
    if (!open) {
      setConfirmReset(false);
      setBackupMsg('');
    }
  }, [open]);

  const handleImport = async (file: File) => {
    try {
      const next = await importSettings(file);
      onChange(() => next);
      const missing = [
        next.bg.mode === 'image' && !bgImage.url && '배경',
        next.blind && next.blindFx.style === 'spinner' && !blindImage.url && '스피너',
      ].filter(Boolean);
      setBackupMsg(missing.length ? `불러왔어요. ${missing.join('·')} 이미지는 따로 올려주세요` : '설정을 불러왔어요');
    } catch {
      setBackupMsg('설정 파일을 읽을 수 없어요');
    }
  };

  return (
    <>
      <div className={`scrim ${open ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`panel ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open}>
        <header className="panel-head">
          <div className="tabs" style={{ '--i': TABS.findIndex(([id]) => id === tab), '--n': TABS.length } as CSSProperties}>
            <span className="tabs-thumb" aria-hidden />
            {TABS.map(([id, label]) => (
              <button key={id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <CloseIcon />
          </button>
        </header>

        <div className="panel-body" key={tab}>
          {/* ───────── 게임: 규칙 · 조작 ───────── */}
          {tab === 'game' && (
            <>
              <Section title="목표 시간">
                <SecondsInput valueMs={s.targetMs} onCommit={(ms) => set({ targetMs: ms })} />
                <div className="chips">
                  {TARGET_CHIPS.map((sec) => (
                    <button key={sec} className={`chip ${s.targetMs === sec * 1000 ? 'is-on' : ''}`} onClick={() => set({ targetMs: sec * 1000 })}>
                      {sec}s
                    </button>
                  ))}
                </div>
                <Toggle label="화면에 목표 시간 표시" checked={s.showTarget} onChange={(v) => set({ showTarget: v })} />
              </Section>

              <Section title="허용 오차" aside={tol === 0 ? '정확히' : `±${(tol / 1000).toFixed(2)}s`}>
                <Segmented<Settings['toleranceMode']>
                  value={s.toleranceMode}
                  options={[
                    ['pct', '퍼센트'],
                    ['ms', '직접 입력'],
                  ]}
                  onChange={(toleranceMode) => set({ toleranceMode })}
                />
                {s.toleranceMode === 'pct' ? (
                  <Range
                    min={0}
                    max={10}
                    step={0.1}
                    value={s.tolerancePct}
                    onChange={(v) => set({ tolerancePct: v })}
                    output={<NumberInput value={s.tolerancePct} min={0} max={100} decimals={2} suffix="%" onCommit={(v) => set({ tolerancePct: v })} />}
                  />
                ) : (
                  <div className="tol-fixed">
                    <span>±</span>
                    <NumberInput
                      value={s.toleranceFixedMs / 1000}
                      min={0}
                      max={3599.99}
                      decimals={2}
                      fixed
                      suffix="초"
                      onCommit={(v) => set({ toleranceFixedMs: Math.round(v * 100) * 10 })}
                    />
                  </div>
                )}
                <p className="hint-text">
                  {tol === 0
                    ? `${(s.targetMs / 1000).toFixed(2)}s 에 정확히 멈춰야 성공`
                    : `${((s.targetMs - tol) / 1000).toFixed(2)}s ~ ${((s.targetMs + tol) / 1000).toFixed(2)}s 성공`}
                </p>
              </Section>

              <Section title="화면 문구">
                <Field label="메인 타이틀">
                  <TextInput placeholder="비우면 숨김" value={s.mainTitle} onChange={(v) => set({ mainTitle: v })} />
                </Field>
                <Field label="서브 타이틀">
                  <TextInput placeholder="비우면 숨김" value={s.subTitle} onChange={(v) => set({ subTitle: v })} />
                </Field>
              </Section>

              <Group
                title="조작 키"
                meta={[s.actionKeys.map(keyLabel).join('·'), s.resetKeys.length ? `리셋 ${s.resetKeys.map(keyLabel).join('·')}` : ''].filter(Boolean).join(' / ')}
              >
                <div className="key-row">
                  <span className="field-label">시작 · 정지</span>
                  <KeyList keys={s.actionKeys} min={1} onChange={(k) => setKeys('actionKeys', k)} />
                </div>
                <div className="key-row">
                  <span className="field-label">리셋</span>
                  <KeyList keys={s.resetKeys} min={0} onChange={(k) => setKeys('resetKeys', k)} />
                </div>
                <p className="hint-text">{s.resetKeys.length ? '리셋 키로만 결과를 넘길 수 있어요' : '비워두면 시작 키로 리셋'}</p>
              </Group>

              <Group title="설정 백업" meta="다른 PC 로 옮기기">
                <div className="row-2">
                  <button className="ghost-btn" onClick={() => exportSettings(s)}>
                    내보내기
                  </button>
                  <label className="ghost-btn file-btn">
                    불러오기
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImport(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <p className="hint-text">{backupMsg || '배경·스피너 이미지는 포함되지 않아요 (각 이미지 설정에서 따로 저장)'}</p>
              </Group>
            </>
          )}

          {/* ───────── 연출: 블라인드 · 극적인 공개 · 결과 ───────── */}
          {tab === 'fx' && (
            <>
              <Section
                title="블라인드"
                hint="진행 중 시간을 가려서 감으로 맞추게 해요"
                toggle={{ checked: s.blind, onChange: (blind) => set({ blind }) }}
                aside={see('blind')}
              >
                <Range
                  label="가림 시작"
                  min={0}
                  max={Math.max(1, Math.floor(s.targetMs / 1000))}
                  step={0.5}
                  value={s.blindAfterMs / 1000}
                  onChange={(v) => set({ blindAfterMs: v * 1000 })}
                  suffix="s 후"
                />

                <div className="blind-preview" style={{ background: s.bg.mode === 'image' && bgImage.url ? `center / cover url(${bgImage.url})` : backgroundCss(s.bg) }}>
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

                <Fold title="효과 옵션" meta={BLIND_STYLES.find((b) => b.id === fx.style)?.label} defaultOpen>
                  {blindGroup(fx.style) === 'digits' && fx.style !== 'scramble' && (
                    <Field label="가림 문자">
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
                    <Field label="가림 문구">
                      <TextInput placeholder="가림 문구" value={fx.text} onChange={(text) => setBlind({ text })} />
                    </Field>
                  )}

                  {fx.style === 'spinner' && (
                    <>
                      <Field label="모양">
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
                      <Range label="크기" min={40} max={200} step={5} value={fx.spinnerSize} onChange={(spinnerSize) => setBlind({ spinnerSize })} suffix="%" />
                      <Range
                        label="너비"
                        min={20}
                        max={500}
                        step={5}
                        value={fx.spinnerW}
                        onChange={(spinnerW) => setBlind({ spinnerW })}
                        output={<NumberInput value={fx.spinnerW} min={10} max={800} decimals={0} suffix="%" onCommit={(spinnerW) => setBlind({ spinnerW })} />}
                      />
                      <Range
                        label="높이"
                        min={20}
                        max={200}
                        step={5}
                        value={fx.spinnerH}
                        onChange={(spinnerH) => setBlind({ spinnerH })}
                        output={<NumberInput value={fx.spinnerH} min={10} max={400} decimals={0} suffix="%" onCommit={(spinnerH) => setBlind({ spinnerH })} />}
                      />
                      <Range
                        label="모서리"
                        min={0}
                        max={50}
                        step={1}
                        value={fx.spinnerRadius}
                        onChange={(spinnerRadius) => setBlind({ spinnerRadius })}
                        output={<NumberInput value={fx.spinnerRadius} min={0} max={50} decimals={0} suffix="%" onCommit={(spinnerRadius) => setBlind({ spinnerRadius })} />}
                      />
                      <Range label="두께" min={20} max={400} step={10} value={fx.spinnerThick} onChange={(spinnerThick) => setBlind({ spinnerThick })} suffix="%" />
                      <p className="hint-text">모서리 50% = 원·알약, 0% = 사각</p>
                      <Field label="가운데 이미지">
                        <ImageField image={blindImage} imageKey="blindImage" small>
                          <Range label="크기" min={10} max={150} step={1} value={fx.imageSize} onChange={(imageSize) => setBlind({ imageSize })} suffix="%" />
                          <Field label="위치">
                            <PositionPad x={fx.imageX} y={fx.imageY} range={50} onChange={(imageX, imageY) => setBlind({ imageX, imageY })} />
                          </Field>
                          <Toggle label="스피너 모양대로 자르기" checked={fx.imageRound} onChange={(imageRound) => setBlind({ imageRound })} />
                        </ImageField>
                      </Field>
                    </>
                  )}

                  {fx.style !== 'dash' && fx.style !== 'hidden' && fx.style !== 'text' && (
                    <Range label="속도" min={25} max={300} step={5} value={fx.speed} onChange={(speed) => setBlind({ speed })} suffix="%" />
                  )}
                  <Toggle label="테두리 글로우 스피너" checked={fx.orbit} onChange={(orbit) => setBlind({ orbit })} />
                </Fold>
              </Section>

              <Section
                title="극적인 결과 공개"
                hint={s.blind ? '가려진 채 멈추면 한 번 더 눌러야 떨림 연출 뒤 공개돼요' : '블라인드를 켜야 쓸 수 있어요'}
                toggle={{ checked: s.blind && s.dramatic, disabled: !s.blind, onChange: (dramatic) => set({ dramatic }) }}
                aside={see('confirm')}
              >
                <Range
                  label="떨림 시간"
                  min={0.5}
                  max={15}
                  step={0.5}
                  value={s.dramaticMs / 1000}
                  onChange={(v) => set({ dramaticMs: v * 1000 })}
                  output={<NumberInput value={s.dramaticMs / 1000} min={0.5} max={60} decimals={1} suffix="초" onCommit={(v) => set({ dramaticMs: v * 1000 })} />}
                />
                <Field label="공개 확인 문구">
                  <TextInput placeholder="결과를 공개하시겠습니까?" value={s.revealPrompt} onChange={(revealPrompt) => set({ revealPrompt })} />
                </Field>
                <Fold title="문구 스타일" meta={`${rp.size}% · ${rp.color ? '사용자 색' : '테마 색'}`}>
                  <Range label="크기" min={50} max={250} step={5} value={rp.size} onChange={(size) => setPrompt({ size })} suffix="%" />
                  <Field label="위치">
                    <PositionPad x={rp.x} y={rp.y} range={45} wide onChange={(x, y) => setPrompt({ x, y })} />
                  </Field>
                  <Field label="색" aside={<ThemeColorChip on={!rp.color} onClick={() => setPrompt({ color: '' })} />}>
                    <ColorField value={rp.color || s.accent} swatches={COLOR_SWATCHES} onChange={(color) => setPrompt({ color })} />
                  </Field>
                </Fold>
              </Section>

              <Section title="결과 문구" aside={see(resultTab === 'fail' ? 'result-fail' : 'result')}>
                <div className="row-2">
                  <Field label="성공">
                    <TextInput placeholder="성공" value={s.successText} onChange={(v) => set({ successText: v })} />
                  </Field>
                  <Field label="실패">
                    <TextInput placeholder="실패" value={s.failText} onChange={(v) => set({ failText: v })} />
                  </Field>
                </div>
                <Fold title="문구 스타일" meta="크기 · 위치 · 색">
                  <Segmented<'success' | 'fail'>
                    value={resultTab}
                    options={[
                      ['success', '성공 문구'],
                      ['fail', '실패 문구'],
                    ]}
                    onChange={(next) => {
                      setResultTab(next);
                      // 보는 중이면 화면도 함께 전환
                      if (preview === 'result' || preview === 'result-fail') onPreview(next === 'fail' ? 'result-fail' : 'result');
                    }}
                  />
                  <Range
                    label="크기"
                    min={40}
                    max={250}
                    step={5}
                    value={rs.size}
                    onChange={(size) => setResultStyle({ size })}
                    output={<NumberInput value={rs.size} min={20} max={400} decimals={0} suffix="%" onCommit={(size) => setResultStyle({ size })} />}
                  />
                  <Field label="위치">
                    <PositionPad x={rs.x} y={rs.y} range={45} wide onChange={(x, y) => setResultStyle({ x, y })} />
                  </Field>
                  <Field label="색" aside={<ThemeColorChip on={!rs.custom} onClick={() => setResultStyle({ custom: false })} />}>
                    <div className={`fill-wrap ${rs.custom ? '' : 'is-dimmed'}`}>
                      <FillField value={rs.fill} onChange={(fill) => setResultStyle({ fill, custom: true })} />
                    </div>
                  </Field>
                </Fold>
              </Section>
            </>
          )}

          {/* ───────── 디자인: 테마 · 배경 · 요소별 스타일 ───────── */}
          {tab === 'design' && (
            <>
              <Section
                title="테마"
                aside={
                  <button className="link-btn" onClick={() => setDesign(structuredClone(getTheme(s.theme).design))}>
                    디자인 되돌리기
                  </button>
                }
              >
                <div className="theme-grid">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      className={`theme-card theme-${t.id} ${s.theme === t.id ? 'is-on' : ''}`}
                      style={
                        {
                          background: backgroundCss(t.bg),
                          '--accent': t.design.borderFill.mode === 'solid' ? t.design.borderFill.color : t.design.borderFill.stops[1],
                          '--text': t.design.digitFill.color,
                          '--font-digit': FONTS[t.design.digitFont].family,
                          '--digit-weight': t.design.digitWeight,
                        } as CSSProperties
                      }
                      onClick={() => applyTheme(t.id)}
                    >
                      <span className="tc-frame">
                        <span className="tc-digits">00:15</span>
                      </span>
                      <span className="tc-name">{t.name}</span>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="색상">
                <Field label="포인트 (성공 · 글로우)">
                  <ColorField value={s.accent} swatches={COLOR_SWATCHES} onChange={(accent) => set({ accent })} />
                </Field>
                <Field label="보조 텍스트">
                  <ColorField value={s.text} swatches={['#ffffff', '#f6e7c1', '#eafcff', '#111111', '#5a3d6e', '#c9ffd6']} onChange={(text) => set({ text })} />
                </Field>
              </Section>

              <Group title="배경" meta={{ solid: '단색', gradient: '그라데이션', image: '이미지' }[s.bg.mode]}>
                <Segmented<BgMode>
                  value={s.bg.mode}
                  onChange={(mode) => setBg({ mode })}
                  options={[
                    ['solid', '단색'],
                    ['gradient', '그라데이션'],
                    ['image', '이미지'],
                  ]}
                />

                {s.bg.mode === 'solid' && <ColorField value={s.bg.solid} swatches={SOLID_SWATCHES} onChange={(solid) => setBg({ solid })} />}

                {s.bg.mode === 'gradient' && (
                  <>
                    <div className="gradient-preview" style={{ background: gradientCss(s.bg.gradient) }} />
                    <Segmented<'linear' | 'radial'>
                      value={s.bg.gradient.type}
                      onChange={(type) => setGradient({ type })}
                      options={[
                        ['linear', '선형'],
                        ['radial', '원형'],
                      ]}
                    />
                    {s.bg.gradient.type === 'linear' && (
                      <Range label="각도" min={0} max={360} step={5} value={s.bg.gradient.angle} onChange={(angle) => setGradient({ angle })} suffix="°" />
                    )}
                    <StopsEditor stops={s.bg.gradient.stops} onChange={(stops) => setGradient({ stops })} />
                    <div className="swatches">
                      {GRADIENT_PRESETS.map((stops, i) => (
                        <button
                          key={i}
                          className="swatch swatch-wide"
                          style={{ background: `linear-gradient(135deg, ${stops.join(', ')})` }}
                          onClick={() => setGradient({ stops: [...stops] })}
                          aria-label="그라데이션 프리셋"
                        />
                      ))}
                    </div>
                  </>
                )}

                {s.bg.mode === 'image' && (
                  <ImageField image={bgImage} imageKey="background">
                    <Range label="어둡게" min={0} max={90} step={1} value={s.bg.imageDim} onChange={(imageDim) => setBg({ imageDim })} suffix="%" />
                    <Range label="블러" min={0} max={30} step={1} value={s.bg.imageBlur} onChange={(imageBlur) => setBg({ imageBlur })} suffix="px" />
                  </ImageField>
                )}
              </Group>

              <Group title="타이틀" meta={`${FONTS[d.titleFont].label} · ${d.titleScale}%`} aside={see('layout')}>
                <FontPicker value={d.titleFont} sample="가Aa" onChange={(titleFont) => setDesign({ titleFont, titleWeight: clampWeight(titleFont, d.titleWeight) })} />
                <WeightRange font={d.titleFont} value={d.titleWeight} onChange={(titleWeight) => setDesign({ titleWeight })} />
                <Range label="메인 크기" min={40} max={180} step={5} value={d.titleScale} onChange={(titleScale) => setDesign({ titleScale })} suffix="%" />
                <Range label="서브 크기" min={50} max={200} step={5} value={d.subScale} onChange={(subScale) => setDesign({ subScale })} suffix="%" />
                <Toggle label="기울임" checked={d.titleItalic} onChange={(titleItalic) => setDesign({ titleItalic })} />
                <FillField value={d.titleFill} onChange={(titleFill) => setDesign({ titleFill })} />
              </Group>

              <Group title="타이머 숫자" meta={`${FONTS[d.digitFont].label} · ${d.digitScale}%`} aside={see('layout')}>
                <FontPicker value={d.digitFont} sample="12" onChange={(digitFont) => setDesign({ digitFont, digitWeight: clampWeight(digitFont, d.digitWeight) })} />
                <WeightRange font={d.digitFont} value={d.digitWeight} onChange={(digitWeight) => setDesign({ digitWeight })} />
                <Range label="크기" min={50} max={140} step={5} value={d.digitScale} onChange={(digitScale) => setDesign({ digitScale })} suffix="%" />
                <Toggle label="기울임" checked={d.digitItalic} onChange={(digitItalic) => setDesign({ digitItalic })} />
                <FillField value={d.digitFill} onChange={(digitFill) => setDesign({ digitFill })} />
              </Group>

              <Group title="테두리 · 판" meta={d.borderLines ? `${d.borderLines}줄` : '테두리 없음'} aside={see('layout')}>
                <Segmented<string>
                  value={String(d.borderLines)}
                  onChange={(v) => setDesign({ borderLines: Number(v) })}
                  options={[
                    ['0', '없음'],
                    ['1', '1줄'],
                    ['2', '2줄'],
                    ['3', '3줄'],
                  ]}
                />
                {d.borderLines > 0 && (
                  <>
                    <Range label="두께" min={0.5} max={12} step={0.5} value={d.borderWidth} onChange={(borderWidth) => setDesign({ borderWidth })} suffix="px" />
                    {d.borderLines > 1 && (
                      <Range label="간격" min={2} max={30} step={1} value={d.borderGap} onChange={(borderGap) => setDesign({ borderGap })} suffix="px" />
                    )}
                    <Segmented<DesignSetting['borderSides']>
                      value={d.borderSides}
                      onChange={(borderSides) => setDesign({ borderSides })}
                      options={[
                        ['all', '전체'],
                        ['y', '위·아래'],
                        ['top', '위'],
                      ]}
                    />
                    {d.borderFill.mode === 'solid' && (
                      <Segmented<DesignSetting['borderStyle']>
                        value={d.borderStyle}
                        onChange={(borderStyle) => setDesign({ borderStyle })}
                        options={[
                          ['solid', '실선'],
                          ['dashed', '대시'],
                          ['dotted', '점선'],
                        ]}
                      />
                    )}
                    <FillField value={d.borderFill} onChange={(borderFill) => setDesign({ borderFill })} />
                  </>
                )}
                <Range label="모서리" min={0} max={80} step={1} value={d.borderRadius} onChange={(borderRadius) => setDesign({ borderRadius })} suffix="px" />
                <Range label="판 배경" min={0} max={100} step={5} value={d.frameBg} onChange={(frameBg) => setDesign({ frameBg })} suffix="%" />
              </Group>

              <Group title="글로우" meta="빛 번짐 세기" aside={see('result')}>
                <Range label="타이틀" min={0} max={100} step={5} value={d.glowTitle} onChange={(glowTitle) => setDesign({ glowTitle })} />
                <Range label="타이머" min={0} max={100} step={5} value={d.glowDigits} onChange={(glowDigits) => setDesign({ glowDigits })} />
                <Range label="테두리" min={0} max={100} step={5} value={d.glowBorder} onChange={(glowBorder) => setDesign({ glowBorder })} />
                <Range label="결과" min={0} max={100} step={5} value={d.glowResult} onChange={(glowResult) => setDesign({ glowResult })} />
              </Group>
            </>
          )}
        </div>

        <footer className="panel-foot">
          <button
            className={`ghost-btn ${confirmReset ? 'is-danger' : ''}`}
            onClick={() => {
              if (!confirmReset) return setConfirmReset(true);
              onChange(() => structuredClone(DEFAULT_SETTINGS));
              setConfirmReset(false);
            }}
          >
            {confirmReset ? '한 번 더 누르면 초기화' : '초기화'}
          </button>
          <button className="primary-btn" onClick={onClose}>
            완료
          </button>
        </footer>
      </aside>
    </>
  );
}

/* ───────── controls ───────── */

interface SectionToggle {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

/** 항상 펼쳐진 섹션. toggle 이 있으면 제목 옆 스위치로 켜고, 켜졌을 때만 내용(과 aside)을 보여줌 */
function Section({
  title,
  hint,
  aside,
  toggle,
  children,
}: {
  title: string;
  hint?: ReactNode;
  aside?: ReactNode;
  toggle?: SectionToggle;
  children: ReactNode;
}) {
  const on = !toggle || toggle.checked;
  return (
    <section className={`section ${toggle ? 'has-toggle' : ''} ${on ? '' : 'is-off'}`}>
      <div className="section-head">
        <div className="section-title">
          <h3>{title}</h3>
          {hint && <p className="section-hint">{hint}</p>}
        </div>
        {on && aside && <span className="section-aside">{aside}</span>}
        {toggle && (
          <label className={`toggle ${toggle.disabled ? 'is-disabled' : ''}`} aria-label={title}>
            <input type="checkbox" checked={toggle.checked} disabled={toggle.disabled} onChange={(e) => toggle.onChange(e.target.checked)} />
            <i aria-hidden />
          </label>
        )}
      </div>
      {on && <div className="section-body">{children}</div>}
    </section>
  );
}

/** 라벨 + 내용 한 묶음 (aside 는 라벨 오른쪽) */
function Field({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <div className="label-row">
        <Label>{label}</Label>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** 섹션 안의 접히는 상세 설정 */
function Fold({ title, meta, defaultOpen, children }: { title: string; meta?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="fold" open={defaultOpen}>
      <summary>
        <span className="fold-title">{title}</span>
        {meta && <span className="fold-meta">{meta}</span>}
        <Chevron />
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

function ThemeColorChip({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className={`chip chip-sm ${on ? 'is-on' : ''}`} onClick={onClick}>
      테마 색
    </button>
  );
}

const Chevron = () => (
  <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const Label = ({ children }: { children: ReactNode }) => <span className="field-label">{children}</span>;

function SecondsInput({ valueMs, onCommit }: { valueMs: number; onCommit: (ms: number) => void }) {
  const [draft, setDraft] = useState((valueMs / 1000).toFixed(2));
  useEffect(() => setDraft((valueMs / 1000).toFixed(2)), [valueMs]);

  const commit = () => {
    const v = Number(draft);
    if (!Number.isFinite(v) || v <= 0) return setDraft((valueMs / 1000).toFixed(2));
    const ms = Math.round(Math.min(v, 3599.99) * 100) * 10;
    onCommit(ms);
    setDraft((ms / 1000).toFixed(2));
  };

  return (
    <div className="seconds-input">
      <input
        type="number"
        inputMode="decimal"
        min={0.01}
        max={3599.99}
        step={0.01}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <span>초</span>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="text-input" type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
  suffix,
  output,
}: {
  label?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  /** 기본 숫자 표시 대신 렌더 (예: 직접 입력 필드) */
  output?: ReactNode;
}) {
  const pct = Math.min(100, ((value - min) / (max - min)) * 100);
  return (
    <div className="range">
      {label && <span className="field-label">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--pct': `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {output ?? (
        <output>
          {Number.isInteger(step) ? value : value.toFixed(1)}
          {suffix}
        </output>
      )}
    </div>
  );
}

/** 입력 중엔 자유롭게, blur/Enter 시 범위·자릿수 맞춰 반영 */
function NumberInput({
  value,
  min,
  max,
  decimals,
  fixed,
  suffix,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  decimals: number;
  /** 소수 자릿수 고정 표시 (0.10) — 아니면 불필요한 0 제거 (0.1) */
  fixed?: boolean;
  suffix?: string;
  onCommit: (v: number) => void;
}) {
  const format = (v: number) => (fixed ? v.toFixed(decimals) : String(Number(v.toFixed(decimals))));
  const [draft, setDraft] = useState(format(value));
  useEffect(() => setDraft(format(value)), [value]);

  const commit = () => {
    const v = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(v)) return setDraft(format(value));
    const next = Number(Math.min(max, Math.max(min, v)).toFixed(decimals));
    onCommit(next);
    setDraft(format(next));
  };

  return (
    <label className="num-input">
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={1 / 10 ** decimals}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {suffix && <span>{suffix}</span>}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
    </label>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const idx = options.findIndex(([v]) => v === value);
  return (
    <div className="segmented" style={{ '--n': options.length, '--i': idx } as CSSProperties}>
      <span className="segmented-thumb" aria-hidden />
      {options.map(([v, label]) => (
        <button key={v} className={v === value ? 'is-on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function ColorField({ value, swatches, onChange }: { value: string; swatches: string[]; onChange: (v: string) => void }) {
  return (
    <div className="color-field">
      <label className="color-current" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
      <div className="swatches">
        {swatches.map((c) => (
          <button
            key={c}
            className={`swatch ${c.toLowerCase() === value.toLowerCase() ? 'is-on' : ''}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={c}
          />
        ))}
      </div>
    </div>
  );
}

function KeyList({ keys, min, onChange }: { keys: string[]; min: number; onChange: (keys: string[]) => void }) {
  const [capturing, setCapturing] = useState(false);

  return (
    <div className="keys">
      {keys.map((k) => (
        <span key={k} className="keycap">
          {keyLabel(k)}
          {keys.length > min && (
            <button className="keycap-remove" aria-label="제거" onClick={() => onChange(keys.filter((x) => x !== k))}>
              ×
            </button>
          )}
        </span>
      ))}
      {keys.length < 4 && (
        <button
          className={`key-add ${capturing ? 'is-capturing' : ''}`}
          data-key-capture
          aria-label="키 추가"
          onClick={() => setCapturing(true)}
          onBlur={() => setCapturing(false)}
          onKeyDown={(e) => {
            if (!capturing) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.repeat || RESERVED_KEYS.includes(e.code)) return;
            if (e.key !== 'Escape' && !keys.includes(e.code)) onChange([...keys, e.code]);
            setCapturing(false);
          }}
        >
          {capturing ? '키 입력…' : <PlusIcon />}
        </button>
      )}
    </div>
  );
}

/** 화면에서 보기 토글 (설정 패널이 닫히면 자동으로 꺼짐) */
function PreviewToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      className={`preview-btn ${on ? 'is-on' : ''}`}
      onClick={(e) => {
        // Group(summary) 안에서 눌러도 접힘/펼침이 바뀌지 않도록
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      {on ? <EyeIcon /> : <EyeOffIcon />}
      {on ? '보는 중' : '화면에서 보기'}
    </button>
  );
}

/** 위치 조절: 패드 드래그 · 방향키(Shift 는 5칸) · 수치 입력. 값은 -range ~ range (%) */
function PositionPad({
  x,
  y,
  range,
  wide,
  onChange,
}: {
  x: number;
  y: number;
  range: number;
  /** 화면 비율(16:9) 패드 — 화면 기준 위치일 때 */
  wide?: boolean;
  onChange: (x: number, y: number) => void;
}) {
  const clamp = (v: number) => Math.round(Math.min(range, Math.max(-range, v)));
  const toPct = (v: number) => `${((v + range) / (range * 2)) * 100}%`;

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onChange(clamp(((e.clientX - r.left) / r.width) * 2 * range - range), clamp(((e.clientY - r.top) / r.height) * 2 * range - range));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 5 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    onChange(clamp(x + d[0]), clamp(y + d[1]));
  };

  return (
    <div className="pos">
      <div
        className={`pos-pad ${wide ? 'is-wide' : ''}`}
        tabIndex={0}
        role="slider"
        aria-label="위치"
        aria-valuetext={`가로 ${x}%, 세로 ${y}%`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
        onKeyDown={onKey}
      >
        <span className="pos-dot" style={{ left: toPct(x), top: toPct(y) }} />
      </div>
      <div className="pos-fields">
        <div className="pos-field">
          <span>가로</span>
          <NumberInput value={x} min={-range} max={range} decimals={0} suffix="%" onCommit={(v) => onChange(v, y)} />
        </div>
        <div className="pos-field">
          <span>세로</span>
          <NumberInput value={y} min={-range} max={range} decimals={0} suffix="%" onCommit={(v) => onChange(x, v)} />
        </div>
        <button className="ghost-btn pos-reset" onClick={() => onChange(0, 0)} disabled={x === 0 && y === 0}>
          가운데
        </button>
      </div>
    </div>
  );
}

/** 이미지 업로드 칸. 이미지가 있으면 children(조절 옵션)과 다운로드·삭제 버튼 표시 */
function ImageField({ image, imageKey, small, children }: { image: StoredImage; imageKey: ImageKey; small?: boolean; children?: ReactNode }) {
  return (
    <>
      <label
        className={`dropzone ${small ? 'is-small' : ''} ${image.url ? 'has-image' : ''}`}
        style={image.url ? { backgroundImage: `url(${image.url})` } : undefined}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) image.save(f);
            e.target.value = '';
          }}
        />
        {!image.url && (
          <span className="dropzone-empty">
            <ImageIcon />
            이미지 선택
          </span>
        )}
      </label>
      {image.url && (
        <>
          {children}
          <div className="row-2">
            <button className="ghost-btn" onClick={() => downloadImage(imageKey)}>
              이미지 다운로드
            </button>
            <button className="ghost-btn" onClick={image.clear}>
              이미지 삭제
            </button>
          </div>
        </>
      )}
    </>
  );
}

/** 접히는 섹션. 접혀 있어도 meta 로 현재 값을 요약해 보여줌 */
function Group({ title, meta, aside, children }: { title: string; meta?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <details className="group">
      <summary>
        <span className="group-title">
          {title}
          {meta && <span className="group-meta">{meta}</span>}
        </span>
        {aside}
        <Chevron />
      </summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

function FontPicker({ value, sample, onChange }: { value: FontId; sample: string; onChange: (id: FontId) => void }) {
  return (
    <div className="font-grid">
      {FONT_IDS.map((id) => (
        <button key={id} className={`font-chip ${id === value ? 'is-on' : ''}`} onClick={() => onChange(id)}>
          <span className="font-sample" style={{ fontFamily: FONTS[id].family }}>
            {sample}
          </span>
          <span className="font-name">{FONTS[id].label}</span>
        </button>
      ))}
    </div>
  );
}

function WeightRange({ font, value, onChange }: { font: FontId; value: number; onChange: (v: number) => void }) {
  const [min, max] = FONTS[font].weights;
  if (min === max) return null;
  return <Range label="굵기" min={min} max={max} step={100} value={value} onChange={onChange} />;
}

function StopsEditor({ stops, onChange }: { stops: string[]; onChange: (stops: string[]) => void }) {
  return (
    <div className="stops">
      {stops.map((c, i) => (
        <div key={i} className="stop">
          <input type="color" value={c} onChange={(e) => onChange(stops.map((x, j) => (j === i ? e.target.value : x)))} />
          {stops.length > 2 && (
            <button className="stop-remove" aria-label="색 제거" onClick={() => onChange(stops.filter((_, j) => j !== i))}>
              ×
            </button>
          )}
        </div>
      ))}
      {stops.length < 4 && (
        <button className="stop-add" aria-label="색 추가" onClick={() => onChange([...stops, stops.at(-1)!])}>
          <PlusIcon />
        </button>
      )}
    </div>
  );
}

/** 단색 / 그라데이션 채우기 편집 (텍스트·테두리 공용) */
function FillField({ value: f, onChange }: { value: Fill; onChange: (f: Fill) => void }) {
  const set = (patch: Partial<Fill>) => onChange({ ...f, ...patch });
  // 단색에서 처음 전환하면 같은 색 두 개라 변화가 안 보이므로 기본 대비색을 채움
  const toGradient = () =>
    set(f.stops.every((c) => c === f.stops[0]) ? { mode: 'gradient', stops: [f.color, '#8a8a8a'] } : { mode: 'gradient' });

  return (
    <>
      <Segmented<Fill['mode']>
        value={f.mode}
        onChange={(mode) => (mode === 'gradient' ? toGradient() : set({ mode }))}
        options={[
          ['solid', '단색'],
          ['gradient', '그라데이션'],
        ]}
      />
      {f.mode === 'solid' ? (
        <ColorField value={f.color} swatches={COLOR_SWATCHES} onChange={(color) => set({ color })} />
      ) : (
        <>
          <div className="gradient-preview is-thin" style={{ background: fillGradient(f) }} />
          <Range label="각도" min={0} max={360} step={5} value={f.angle} onChange={(angle) => set({ angle })} suffix="°" />
          <StopsEditor stops={f.stops} onChange={(stops) => set({ stops })} />
          <div className="swatches">
            {FILL_PRESETS.map((stops, i) => (
              <button
                key={i}
                className="swatch swatch-wide"
                style={{ background: `linear-gradient(135deg, ${stops.join(', ')})` }}
                onClick={() => set({ stops: [...stops] })}
                aria-label="그라데이션 프리셋"
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
