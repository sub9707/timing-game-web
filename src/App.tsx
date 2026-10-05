import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Background } from './components/Background';
import { ExpandIcon, GearIcon, InfoIcon, ShrinkIcon } from './components/Icons';
import { InfoCard } from './components/InfoCard';
import { Burst, Result } from './components/Result';
import { SettingsPanel } from './components/SettingsPanel';
import { Digits, LiveTimer } from './components/Timer';
import { designVars, lineStyle } from './design';
import { clearBgImage, loadBgImage, saveBgImage } from './imageStore';
import { toleranceMs, useSettings } from './settings';
import { keyLabel, RESERVED_KEYS } from './keys';
import { toCs } from './time';
import type { GameResult, Phase } from './types';

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  /* ───── 게임 진행 ───── */

  const overlayOpen = settingsOpen || infoOpen;
  const state = useRef({ phase, startAt, lastAction: 0, settings, overlayOpen });
  state.current.phase = phase;
  state.current.startAt = startAt;
  state.current.settings = settings;
  state.current.overlayOpen = overlayOpen;

  const press = useCallback((t: number, kind: 'action' | 'reset') => {
    const st = state.current;
    const since = t - st.lastAction;

    if (kind === 'reset') {
      // 운영자용: 진행 중 취소 또는 결과 화면 리셋
      if (st.phase === 'idle') return;
      st.lastAction = t;
      setResult(null);
      setPhase('idle');
    } else if (st.phase === 'idle') {
      st.lastAction = t;
      setResult(null);
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
      setRound((r) => r + 1);
      setPhase('result');
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
    setInfoOpen(false);
    setPhase('idle');
    setResult(null);
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  /* ───── 배경 이미지 ───── */

  useEffect(() => {
    loadBgImage().then((blob) => blob && setImageUrl(URL.createObjectURL(blob)));
  }, []);

  const replaceImageUrl = (url: string | null) =>
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });

  const handleImage = async (file: File) => {
    replaceImageUrl(URL.createObjectURL(file));
    await saveBgImage(file).catch(() => undefined);
  };

  const handleClearImage = async () => {
    replaceImageUrl(null);
    await clearBgImage().catch(() => undefined);
  };

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

  const outcome = result ? (result.success ? 'is-success' : 'is-fail') : '';
  const { design } = settings;
  const dv = designVars(design);
  const themeVars = { '--accent': settings.accent, '--text': settings.text, ...dv.style } as CSSProperties;

  return (
    <div
      className={`app theme-${settings.theme} phase-${phase} ${outcome} ${dv.className}`}
      style={themeVars}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Background bg={settings.bg} imageUrl={imageUrl} />

      <main className="stage">
        {(settings.mainTitle || settings.subTitle) && (
          <header className="titles">
            {settings.mainTitle && <h1 className="main-title">{settings.mainTitle}</h1>}
            {settings.subTitle && <p className="sub-title">{settings.subTitle}</p>}
          </header>
        )}

        <div className="frame-wrap">
          {result?.success && <Burst key={round} />}
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
              phase={phase}
              startAt={startAt}
              stoppedMs={result?.elapsedMs ?? 0}
              blind={settings.blind}
              blindAfterMs={settings.blindAfterMs}
            />
          </div>
        </div>

        <Result result={result} successText={settings.successText} failText={settings.failText} />

        <div className="key-hint" aria-hidden>
          <kbd>{keyLabel(phase === 'result' && settings.resetKeys.length ? settings.resetKeys[0] : settings.actionKeys[0])}</kbd>
          <span>{phase === 'idle' ? 'START' : phase === 'running' ? 'STOP' : 'RESET'}</span>
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
        imageUrl={imageUrl}
        onImage={handleImage}
        onClearImage={handleClearImage}
        onClose={closeSettings}
      />
    </div>
  );
}
