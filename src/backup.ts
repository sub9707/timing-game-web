// 설정 내보내기/가져오기 (다른 PC 로 옮기기용). 배경 이미지는 파일로 따로 주고받음
import { loadImage, type ImageKey } from './imageStore';
import { normalizeSettings } from './settings';
import type { Settings } from './types';

const FORMAT = 'timer-game-settings';
const VERSION = 1;

interface BackupFile {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  settings: Settings;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

export function exportSettings(settings: Settings) {
  const file: BackupFile = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), settings };
  downloadBlob(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }), `timer-game-settings-${stamp()}.json`);
}

/** 잘못된 파일이면 throw */
export async function importSettings(file: File): Promise<Settings> {
  const data = JSON.parse(await file.text()) as Partial<BackupFile>;
  if (data?.format !== FORMAT || typeof data.settings !== 'object' || data.settings === null) {
    throw new Error('not a timer-game settings file');
  }
  return normalizeSettings(data.settings);
}

export async function downloadImage(key: ImageKey) {
  const blob = await loadImage(key);
  if (!blob) return;
  const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') || 'png';
  downloadBlob(blob, `timer-game-${key === 'background' ? 'background' : 'blind'}.${ext}`);
}
