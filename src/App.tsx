import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { InsertKind } from './components/editor/EditorMenu';
import { StageEditor, type EditView, type Zoom } from './components/editor/StageEditor';
import { SettingsPanel } from './components/panel/SettingsPanel';
import { AdRail, useAdsVisible } from './components/stage/AdRail';
import type { TextEditProps } from './components/stage/EditableText';
import { Dock } from './components/stage/Dock';
import { Stage } from './components/stage/Stage';
import { InfoCard } from './components/ui/InfoCard';
import { PinDialog } from './components/ui/PinDialog';
import { SavedBadge } from './components/ui/SavedBadge';
import { addItems, newImageItem, newShapeItem, newTextItem, pickImage } from './design/items';
import { getBox, itemIdOf, itemOf, keyHintStage, PREVIEW_FOR, setBox, TEXT_FIELD, uid } from './design/layout';
import { ranking, useRecords } from './game/records';
import { useGame, type PressKind } from './game/useGame';
import { usePanelGesture } from './hooks/panelGesture';
import { useFileDrop, useUnsavedWarning } from './hooks/useFileDrop';
import { useFullscreen } from './hooks/useFullscreen';
import { useGameKeys } from './hooks/useGameKeys';
import { useGamepad } from './hooks/useGamepad';
import { useHistory } from './hooks/useHistory';
import { useIdleCursor } from './hooks/useIdleCursor';
import { useLocalState } from './hooks/useLocalState';
import { useLock } from './hooks/useLock';
import { useStageView } from './hooks/useStageView';
import { track, useGameAnalytics } from './analytics';
import { openOutputWindow, usePublisher } from './live/sync';
import { useCustomFonts } from './settings/fonts';
import { useSettings } from './settings/settings';
import { onAssetChange, onAssetError, putAsset, useStoredImage } from './storage/assets';
import { useDocument } from './storage/doc';
import type { EditId, FontId, ShapeKind, StagePreview } from './types';
import { tr } from './i18n';

const DEFAULT_VIEW: EditView = { grid: false, snapGrid: false, guides: true, rulers: false, showHidden: false, units: 'pct' };
const NO_ZOOM: Zoom = { z: 1, x: 0, y: 0 };

export default function App() {
  const [settings, setSettings, savedAt] = useSettings();
  /** 실행 취소·다시 실행 — 설정·에셋 변경을 자동 기록 */
  const history = useHistory(settings, setSettings);
  /** 저장 파일(.stopia) — 파일을 불러오면 그 전 실행 취소 기록은 지움 (파워포인트와 같음) */
  const doc = useDocument(settings, setSettings, history.reset);
  useUnsavedWarning(doc);
  useCustomFonts(settings.customFonts);
  const { records, player } = useRecords();
  const lock = useLock();
  const fs = useFullscreen();

  // 에셋(이미지)은 바뀌는 즉시 임시 저장됨 · 저장 실패(용량 부족)는 알림
  const [assetSavedAt, setAssetSavedAt] = useState(0);
  const [toast, setToast] = useState<{ at: number; message: string; tone: 'ok' | 'error' } | null>(null);
  useEffect(() => onAssetChange((c) => c.source === 'user' && setAssetSavedAt(Date.now())), []);
  useEffect(
    () => onAssetError(() => setToast({ at: Date.now(), message: tr('저장 공간이 부족해 저장하지 못했어요 — 큰 그림을 줄이거나 지워 주세요'), tone: 'error' })),
    [],
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  /** 잠금 해제 PIN 입력 (다음에 열 화면) */
  const [pinFor, setPinFor] = useState<'settings' | 'edit' | null>(null);
  const [preview, setPreview] = useState<StagePreview | null>(null);
  const [dockHidden, setDockHidden] = useLocalState('timer-game:dock-hidden', false);
  const [hideCursor, setHideCursor] = useLocalState('timer-game:hide-cursor', true);
  const [boardOpen, setBoardOpen] = useState(false);
  /** 처음 온 사람에게 설정 버튼 안내 (한 번 열거나 닫으면 다시 안 띄움) */
  const [guideSeen, setGuideSeen] = useLocalState('timer-game:guide-settings', false);
  /** 화면 직접 편집 (설정 패널이 서식 창 역할) */
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<EditId[]>([]);
  /** 편집 보기 옵션 — 이 브라우저에만 저장 */
  const [editView, setEditView] = useLocalState<EditView>('timer-game:edit-view', DEFAULT_VIEW);
  const [zoom, setZoom] = useState<Zoom>(NO_ZOOM);
  /** 화면에서 드래그로 옮기기·크기·회전 중 (그동안 패널은 멈춤) */
  const [gesturing, setGesturing] = useState(false);
  /** 패널의 색 선택기·슬라이더를 끄는 중 (그동안 패널 전체는 멈춤) */
  const panelGesture = usePanelGesture();
  /** 화면 위에서 글자를 직접 고치는 중인 요소 */
  const [textEditing, setTextEditing] = useState<EditId | null>(null);
  const anyFullscreen = fs.any;
  const showAds = useAdsVisible() && !fs.app;
  useIdleCursor(hideCursor && anyFullscreen);

  const overlayOpen = settingsOpen || infoOpen || !!pinFor;
  /** 게임 — 설정을 열어 둔 동안의 미리보기는 기록하지 않음 */
  const game = useGame(settings, { record: !settingsOpen });
  const gameRef = useRef(game);
  gameRef.current = game;
  const overlayRef = useRef(overlayOpen);
  overlayRef.current = overlayOpen;

  useGameAnalytics(game.phase, game.result, game.targetMs, { enabled: !settingsOpen, blind: settings.blind });

  const press = useCallback((kind: PressKind, t = performance.now()) => {
    if (overlayRef.current) return;
    gameRef.current.press(t, kind);
  }, []);

  useGameKeys({
    settings,
    overlayOpen,
    editing,
    boardOpen,
    locked: lock.locked,
    playing: !overlayOpen && game.phase !== 'idle' && game.phase !== 'result',
    history,
    doc,
    press,
    closeOverlays: () => {
      setSettingsOpen(false);
      setInfoOpen(false);
      setPinFor(null);
    },
    setBoardOpen,
  });

  // 게임패드 · 화면 탭
  useGamepad(settings.input.gamepad && !overlayOpen, (kind, t) => press(kind, t));
  const onStagePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!settings.input.tap || overlayOpen || e.button !== 0) return;
    press('action', e.timeStamp || performance.now());
  };

  /* ───── 설정 · 잠금 ───── */

  /** 설정 열기 (잠금은 PIN 으로 풀린 뒤 부름) */
  const doOpenSettings = () => {
    track('settings_open');
    game.goIdle();
    setPreview(null);
    setInfoOpen(false);
    setBoardOpen(false);
    setSettingsOpen(true);
  };
  const openSettings = () => (lock.locked ? setPinFor('settings') : doOpenSettings());

  useEffect(() => {
    if (settingsOpen) setGuideSeen(true);
  }, [settingsOpen, setGuideSeen]);
  const showGuide = !guideSeen && !lock.locked && !dockHidden;

  /* ───── 화면 편집 ───── */

  const record = history.mark;

  const stopEditing = () => {
    setTextEditing(null);
    setGesturing(false);
    setEditing(false);
    setSelected([]);
    setPreview(null);
    setZoom(NO_ZOOM);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    stopEditing();
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const startEditing = (unlocked = false) => {
    // 전체화면(방송·진행 중)에서는 편집 불가
    if (anyFullscreen) return;
    if (lock.locked && !unlocked) return setPinFor('edit');
    if (!settingsOpen) doOpenSettings();
    track('edit_open');
    setEditing(true);
    setSelected([]);
  };

  // 편집 중 전체화면이 되면 편집 종료
  useEffect(() => {
    if (anyFullscreen && editing) stopEditing();
  }, [anyFullscreen]);

  /** 결과 자리 요소를 하나만 고르면 그 상태를 화면에 띄움 */
  const selectElements = (ids: EditId[]) => {
    setSelected(ids);
    const pv = ids.length === 1 ? PREVIEW_FOR[ids[0]] : undefined;
    if (pv) setPreview(pv);
  };

  /** 삽입 — 텍스트 상자 · 그림 · 도형 (at: 무대 가운데 기준 %) */
  const insert = async (kind: InsertKind, at?: { x: number; y: number }, file?: File) => {
    if (!editing) startEditing();
    const s = settingsRef.current;
    let item;
    if (kind === 'image') {
      const f = file ?? (await pickImage());
      if (!f) return;
      item = await newImageItem(s, f, f.name);
      if (!item) return setToast({ at: Date.now(), message: tr('그림을 저장하지 못했어요 (저장 공간 부족)'), tone: 'error' });
    } else if (kind === 'text') item = newTextItem(s);
    else item = newShapeItem(s, kind as ShapeKind);
    if (at) Object.assign(item, at);
    record(tr('{0} 삽입', kind === 'text' ? tr('텍스트 상자') : kind === 'image' ? tr('그림') : tr('도형')));
    const added = item;
    setSettings((prev) => addItems(prev, [added]));
    setSelected([itemIdOf(added.id)]);
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  /** 글꼴 파일 올리기 → 올린 글꼴 id */
  const addFont = async (file: File): Promise<FontId | null> => {
    const id = uid();
    if (!(await putAsset(`font:${id}`, file, 'load'))) return null;
    record(tr('글꼴 추가'));
    setSettings((s) => ({ ...s, customFonts: [...s.customFonts, { id, name: file.name.replace(/\.[^.]+$/, '') }] }));
    return `custom:${id}`;
  };

  /* ───── 무대 상태 (미리보기 반영) ───── */

  const bgImage = useStoredImage('background');
  const blindImage = useStoredImage('blindImage');

  // 설정 중 미리보기는 실제 게임 상태 대신 화면에만 반영
  const pv = settingsOpen ? preview : null;
  const { view, phaseRef: viewPhaseRef } = useStageView(game, pv);
  const board = boardOpen ? ranking(records, settings.leaderboard) : null;
  useEffect(() => {
    if (boardOpen) track('leaderboard_open');
  }, [boardOpen]);

  /** 텍스트 요소의 제자리 편집 연결 (편집 모드에서만 켜짐) */
  const textEdit = (id: EditId): TextEditProps => ({
    active: editing && textEditing === id,
    onCommit: (text) => {
      record(tr('문구 편집'));
      // 키 안내는 지금 보이는 상태의 문구를 고침
      if (id === 'hint') {
        const stage = keyHintStage(viewPhaseRef.current);
        setSettings((s) => ({ ...s, keyHint: { ...s.keyHint, [stage]: text } }));
        return;
      }
      // 텍스트 상자
      if (itemOf(settingsRef.current, id)) {
        setSettings((s) => ({ ...setBox(s, id, getBox(s, id)), items: s.items.map((i) => (itemIdOf(i.id) === id && i.type === 'text' ? { ...i, text } : i)) }));
        return;
      }
      const field = TEXT_FIELD[id];
      if (field) setSettings((s) => ({ ...s, [field]: text }));
    },
    onDone: () => setTextEditing((cur) => (cur === id ? null : cur)),
  });

  /* ───── 송출 창 ───── */
  const { outputs } = usePublisher(
    {
      settings,
      phase: view.phase,
      realPhase: view.realPhase,
      result: view.result,
      startAt: view.startAt,
      countdownAt: view.countdownAt,
      round: view.round,
      dramaticHit: view.dramaticHit,
      targetMs: view.targetMs,
      forceBlind: !!view.forceBlind,
      player,
      board,
    },
    (kind) => press(kind),
  );

  /* ───── 파일 끌어다 놓기 · 투명 배경 ───── */

  const dragOver = useFileDrop({ doc, locked: lock.locked, insertImage: (f, at) => void insert('image', at, f) });

  useEffect(() => {
    document.documentElement.classList.toggle('is-transparent', settings.bg.mode === 'transparent');
  }, [settings.bg.mode]);

  /* ───── render ───── */

  const badgeAt = Math.max(savedAt, assetSavedAt, doc.fileSavedAt, toast?.at ?? 0);
  const badgeMsg =
    toast && toast.at === badgeAt ? toast.message : doc.fileSavedAt === badgeAt ? tr('파일에 저장됨 · {0}', doc.name ?? '') : tr('임시 저장됨');

  return (
    <>
      <Stage
        settings={settings}
        view={view}
        bg={bgImage}
        blindImageUrl={blindImage.url}
        player={player}
        board={board}
        onCloseBoard={() => setBoardOpen(false)}
        className={`${pv || editing ? 'is-previewing' : ''} ${editing ? 'is-editing' : ''} ${gesturing ? 'is-gesturing' : ''} ${showAds ? 'has-ads' : ''} ${dragOver ? 'is-drop' : ''}`}
        textEdit={editing ? textEdit : undefined}
        showHidden={editing && editView.showHidden}
        zoom={editing ? zoom : undefined}
        onStagePointerDown={onStagePointerDown}
      >
        {showAds && (
          <>
            <AdRail side="left" />
            <AdRail side="right" />
          </>
        )}

        <Dock
          hidden={dockHidden}
          onToggleHidden={() => setDockHidden((h) => !h)}
          locked={lock.locked}
          boardOpen={boardOpen}
          fullscreen={fs.app}
          canEdit={!anyFullscreen}
          guide={showGuide}
          onCloseGuide={() => setGuideSeen(true)}
          onInfo={() => setInfoOpen(true)}
          onBoard={() => setBoardOpen((o) => !o)}
          onFullscreen={fs.toggle}
          onEdit={() => startEditing()}
          onSettings={openSettings}
        />
      </Stage>

      {/* 패널·편집기·알림은 .app 바깥 — 디자인 변수(.app 에 걸림)가 바뀔 때 패널 전체 스타일을 다시 계산하지 않도록 */}
      <InfoCard open={infoOpen} onClose={() => setInfoOpen(false)} />

      {pinFor && (
        <PinDialog
          onCancel={() => setPinFor(null)}
          onSubmit={async (pin) => {
            if (!(await lock.unlock(pin))) return false;
            const next = pinFor;
            setPinFor(null);
            // 잠금이 풀린 뒤 원래 열려던 화면으로
            if (next === 'edit') startEditing(true);
            else doOpenSettings();
            return true;
          }}
        />
      )}

      <SavedBadge at={badgeAt} message={badgeMsg} tone={toast && toast.at === badgeAt ? toast.tone : 'ok'} />

      {dragOver && <div className="drop-hint">{tr('놓으면 열기 · 그림은 화면에 삽입')}</div>}

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        bgImage={bgImage}
        blindImage={blindImage}
        preview={preview}
        onPreview={setPreview}
        onClose={closeSettings}
        clearScrim={!!pv || editing}
        frozen={gesturing || panelGesture}
        doc={doc}
        editing={editing}
        selected={selected}
        onSelect={selectElements}
        onStartEditing={() => startEditing()}
        onStopEditing={stopEditing}
        canEdit={!anyFullscreen}
        editView={editView}
        onEditView={setEditView}
        record={record}
        history={history}
        app={{
          boardOpen,
          setBoardOpen,
          lock,
          outputs,
          openOutput: openOutputWindow,
          zoom,
          setZoom,
          insert: (k) => void insert(k),
          addFont,
          hideCursor,
          setHideCursor,
        }}
      />

      {editing && (
        <StageEditor
          settings={settings}
          onChange={setSettings}
          selected={selected}
          onSelect={selectElements}
          onEditText={(id) => {
            // 파워포인트처럼 화면 위에서 바로 고침
            selectElements([id]);
            setTextEditing(id);
          }}
          textEditing={textEditing}
          onExit={stopEditing}
          view={editView}
          onView={setEditView}
          record={record}
          history={history}
          onGesture={setGesturing}
          zoom={zoom}
          onZoom={setZoom}
          onInsert={(k, at) => void insert(k, at)}
        />
      )}
    </>
  );
}
