import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Background } from './components/Background';
import { ExpandIcon, GearIcon, InfoIcon, ShrinkIcon } from './components/Icons';
import { InfoCard } from './components/InfoCard';
import { Burst, Result } from './components/Result';
import { SettingsPanel } from './components/SettingsPanel';
import { Digits, LiveTimer } from './components/Timer';
import { designVars, lineStyle } from './design';
import { useStoredImage } from './imageStore';
import { toleranceMs, useSettings } from './settings';
import { keyLabel, RESERVED_KEYS } from './keys';
import { toCs } from './time';
import type { GameResult, Phase, StagePreview } from './types';

/** 버튼 채터링/연타 방지 */
const MIN_RUN_MS = 150;
const MIN_RESULT_MS = 700;

export default function App() {
  const [settings, setSettings] = useSettings();
  const [phase, setPhase] = useState<Phase>('idle');
  const [startAt, setStartAt] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [round, setRound] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /** 이번 결과가 극적인 공개를 거쳐 나왔는지 (공개 순간 연출용) */
  const [dramaticHit, setDramaticHit] = useState(false);
  const [preview, setPreview] = useState<StagePreview | null>(null);
  const revealTimer = useRef(0);

  /* ───── 게임 진행 ───── */

  const overlayOpen = settingsOpen || infoOpen;
  const state = useRef({ phase, startAt, lastAction: 0, settings, overlayOpen });
  state.current.phase = phase;
  state.current.startAt = startAt;
  state.current.settings = settings;
  state.current.overlayOpen = overlayOpen;

  const cancelReveal = () => clearTimeout(revealTimer.current);
  useEffect(() => cancelReveal, []);

  const press = useCallback((t: number, kind: 'action' | 'reset') => {
    const st = state.current;
    const since = t - st.lastAction;

    if (kind === 'reset') {
      // 운영자용: 진행 중 취소 또는 결과 화면 리셋
      if (st.phase === 'idle') return;
      st.lastAction = t;
      cancelReveal();
      setResult(null);
      setPhase('idle');
    } else if (st.phase === 'idle') {
      st.lastAction = t;
      setResult(null);
      setDramaticHit(false);
      setStartAt(t);
      setPhase('running');
    } else if (st.phase === 'running') {
      if (since < MIN_RUN_MS) return;
      st.lastAction = t;
      const { targetMs } = st.settings;
      // 화면에 보이는 1/100초 값으로 판정
      const elapsedMs = toCs(t - st.startAt) * 10;
      const diffMs = elapsedMs - targetMs;
      const success = Math.abs(diffMs) <= toleranceMs(st.settings);
      setResult({ elapsedMs, diffMs, success });
      // 블라인드로 가려진 채 멈췄으면 바로 공개하지 않고 한 번 더 묻기
      const { blind, blindAfterMs, dramatic } = st.settings;
      if (blind && dramatic && t - st.startAt >= blindAfterMs) {
        setPhase('confirm');
        return;
      }
      setRound((r) => r + 1);
      setPhase('result');
    } else if (st.phase === 'confirm') {
      if (since < MIN_RESULT_MS) return;
      st.lastAction = t;
      setPhase('reveal');
      revealTimer.current = window.setTimeout(() => {
        state.current.lastAction = performance.now();
        setDramaticHit(true);
        setRound((r) => r + 1);
        setPhase('result');
      }, st.settings.dramaticMs);
    } else if (st.phase === 'reveal') {
      return; // 긴장 연출 중엔 진행 키 무시 (리셋 키로만 취소)
    } else {
      // 리셋 키가 따로 지정돼 있으면 진행 키로는 리셋 불가
      if (st.settings.resetKeys.length > 0 || since < MIN_RESULT_MS) return;
      st.lastAction = t;
      setResult(null);
      setPhase('idle');
    }
  }, []);

  /* ───── 키보드: 매핑된 키 외 전부 차단 ───── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.current.overlayOpen) {
        // 키 매핑 입력 중에는 ESC 를 캡처 취소로 사용
        const capturing = (e.target as HTMLElement | null)?.closest?.('[data-key-capture]');
        if (e.type === 'keydown' && e.key === 'Escape' && !capturing) {
          setSettingsOpen(false);
          setInfoOpen(false);
        }
        return; // 설정·정보 화면에선 입력 허용
      }
      if (RESERVED_KEYS.includes(e.code)) return; // 전체화면 전환만 허용
      e.preventDefault();
      e.stopPropagation();
      if (e.type !== 'keydown' || e.repeat) return;
      const { actionKeys, resetKeys } = state.current.settings;
      const kind = resetKeys.includes(e.code) ? 'reset' : actionKeys.includes(e.code) ? 'action' : null;
      if (!kind) return;
      const now = performance.now();
      // keydown 발생 시각을 그대로 사용해 렌더 지연 영향을 없앰
      press(e.timeStamp > 0 && Math.abs(now - e.timeStamp) < 1000 ? e.timeStamp : now, kind);
    };
    const opts = { capture: true };
    window.addEventListener('keydown', onKey, opts);
    window.addEventListener('keyup', onKey, opts);
    window.addEventListener('keypress', onKey, opts);
    return () => {
      window.removeEventListener('keydown', onKey, opts);
      window.removeEventListener('keyup', onKey, opts);
      window.removeEventListener('keypress', onKey, opts);
    };
  }, [press]);

  const openSettings = () => {
    cancelReveal();
    setPreview(null);
    setInfoOpen(false);
    setPhase('idle');
    setResult(null);
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    setPreview(null);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  /* ───── 이미지 (배경 · 블라인드 스피너) ───── */

  const bgImage = useStoredImage('background');
  const blindImage = useStoredImage('blindImage');

  /* ───── 전체화면 ───── */

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => undefined);
  };

  /* ───── render ───── */

  // 설정 중 미리보기는 실제 게임 상태 대신 화면에만 반영
  const pv = settingsOpen ? preview : null;
  const viewPhase: Phase = pv === 'confirm' ? 'confirm' : pv === 'result' || pv === 'result-fail' ? 'result' : phase;
  const viewResult: GameResult | null =
    pv === 'result'
      ? { elapsedMs: settings.targetMs, diffMs: 0, success: true }
      : pv === 'result-fail'
        ? { elapsedMs: settings.targetMs + 1230, diffMs: 1230, success: false }
        : result;

  // 공개 전(confirm·reveal)에는 결과를 숨김
  const shown = viewPhase === 'result' ? viewResult : null;
  const outcome = shown ? (shown.success ? 'is-success' : 'is-fail') : '';
  const { design } = settings;
  const dv = designVars(design);
  const themeVars = { '--accent': settings.accent, '--text': settings.text, ...dv.style } as CSSProperties;

  return (
    <div
      className={`app theme-${settings.theme} phase-${viewPhase} ${outcome} ${dramaticHit && !pv ? 'is-dramatic' : ''} ${pv ? 'is-previewing' : ''} ${dv.className}`}
      style={{ ...themeVars, '--reveal-ms': `${settings.dramaticMs}ms` } as CSSProperties}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Background bg={settings.bg} imageUrl={bgImage.url} />
      {phase === 'reveal' && <div className="reveal-veil" aria-hidden />}
      {shown && dramaticHit && <div key={round} className="reveal-flash" aria-hidden />}

      <main className="stage">
        {(settings.mainTitle || settings.subTitle) && (
          <header className="titles">
            {settings.mainTitle && <h1 className="main-title">{settings.mainTitle}</h1>}
            {settings.subTitle && <p className="sub-title">{settings.subTitle}</p>}
          </header>
        )}

        <div className="frame-wrap">
          {shown?.success && <Burst key={round} />}
          {shown?.success && dramaticHit && <Burst key={`${round}-2`} />}
          <div key={round} className={`frame ${outcome}`}>
            <div className="frame-lines" aria-hidden>
              {Array.from({ length: design.borderLines }, (_, i) => (
                <span key={i} className={design.borderFill.mode === 'gradient' ? 'is-gradient' : ''} style={lineStyle(design, i)} />
              ))}
            </div>
            {settings.showTarget && (
              <div className="target">
                <span className="target-label">TARGET</span>
                <Digits ms={settings.targetMs} className="target-digits" />
              </div>
            )}
            <LiveTimer
              phase={viewPhase}
              startAt={startAt}
              stoppedMs={viewResult?.elapsedMs ?? 0}
              blind={settings.blind}
              blindAfterMs={settings.blindAfterMs}
              blindFx={settings.blindFx}
              blindImageUrl={blindImage.url}
              forceBlind={pv === 'blind'}
            />
          </div>
        </div>

        <Result phase={viewPhase} result={shown} successText={settings.successText} failText={settings.failText} revealPrompt={settings.revealPrompt} promptStyle={settings.revealPromptStyle} resultStyle={settings.resultStyle} />

        <div className="key-hint" aria-hidden>
          <kbd>{keyLabel(viewPhase === 'result' && settings.resetKeys.length ? settings.resetKeys[0] : settings.actionKeys[0])}</kbd>
          <span>{viewPhase === 'idle' ? 'START' : viewPhase === 'running' ? 'STOP' : viewPhase === 'confirm' || viewPhase === 'reveal' ? 'REVEAL' : 'RESET'}</span>
        </div>
      </main>

      <nav className="dock">
        <button
          className="dock-btn"
          onClick={(e) => {
            e.currentTarget.blur();
            setInfoOpen(true);
          }}
          aria-label="정보"
          tabIndex={-1}
        >
          <InfoIcon />
        </button>
        <button className="dock-btn" onClick={toggleFullscreen} aria-label="전체화면" tabIndex={-1}>
          {fullscreen ? <ShrinkIcon /> : <ExpandIcon />}
        </button>
        <button className="dock-btn" onClick={openSettings} aria-label="설정" tabIndex={-1}>
          <GearIcon />
        </button>
      </nav>

      <InfoCard open={infoOpen} onClose={() => setInfoOpen(false)} />

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        bgImage={bgImage}
        blindImage={blindImage}
        preview={preview}
        onPreview={setPreview}
        onClose={closeSettings}
      />
    </div>
  );
}
