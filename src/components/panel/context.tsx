// 설정 패널 공용 상태 — 탭 파일들이 usePanel() 로 꺼내 씀
import { createContext, useContext, type ReactNode } from 'react';
import type { HistoryApi } from '../../hooks/useHistory';
import type { useStoredImage } from '../../storage/assets';
import type { DocumentApi } from '../../storage/doc';
import type { LockApi } from '../../hooks/useLock';
import type { BackgroundSetting, BlindSetting, DesignSetting, EditId, FontId, Settings, StagePreview } from '../../types';
import type { InsertKind } from '../editor/EditorMenu';
import type { EditView, Zoom } from '../editor/StageEditor';

/** 패널에서 쓰는 앱 기능 (설정 밖 상태) */
export interface PanelApp {
  boardOpen: boolean;
  setBoardOpen: (open: boolean) => void;
  lock: LockApi;
  /** 열린 송출 창 수 */
  outputs: number;
  openOutput: () => void;
  install: { canInstall: boolean; installed: boolean; install: () => Promise<void> };
  zoom: Zoom;
  setZoom: (z: Zoom) => void;
  insert: (kind: InsertKind) => void;
  addFont: (file: File) => Promise<FontId | null>;
  hideCursor: boolean;
  setHideCursor: (on: boolean) => void;
}

export type StoredImage = ReturnType<typeof useStoredImage>;

export interface PanelCtx {
  s: Settings;
  d: DesignSetting;
  onChange: (updater: (s: Settings) => Settings) => void;
  set: (patch: Partial<Settings>) => void;
  setDesign: (patch: Partial<DesignSetting>) => void;
  setBg: (patch: Partial<BackgroundSetting>) => void;
  setBlind: (patch: Partial<BlindSetting>) => void;
  setPrompt: (patch: Partial<Settings['revealPromptStyle']>) => void;
  setResultStyleOf: (key: 'success' | 'fail', patch: Partial<Settings['resultStyle']['success']>) => void;
  setKeyHint: (patch: Partial<Settings['keyHint']>) => void;
  /** 되돌리기 단계를 끊고 바꿈 (버튼·메뉴처럼 딱 떨어지는 동작) */
  act: (fn: (prev: Settings) => Settings, label?: string) => void;
  preview: StagePreview | null;
  onPreview: (p: StagePreview | null) => void;
  /** 이 섹션 상태를 무대에 띄워 보기 토글 */
  see: (mode: StagePreview) => ReactNode;
  bgImage: StoredImage;
  blindImage: StoredImage;
  editing: boolean;
  selected: EditId[];
  onSelect: (ids: EditId[]) => void;
  editView: EditView;
  onEditView: (v: EditView) => void;
  record: (label?: string) => void;
  history: HistoryApi;
  doc: DocumentApi;
  app: PanelApp;
}

const Ctx = createContext<PanelCtx | null>(null);

export const PanelProvider = Ctx.Provider;

export function usePanel() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePanel outside SettingsPanel');
  return v;
}
