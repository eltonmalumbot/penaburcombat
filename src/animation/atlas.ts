import type { Pose } from '../game/types.ts';

export interface AtlasFrame { x: number; y: number; w: number; h: number; pivotX: number; pivotY: number }
export interface Clip { frames: { frame: string; duration: number }[]; loop: boolean }
export interface AtlasMetadata { version: 1; image: string; scale: number; frames: Record<string, AtlasFrame>; clips: Record<string, Clip> }
export interface SpriteAtlas { metadata: AtlasMetadata; image: HTMLImageElement }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Validate untrusted JSON once at load time, never in the drawing loop. Durations are seconds. */
export function parseAtlas(value: unknown): AtlasMetadata {
  if (!record(value) || value.version !== 1 || typeof value.image !== 'string' || !value.image.trim()
    || !record(value.frames) || !record(value.clips)) throw new Error('Invalid atlas header');
  const frames: Record<string, AtlasFrame> = Object.create(null);
  for (const [id, frame] of Object.entries(value.frames)) {
    if (!record(frame) || !['x', 'y', 'w', 'h'].every(key => finite(frame[key]))
      || (frame.x as number) < 0 || (frame.y as number) < 0 || (frame.w as number) <= 0 || (frame.h as number) <= 0) throw new Error(`Invalid frame: ${id}`);
    const { x, y, w, h } = frame as unknown as AtlasFrame;
    const pivotX = frame.pivotX ?? w / 2, pivotY = frame.pivotY ?? h;
    if (!finite(pivotX) || !finite(pivotY)) throw new Error(`Invalid pivot: ${id}`);
    frames[id] = { x, y, w, h, pivotX, pivotY };
  }
  const clips: Record<string, Clip> = Object.create(null);
  for (const [id, clip] of Object.entries(value.clips)) {
    if (!record(clip) || !Array.isArray(clip.frames) || clip.frames.length === 0 || typeof clip.loop !== 'boolean') throw new Error(`Invalid clip: ${id}`);
    const entries = clip.frames.map(entry => {
      if (!record(entry) || typeof entry.frame !== 'string' || !Object.hasOwn(frames, entry.frame)
        || !finite(entry.duration) || entry.duration <= 0 || entry.duration > 60) throw new Error(`Invalid clip frame: ${id}`);
      return { frame: entry.frame, duration: entry.duration };
    });
    clips[id] = { frames: entries, loop: clip.loop };
  }
  if (!Object.hasOwn(clips, 'idle')) throw new Error('An idle clip is required');
  const scale = value.scale ?? 1;
  if (!finite(scale) || scale <= 0 || scale > 10) throw new Error('Invalid sprite scale');
  return { version: 1, image: value.image, scale, frames, clips };
}

export function sampleFrame(metadata: AtlasMetadata, pose: Pose, elapsed: number): AtlasFrame {
  const clip = metadata.clips[pose] ?? metadata.clips.idle;
  const total = clip.frames.reduce((sum, frame) => sum + frame.duration, 0);
  let time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  time = clip.loop ? time % total : Math.min(time, total);
  for (const entry of clip.frames) {
    if (time < entry.duration) return metadata.frames[entry.frame];
    time -= entry.duration;
  }
  return metadata.frames[clip.frames.at(-1)!.frame];
}

export function validateAtlasImage(metadata: AtlasMetadata, width: number, height: number): void {
  if (!(width > 0 && height > 0)) throw new Error('Atlas image is empty');
  for (const [id, frame] of Object.entries(metadata.frames)) {
    if (frame.x + frame.w > width || frame.y + frame.h > height) throw new Error(`Frame exceeds atlas image: ${id}`);
  }
}

const cache = new Map<string, Promise<SpriteAtlas>>();
export function loadAtlas(url: string): Promise<SpriteAtlas> {
  const absolute = new URL(url, window.location.href);
  // Character art is an explicit, locally reviewed asset, not an arbitrary remote image.
  if (absolute.origin !== window.location.origin) return Promise.reject(new Error('Use same-origin character assets'));
  if (!cache.has(absolute.href)) {
    const pending = (async () => {
      const response = await fetch(absolute);
      if (!response.ok) throw new Error(`Atlas request failed: ${response.status}`);
      const metadata = parseAtlas(await response.json());
      const imageUrl = new URL(metadata.image, absolute);
      if (imageUrl.origin !== window.location.origin) throw new Error('Use same-origin atlas images');
      const image = new Image();
      image.src = imageUrl.href;
      await image.decode();
      validateAtlasImage(metadata, image.naturalWidth, image.naturalHeight);
      return { metadata, image };
    })();
    cache.set(absolute.href, pending);
    // Allow an explicit retry after an asset is corrected during development.
    pending.catch(() => cache.delete(absolute.href));
  }
  return cache.get(absolute.href)!;
}
