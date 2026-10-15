// 효과음 — 기본 소리는 Web Audio 로 합성(파일 없음), 직접 올린 소리는 에셋 sfx:<이벤트>
import { loadAsset, onAssetChange } from '../storage/assets';
import type { SoundEvent, SoundSetting } from '../types';
import { tr } from '../i18n';

let ctx: AudioContext | null = null;
const audio = () => {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

/* ───── 올린 소리 (해독해서 보관) ───── */
const buffers = new Map<string, Promise<AudioBuffer | null>>();
onAssetChange((c) => c.key.startsWith('sfx:') && buffers.delete(c.key));

function customBuffer(event: SoundEvent) {
  const key = `sfx:${event}`;
  if (!buffers.has(key)) {
    buffers.set(
      key,
      loadAsset(key).then(async (blob) => (blob ? audio().decodeAudioData(await blob.arrayBuffer()).catch(() => null) : null)),
    );
  }
  return buffers.get(key)!;
}

/* ───── 합성 기본 소리 ───── */
function tone(out: AudioNode, at: number, freq: number, dur: number, type: OscillatorType = 'sine', to?: number, peak = 0.5) {
  const a = audio();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.02);
}

function noiseHit(out: AudioNode, at: number, dur: number, peak: number) {
  const a = audio();
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 900;
  const g = a.createGain();
  g.gain.value = peak;
  src.connect(f).connect(g).connect(out);
  src.start(at);
}

function synth(event: SoundEvent, out: AudioNode, opts: SfxOptions) {
  const t = audio().currentTime + 0.01;
  switch (event) {
    case 'start':
      tone(out, t, 660, 0.12, 'square', 990, 0.25);
      break;
    case 'stop':
      tone(out, t, 520, 0.09, 'triangle', 380, 0.4);
      break;
    case 'success':
      [523, 659, 784, 1047].forEach((f, i) => tone(out, t + i * 0.09, f, 0.35, 'triangle', undefined, 0.35));
      break;
    case 'fail':
      tone(out, t, 320, 0.5, 'sawtooth', 110, 0.22);
      break;
    case 'countdown':
      // n === 0 은 "시작!" — 높고 길게
      if (opts.n === 0) tone(out, t, 1320, 0.35, 'square', undefined, 0.22);
      else tone(out, t, 880, 0.12, 'square', undefined, 0.2);
      break;
    case 'reveal': {
      // 점점 빨라지는 북소리
      const total = (opts.durationMs ?? 3000) / 1000;
      let at = 0;
      let gap = 0.22;
      while (at < total) {
        noiseHit(out, t + at, 0.08, 0.15 + (at / total) * 0.5);
        at += gap;
        gap = Math.max(0.045, gap * 0.92);
      }
      break;
    }
  }
}

export interface SfxOptions {
  /** 긴장 효과음 길이 */
  durationMs?: number;
  /** 카운트다운 숫자 (0 = 시작) */
  n?: number;
}

/** 이벤트 효과음 재생 (설정에서 꺼져 있으면 무시) */
export async function playSfx(event: SoundEvent, sound: SoundSetting, opts: SfxOptions = {}) {
  if (!sound.enabled) return;
  const choice = sound.events[event];
  if (choice === 'off') return;
  try {
    const a = audio();
    const gain = a.createGain();
    gain.gain.value = Math.max(0, Math.min(1, sound.volume / 100));
    gain.connect(a.destination);
    if (choice === 'custom') {
      const buf = await customBuffer(event);
      if (buf) {
        const src = a.createBufferSource();
        src.buffer = buf;
        src.connect(gain);
        src.start();
        return;
      }
    }
    synth(event, gain, opts);
  } catch {
    /* 오디오를 쓸 수 없는 환경 */
  }
}

export const SOUND_EVENTS: [SoundEvent, string][] = [
  ['start', tr('시작')],
  ['stop', tr('정지')],
  ['countdown', tr('카운트다운')],
  ['reveal', tr('긴장 (극적인 공개)')],
  ['success', tr('성공')],
  ['fail', tr('실패')],
];
