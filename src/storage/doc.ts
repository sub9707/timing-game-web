// 문서(저장 파일) 관리 — 파워포인트처럼
//  · 임시 저장: 바뀔 때마다 이 브라우저에 자동 보관 (settings.ts · assets.ts)
//  · 저장: 처음엔 위치·이름을 고르고(경로 설정), 다음부터 같은 파일에 덮어씀
//  · 불러오기·끌어다 놓기·최근 파일: .tcpack 하나로 설정·에셋·기록 복원 후 그 파일에 연결
//  · 자동 백업: 몇 분마다 지금 상태를 보관 (최근 몇 개)
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { recordsApi } from '../game/records';
import { DEFAULT_SETTINGS } from '../settings/settings';
import type { Settings } from '../types';
import { assetRev, loadMeta, onAssetChange, saveMeta } from './assets';
import { downloadBlob } from './download';
import { applyAssets, buildPack, clearAllAssets, PACK_EXT, PACK_MIME, readPack, readThumbnail } from './pack';
import { thumbnailDataUrl } from './thumbnail';
import { tr } from '../i18n';

interface WritableHandle extends FileSystemFileHandle {
  queryPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
}

type PickerWindow = Window & {
  showSaveFilePicker?: (o: object) => Promise<WritableHandle>;
  showOpenFilePicker?: (o: object) => Promise<WritableHandle[]>;
};
const win = window as PickerWindow;

const SAVE_TYPES = [{ description: tr('타임 챌린지 파일'), accept: { [PACK_MIME]: [PACK_EXT] } }];
const OPEN_TYPES = [{ description: tr('타임 챌린지 파일'), accept: { [PACK_MIME]: [PACK_EXT], 'application/zip': ['.zip'], 'application/json': ['.json'] } }];
const PICKER_ID = 'time-challenge';
const DEFAULT_NAME = tr('타임 챌린지{0}', PACK_EXT);

/** 위치를 골라 저장할 수 있는 브라우저인지 (크롬·엣지). 아니면 내려받기로 저장 */
export const canPickPath = typeof win.showSaveFilePicker === 'function';

/** 끌어다 놓기로 열 수 있는 파일 */
export const isDocFile = (f: File) => /\.(tcpack|zip|json)$/i.test(f.name);

const META_KEY = 'timer-game:doc';
interface DocMeta {
  /** 연결된 파일 이름 (없으면 아직 파일로 저장 안 한 새 문서) */
  name: string | null;
  /** 마지막으로 파일에 저장(또는 불러온) 때의 설정 */
  saved: string | null;
  /** 그때의 에셋 리비전 */
  rev: number;
}
const EMPTY: DocMeta = { name: null, saved: null, rev: 0 };

const readMeta = (): DocMeta => {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(META_KEY) ?? '{}') };
  } catch {
    return EMPTY;
  }
};

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

/** 파일 고르기 대체 (위치 선택 API 가 없는 브라우저) */
function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `${PACK_EXT},.zip,.json`;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/* ───── 최근 파일 · 자동 백업 (IndexedDB 보관) ───── */

export interface RecentFile {
  name: string;
  at: number;
  thumb: string | null;
  handle: WritableHandle | null;
}

export interface Backup {
  at: number;
  name: string | null;
  thumb: string | null;
  blob: Blob;
}

const RECENT_MAX = 8;
const BACKUP_MAX = 6;
const BACKUP_EVERY_MS = 5 * 60 * 1000;
const BACKUP_MAX_BYTES = 40 * 1024 * 1024;

export type DocResult = { ok: true; message: string } | { ok: false; message: string } | null;

/** onReplace: 불러오기·새 문서로 설정을 통째로 바꾸기 직전 (실행 취소 기록 초기화) */
export function useDocument(settings: Settings, setSettings: Dispatch<SetStateAction<Settings>>, onReplace?: (next: Settings) => void) {
  const [meta, setMeta] = useState<DocMeta>(readMeta);
  useEffect(() => {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch {
      /* storage unavailable */
    }
  }, [meta]);

  // 연결된 파일 핸들 (새로고침해도 같은 파일에 저장되도록 IndexedDB 에 보관)
  const handle = useRef<WritableHandle | null>(null);
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  useEffect(() => {
    loadMeta<WritableHandle>('file-handle').then((h) => {
      if (h && !handle.current) handle.current = h;
    });
    loadMeta<RecentFile[]>('recent').then((r) => setRecent(Array.isArray(r) ? r : []));
    loadMeta<Backup[]>('backups').then((b) => setBackups(Array.isArray(b) ? b : []));
  }, []);

  const [rev, setRev] = useState(assetRev);
  useEffect(() => onAssetChange(() => setRev(assetRev())), []);

  const latest = useRef(settings);
  latest.current = settings;
  const json = useMemo(() => JSON.stringify(settings), [settings]);
  const dirty = meta.saved === null || meta.saved !== json || meta.rev !== rev;

  const [busy, setBusy] = useState(false);
  /** 파일 저장 완료 시각 (알림용) */
  const [fileSavedAt, setFileSavedAt] = useState(0);

  /** 마지막 결과 메시지 (파일 바에 잠깐 표시) */
  const [notice, setNotice] = useState<(NonNullable<DocResult> & { at: number }) | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  // 저장된 상태에서 무언가 바뀌면 "저장했어요" 대신 바로 "저장 안 된 변경" 이 보이게
  const wasDirty = useRef(dirty);
  useEffect(() => {
    if (dirty && !wasDirty.current) setNotice(null);
    wasDirty.current = dirty;
  }, [dirty]);

  const markSaved = (name: string, saved = JSON.stringify(latest.current)) => {
    setMeta({ name, saved, rev: assetRev() });
    setFileSavedAt(Date.now());
  };

  const attach = (h: WritableHandle | null) => {
    handle.current = h;
    void saveMeta('file-handle', h);
  };

  const remember = async (name: string, h: WritableHandle | null, thumb: string | null) => {
    const next = [{ name, at: Date.now(), thumb, handle: h }, ...recent.filter((r) => r.name !== name)].slice(0, RECENT_MAX);
    setRecent(next);
    await saveMeta('recent', next);
  };

  const write = async (h: WritableHandle) => {
    const blob = await buildPack(latest.current);
    const w = await h.createWritable();
    await w.write(blob);
    await w.close();
  };

  const run = async (fn: () => Promise<DocResult>): Promise<DocResult> => {
    if (busy) return null;
    setBusy(true);
    let r: DocResult;
    try {
      r = await fn();
    } catch (e) {
      r = isAbort(e) ? null : { ok: false, message: tr('파일을 처리하지 못했어요') };
    } finally {
      setBusy(false);
    }
    if (r) setNotice({ ...r, at: Date.now() });
    return r;
  };

  /** 다른 이름으로 저장 — 위치·이름 선택 (처음 저장도 이것) */
  const saveAs = () =>
    run(async () => {
      const suggestedName = meta.name ?? DEFAULT_NAME;
      if (canPickPath) {
        const h = await win.showSaveFilePicker!({ suggestedName, types: SAVE_TYPES, id: PICKER_ID, startIn: handle.current ?? 'documents' });
        await write(h);
        attach(h);
        markSaved(h.name);
        await remember(h.name, h, await thumbnailDataUrl(latest.current));
        return { ok: true, message: tr('{0} 에 저장했어요', h.name) };
      }
      // 위치를 고를 수 없는 브라우저: 내려받기 폴더로
      downloadBlob(await buildPack(latest.current), suggestedName);
      markSaved(suggestedName);
      await remember(suggestedName, null, await thumbnailDataUrl(latest.current));
      return { ok: true, message: tr('{0} 을(를) 내려받았어요 (이 브라우저는 저장할 때마다 새로 내려받아요)', suggestedName) };
    });

  /** 저장 — 연결된 파일이 있으면 덮어쓰기, 없으면 위치 선택 */
  const save = async (): Promise<DocResult> => {
    const h = handle.current;
    if (!h || !canPickPath) return saveAs();
    return run(async () => {
      let ok = true;
      if (h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        ok = (await h.requestPermission?.({ mode: 'readwrite' })) === 'granted';
      }
      if (!ok) return { ok: false, message: tr('파일에 쓸 권한이 없어요. 다른 이름으로 저장해 주세요') };
      await write(h);
      markSaved(h.name);
      await remember(h.name, h, await thumbnailDataUrl(latest.current));
      return { ok: true, message: tr('{0} 에 저장했어요', h.name) };
    });
  };

  /** 파일 내용으로 바꾸고 그 파일에 연결 (불러오기·끌어다 놓기·최근 파일 공용) */
  const load = async (file: File | Blob, name: string, h: WritableHandle | null): Promise<DocResult> => {
    let pack;
    try {
      pack = await readPack(file);
    } catch {
      return { ok: false, message: tr('타임 챌린지 파일이 아니에요') };
    }
    await applyAssets(pack);
    if (!pack.legacy) recordsApi.replace(pack.records ?? []);
    onReplace?.(pack.settings);
    setSettings(pack.settings);

    if (pack.legacy) {
      // 예전 설정 백업: 내용만 가져오고 새 문서로 (저장 시 .tcpack 위치 선택)
      attach(null);
      setMeta({ ...EMPTY, rev: assetRev() });
      return { ok: true, message: tr('예전 설정 백업을 불러왔어요. 이미지는 지금 것을 유지해요') };
    }
    const isPack = name.toLowerCase().endsWith(PACK_EXT);
    attach(isPack ? h : null);
    setMeta(isPack ? { name, saved: JSON.stringify(pack.settings), rev: assetRev() } : { ...EMPTY, rev: assetRev() });
    if (isPack) await remember(name, h, await readThumbnail(file));
    const n = Object.keys(pack.assets).length;
    return { ok: true, message: tr('{0} 을(를) 불러왔어요{1}{2}', name, n ? tr(' · 에셋 {0}개', n) : '', pack.records?.length ? tr(' · 기록 {0}개', pack.records.length) : '') };
  };

  /** 불러오기 — 파일 고르기 */
  const open = () =>
    run(async () => {
      if (typeof win.showOpenFilePicker === 'function') {
        const [h] = await win.showOpenFilePicker({ types: OPEN_TYPES, id: PICKER_ID, multiple: false });
        const file = await h.getFile();
        return load(file, file.name, h);
      }
      const file = await pickFile();
      return file ? load(file, file.name, null) : null;
    });

  /** 끌어다 놓은 파일 열기 (덮어쓸 위치는 다음 저장 때 고름) */
  const openFile = (file: File) => run(() => load(file, file.name, null));

  /** 최근 파일 다시 열기 (위치를 기억한 브라우저만) */
  const openRecent = (r: RecentFile) =>
    run(async () => {
      const h = r.handle;
      if (!h) return { ok: false, message: tr('이 브라우저에선 최근 파일을 바로 열 수 없어요. 불러오기를 써 주세요') };
      if (h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        if ((await h.requestPermission?.({ mode: 'readwrite' })) !== 'granted') return { ok: false, message: tr('파일을 열 권한이 없어요') };
      }
      try {
        const file = await h.getFile();
        return load(file, file.name, h);
      } catch {
        return { ok: false, message: tr('파일을 찾을 수 없어요 (옮기거나 지웠을 수 있어요)') };
      }
    });

  const removeRecent = async (r: RecentFile) => {
    const next = recent.filter((x) => x !== r);
    setRecent(next);
    await saveMeta('recent', next);
  };

  /** 새로 만들기 — 기본 설정 · 에셋·기록 비움 · 파일 연결 해제 */
  const newDoc = () =>
    run(async () => {
      await clearAllAssets();
      recordsApi.clear();
      const next = structuredClone(DEFAULT_SETTINGS);
      onReplace?.(next);
      setSettings(next);
      attach(null);
      setMeta({ ...EMPTY, rev: assetRev() });
      return { ok: true, message: tr('새 문서를 만들었어요') };
    });

  /* ───── 자동 백업 ───── */
  const lastBackupJson = useRef<string>('');
  const lastBackupRev = useRef(-1);
  useEffect(() => {
    const id = window.setInterval(async () => {
      const j = JSON.stringify(latest.current);
      if (j === lastBackupJson.current && assetRev() === lastBackupRev.current) return;
      try {
        const blob = await buildPack(latest.current);
        if (blob.size > BACKUP_MAX_BYTES) return;
        lastBackupJson.current = j;
        lastBackupRev.current = assetRev();
        const prev = (await loadMeta<Backup[]>('backups')) ?? [];
        const next = [{ at: Date.now(), name: readMeta().name, thumb: await thumbnailDataUrl(latest.current), blob }, ...prev].slice(0, BACKUP_MAX);
        await saveMeta('backups', next);
        setBackups(next);
      } catch {
        /* 다음 차례에 다시 */
      }
    }, BACKUP_EVERY_MS);
    return () => clearInterval(id);
  }, []);

  /** 백업으로 되돌리기 (새 문서로 열림 — 저장하면 위치를 다시 고름) */
  const restoreBackup = (b: Backup) =>
    run(async () => {
      const r = await load(b.blob, tr('백업 {0}', new Date(b.at).toLocaleString()), null);
      return r?.ok ? { ok: true, message: tr('{0} 백업으로 되돌렸어요', new Date(b.at).toLocaleTimeString()) } : r;
    });

  return {
    /** 연결된 파일 이름 (null = 아직 저장 안 한 새 문서) */
    name: meta.name,
    dirty,
    busy,
    notice,
    fileSavedAt,
    save,
    saveAs,
    open,
    openFile,
    openRecent,
    removeRecent,
    newDoc,
    recent,
    backups,
    restoreBackup,
  };
}

export type DocumentApi = ReturnType<typeof useDocument>;
