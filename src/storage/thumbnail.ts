// 저장 파일 미리보기 썸네일 — 배경·타이틀·타이머를 단순하게 그린 작은 그림
import { gradientCss } from '../design/gradient';
import { formatTime } from '../game/time';
import { fontDef } from '../settings/fonts';
import type { Settings } from '../types';
import { loadAsset } from './assets';

const W = 320;
const H = 180;

function paintBackground(ctx: OffscreenCanvasRenderingContext2D, s: Settings) {
  const bg = s.bg;
  if (bg.mode === 'solid' || bg.mode === 'chroma') {
    ctx.fillStyle = bg.mode === 'solid' ? bg.solid : bg.chroma;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (bg.mode === 'transparent') {
    // 체크무늬로 투명 표시
    for (let y = 0; y < H; y += 10) for (let x = 0; x < W; x += 10) {
      ctx.fillStyle = (x + y) % 20 ? '#2a2a30' : '#3a3a42';
      ctx.fillRect(x, y, 10, 10);
    }
    return;
  }
  const g = bg.gradient;
  const stops = [...g.stops].sort((a, b) => a.pos - b.pos);
  let grad: CanvasGradient;
  if (g.type === 'radial') grad = ctx.createRadialGradient((g.cx / 100) * W, (g.cy / 100) * H, 0, (g.cx / 100) * W, (g.cy / 100) * H, Math.hypot(W, H) / 2);
  else if (g.type === 'conic') grad = ctx.createConicGradient(((g.angle - 90) * Math.PI) / 180, (g.cx / 100) * W, (g.cy / 100) * H);
  else {
    const a = ((g.angle - 90) * Math.PI) / 180;
    const dx = (Math.cos(a) * W) / 2;
    const dy = (Math.sin(a) * H) / 2;
    grad = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
  }
  stops.forEach((st) => grad.addColorStop(Math.min(1, Math.max(0, st.pos / 100)), st.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

/** PNG 썸네일 (실패하면 null) */
export async function makeThumbnail(s: Settings): Promise<Blob | null> {
  try {
    const canvas = new OffscreenCanvas(W, H);
    const ctx = canvas.getContext('2d')!;
    paintBackground(ctx, s);
    if (s.bg.mode === 'image') {
      const blob = await loadAsset('background');
      // 그림을 못 읽어도 (깨진 파일 등) 썸네일은 배경색으로 계속 그림
      const bmp = blob && blob.type.startsWith('image/') ? await createImageBitmap(blob).catch(() => null) : null;
      if (bmp) {
        const k = Math.max(W / bmp.width, H / bmp.height);
        ctx.drawImage(bmp, (W - bmp.width * k) / 2, (H - bmp.height * k) / 2, bmp.width * k, bmp.height * k);
        bmp.close();
        ctx.fillStyle = `rgba(0,0,0,${s.bg.imageDim / 100})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const d = s.design;
    if (s.mainTitle) {
      ctx.font = `${d.titleWeight} 20px ${fontDef(d.titleFont).family}`;
      ctx.fillStyle = d.titleFill.mode === 'solid' ? d.titleFill.color : d.titleFill.stops[0]?.color ?? '#fff';
      ctx.fillText(s.mainTitle, W / 2, H * 0.28, W * 0.9);
    }
    // 타이머 판
    const bw = W * 0.72;
    const bh = H * 0.32;
    ctx.strokeStyle = d.borderFill.mode === 'solid' ? d.borderFill.color : d.borderFill.stops[0]?.color ?? s.accent;
    ctx.lineWidth = Math.max(1, d.borderWidth / 2);
    if (d.borderLines > 0) {
      ctx.beginPath();
      ctx.roundRect((W - bw) / 2, H * 0.58 - bh / 2, bw, bh, Math.min(16, d.borderRadius / 3));
      ctx.stroke();
    }
    ctx.font = `${d.digitWeight} 30px ${fontDef(d.digitFont).family}`;
    ctx.fillStyle = d.digitFill.mode === 'solid' ? d.digitFill.color : d.digitFill.stops[0]?.color ?? '#fff';
    ctx.fillText(formatTime(0, s.timeFormat), W / 2, H * 0.58, bw * 0.9);
    return await canvas.convertToBlob({ type: 'image/png' });
  } catch {
    return null;
  }
}

/** 썸네일을 화면에 쓸 data URL 로 (최근 파일·백업 목록용, 작아서 그대로 보관) */
export async function thumbnailDataUrl(s: Settings): Promise<string | null> {
  const blob = await makeThumbnail(s);
  if (!blob) return null;
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => resolve(null);
    r.readAsDataURL(blob);
  });
}

/** 배경 CSS (썸네일이 없을 때 대체 표시) */
export const fallbackThumb = (s: Settings) => (s.bg.mode === 'gradient' ? gradientCss(s.bg.gradient) : s.bg.mode === 'solid' ? s.bg.solid : '#111');
