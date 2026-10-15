import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

/** 화면 위 직접 텍스트 편집 상태 (App 이 내려줌) */
export interface TextEditProps {
  /** 지금 이 요소의 글자를 편집 중 */
  active: boolean;
  onCommit: (text: string) => void;
  onDone: () => void;
}

type Tag = 'h1' | 'p' | 'span' | 'div';

interface Props extends Partial<TextEditProps> {
  as: Tag;
  text: string;
  className?: string;
  style?: CSSProperties;
  /** 줄바꿈 허용 (Shift+Enter) */
  multiline?: boolean;
  'data-edit-id'?: string;
}

/**
 * 파워포인트처럼 제자리에서 고치는 텍스트.
 * 편집 중엔 입력을 DOM 에만 두고, 끝날 때 한 번 반영한 뒤 key 를 바꿔 새로 그림 (커서·리액트 충돌 방지)
 */
export function EditableText({ as: Tag, text, active = false, onCommit, onDone, multiline, className, style, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [session, setSession] = useState(0);
  const done = useRef(false);

  // 편집 시작: 포커스 + 전체 선택 (파워포인트 더블클릭과 같게)
  useLayoutEffect(() => {
    if (!active) return;
    done.current = false;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [active]);

  const finish = () => {
    if (!active || done.current) return;
    done.current = true;
    const el = ref.current;
    let value = el?.innerText ?? text;
    value = multiline ? value.replace(/\n$/, '') : value.replace(/\s*\n\s*/g, ' ');
    getSelection()?.removeAllRanges();
    if (value !== text) onCommit?.(value);
    setSession((n) => n + 1);
    onDone?.();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    // 게임 키·편집기 단축키로 새지 않게
    e.stopPropagation();
    if (e.key === 'Escape' || (e.key === 'Enter' && !(multiline && e.shiftKey))) {
      e.preventDefault();
      finish();
    }
  };

  return (
    <Tag
      key={session}
      ref={ref as never}
      className={`${className ?? ''} ${active ? 'is-text-editing' : ''}`}
      style={style}
      contentEditable={active ? 'plaintext-only' : undefined}
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={finish}
      onKeyDown={active ? onKeyDown : undefined}
      {...rest}
    >
      {text}
    </Tag>
  );
}
