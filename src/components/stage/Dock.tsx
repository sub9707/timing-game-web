import type { MouseEvent } from 'react';
import { ChevronDownIcon, ExpandIcon, GearIcon, InfoIcon, LayoutIcon, LockIcon, ShrinkIcon, TrophyIcon } from '../ui/Icons';
import { lang, setLang, tr } from '../../i18n';

interface Props {
  hidden: boolean;
  onToggleHidden: () => void;
  locked: boolean;
  boardOpen: boolean;
  /** 앱 전체화면 중 (버튼 아이콘) */
  fullscreen: boolean;
  /** 화면 편집 버튼 (전체화면 중엔 숨김) */
  canEdit: boolean;
  /** 처음 온 사람에게 설정 버튼 안내 */
  guide: boolean;
  onCloseGuide: () => void;
  onInfo: () => void;
  onBoard: () => void;
  onFullscreen: () => void;
  onEdit: () => void;
  onSettings: () => void;
}

/** 버튼을 누른 뒤 포커스를 풀어 스페이스 키가 버튼을 다시 누르지 않게 */
const blurThen = (fn: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.blur();
  fn();
};

/** 화면 가운데 아래 메뉴 */
export function Dock({ hidden, onToggleHidden, locked, boardOpen, fullscreen, canEdit, guide, onCloseGuide, onInfo, onBoard, onFullscreen, onEdit, onSettings }: Props) {
  return (
    <nav className={`dock ${hidden ? 'is-hidden' : ''} ${guide ? 'has-guide' : ''}`}>
      <div className="dock-items" inert={hidden}>
        <button className="dock-btn" onClick={blurThen(onInfo)} aria-label={tr('정보')} tabIndex={-1}>
          <InfoIcon />
        </button>
        <button className={`dock-btn ${boardOpen ? 'is-on' : ''}`} onClick={blurThen(onBoard)} aria-label={tr('랭킹')} title={tr('랭킹 화면 (L)')} tabIndex={-1}>
          <TrophyIcon />
        </button>
        {/* 언어 바꾸기 (새로고침) — 잠금 중엔 관객이 못 누르게 숨김 */}
        {!locked && (
          <button
            className="dock-btn dock-lang"
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            aria-label={lang === 'ko' ? 'English' : '한국어'}
            title={lang === 'ko' ? 'English' : '한국어'}
            tabIndex={-1}
          >
            {lang === 'ko' ? 'EN' : '한'}
          </button>
        )}
        <button className="dock-btn" onClick={blurThen(onFullscreen)} aria-label={tr('전체화면')} tabIndex={-1}>
          {fullscreen ? <ShrinkIcon /> : <ExpandIcon />}
        </button>
        {canEdit && (
          <button className="dock-btn" onClick={blurThen(onEdit)} aria-label={tr('화면 편집')} title={tr('화면 편집 — 요소를 직접 옮기고 크기 조절')} tabIndex={-1}>
            <LayoutIcon />
          </button>
        )}
        <span className="dock-anchor">
          <button
            className={`dock-btn ${guide ? 'is-guide' : ''}`}
            onClick={onSettings}
            aria-label={tr('설정')}
            title={locked ? tr('잠김 — PIN 필요') : tr('설정')}
            tabIndex={-1}
          >
            {locked ? <LockIcon /> : <GearIcon />}
          </button>
          {guide && (
            <div className="dock-guide" role="status">
              <strong>{tr('나만의 게임으로 꾸며 보세요')}</strong>
              <span>{tr('디자인·문구·효과음·랭킹을 여기서 바꿀 수 있어요')}</span>
              <button className="dock-guide-close" onClick={onCloseGuide} aria-label={tr('닫기')} tabIndex={-1}>
                ×
              </button>
            </div>
          )}
        </span>
      </div>
      <button
        className="dock-toggle"
        onClick={blurThen(onToggleHidden)}
        aria-label={hidden ? tr('메뉴 보이기') : tr('메뉴 숨기기')}
        aria-expanded={!hidden}
        title={hidden ? tr('메뉴 보이기') : tr('메뉴 숨기기')}
        tabIndex={-1}
      >
        <ChevronDownIcon />
      </button>
    </nav>
  );
}
