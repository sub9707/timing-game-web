// 설정 패널 전용 부품 (템플릿 카드 · 키 목록 · 이미지 칸 · 글꼴 선택 · 크기·위치 입력)
import { memo, useState, type CSSProperties, type ReactNode } from 'react';
import { fillColor } from '../../design/design';
import { gradientCss } from '../../design/gradient';
import { normDeg } from '../../design/layout';
import { keyLabel, RESERVED_KEYS } from '../../game/keys';
import { FONT_IDS, fontDef } from '../../settings/fonts';
import { getTheme } from '../../settings/themes';
import type { ImageKey, useStoredImage } from '../../storage/assets';
import { downloadImage } from '../../storage/download';
import { optimizeImage } from '../../storage/optimize';
import type { BackgroundSetting, Box, DesignSetting, FontId, ThemeId } from '../../types';
import { backgroundCss } from '../stage/Background';
import { ImageIcon, PlusIcon } from '../ui/Icons';
import { Hint, NumberInput, Range, Toggle } from './controls';
import { tr } from '../../i18n';

type StoredImage = ReturnType<typeof useStoredImage>;

/** px 표시용 환산 (기준 해상도 px) */
export interface PxInfo {
  /** 위치 1% 가 몇 px 인지 */
  perX: number;
  perY: number;
  /** 지금 크기 (px) */
  wPx: number;
  hPx: number;
}

/** 크기 및 위치 수치 입력 (파워포인트 서식 창처럼) — px 를 주면 px 단위로 */
export function BoxFields({ box, onChange, px }: { box: Box; onChange: (b: Box) => void; px?: PxInfo | null }) {
  const [lock, setLock] = useState(false);
  const ratio = box.h / (box.w || 1);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const setW = (w: number) => onChange({ ...box, w, h: lock ? r1(w * ratio) : box.h });
  const setH = (h: number) => onChange({ ...box, h, w: lock ? r1(h / ratio) : box.w });
  return (
    <>
      <div className="box-grid">
        <div className="box-field">
          <span>{tr('가로 위치')}</span>
          {px ? (
            <NumberInput value={Math.round(box.x * px.perX)} min={-99999} max={99999} decimals={0} suffix="px" onCommit={(v) => onChange({ ...box, x: r2(v / px.perX) })} />
          ) : (
            <NumberInput value={box.x} min={-100} max={100} decimals={2} suffix="%" onCommit={(x) => onChange({ ...box, x })} />
          )}
        </div>
        <div className="box-field">
          <span>{tr('세로 위치')}</span>
          {px ? (
            <NumberInput value={Math.round(box.y * px.perY)} min={-99999} max={99999} decimals={0} suffix="px" onCommit={(v) => onChange({ ...box, y: r2(v / px.perY) })} />
          ) : (
            <NumberInput value={box.y} min={-100} max={100} decimals={2} suffix="%" onCommit={(y) => onChange({ ...box, y })} />
          )}
        </div>
        <div className="box-field">
          <span>{tr('너비')}</span>
          {px && px.wPx > 0 ? (
            <NumberInput value={Math.round(px.wPx)} min={4} max={99999} decimals={0} suffix="px" onCommit={(v) => setW(r1((box.w * v) / px.wPx))} />
          ) : (
            <NumberInput value={box.w} min={5} max={1000} decimals={1} suffix="%" onCommit={setW} />
          )}
        </div>
        <div className="box-field">
          <span>{tr('높이')}</span>
          {px && px.hPx > 0 ? (
            <NumberInput value={Math.round(px.hPx)} min={4} max={99999} decimals={0} suffix="px" onCommit={(v) => setH(r1((box.h * v) / px.hPx))} />
          ) : (
            <NumberInput value={box.h} min={5} max={1000} decimals={1} suffix="%" onCommit={setH} />
          )}
        </div>
        <div className="box-field">
          <span>{tr('회전')}</span>
          <NumberInput value={box.r} min={-360} max={360} decimals={1} suffix="°" onCommit={(r) => onChange({ ...box, r: normDeg(r) })} />
        </div>
      </div>
      <Toggle label={tr('가로·세로 비율 고정')} checked={lock} onChange={setLock} />
      <Hint>{px ? tr('위치는 기본 자리에서 옮긴 거리, 크기는 화면 기준 해상도 px') : tr('위치는 기본 자리에서 무대 폭·높이 대비 %, 크기는 기본 대비 %')}</Hint>
    </>
  );
}


/** 카드에 그릴 템플릿 내용 (기본 테마 · 내 템플릿 공용) */
export interface CardPreset {
  /** 장식 클래스 (theme-<id>) */
  theme: ThemeId;
  name: string;
  bg: BackgroundSetting;
  design: DesignSetting;
}

/** 템플릿 카드 — 배경·테두리·숫자 채우기로 미리보기 (같은 카드·선택 여부면 다시 안 그림) */
export const TemplateCard = memo(TemplateCardView, (a, b) => a.cardKey === b.cardKey && a.on === b.on);
function TemplateCardView({ t, on, onClick, onRemove }: { cardKey: string; t: CardPreset; on: boolean; onClick: () => void; onRemove?: () => void }) {
  const td = t.design;
  const digitGrad = td.digitFill.mode === 'gradient';
  return (
    <div className="theme-card-wrap">
      <button
        className={`theme-card theme-${t.theme} sides-${td.borderSides} ${on ? 'is-on' : ''}`}
        style={
          {
            background: backgroundCss(t.bg),
            '--accent': td.borderFill.mode === 'solid' ? td.borderFill.color : fillColor(td.borderFill),
            '--tc-border': td.borderLines ? (td.borderFill.mode === 'solid' ? td.borderFill.color : 'transparent') : 'transparent',
            '--tc-border-grad': td.borderFill.mode === 'gradient' && td.borderLines ? gradientCss(td.borderFill) : 'none',
            '--tc-bw': `${Math.min(3, Math.max(1, td.borderWidth * 0.6))}px`,
            '--tc-radius': `${Math.min(99, td.borderRadius / 2.5)}px`,
            '--text': td.digitFill.color,
            '--tc-digit-grad': digitGrad ? gradientCss(td.digitFill) : 'none',
            '--font-digit': fontDef(td.digitFont).family,
            '--digit-weight': td.digitWeight,
            fontStyle: td.digitItalic ? 'italic' : undefined,
          } as CSSProperties
        }
        onClick={onClick}
      >
        <span className="tc-frame">
          <span className={`tc-digits ${digitGrad ? 'is-grad' : ''}`}>00:15</span>
        </span>
        <span className="tc-name">{t.name}</span>
      </button>
      {onRemove && (
        <button className="theme-card-remove" aria-label={tr('템플릿 삭제')} title={tr('이 템플릿 삭제')} onClick={onRemove}>
          ×
        </button>
      )}
    </div>
  );
}

/** 기본 테마 카드 */
export function ThemeCard({ id, on, onClick }: { id: ThemeId; on: boolean; onClick: () => void }) {
  const t = getTheme(id);
  return <TemplateCard cardKey={id} t={{ theme: t.id, name: t.name, bg: t.bg, design: t.design }} on={on} onClick={onClick} />;
}

export function KeyList({ keys, min, onChange }: { keys: string[]; min: number; onChange: (keys: string[]) => void }) {
  const [capturing, setCapturing] = useState(false);

  return (
    <div className="keys">
      {keys.map((k) => (
        <span key={k} className="keycap">
          {keyLabel(k)}
          {keys.length > min && (
            <button className="keycap-remove" aria-label={tr('제거')} onClick={() => onChange(keys.filter((x) => x !== k))}>
              ×
            </button>
          )}
        </span>
      ))}
      {keys.length < 4 && (
        <button
          className={`key-add ${capturing ? 'is-capturing' : ''}`}
          data-key-capture
          aria-label={tr('키 추가')}
          onClick={() => setCapturing(true)}
          onBlur={() => setCapturing(false)}
          onKeyDown={(e) => {
            if (!capturing) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.repeat || RESERVED_KEYS.includes(e.code)) return;
            if (e.key !== 'Escape' && !keys.includes(e.code)) onChange([...keys, e.code]);
            setCapturing(false);
          }}
        >
          {capturing ? tr('키 입력…') : <PlusIcon />}
        </button>
      )}
    </div>
  );
}

/** 이미지 업로드 칸. 이미지가 있으면 children(조절 옵션)과 다운로드·삭제 버튼 표시 */
export function ImageField({
  image,
  imageKey,
  small,
  accept = 'image/*',
  children,
}: {
  image: StoredImage;
  imageKey: ImageKey;
  small?: boolean;
  /** 받을 파일 (배경은 동영상도) */
  accept?: string;
  children?: ReactNode;
}) {
  const isVideo = image.type.startsWith('video/');
  return (
    <>
      <label
        className={`dropzone ${small ? 'is-small' : ''} ${image.url ? 'has-image' : ''}`}
        style={image.url && !isVideo ? { backgroundImage: `url(${image.url})` } : undefined}
      >
        {image.url && isVideo && <video className="dropzone-video" src={image.url} autoPlay muted loop playsInline />}
        <input
          type="file"
          accept={accept}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            // 큰 사진은 줄여서 저장 (동영상·움짤은 그대로)
            if (f) image.save(await optimizeImage(f));
          }}
        />
        {!image.url && (
          <span className="dropzone-empty">
            <ImageIcon />
            {tr('이미지 선택')}
          </span>
        )}
      </label>
      {image.url && (
        <>
          {children}
          <div className="row-2">
            <button className="ghost-btn" onClick={() => downloadImage(imageKey)}>
              {tr('이미지 다운로드')}
            </button>
            <button className="ghost-btn" onClick={image.clear}>
              {tr('이미지 삭제')}
            </button>
          </div>
        </>
      )}
    </>
  );
}

interface FontPickerProps {
  value: FontId;
  sample: string;
  onChange: (id: FontId) => void;
  /** 고를 수 있는 글꼴 (기본 + 올린 글꼴) */
  fonts?: FontId[];
  /** 글꼴 파일 올리기 (.ttf·.otf·.woff·.woff2) */
  onUpload?: (file: File) => void;
}

/** 글꼴 목록 — 고른 글꼴·목록이 같으면 다시 안 그림 (onChange 는 최신 값을 쓰는 업데이터라 안전) */
export const FontPicker = memo(FontPickerView, (a, b) => a.value === b.value && a.sample === b.sample && (a.fonts ?? []).join() === (b.fonts ?? []).join());
function FontPickerView({ value, sample, onChange, fonts = FONT_IDS, onUpload }: FontPickerProps) {
  return (
    <div className="font-grid">
      {fonts.map((id) => {
        const f = fontDef(id);
        return (
          <button key={id} className={`font-chip ${id === value ? 'is-on' : ''} ${id.startsWith('custom:') ? 'is-custom' : ''}`} onClick={() => onChange(id)}>
            <span className="font-sample" style={{ fontFamily: f.family }}>
              {sample}
            </span>
            <span className="font-name">{f.label}</span>
          </button>
        );
      })}
      {onUpload && (
        <label className="font-chip is-upload" title={tr('글꼴 파일 올리기 (.ttf .otf .woff .woff2)')}>
          <PlusIcon />
          <span className="font-name">{tr('글꼴 올리기')}</span>
          <input
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
}

export function WeightRange({ font, value, onChange }: { font: FontId; value: number; onChange: (v: number) => void }) {
  const [min, max] = fontDef(font).weights;
  if (min === max) return null;
  return <Range label={tr('굵기')} min={min} max={max} step={100} value={value} onChange={onChange} />;
}
