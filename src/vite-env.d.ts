/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 애드센스 게시자 ID (ca-pub-XXXXXXXXXXXXXXXX) */
  readonly VITE_ADSENSE_CLIENT?: string;
  /** 왼쪽·오른쪽 세로 배너 광고 단위 ID */
  readonly VITE_ADSENSE_SLOT_LEFT?: string;
  readonly VITE_ADSENSE_SLOT_RIGHT?: string;
}
