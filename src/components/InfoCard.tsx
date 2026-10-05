import { ArrowUpRightIcon, CloseIcon, GithubIcon } from './Icons';

const REPO_URL = 'https://github.com/sub9707/timing-game-web';
const AUTHOR = 'sub9707';
const AUTHOR_URL = 'https://github.com/sub9707';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InfoCard({ open, onClose }: Props) {
  return (
    <>
      <div className={`scrim ${open ? 'is-open' : ''}`} onClick={onClose} />
      <div className={`info-card ${open ? 'is-open' : ''}`} role="dialog" aria-label="정보" aria-hidden={!open} inert={!open}>
        <button className="icon-btn info-close" onClick={onClose} aria-label="닫기">
          <CloseIcon />
        </button>

        <div className="info-mark" aria-hidden>
          00:15:00
        </div>
        <h2 className="info-title">Time Challenge</h2>
        <p className="info-desc">정확한 순간에 멈추는 타이밍 게임</p>

        <dl className="info-meta">
          <div>
            <dt>Made by</dt>
            <dd>
              <a href={AUTHOR_URL} target="_blank" rel="noreferrer">
                {AUTHOR}
              </a>
            </dd>
          </div>
        </dl>

        <a className="info-github" href={REPO_URL} target="_blank" rel="noreferrer">
          <GithubIcon />
          <span>GitHub</span>
          <span className="info-github-sub">sub9707/timing-game-web</span>
          <ArrowUpRightIcon />
        </a>
      </div>
    </>
  );
}
