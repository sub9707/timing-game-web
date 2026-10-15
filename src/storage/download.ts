// 파일 내려받기 (저장 위치를 고를 수 없는 브라우저의 저장 · 개별 이미지 내려받기)
import { loadImage, type ImageKey } from './assets';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function downloadImage(key: ImageKey) {
  const blob = await loadImage(key);
  if (!blob) return;
  const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') || 'png';
  downloadBlob(blob, `timer-game-${key === 'background' ? 'background' : 'blind'}.${ext}`);
}
