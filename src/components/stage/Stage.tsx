// 무대 전체 — 메인 창과 송출 창이 함께 씀
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { designVars, lineStyle, textFxStyle } from '../../design/design';
import { boxStyle, keyHintStage } from '../../design/layout';
import { keyLabel } from '../../game/keys';
import type { EditId, GameResult, Phase, RoundRecord, Settings } from '../../types';
import { Background } from './Background';
import { EditableText, type TextEditProps } from './EditableText';
import { Items } from './Items';
import { Countdown, Leaderboard } from './Overlays';
import { Burst, Result } from './Result';
import { Digits, LiveTimer } from './Timer';
import { tr } from '../../i18n';

/** 화면 비율 → CSS aspect-ratio (free 는 창에 꽉 차게) */
const ASPECT: Record<Settings['canvas']['aspect'], string | null> = {
  free: null,
  '16:9': '16 / 9',
  '9:16': '9 / 16',
  '4:3': '4 / 3',
  '1:1': '1 / 1',
  '21:9': '21 / 9',
};

export interface StageView {
  /** 화면에 보이는 상태 (미리보기 포함) */
  phase: Phase;
  result: GameResult | null;
  startAt: number;
  countdownAt: number;
  round: number;
  dramaticHit: boolean;
  targetMs: number;
  /** 실제 게임 상태 (긴장 막·섬광은 실제 진행에서만) */
  realPhase: Phase;
  forceBlind?: boolean;
}

interface Props {
  settings: Settings;
  view: StageView;
  bg: { url: string | null; type: string };
  blindImageUrl: string | null;
  player: string;
  /** 랭킹 화면 (null 이면 닫힘) */
  board: RoundRecord[] | null;
  className?: string;
  style?: CSSProperties;
  /** 화면 편집: 제자리 글자 편집 · 숨긴 요소 반투명 · 줌 */
  textEdit?: (id: EditId) => TextEditProps;
  showHidden?: boolean;
  zoom?: { z: number; x: number; y: number };
  onStagePointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  children?: ReactNode;
}

export function Stage({ settings, view, bg, blindImageUrl, player, board, className = '', style, textEdit, showHidden, zoom, onStagePointerDown, children }: Props) {
  const { design, layout, timeFormat: fmt } = settings;
  const dv = designVars(design, fmt);
  const shown = view.phase === 'result' ? view.result : null;
  const outcome = shown ? (shown.success ? 'is-success' : 'is-fail') : '';
  const fx = settings.resultFx;
  const aspect = ASPECT[settings.canvas.aspect];
  const editing = !!textEdit;
  const playerText = player ? settings.playerFormat.replace('{name}', player) : editing ? settings.playerFormat.replace('{name}', tr('참가자 이름')) : '';

  const rootStyle = {
    '--accent': settings.accent,
    '--text': settings.text,
    ...(fx.successColor && { '--success': fx.successColor }),
    ...(fx.failColor && { '--fail': fx.failColor }),
    '--shake': fx.failShake / 100,
    ...dv.style,
    '--reveal-ms': `${settings.dramaticMs}ms`,
    '--settle-ms': `${view.result?.settleMs ?? settings.settleMs}ms`,
    ...style,
  } as CSSProperties;

  return (
    <div
      className={`app theme-${settings.theme} phase-${view.phase} ${outcome} ${dv.className} ${aspect ? 'has-canvas' : ''} ${className}`}
      style={rootStyle}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Background bg={settings.bg} imageUrl={bg.url} imageType={bg.type} />
      {view.realPhase === 'reveal' && <div className="reveal-veil" aria-hidden />}
      {view.realPhase === 'settle' && <div className="reveal-veil is-settle" aria-hidden />}
      {shown && view.dramaticHit && <div key={view.round} className="reveal-flash" aria-hidden />}

      {/* 화면 비율 틀: 고정 비율이면 가운데 맞춤 (남는 곳은 배경), 줌은 화면 편집에서만 */}
      <div className="canvas-area" onPointerDown={onStagePointerDown}>
        <div
          className="canvas"
          style={
            {
              aspectRatio: aspect ?? undefined,
              '--ar': aspect ? aspect.split('/').map(Number).reduce((a, b) => a / b) : undefined,
              ...(zoom && { '--zoom': zoom.z, '--pan-x': `${zoom.x}px`, '--pan-y': `${zoom.y}px` }),
            } as CSSProperties
          }
        >
          <main className="stage">
            {(settings.mainTitle || settings.subTitle) && (
              <header className="titles">
                {settings.mainTitle && (
                  <EditableText
                    as="h1"
                    className="main-title"
                    data-edit-id="title"
                    style={{ ...boxStyle(layout.title, showHidden), ...textFxStyle(design.textFx.title) }}
                    text={settings.mainTitle}
                    {...textEdit?.('title')}
                  />
                )}
                {settings.subTitle && (
                  <EditableText
                    as="p"
                    className="sub-title"
                    data-edit-id="sub"
                    style={{ ...boxStyle(layout.sub, showHidden), ...textFxStyle(design.textFx.sub) }}
                    text={settings.subTitle}
                    {...textEdit?.('sub')}
                  />
                )}
              </header>
            )}

            <div className="frame-wrap" data-edit-id="frame" style={boxStyle(layout.frame, showHidden)}>
              {shown?.success && <Burst key={`burst-${view.round}`} fx={fx} />}
              {shown?.success && view.dramaticHit && <Burst key={`${view.round}-2`} fx={fx} />}
              <div key={view.round} className={`frame ${outcome}`}>
                <div className="frame-lines" aria-hidden>
                  {Array.from({ length: design.borderLines }, (_, i) => (
                    <span key={i} className={design.borderFill.mode === 'gradient' ? 'is-gradient' : ''} style={lineStyle(design, i)} />
                  ))}
                </div>
                {settings.showTarget && (
                  <div className="target">
                    {settings.labels.target && <span className="target-label">{settings.labels.target}</span>}
                    <Digits ms={view.targetMs} className="target-digits" format={fmt} />
                  </div>
                )}
                <LiveTimer
                  phase={view.phase}
                  startAt={view.startAt}
                  stoppedMs={view.result?.elapsedMs ?? 0}
                  fromMs={view.result?.fromMs}
                  settleMs={view.result?.settleMs ?? settings.settleMs}
                  blind={settings.blind}
                  blindAfterMs={settings.blindAfterMs}
                  blindFx={settings.blindFx}
                  blindImageUrl={blindImageUrl}
                  forceBlind={view.forceBlind}
                  format={fmt}
                />
              </div>
            </div>

            <Result
              phase={view.phase}
              result={shown}
              successText={settings.successText}
              failText={settings.failText}
              revealPrompt={settings.revealPrompt}
              promptStyle={settings.revealPromptStyle}
              resultStyle={settings.resultStyle}
              labels={settings.labels}
              format={fmt}
              textFx={design.textFx.result}
              textEdit={textEdit}
              showHidden={showHidden}
            />

            <div className="key-hint" data-edit-id="hint" style={boxStyle(layout.hint, showHidden)} aria-hidden>
              {settings.keyHint.showKey && (
                <kbd>{keyLabel(view.phase === 'result' && settings.resetKeys.length ? settings.resetKeys[0] : settings.actionKeys[0])}</kbd>
              )}
              <EditableText as="span" text={settings.keyHint[keyHintStage(view.phase)]} {...textEdit?.('hint')} />
            </div>

            {playerText && (!layout.player.hidden || showHidden) && (
              <div className="player-anchor">
                <div className="player-name" data-edit-id="player" style={{ ...boxStyle(layout.player, showHidden), ...textFxStyle(design.textFx.sub) }}>
                  {playerText}
                </div>
              </div>
            )}

            <Items items={settings.items} textEdit={textEdit} showHidden={showHidden} />

            {view.phase === 'countdown' && <Countdown at={view.countdownAt} sec={Math.round(settings.round.countdownSec)} />}
          </main>
        </div>
      </div>

      {board && <Leaderboard rows={board} lb={settings.leaderboard} format={fmt} />}

      {children}
    </div>
  );
}
