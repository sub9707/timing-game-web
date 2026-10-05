import type { CSSProperties } from 'react';
import type { BackgroundSetting, GradientSetting } from '../types';

export function gradientCss(g: GradientSetting) {
  const stops = g.stops.join(', ');
  return g.type === 'radial'
    ? `radial-gradient(circle at 50% 42%, ${stops})`
    : `linear-gradient(${g.angle}deg, ${stops})`;
}

export function backgroundCss(bg: BackgroundSetting) {
  return bg.mode === 'solid' ? bg.solid : gradientCss(bg.gradient);
}

interface Props {
  bg: BackgroundSetting;
  imageUrl: string | null;
}

export function Background({ bg, imageUrl }: Props) {
  const showImage = bg.mode === 'image' && imageUrl;
  const base: CSSProperties = {
    background: showImage ? '#000' : backgroundCss(bg.mode === 'image' ? { ...bg, mode: 'gradient' } : bg),
  };

  return (
    <div className={`bg bg-${showImage ? "image" : bg.mode === "image" ? "gradient" : bg.mode}`} style={base} aria-hidden>
      {showImage && (
        <>
          <div
            className="bg-image"
            style={{
              backgroundImage: `url(${imageUrl})`,
              filter: bg.imageBlur ? `blur(${bg.imageBlur}px)` : undefined,
              inset: bg.imageBlur ? -bg.imageBlur * 2 : 0,
            }}
          />
          <div className="bg-dim" style={{ opacity: bg.imageDim / 100 }} />
        </>
      )}
      <div className="bg-fx" />
    </div>
  );
}
