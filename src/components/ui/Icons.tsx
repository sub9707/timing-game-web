import type { ReactNode, SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const GearIcon = () => (
  <svg {...base}>
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

export const ExpandIcon = () => (
  <svg {...base}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const ShrinkIcon = () => (
  <svg {...base}>
    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...base}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const PlusIcon = () => (
  <svg {...base} width={16} height={16}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ImageIcon = () => (
  <svg {...base} width={22} height={22}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
  </svg>
);

export const EyeIcon = () => (
  <svg {...base} width={16} height={16}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = () => (
  <svg {...base} width={16} height={16}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />
  </svg>
);

export const InfoIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 16.5v-5M12 8h.01" strokeWidth={2.2} />
  </svg>
);

export const GithubIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.24 2.75.12 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);

export const ArrowUpRightIcon = () => (
  <svg {...base} width={14} height={14}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const ChevronDownIcon = () => (
  <svg {...base} width={16} height={16}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** 화면 편집 (선택 영역 + 핸들) */
export const LayoutIcon = () => (
  <svg {...base}>
    <rect x="5" y="5" width="14" height="14" rx="1.5" strokeDasharray="3 2.4" />
    <rect x="3" y="3" width="4" height="4" rx="1" fill="currentColor" stroke="none" />
    <rect x="17" y="17" width="4" height="4" rx="1" fill="currentColor" stroke="none" />
    <rect x="17" y="3" width="4" height="4" rx="1" fill="currentColor" stroke="none" />
    <rect x="3" y="17" width="4" height="4" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

/* ───── 맞춤 · 정렬 (16px) ───── */
const sm: SVGProps<SVGSVGElement> = { ...base, width: 16, height: 16, strokeWidth: 1.8 };
const Ico = ({ children }: { children: ReactNode }) => <svg {...sm}>{children}</svg>;

export const ALIGN_ICONS = {
  left: (
    <Ico>
      <path d="M4 3v18" />
      <rect x="7" y="6" width="12" height="4" rx="1" />
      <rect x="7" y="14" width="7" height="4" rx="1" />
    </Ico>
  ),
  center: (
    <Ico>
      <path d="M12 3v18" />
      <rect x="5" y="6" width="14" height="4" rx="1" />
      <rect x="8" y="14" width="8" height="4" rx="1" />
    </Ico>
  ),
  right: (
    <Ico>
      <path d="M20 3v18" />
      <rect x="5" y="6" width="12" height="4" rx="1" />
      <rect x="10" y="14" width="7" height="4" rx="1" />
    </Ico>
  ),
  top: (
    <Ico>
      <path d="M3 4h18" />
      <rect x="6" y="7" width="4" height="12" rx="1" />
      <rect x="14" y="7" width="4" height="7" rx="1" />
    </Ico>
  ),
  middle: (
    <Ico>
      <path d="M3 12h18" />
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="8" width="4" height="8" rx="1" />
    </Ico>
  ),
  bottom: (
    <Ico>
      <path d="M3 20h18" />
      <rect x="6" y="5" width="4" height="12" rx="1" />
      <rect x="14" y="10" width="4" height="7" rx="1" />
    </Ico>
  ),
  'dist-h': (
    <Ico>
      <path d="M3 4v16M21 4v16" />
      <rect x="9" y="7" width="6" height="10" rx="1" />
    </Ico>
  ),
  'dist-v': (
    <Ico>
      <path d="M4 3h16M4 21h16" />
      <rect x="7" y="9" width="10" height="6" rx="1" />
    </Ico>
  ),
};

export const ORDER_ICONS = {
  front: (
    <Ico>
      <rect x="3" y="3" width="11" height="11" rx="1.5" fill="currentColor" />
      <rect x="10" y="10" width="11" height="11" rx="1.5" strokeDasharray="2 2" />
    </Ico>
  ),
  forward: (
    <Ico>
      <rect x="9" y="9" width="12" height="12" rx="1.5" />
      <rect x="3" y="3" width="12" height="12" rx="1.5" fill="currentColor" />
    </Ico>
  ),
  backward: (
    <Ico>
      <rect x="3" y="3" width="12" height="12" rx="1.5" />
      <rect x="9" y="9" width="12" height="12" rx="1.5" fill="currentColor" fillOpacity="0.35" />
    </Ico>
  ),
  back: (
    <Ico>
      <rect x="3" y="3" width="11" height="11" rx="1.5" strokeDasharray="2 2" />
      <rect x="10" y="10" width="11" height="11" rx="1.5" fill="currentColor" fillOpacity="0.35" />
    </Ico>
  ),
};

export const LockIcon = ({ open }: { open?: boolean }) => (
  <svg {...sm} width={14} height={14}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d={open ? 'M8 11V7a4 4 0 0 1 7.5-2' : 'M8 11V7a4 4 0 0 1 8 0v4'} />
  </svg>
);

export const RotateIcon = ({ dir }: { dir: 1 | -1 }) => (
  <svg {...sm} style={dir < 0 ? { scale: '-1 1' } : undefined}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
  </svg>
);

export const UndoIcon = () => (
  <svg {...sm}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

export const RedoIcon = () => (
  <svg {...sm}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </svg>
);

export const TrophyIcon = () => (
  <svg {...base}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3" />
  </svg>
);

export const MonitorIcon = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);
