const NAMED: Record<string, string> = {
  Space: 'SPACE',
  Enter: 'ENTER',
  NumpadEnter: 'NUM ENTER',
  Escape: 'ESC',
  Backspace: 'BKSP',
  Tab: 'TAB',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  PageUp: 'PG UP',
  PageDown: 'PG DN',
  ShiftLeft: 'L SHIFT',
  ShiftRight: 'R SHIFT',
  ControlLeft: 'L CTRL',
  ControlRight: 'R CTRL',
  AltLeft: 'L ALT',
  AltRight: 'R ALT',
  MetaLeft: 'L WIN',
  MetaRight: 'R WIN',
  CapsLock: 'CAPS',
  Period: '.',
  Comma: ',',
  Slash: '/',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
};

/** KeyboardEvent.code → 화면 표시용 라벨 */
export function keyLabel(code: string) {
  if (NAMED[code]) return NAMED[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6).replace('Add', '+').replace('Subtract', '-').replace('Multiply', '*').replace('Divide', '/').replace('Decimal', '.')}`;
  return code.toUpperCase();
}

/** 매핑할 수 없는 키 (브라우저 전체화면 전환용) */
export const RESERVED_KEYS = ['F11'];
