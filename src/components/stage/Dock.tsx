import type { MouseEvent, ReactElement } from 'react';
import type { DockTour, TourStep } from '../../hooks/useDockTour';
import { ChevronDownIcon, ExpandIcon, GearIcon, InfoIcon, LayoutIcon, LockIcon, ShrinkIcon, TrophyIcon } from '../ui/Icons';
import { lang, setLang, tr } from '../../i18n';

interface Props {
  hidden: boolean;
  onToggleHidden: () => void;
  locked: boolean;
  boardOpen: boolean;
  /** 앱 전체화면 중 (버튼 아이콘) */
  fullscreen: boolean;
  /** 전체화면 버튼 (지원하지 않는 기기에선 숨김) */
  canFullscreen: boolean;
  /** 화면 편집 버튼 (전체화면 중엔 숨김) */
  canEdit: boolean;
  /** 아래 메뉴 안내 (처음 왔거나 오랜만에 왔을 때) */
  tour: DockTour;
  onInfo: () => void;
  onBoard: () => void;
  onFullscreen: () => void;
  onEdit: () => void;
  onSettings: () => void;
}

/** 안내 문구 · 말풍선을 버튼의 어느 쪽에 맞출지 (화면 밖으로 나가지 않게) */
const TOUR: Record<TourStep, { title: string; text: string; align: 'left' | 'center' | 'right' }> = {
  board: { title: tr('랭킹 화면'), text: tr('참가자 기록을 순위로 보여줘요. L 키로도 열 수 있어요.'), align: 'left' },
  lang: { title: tr('언어 바꾸기'), text: tr('화면을 한국어나 영어로 바꿔요.'), align: 'left' },
  fullscreen: { title: tr('전체화면'), text: tr('행사·방송에서는 전체화면으로 띄워 보세요. 게임 중에는 메뉴가 저절로 숨어요.'), align: 'center' },
  edit: { title: tr('화면 편집'), text: tr('제목·타이머·문구를 끌어서 옮기고 크기를 바꿀 수 있어요.'), align: 'right' },
  settings: { title: tr('나만의 게임으로 꾸며 보세요'), text: tr('목표 시간, 판정, 디자인, 문구, 효과음, 기록을 여기서 바꿔요.'), align: 'right' },
  toggle: { title: tr('메뉴 접기'), text: tr('메뉴를 아래로 접어 화면을 깔끔하게 쓸 수 있어요.'), align: 'right' },
};

/** 버튼을 누른 뒤 포커스를 풀어 스페이스 키가 버튼을 다시 누르지 않게 */
const blurThen = (fn: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.blur();
  fn();
};

/** 화면 가운데 아래 메뉴 */
export function Dock({ hidden, onToggleHidden, locked, boardOpen, fullscreen, canFullscreen, canEdit, tour, onInfo, onBoard, onFullscreen, onEdit, onSettings }: Props) {
  /** 안내 중인 버튼은 빛나게 하고 위에 말풍선 */
  const guided = (id: TourStep, button: ReactElement) => {
    if (tour.step !== id) return button;
    const t = TOUR[id];
    const last = tour.index + 1 >= tour.total;
    return (
      <span className="dock-anchor">
        {button}
        <div key={id} className={`dock-guide is-${t.align} ${tour.index > 0 ? 'is-next' : ''}`} role="dialog" aria-label={t.title}>
          <strong>{t.title}</strong>
          <span>{t.text}</span>
          <div className="dock-guide-foot">
            <span className="dock-guide-count">{tr('{0} / {1}', tour.index + 1, tour.total)}</span>
            {tour.index > 0 && (
              <button className="dock-guide-btn" onClick={blurThen(tour.prev)} tabIndex={-1}>
                {tr('이전')}
              </button>
            )}
            <button className="dock-guide-btn is-primary" onClick={blurThen(tour.next)} tabIndex={-1}>
              {last ? tr('시작하기') : tr('다음')}
            </button>
          </div>
          <button className="dock-guide-close" onClick={blurThen(tour.close)} aria-label={tr('닫기')} tabIndex={-1}>
            ×
          </button>
        </div>
      </span>
    );
  };
  const glow = (id: TourStep) => (tour.step === id ? 'is-guide' : '');

  return (
    <nav className={`dock ${hidden ? 'is-hidden' : ''} ${tour.step ? 'has-guide' : ''}`}>
      <div className="dock-items" inert={hidden}>
        <button className="dock-btn" onClick={blurThen(onInfo)} aria-label={tr('정보')} tabIndex={-1}>
          <InfoIcon />
        </button>
        {guided(
          'board',
          <button className={`dock-btn ${boardOpen ? 'is-on' : ''} ${glow('board')}`} onClick={blurThen(onBoard)} aria-label={tr('랭킹')} title={tr('랭킹 화면 (L)')} tabIndex={-1}>
            <TrophyIcon />
          </button>,
        )}
        {/* 언어 바꾸기 (새로고침) — 잠금 중엔 관객이 못 누르게 숨김 */}
        {!locked &&
          guided(
            'lang',
            <button
              className={`dock-btn dock-lang ${glow('lang')}`}
              onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
              aria-label={lang === 'ko' ? 'English' : '한국어'}
              title={lang === 'ko' ? 'English' : '한국어'}
              tabIndex={-1}
            >
              {lang === 'ko' ? 'EN' : '한'}
            </button>,
          )}
        {canFullscreen &&
          guided(
            'fullscreen',
            <button className={`dock-btn ${glow('fullscreen')}`} onClick={blurThen(onFullscreen)} aria-label={tr('전체화면')} tabIndex={-1}>
              {fullscreen ? <ShrinkIcon /> : <ExpandIcon />}
            </button>,
          )}
        {canEdit &&
          guided(
            'edit',
            <button className={`dock-btn ${glow('edit')}`} onClick={blurThen(onEdit)} aria-label={tr('화면 편집')} title={tr('화면 편집 — 요소를 직접 옮기고 크기 조절')} tabIndex={-1}>
              <LayoutIcon />
            </button>,
          )}
        {guided(
          'settings',
          <button
            className={`dock-btn ${glow('settings')}`}
            data-tour="settings"
            onClick={onSettings}
            aria-label={tr('설정')}
            title={locked ? tr('잠김 — PIN 필요') : tr('설정')}
            tabIndex={-1}
          >
            {locked ? <LockIcon /> : <GearIcon />}
          </button>,
        )}
      </div>
      {guided(
        'toggle',
        <button
          className={`dock-toggle ${glow('toggle')}`}
          onClick={blurThen(onToggleHidden)}
          aria-label={hidden ? tr('메뉴 보이기') : tr('메뉴 숨기기')}
          aria-expanded={!hidden}
          title={hidden ? tr('메뉴 보이기') : tr('메뉴 숨기기')}
          tabIndex={-1}
        >
          <ChevronDownIcon />
        </button>,
      )}
    </nav>
  );
}
