import { useEffect, useRef } from 'react';
import { RESERVED_KEYS } from '../game/keys';
import type { PressKind } from '../game/useGame';
import { confirmDiscard, type DocumentApi } from '../storage/doc';
import type { Settings } from '../types';
import type { HistoryApi } from './useHistory';

interface Ctx {
  settings: Settings;
  /** 설정·정보·PIN 화면이 열려 있음 (이땐 입력 허용) */
  overlayOpen: boolean;
  editing: boolean;
  boardOpen: boolean;
  locked: boolean;
  /** 게임 진행 중 (파일·편집 단축키는 막음) */
  playing: boolean;
  history: HistoryApi;
  doc: DocumentApi;
  press: (kind: PressKind, t: number) => void;
  closeOverlays: () => void;
  setBoardOpen: (open: boolean | ((o: boolean) => boolean)) => void;
}

/**
 * 키보드 — 게임 중엔 매핑된 키 외 전부 차단
 *  · Ctrl+Z / Ctrl+Y 실행 취소·다시 실행 · Ctrl+S / Ctrl+Shift+S / Ctrl+O 파일
 *  · L 랭킹 화면 · ESC 닫기
 */
export function useGameKeys(ctx: Ctx) {
  const ref = useRef(ctx);
  ref.current = ctx;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = ref.current;
      const mod = e.ctrlKey || e.metaKey;
      // 실행 취소 Ctrl+Z · 다시 실행 Ctrl+Y / Ctrl+Shift+Z (화면 위 글자 편집 중엔 글자 단위로)
      if (e.type === 'keydown' && mod && (e.code === 'KeyZ' || e.code === 'KeyY')) {
        if ((e.target as HTMLElement | null)?.isContentEditable) return;
        e.preventDefault();
        e.stopPropagation();
        if (c.playing || c.locked) return;
        if (e.code === 'KeyY' || e.shiftKey) c.history.redo();
        else c.history.undo();
        return;
      }
      // 파일: Ctrl+S 저장 · Ctrl+Shift+S 다른 이름으로 · Ctrl+O 불러오기
      if (e.type === 'keydown' && mod && (e.code === 'KeyS' || e.code === 'KeyO')) {
        e.preventDefault();
        e.stopPropagation();
        if (c.playing || e.repeat || c.locked) return;
        if (e.code === 'KeyS') void (e.shiftKey ? c.doc.saveAs() : c.doc.save());
        else if (confirmDiscard(c.doc)) void c.doc.open();
        return;
      }
      if (c.overlayOpen) {
        // 키 매핑 입력 중에는 ESC 를 캡처 취소로 사용
        const capturing = (e.target as HTMLElement | null)?.closest?.('[data-key-capture]');
        // 화면 편집 중 ESC 는 편집기가 처리 (선택 해제 → 편집 끝)
        if (e.type === 'keydown' && e.key === 'Escape' && !capturing && !c.editing) c.closeOverlays();
        return; // 설정·정보 화면에선 입력 허용
      }
      if (RESERVED_KEYS.includes(e.code)) return; // 전체화면 전환만 허용
      e.preventDefault();
      e.stopPropagation();
      if (e.type !== 'keydown' || e.repeat) return;
      const { actionKeys, resetKeys, cheatKeys } = c.settings;
      const kind = resetKeys.includes(e.code) ? 'reset' : actionKeys.includes(e.code) ? 'action' : cheatKeys.includes(e.code) ? 'cheat' : null;
      // 랭킹 화면: L 로 열고 닫기 (대기·결과에서) · ESC 로 닫기
      if (!kind && e.code === 'KeyL' && !c.playing) return c.setBoardOpen((o) => !o);
      if (!kind && e.key === 'Escape') return c.setBoardOpen(false);
      if (!kind) return;
      if (c.boardOpen) c.setBoardOpen(false);
      const now = performance.now();
      // keydown 발생 시각을 그대로 사용해 렌더 지연 영향을 없앰
      c.press(kind, e.timeStamp > 0 && Math.abs(now - e.timeStamp) < 1000 ? e.timeStamp : now);
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
  }, []);
}
