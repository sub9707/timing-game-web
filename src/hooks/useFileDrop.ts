import { useEffect, useRef, useState } from 'react';
import { confirmDiscard, isDocFile, type DocumentApi } from '../storage/doc';

interface Ctx {
  doc: DocumentApi;
  locked: boolean;
  /** 그림을 놓은 자리(무대 가운데 기준 %)에 삽입 */
  insertImage: (file: File, at?: { x: number; y: number }) => void;
}

/** 파일 끌어다 놓기 — 저장 파일은 열고, 그림은 화면에 삽입 · 끌어 오는 중인지 돌려줌 */
export function useFileDrop(ctx: Ctx) {
  const ref = useRef(ctx);
  ref.current = ctx;
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const over = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      setDragOver(true);
    };
    const leave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragOver(false);
    };
    const drop = (e: DragEvent) => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      setDragOver(false);
      const c = ref.current;
      for (const f of e.dataTransfer.files) {
        if (isDocFile(f)) {
          if (confirmDiscard(c.doc)) void c.doc.openFile(f);
          return;
        }
        // 그림은 화면 편집에 삽입 (놓은 자리에)
        if (f.type.startsWith('image/') && !c.locked) {
          const u = document.querySelector('.canvas')?.getBoundingClientRect();
          const at = u ? { x: ((e.clientX - (u.left + u.width / 2)) / u.width) * 100, y: ((e.clientY - (u.top + u.height / 2)) / u.height) * 100 } : undefined;
          c.insertImage(f, at);
        }
      }
    };
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, []);

  return dragOver;
}

/** 파일로 저장한 문서에 저장 안 한 변경이 있으면 창 닫기 전에 경고 */
export function useUnsavedWarning(doc: DocumentApi) {
  const ref = useRef(doc);
  ref.current = doc;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (ref.current.name && ref.current.dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
}
