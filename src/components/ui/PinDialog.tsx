import { useEffect, useRef, useState } from 'react';
import { LockIcon } from './Icons';
import { tr } from '../../i18n';

/** 잠금 해제 PIN 입력 */
export function PinDialog({ onSubmit, onCancel }: { onSubmit: (pin: string) => Promise<boolean>; onCancel: () => void }) {
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const submit = async () => {
    if (!pin) return;
    if (!(await onSubmit(pin))) {
      setWrong(true);
      setPin('');
      ref.current?.focus();
    }
  };

  return (
    <>
      <div className="scrim is-open" onClick={onCancel} />
      <div className="pin-dialog" role="dialog" aria-label={tr('잠금 해제')}>
        <span className="pin-icon">
          <LockIcon />
        </span>
        <h2>{tr('잠겨 있어요')}</h2>
        <p>{tr('설정을 열려면 PIN 을 입력하세요')}</p>
        <input
          ref={ref}
          className={`pin-input ${wrong ? 'is-wrong' : ''}`}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          placeholder="PIN"
          onChange={(e) => {
            setPin(e.target.value);
            setWrong(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
            if (e.key === 'Escape') onCancel();
          }}
        />
        {wrong && <p className="pin-error">{tr('PIN 이 맞지 않아요')}</p>}
        <div className="row-2">
          <button className="ghost-btn" onClick={onCancel}>
            {tr('취소')}
          </button>
          <button className="primary-btn" onClick={() => void submit()}>
            {tr('열기')}
          </button>
        </div>
      </div>
    </>
  );
}
