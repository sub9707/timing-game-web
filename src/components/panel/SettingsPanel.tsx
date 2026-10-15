import { memo, useEffect, useState, type CSSProperties } from 'react';
import { editIds, labelOf } from '../../design/layout';
import type { HistoryApi } from '../../hooks/useHistory';
import { DEFAULT_SETTINGS } from '../../settings/settings';
import type { DocumentApi } from '../../storage/doc';
import type { EditId, Settings, StagePreview } from '../../types';
import type { EditView } from '../editor/StageEditor';
import { CloseIcon, LayoutIcon } from '../ui/Icons';
import { PanelProvider, type PanelApp, type PanelCtx, type StoredImage } from './context';
import { PreviewToggle } from './controls';
import { FileBar } from './FileBar';
import { DesignTab } from './tabs/DesignTab';
import { EditPane, resetBoxes } from './tabs/EditPane';
import { FxTab } from './tabs/FxTab';
import { GameTab } from './tabs/GameTab';
import { OpsTab } from './tabs/OpsTab';
import { RecordsTab } from './tabs/RecordsTab';
import { TextTab } from './tabs/TextTab';
import { tr } from '../../i18n';

interface Props {
  open: boolean;
  settings: Settings;
  onChange: (updater: (s: Settings) => Settings) => void;
  bgImage: StoredImage;
  blindImage: StoredImage;
  preview: StagePreview | null;
  onPreview: (p: StagePreview | null) => void;
  onClose: () => void;
  /** 미리보기·편집 중이면 무대를 덮지 않는 투명 덮개 */
  clearScrim?: boolean;
  /** 화면에서 드래그하는 동안 다시 그리지 않음 (놓으면 한 번에 반영) */
  frozen?: boolean;
  /** 저장 파일 (저장·불러오기) */
  doc: DocumentApi;
  /** 화면 편집 중이면 패널이 선택한 요소의 서식 창이 됨 */
  editing: boolean;
  selected: EditId[];
  onSelect: (ids: EditId[]) => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
  /** 전체화면에선 편집 불가 */
  canEdit: boolean;
  editView: EditView;
  onEditView: (v: EditView) => void;
  /** 다음 변경을 새 실행 취소 단계로 (편집 동작 직전) */
  record: (label?: string) => void;
  /** 실행 취소 · 다시 실행 */
  history: HistoryApi;
  /** 설정 밖 앱 기능 */
  app: PanelApp;
}

type Tab = 'game' | 'fx' | 'text' | 'design' | 'records' | 'ops';
const TABS: [Tab, string][] = [
  ['game', tr('게임')],
  ['fx', tr('연출')],
  ['text', tr('텍스트')],
  ['design', tr('디자인')],
  ['records', tr('기록')],
  ['ops', tr('운영')],
];

/** 드래그 중(frozen)엔 다시 그리지 않음 — 무대만 매 프레임 갱신 */
export const SettingsPanel = memo(SettingsPanelView, (prev, next) => !!prev.frozen && !!next.frozen);

function SettingsPanelView({
  open,
  settings: s,
  onChange,
  bgImage,
  blindImage,
  preview,
  onPreview,
  onClose,
  clearScrim,
  doc,
  editing,
  selected,
  onSelect,
  onStartEditing,
  onStopEditing,
  canEdit,
  editView,
  onEditView,
  record,
  history,
  app,
}: Props) {
  const set = (patch: Partial<Settings>) => onChange((prev) => ({ ...prev, ...patch }));
  const act = (fn: (prev: Settings) => Settings, label?: string) => {
    record(label);
    onChange(fn);
  };
  const ctx: PanelCtx = {
    s,
    d: s.design,
    onChange,
    set,
    setDesign: (patch) => onChange((prev) => ({ ...prev, design: { ...prev.design, ...patch } })),
    setBg: (patch) => onChange((prev) => ({ ...prev, bg: { ...prev.bg, ...patch } })),
    setBlind: (patch) => onChange((prev) => ({ ...prev, blindFx: { ...prev.blindFx, ...patch } })),
    setPrompt: (patch) => onChange((prev) => ({ ...prev, revealPromptStyle: { ...prev.revealPromptStyle, ...patch } })),
    setResultStyleOf: (key, patch) => onChange((prev) => ({ ...prev, resultStyle: { ...prev.resultStyle, [key]: { ...prev.resultStyle[key], ...patch } } })),
    setKeyHint: (patch) => onChange((prev) => ({ ...prev, keyHint: { ...prev.keyHint, ...patch } })),
    act,
    preview,
    onPreview,
    see: (mode) => <PreviewToggle on={preview === mode} onToggle={() => onPreview(preview === mode ? null : mode)} />,
    bgImage,
    blindImage,
    editing,
    selected,
    onSelect,
    editView,
    onEditView,
    record,
    history,
    doc,
    app,
  };

  const single = selected.length === 1 ? selected[0] : null;
  const [tab, setTab] = useState<Tab>('game');
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    if (!open) setConfirmReset(false);
  }, [open]);
  useEffect(() => setConfirmReset(false), [editing, selected]);

  return (
    <PanelProvider value={ctx}>
      {/* 화면 편집 중엔 무대를 눌러야 하므로 덮개 없음 */}
      <div className={`scrim ${open && !editing ? 'is-open' : ''} ${clearScrim ? 'is-clear' : ''}`} onClick={onClose} />
      <aside className={`panel ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open}>
        <header className="panel-head">
          {editing ? (
            <div className="edit-head">
              <span className="edit-badge">
                <LayoutIcon />
                {tr('화면 편집')}
              </span>
              <span className="edit-title">{single ? labelOf(s, single) : selected.length ? tr('{0}개 선택', selected.length) : tr('요소를 선택하세요')}</span>
            </div>
          ) : (
            <div className="tabs" style={{ '--i': TABS.findIndex(([id]) => id === tab), '--n': TABS.length } as CSSProperties}>
              <span className="tabs-thumb" aria-hidden />
              {TABS.map(([id, label]) => (
                <button key={id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <button className="icon-btn" onClick={onClose} aria-label={tr('닫기')}>
            <CloseIcon />
          </button>
        </header>

        <FileBar doc={doc} history={history} />

        <div className="panel-body" key={editing ? `edit-${single ?? (selected.length ? 'multi' : 'none')}` : tab}>
          {editing ? (
            <EditPane />
          ) : tab === 'game' ? (
            <GameTab />
          ) : tab === 'fx' ? (
            <FxTab />
          ) : tab === 'text' ? (
            <TextTab />
          ) : tab === 'design' ? (
            <DesignTab />
          ) : tab === 'records' ? (
            <RecordsTab />
          ) : (
            <OpsTab />
          )}
        </div>

        {editing ? (
          <footer className="panel-foot">
            <button
              className={`ghost-btn ${confirmReset ? 'is-danger' : ''}`}
              onClick={() => {
                if (!selected.length && !confirmReset) return setConfirmReset(true);
                act(resetBoxes(selected.length ? selected : editIds(s)), tr('배치 초기화'));
                setConfirmReset(false);
              }}
            >
              {selected.length ? tr('선택 배치 초기화') : confirmReset ? tr('한 번 더 누르면 전체 초기화') : tr('전체 배치 초기화')}
            </button>
            <button className="primary-btn" onClick={onStopEditing}>
              {tr('편집 끝내기')}
            </button>
          </footer>
        ) : (
          <footer className="panel-foot">
            <button
              className={`ghost-btn ${confirmReset ? 'is-danger' : ''}`}
              onClick={() => {
                if (!confirmReset) return setConfirmReset(true);
                onChange(() => structuredClone(DEFAULT_SETTINGS));
                setConfirmReset(false);
              }}
            >
              {confirmReset ? tr('한 번 더 누르면 초기화') : tr('초기화')}
            </button>
            <span className="foot-right">
              <button
                className="ghost-btn with-icon"
                onClick={onStartEditing}
                disabled={!canEdit}
                title={canEdit ? tr('화면에서 요소를 직접 옮기고 크기 조절') : tr('전체화면에서는 편집할 수 없어요')}
              >
                <LayoutIcon />
                {tr('화면 편집')}
              </button>
              <button className="primary-btn" onClick={onClose}>
                {tr('완료')}
              </button>
            </span>
          </footer>
        )}
      </aside>
    </PanelProvider>
  );
}
