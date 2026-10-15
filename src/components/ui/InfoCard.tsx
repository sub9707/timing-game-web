import { CloseIcon } from './Icons';
import { lang, setLang, tr } from '../../i18n';

const AUTHOR = 'sub9707';
const AUTHOR_URL = 'https://github.com/sub9707';
const CONTACT_EMAIL = 'sub9707@naver.com';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InfoCard({ open, onClose }: Props) {
  return (
    <>
      <div className={`scrim ${open ? 'is-open' : ''}`} onClick={onClose} />
      <div className={`info-card ${open ? 'is-open' : ''}`} role="dialog" aria-label={tr('정보')} aria-hidden={!open} inert={!open}>
        <button className="icon-btn info-close" onClick={onClose} aria-label={tr('닫기')}>
          <CloseIcon />
        </button>

        <div className="info-mark" aria-hidden>
          00:15:00
        </div>
        <h2 className="info-title">Time Challenge</h2>
        <p className="info-desc">{tr('정확한 순간에 멈추는 타이밍 게임')}</p>

        <dl className="info-meta">
          <div>
            <dt>Made by</dt>
            <dd>
              <a href={AUTHOR_URL} target="_blank" rel="noreferrer">
                {AUTHOR}
              </a>
            </dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </dd>
          </div>
        </dl>
        <p className="info-contact">{tr('제휴·비즈니스, 기능 제안, 버그 제보 등 문의는 메일로 편하게 보내주세요')}</p>
        <nav className="info-links">
          <a href="privacy.html" target="_blank" rel="noreferrer">
            {tr('개인정보처리방침')}
          </a>
          <span aria-hidden>·</span>
          <a href="terms.html" target="_blank" rel="noreferrer">
            {tr('이용약관')}
          </a>
          <span aria-hidden>·</span>
          <button className="info-lang" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>
            {lang === 'ko' ? 'English' : '한국어'}
          </button>
        </nav>
      </div>
    </>
  );
}
