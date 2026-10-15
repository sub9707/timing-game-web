// 송출 창 — 운영자 창에서 받은 상태로 무대만 그림 (패널·메뉴·광고 없음)
import { useEffect } from 'react';
import { Stage } from './components/stage/Stage';
import { RESERVED_KEYS } from './game/keys';
import { useIdleCursor } from './hooks/useIdleCursor';
import { useSubscriber } from './live/sync';
import { useCustomFonts } from './settings/fonts';
import { useStoredImage } from './storage/assets';
import { tr } from './i18n';

export default function OutputApp() {
  const { snap, press } = useSubscriber();
  useCustomFonts(snap?.settings.customFonts ?? []);
  const bgImage = useStoredImage('background');
  const blindImage = useStoredImage('blindImage');
  useIdleCursor(true, 1500);

  // 송출 창에서 누른 조작 키는 운영자 창으로 보냄
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!snap || RESERVED_KEYS.includes(e.code) || e.repeat) return;
      const { actionKeys, resetKeys, cheatKeys } = snap.settings;
      const kind = resetKeys.includes(e.code) ? 'reset' : actionKeys.includes(e.code) ? 'action' : cheatKeys.includes(e.code) ? 'cheat' : null;
      if (!kind) return;
      e.preventDefault();
      press(kind);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snap, press]);

  useEffect(() => {
    document.title = tr('Time Challenge — 송출');
    if (snap) document.documentElement.classList.toggle('is-transparent', snap.settings.bg.mode === 'transparent');
  }, [snap]);

  if (!snap) {
    return (
      <div className="output-wait">
        <p>{tr('운영자 창과 연결하는 중…')}</p>
        <small>{tr('운영자 창(설정 › 운영 › 송출 창 열기)이 열려 있어야 해요')}</small>
      </div>
    );
  }

  return (
    <Stage
      settings={snap.settings}
      view={{
        phase: snap.phase,
        result: snap.result,
        startAt: snap.startAt,
        countdownAt: snap.countdownAt,
        round: snap.round,
        dramaticHit: snap.dramaticHit,
        targetMs: snap.targetMs,
        realPhase: snap.realPhase,
        forceBlind: snap.forceBlind,
      }}
      bg={bgImage}
      blindImageUrl={blindImage.url}
      player={snap.player}
      board={snap.board}
      className="is-output"
    />
  );
}
