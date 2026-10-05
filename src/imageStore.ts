import { useEffect, useState } from 'react';

// 이미지는 용량이 커서 localStorage 대신 IndexedDB 에 저장
const DB_NAME = 'timer-game';
const STORE = 'assets';

/** background: 배경 · blindImage: 블라인드 스피너 가운데 이미지 */
export type ImageKey = 'background' | 'blindImage';

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

export const loadImage = (key: ImageKey) => tx<Blob | undefined>('readonly', (s) => s.get(key)).catch(() => undefined);
const saveImage = (key: ImageKey, blob: Blob) => tx<void>('readwrite', (s) => s.put(blob, key));
const clearImage = (key: ImageKey) => tx<void>('readwrite', (s) => s.delete(key));

/** 저장된 이미지를 object URL 로 들고 있고, 교체·삭제 시 IndexedDB 와 동기화 */
export function useStoredImage(key: ImageKey) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadImage(key).then((blob) => alive && blob && setUrl(URL.createObjectURL(blob)));
    return () => {
      alive = false;
    };
  }, [key]);

  const replace = (next: string | null) =>
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next;
    });

  const save = async (file: File) => {
    replace(URL.createObjectURL(file));
    await saveImage(key, file).catch(() => undefined);
  };

  const clear = async () => {
    replace(null);
    await clearImage(key).catch(() => undefined);
  };

  return { url, save, clear };
}
