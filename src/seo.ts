// 검색·공유용 문구 (빌드 때 index.html 머리말·영어 페이지·sitemap 을 만들 때 씀 — 앱 코드에선 안 씀)
export const SITE_NAME = 'Stopia';

export interface SeoText {
  lang: 'ko' | 'en';
  locale: string;
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  imageAlt: string;
  /** 자바스크립트 없이도 읽히는 본문 (검색 로봇용 · 앱이 뜨면 바뀜) */
  heading: string;
  intro: string;
  features: string[];
}

export const SEO: Record<'ko' | 'en', SeoText> = {
  ko: {
    lang: 'ko',
    locale: 'ko_KR',
    title: '스토피아 Stopia — 나만의 시간 맞추기 게임 | 10초 맞추기 타이머 챌린지',
    description:
      '직접 커스텀할 수 있는 나만의 시간 맞추기 게임, 스토피아. 타이머를 정확히 10초·15초에 멈춰 보세요. 디자인·문구·효과음·랭킹을 마음대로 꾸며 행사·방송·수업·파티에서 설치 없이 무료로 바로 쓸 수 있어요.',
    keywords:
      '시간 맞추기 게임, 10초 맞추기, 10초 게임, 타이머 게임, 타이머 멈추기, 초시계 게임, 스톱워치 게임, 타이밍 게임, 행사 게임, 레크리에이션 게임, 방송 게임, 스토피아, Stopia',
    ogTitle: '스토피아 Stopia — 나만의 시간 맞추기 게임',
    ogDescription: '타이머를 정확히 멈춰라! 디자인·문구·효과음·랭킹까지 직접 꾸미는 무료 시간 맞추기 게임.',
    imageAlt: '스토피아 Stopia 로고',
    heading: '스토피아 Stopia — 직접 커스텀할 수 있는 나만의 시간 맞추기 게임',
    intro:
      '흘러가는 타이머를 목표 시간(예: 10초)에 딱 맞춰 멈추는 게임이에요. 허용 오차 안이면 성공! 화면 디자인부터 문구, 효과음, 랭킹까지 직접 만들어 행사·방송·수업·파티에서 써 보세요.',
    features: [
      '목표 시간·허용 오차·엄격한 판정 설정',
      '시간을 가리는 블라인드 모드와 극적인 결과 공개',
      'PPT처럼 화면 요소를 옮기고 꾸미는 편집기 · 템플릿 · 글꼴 · 그라데이션',
      '참가자 이름·기록·랭킹 화면과 CSV 내보내기',
      '카운트다운·효과음·무작위 목표 시간',
      'OBS·프로젝터용 송출 창과 투명·크로마키 배경',
      '설치 없이 브라우저에서 무료로 실행',
    ],
  },
  en: {
    lang: 'en',
    locale: 'en_US',
    title: 'Stopia — Make Your Own Stop the Timer Game | 10 Second Challenge',
    description:
      'Stopia is a free, fully customizable stop-the-timer game. Try to stop the clock at exactly 10 seconds, then design your own challenge with themes, text, sound effects and leaderboards for events, streams, classrooms and parties. No install — it runs in your browser.',
    keywords:
      'stop the timer game, 10 second challenge, stop at 10 seconds, timer challenge, stopwatch game, timing game, reaction time game, party game, event game, classroom game, OBS timer overlay, Stopia',
    ogTitle: 'Stopia — Make Your Own Stop the Timer Game',
    ogDescription: 'Stop the clock at exactly the right moment! A free timing game you can fully customize — themes, text, sounds and leaderboards.',
    imageAlt: 'Stopia logo',
    heading: 'Stopia — your own fully customizable stop-the-timer game',
    intro:
      'Stop the running timer exactly on target (like 10.00 seconds). Land within the tolerance and you win! Design every part of the screen — text, sounds and leaderboards — and use it at events, on stream, in class or at parties.',
    features: [
      'Target time, tolerance and strict judging',
      'Blind mode that hides the clock, with a dramatic reveal',
      'PowerPoint-style screen editor, templates, fonts and gradients',
      'Player names, records, leaderboard screen and CSV export',
      'Countdown, sound effects and random targets',
      'Output window for OBS/projectors with transparent and chroma-key backgrounds',
      'Free, no install — runs right in your browser',
    ],
  },
};
