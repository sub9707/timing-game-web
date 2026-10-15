import { useEffect, useState } from 'react';
import { tr } from '../i18n';

// 이미지·글꼴·효과음 같은 에셋은 용량이 커서 localStorage 대신 IndexedDB 에 저장 (= 임시 저장)
const DB_NAME = 'timer-game';
const STORE = 'assets';

/** 기본 에셋 — 삽입 그림(img:<id>) · 올린 글꼴(font:<id>) 은 설정에서 참조될 때 함께 저장됨 */
export const BUILTIN_ASSETS = ['background', 'blindImage', 'sfx:start', 'sfx:stop', 'sfx:success', 'sfx:fail', 'sfx:reveal', 'sfx:countdown'] as const;
/** 예전 이름 */
export const ASSET_KEYS = BUILTIN_ASSETS;

export type AssetKey = string;
/** 예전 이름 */
export type ImageKey = AssetKey;

export const ASSET_LABELS: Record<string, string> = {
  background: tr('배경'),
  blindImage: tr('스피너 이미지'),
  'sfx:start': tr('시작 효과음'),
  'sfx:stop': tr('정지 효과음'),
  'sfx:success': tr('성공 효과음'),
  'sfx:fail': tr('실패 효과음'),
  'sfx:reveal': tr('긴장 효과음'),
  'sfx:countdown': tr('카운트다운 효과음'),
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export const loadAsset = (key: AssetKey) => tx<Blob | undefined>('readonly', (s) => s.get(key)).catch(() => undefined);
/** 예전 이름 */
export const loadImage = loadAsset;

/** 저장된 에셋 키 전체 (보관값 meta:* 제외) */
export const listAssetKeys = () =>
  tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys())
    .then((keys) => keys.map(String).filter((k) => !k.startsWith('meta:')))
    .catch(() => [] as string[]);

/* ───── 변경 알림 · 리비전 (파일 저장 후 바뀌었는지 판단용) ───── */

const REV_KEY = 'timer-game:asset-rev';
const readRev = () => {
  try {
    return Number(localStorage.getItem(REV_KEY)) || 0;
  } catch {
    return 0;
  }
};
let rev = readRev();

/** user: 사용자가 바꿈(실행 취소 기록) · history: 실행 취소/다시 실행 · load: 불러오기·새 문서 · remote: 다른 창 알림 */
export type AssetSource = 'user' | 'history' | 'load' | 'remote';
export interface AssetChange {
  key: AssetKey;
  before: Blob | null;
  after: Blob | null;
  source: AssetSource;
}

const listeners = new Set<(c: AssetChange) => void>();

export const assetRev = () => rev;

export function onAssetChange(fn: (c: AssetChange) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 저장 실패 (용량 초과 등) 알림 */
const errorListeners = new Set<(e: unknown) => void>();
export function onAssetError(fn: (e: unknown) => void) {
  errorListeners.add(fn);
  return () => {
    errorListeners.delete(fn);
  };
}

/** 에셋 교체(blob) 또는 삭제(null) — 화면의 모든 사용처가 다시 읽음 */
export async function putAsset(key: AssetKey, blob: Blob | null, source: AssetSource = 'user') {
  const before = source === 'user' ? ((await loadAsset(key)) ?? null) : null;
  try {
    await tx<void>('readwrite', (s) => (blob ? s.put(blob, key) : s.delete(key)));
  } catch (e) {
    errorListeners.forEach((l) => l(e));
    return false;
  }
  rev += 1;
  try {
    localStorage.setItem(REV_KEY, String(rev));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l({ key, before, after: blob, source }));
  return true;
}

/** 다른 창(송출 창)에서 바뀐 걸 알려줬을 때 — 다시 읽기만 */
export function notifyAsset(key: AssetKey) {
  listeners.forEach((l) => l({ key, before: null, after: null, source: 'remote' }));
}

/* ───── 에셋 외 보관값 (연결된 파일 핸들 · 최근 파일 · 자동 백업 등) ───── */

export const loadMeta = <T>(name: string) => tx<T | undefined>('readonly', (s) => s.get(`meta:${name}`)).catch(() => undefined);
export const saveMeta = (name: string, value: unknown) =>
  tx<void>('readwrite', (s) => (value === null ? s.delete(`meta:${name}`) : s.put(value, `meta:${name}`))).catch((e) => {
    errorListeners.forEach((l) => l(e));
  });

/** 저장된 에셋을 object URL 로 들고 있고, 교체·삭제·불러오기 시 다시 읽음 */
export function useStoredImage(key: AssetKey | null) {
  const [state, setState] = useState<{ url: string | null; type: string }>({ url: null, type: '' });

  useEffect(() => {
    if (!key) {
      setState({ url: null, type: '' });
      return;
    }
    let alive = true;
    let current: string | null = null;
    const load = () =>
      loadAsset(key).then((blob) => {
        if (!alive) return;
        const next = blob ? URL.createObjectURL(blob) : null;
        if (current) URL.revokeObjectURL(current);
        current = next;
        setState({ url: next, type: blob?.type ?? '' });
      });
    load();
    const off = onAssetChange((c) => c.key === key && load());
    return () => {
      alive = false;
      off();
      if (current) URL.revokeObjectURL(current);
    };
  }, [key]);

  return {
    url: state.url,
    /** MIME (동영상 배경 구분용) */
    type: state.type,
    save: (file: Blob) => (key ? putAsset(key, file) : Promise.resolve(false)),
    clear: () => (key ? putAsset(key, null) : Promise.resolve(false)),
  };
}
