// 동의를 먼저 받아야 하는 지역 (EEA · 영국 · 스위스) — 이 지역은 구글 동의 메시지(애드센스)에서 고르기 전까지 쿠키를 쓰지 않음
// 앱(analytics.ts)과 빌드 때 정적 페이지에 넣는 태그(vite.config.ts)가 같이 씀
export const CONSENT_REGIONS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
];

/** 구글 동의 모드 기본값 — 위 지역만 거부로 시작 */
export const CONSENT_DEFAULT = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  region: CONSENT_REGIONS,
  wait_for_update: 500,
} as const;
