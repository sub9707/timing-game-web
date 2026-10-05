// 배경 이미지는 용량이 커서 localStorage 대신 IndexedDB 에 저장
const DB_NAME = 'timer-game';
const STORE = 'assets';
const KEY = 'background';

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

export const loadBgImage = () => tx<Blob | undefined>('readonly', (s) => s.get(KEY)).catch(() => undefined);
export const saveBgImage = (blob: Blob) => tx<void>('readwrite', (s) => s.put(blob, KEY));
export const clearBgImage = () => tx<void>('readwrite', (s) => s.delete(KEY));
