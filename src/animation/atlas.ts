import type { Pose } from '../game/types.ts';

/** Single source of truth for atlas clip IDs supported by the fighting engine. */
export const ATLAS_POSES: readonly Pose[] = [
  'idle', 'walk', 'jump', 'fall', 'guard', 'light1', 'light2', 'light3',
  'heavy', 'skill', 'ultimate', 'hurt', 'ko', 'victory',
];
const validClips = new Set<string>(ATLAS_POSES);
const oneShotClips = new Set<string>([
  'light1', 'light2', 'light3', 'heavy', 'skill', 'ultimate', 'hurt', 'ko',
]);

export interface AtlasFrame { x: number; y: number; w: number; h: number; pivotX: number; pivotY: number }
export interface Clip { frames: { frame: string; duration: number }[]; loop: boolean }
export interface AtlasMetadata {
  version: 1; image: string; scale: number; frames: Record<string, AtlasFrame>; clips: Record<string, Clip>;
  sampling: 'smooth' | 'pixelated'; facing: 'right' | 'left';
}
/** Optional browser-only candidate layer; never serialized or used by approved production assets. */
export interface CombatPreviewLayer { image: HTMLImageElement; startY: number }
export interface SpriteAtlas {
  metadata: AtlasMetadata; image: HTMLImageElement;
  idleBounds?: { left: number; right: number };
  combatPreview?: CombatPreviewLayer;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Validate untrusted JSON once at load time, never in the drawing loop. Durations are seconds. */
export function parseAtlas(value: unknown): AtlasMetadata {
  if (!record(value) || value.version !== 1 || typeof value.image !== 'string' || !value.image.trim()
    || !record(value.frames) || !record(value.clips)) throw new Error('Invalid atlas header');
  const frames: Record<string, AtlasFrame> = Object.create(null);
  for (const [id, frame] of Object.entries(value.frames)) {
    if (!record(frame) || !['x', 'y', 'w', 'h'].every(key => Number.isSafeInteger(frame[key]))
      || (frame.x as number) < 0 || (frame.y as number) < 0 || (frame.w as number) <= 0 || (frame.h as number) <= 0) throw new Error(`Invalid frame: ${id}`);
    const { x, y, w, h } = frame as unknown as AtlasFrame;
    const pivotX = frame.pivotX ?? w / 2, pivotY = frame.pivotY ?? h;
    if (!finite(pivotX) || !finite(pivotY) || pivotX < 0 || pivotX > w || pivotY < 0 || pivotY > h) throw new Error(`Invalid pivot: ${id}`);
    frames[id] = { x, y, w, h, pivotX, pivotY };
  }
  const clips: Record<string, Clip> = Object.create(null);
  for (const [id, clip] of Object.entries(value.clips)) {
    if (!validClips.has(id)) throw new Error(`Unknown atlas pose: ${id}`);
    if (!record(clip) || !Array.isArray(clip.frames) || clip.frames.length === 0 || typeof clip.loop !== 'boolean') throw new Error(`Invalid clip: ${id}`);
    if (oneShotClips.has(id) && clip.loop) throw new Error(`Non-looping combat clip required: ${id}`);
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
  const sampling = value.sampling ?? 'smooth', facing = value.facing ?? 'right';
  if (sampling !== 'smooth' && sampling !== 'pixelated') throw new Error('Invalid sprite sampling');
  if (facing !== 'right' && facing !== 'left') throw new Error('Invalid sprite facing');
  return { version: 1, image: value.image, scale, sampling, facing, frames, clips };
}

/** Sample authored clips only. The presentation layer explicitly handles missing poses. */
export function sampleFrame(metadata: AtlasMetadata, pose: Pose, elapsed: number): AtlasFrame | null {
  const clip = metadata.clips[pose];
  if (!clip) return null;
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
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) throw new Error('Atlas image is empty or has invalid dimensions');
  for (const [id, frame] of Object.entries(metadata.frames)) {
    if (frame.x + frame.w > width || frame.y + frame.h > height) throw new Error(`Frame exceeds atlas image: ${id}`);
  }
}

/** Measure once at load, never read pixels in the rendering loop. */
function measureIdleBounds(metadata: AtlasMetadata, image: HTMLImageElement) {
  const idle = sampleFrame(metadata, 'idle', 0)!;
  const canvas = document.createElement('canvas'); canvas.width = idle.w; canvas.height = idle.h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, idle.x, idle.y, idle.w, idle.h, 0, 0, idle.w, idle.h);
  const pixels = ctx.getImageData(0, 0, idle.w, idle.h).data;
  let left = idle.w, right = 0;
  for (let y = 0; y < idle.h; y++) for (let x = 0; x < idle.w; x++) {
    if (pixels[(y * idle.w + x) * 4 + 3] >= 128) { left = Math.min(left, x); right = Math.max(right, x + 1); }
  }
  return right > left ? { left, right } : undefined;
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
      // Revalidate bytes on a failed-atlas retry instead of reusing the document's
      // previously decoded Image (which may still have invalid dimensions).
      const imageResponse = await fetch(imageUrl, { cache: 'no-cache' });
      if (!imageResponse.ok) throw new Error(`Atlas image request failed: ${imageResponse.status}`);
      const image = new Image();
      const objectUrl = URL.createObjectURL(await imageResponse.blob());
      try { image.src = objectUrl; await image.decode(); }
      finally { URL.revokeObjectURL(objectUrl); }
      validateAtlasImage(metadata, image.naturalWidth, image.naturalHeight);
      return { metadata, image, idleBounds: measureIdleBounds(metadata, image) };
    })();
    cache.set(absolute.href, pending);
    // Allow an explicit retry after an asset is corrected during development.
    pending.catch(() => cache.delete(absolute.href));
  }
  return cache.get(absolute.href)!;
}
