import { useEffect, useState } from 'react';

/** 이 브라우저에만 기억하는 값 (메뉴 숨김·편집 보기 옵션 등). 읽기 실패 시 기본값 */
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed = JSON.parse(raw) as T;
      // 객체는 새로 생긴 항목을 기본값으로 채움
      return typeof initial === 'object' && initial && !Array.isArray(initial) ? { ...initial, ...parsed } : parsed;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
