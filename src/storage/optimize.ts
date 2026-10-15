// 올리는 이미지 자동 최적화 — 너무 크면 줄여서 저장 파일·저장 공간을 아낌
const MAX_SIDE = 2560;
const MAX_BYTES = 1.5 * 1024 * 1024;

const PREF_KEY = 'timer-game:optimize-images';

export function optimizeEnabled() {
  try {
    return localStorage.getItem(PREF_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setOptimizeEnabled(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

/** 큰 사진은 긴 변 2560px · WebP 로. 움짤(GIF)·SVG·동영상·작은 파일은 그대로 */
export async function optimizeImage(file: Blob): Promise<Blob> {
  if (!optimizeEnabled() || !file.type.startsWith('image/') || /gif|svg/.test(file.type)) return file;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size <= MAX_BYTES) {
    bmp.close();
    return file;
  }
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const out = await canvas.convertToBlob({ type: 'image/webp', quality: 0.9 }).catch(() => null);
  // 줄였는데 오히려 커지면 원본
  return out && out.size < file.size ? out : file;
}

/** 그림 크기 (삽입할 때 비율 계산용) */
export async function imageSize(file: Blob): Promise<{ w: number; h: number }> {
  try {
    const bmp = await createImageBitmap(file);
    const size = { w: bmp.width, h: bmp.height };
    bmp.close();
    return size;
  } catch {
    return { w: 1, h: 1 };
  }
}
