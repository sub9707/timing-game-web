// 저장 파일 형식 (.stopia) — 표준 ZIP (예전 .tcpack 도 같은 구조)
//   manifest.json   형식·버전·에셋 목록
//   settings.json   전체 설정
//   records.json    기록 (있으면)
//   thumbnail.png   미리보기 (있으면)
//   assets/<키>.<확장자>   이미지·글꼴·효과음 원본 (재압축 없이 그대로)
// 확장자를 .zip 으로 바꾸면 일반 압축 프로그램으로도 열림
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { getRecords } from '../game/records';
import { normalizeSettings } from '../settings/settings';
import type { RoundRecord, Settings } from '../types';
import { BUILTIN_ASSETS, listAssetKeys, loadAsset, putAsset, type AssetKey } from './assets';
import { makeThumbnail } from './thumbnail';

export const PACK_EXT = '.stopia';
/** 이름 바꾸기 전 확장자 — 계속 열 수 있음 */
export const OLD_PACK_EXT = '.tcpack';
export const PACK_MIME = 'application/x-stopia';
const FORMAT = 'stopia-pack';
const OLD_FORMATS = ['time-challenge-pack'];
const VERSION = 2;
/** 예전 설정 백업(JSON) */
const LEGACY_FORMAT = 'timer-game-settings';

interface AssetEntry {
  key: AssetKey;
  path: string;
  type: string;
  size: number;
}

interface Manifest {
  format: string;
  version: number;
  app: string;
  exportedAt: string;
  settings: string;
  records?: string;
  thumbnail?: string;
  assets: AssetEntry[];
}

export interface Pack {
  settings: Settings;
  assets: Record<AssetKey, Blob>;
  records: RoundRecord[] | null;
  /** 예전 JSON 백업 — 에셋 없음 (기존 에셋은 그대로 둠) */
  legacy: boolean;
}

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'font/ttf': 'ttf',
  'font/otf': 'otf',
  'font/woff': 'woff',
  'font/woff2': 'woff2',
};

/** 설정이 쓰는 에셋 (기본 + 삽입 그림 + 올린 글꼴) */
export const referencedAssets = (s: Settings): AssetKey[] => [
  ...BUILTIN_ASSETS,
  ...s.items.flatMap((i) => (i.type === 'image' ? [i.asset] : [])),
  ...s.customFonts.map((f) => `font:${f.id}`),
];

const safeName = (key: string) => key.replace(/[^a-z0-9_-]/gi, '_');

/** 지금 상태(설정 + 임시 저장된 에셋 + 기록)를 하나의 파일로 */
export async function buildPack(settings: Settings): Promise<Blob> {
  const files: Zippable = {};
  const assets: AssetEntry[] = [];
  for (const key of referencedAssets(settings)) {
    const blob = await loadAsset(key);
    if (!blob) continue;
    const type = blob.type || 'application/octet-stream';
    const path = `assets/${safeName(key)}.${EXT[type] ?? 'bin'}`;
    // 이미지·소리는 이미 압축돼 있어 그대로 담음 (level 0)
    files[path] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
    assets.push({ key, path, type, size: blob.size });
  }
  const records = getRecords();
  const thumb = await makeThumbnail(settings);
  const manifest: Manifest = {
    format: FORMAT,
    version: VERSION,
    app: 'Stopia',
    exportedAt: new Date().toISOString(),
    settings: 'settings.json',
    ...(records.length && { records: 'records.json' }),
    ...(thumb && { thumbnail: 'thumbnail.png' }),
    assets,
  };
  files['manifest.json'] = [strToU8(JSON.stringify(manifest, null, 2)), { level: 6 }];
  files['settings.json'] = [strToU8(JSON.stringify(settings, null, 2)), { level: 6 }];
  if (records.length) files['records.json'] = [strToU8(JSON.stringify(records)), { level: 6 }];
  if (thumb) files['thumbnail.png'] = [new Uint8Array(await thumb.arrayBuffer()), { level: 0 }];
  return new Blob([zipSync(files) as Uint8Array<ArrayBuffer>], { type: PACK_MIME });
}

/** .stopia(·.tcpack·.zip) 또는 예전 .json 백업 읽기. 잘못된 파일이면 throw */
export async function readPack(file: Blob): Promise<Pack> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // "PK"

  if (!isZip) {
    const data = JSON.parse(new TextDecoder().decode(buf)) as { format?: string; settings?: unknown };
    if (data?.format !== LEGACY_FORMAT || typeof data.settings !== 'object' || data.settings === null) throw new Error('not a stopia file');
    return { settings: normalizeSettings(data.settings), assets: {}, records: null, legacy: true };
  }

  const files = unzipSync(buf);
  const raw = files['manifest.json'];
  if (!raw) throw new Error('manifest missing');
  const manifest = JSON.parse(strFromU8(raw)) as Partial<Manifest>;
  if (manifest.format !== FORMAT && !OLD_FORMATS.includes(manifest.format ?? '')) throw new Error('unknown format');
  if ((manifest.version ?? 0) > VERSION) throw new Error('newer version');
  const settingsRaw = files[manifest.settings ?? 'settings.json'];
  if (!settingsRaw) throw new Error('settings missing');

  const assets: Pack['assets'] = {};
  for (const a of manifest.assets ?? []) {
    // 목록의 경로에서만 꺼냄
    if (typeof a.key !== 'string' || !files[a.path]) continue;
    assets[a.key] = new Blob([files[a.path] as Uint8Array<ArrayBuffer>], { type: a.type });
  }
  let records: RoundRecord[] | null = null;
  const rec = manifest.records && files[manifest.records];
  if (rec) {
    try {
      records = JSON.parse(strFromU8(rec));
    } catch {
      records = null;
    }
  }
  return { settings: normalizeSettings(JSON.parse(strFromU8(settingsRaw))), assets, records, legacy: false };
}

/** 불러온 에셋을 임시 저장소에 반영. 새 형식이면 파일에 없는 에셋은 지움 (파일 내용 그대로 복원) */
export async function applyAssets(pack: Pack) {
  const keep = new Set(Object.keys(pack.assets));
  if (!pack.legacy) {
    for (const key of await listAssetKeys()) if (!keep.has(key)) await putAsset(key, null, 'load');
  }
  for (const [key, blob] of Object.entries(pack.assets)) await putAsset(key, blob, 'load');
}

/** 새 문서: 에셋 모두 지움 */
export async function clearAllAssets() {
  for (const key of await listAssetKeys()) await putAsset(key, null, 'load');
}

/** 파일 안 썸네일 (최근 파일·불러오기 미리보기) */
export async function readThumbnail(file: Blob): Promise<string | null> {
  try {
    const files = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (f) => f.name === 'thumbnail.png' });
    const png = files['thumbnail.png'];
    if (!png) return null;
    const blob = new Blob([png as Uint8Array<ArrayBuffer>], { type: 'image/png' });
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
