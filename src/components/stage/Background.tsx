import { memo, type CSSProperties } from 'react';
import { gradientCss } from '../../design/gradient';
import type { BackgroundSetting } from '../../types';

export function backgroundCss(bg: BackgroundSetting) {
  if (bg.mode === 'chroma') return bg.chroma;
  if (bg.mode === 'transparent') return 'transparent';
  return bg.mode === 'solid' ? bg.solid : gradientCss(bg.gradient);
}

interface Props {
  bg: BackgroundSetting;
  imageUrl: string | null;
  /** 동영상이면 video 로 */
  imageType?: string;
}

/** 배경은 배경 설정·이미지가 바뀔 때만 다시 그림 */
export const Background = memo(function Background({ bg, imageUrl, imageType = '' }: Props) {
  // 투명: 송출(OBS 브라우저 소스)에서 뒤 화면이 보이도록 아무것도 그리지 않음
  if (bg.mode === 'transparent') return null;
  // 크로마키: 장식 없이 단색
  if (bg.mode === 'chroma') return <div className="bg bg-chroma" style={{ background: bg.chroma }} aria-hidden />;

  const showImage = bg.mode === 'image' && imageUrl;
  const isVideo = imageType.startsWith('video/');
  const base: CSSProperties = {
    background: showImage ? '#000' : backgroundCss(bg.mode === 'image' ? { ...bg, mode: 'gradient' } : bg),
  };
  const media: CSSProperties = {
    filter: bg.imageBlur ? `blur(${bg.imageBlur}px)` : undefined,
    inset: bg.imageBlur ? -bg.imageBlur * 2 : 0,
  };

  return (
    <div className={`bg bg-${showImage ? 'image' : bg.mode === 'image' ? 'gradient' : bg.mode}`} style={base} aria-hidden>
      {showImage && (
        <>
          {isVideo ? (
            <video className="bg-image bg-video" src={imageUrl} autoPlay muted loop playsInline style={media} />
          ) : (
            <div className="bg-image" style={{ ...media, backgroundImage: `url(${imageUrl})` }} />
          )}
          <div className="bg-dim" style={{ opacity: bg.imageDim / 100 }} />
        </>
      )}
      <div className="bg-fx" />
    </div>
  );
});
