import { loadAtlas, parseAtlas, validateAtlasImage } from './atlas.ts';
import type { SpriteAtlas, AtlasMetadata } from './atlas.ts';

/**
 * Browser-local, review-only Ali V3 candidate. NEVER persists bytes or changes
 * public/assets/fighters/ali.png. The SHA pin is for the existing imperfect V3.
 */
export const ALI_V3_SHA256 = '6b73f725013558b0b08f7cd1c91efdbd7bb1d8df2c3ddf588251ac9bf37f878a';
const frameDurations = {
  light1: [.04, .04, .035, .055, .09, .09],
  light2: [.04, .04, .035, .055, .09, .09],
  light3: [.05, .04, .03, .045, .045, .18],
} as const;
const sizes = { width: 4320, height: 1620 } as const;

const sha256 = async (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte =>
    byte.toString(16).padStart(2, '0')).join('');

async function decodeFile(bytes: ArrayBuffer): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    return image;
  } finally { URL.revokeObjectURL(url); }
}

/** Strict checks happen before any selected candidate reaches the drawing loop. */
export async function loadAliV3ForReview(file: File): Promise<SpriteAtlas> {
  if (file.size > 20 * 1024 * 1024 || file.size < 100)
    throw new Error('Ukuran PNG kandidat tidak sesuai (maksimal 20 MB).');
  const bytes = await file.arrayBuffer();
  const checksum = await sha256(bytes);
  if (checksum !== ALI_V3_SHA256)
    throw new Error('Checksum salah. Pilih ali-combat-frames.png dari ZIP Cleanup V3 asli.');
  const image = await decodeFile(bytes);
  validateCandidateImage(image);
  const original = await loadAtlas('/assets/fighters/ali.json');
  return assembleAliReviewAtlas(original, image);
}

function validateCandidateImage(image: HTMLImageElement): void {
  if (image.naturalWidth !== sizes.width || image.naturalHeight !== sizes.height)
    throw new Error('Kandidat harus berukuran 4320×1620 piksel.');
}

/**
 * Pure assembly helper for synthetic browser tests. Not an art approval or
 * external-file loader: callers MUST verify the candidate hash before use.
 */
export async function assembleAliReviewAtlas(original: SpriteAtlas, candidate: HTMLImageElement): Promise<SpriteAtlas> {
  validateCandidateImage(candidate);
  if (original.image.naturalWidth !== 1600 || original.image.naturalHeight !== 1080
      || original.metadata.image !== 'ali.png' || original.metadata.facing !== 'right')
    throw new Error('Atlas Ali asli tidak sesuai kontrak yang sudah disetujui.');

  const width = 4320, height = 2700;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia.');
  ctx.drawImage(original.image, 0, 0);
  ctx.drawImage(candidate, 0, 1080);
  const frames: AtlasMetadata['frames'] = { ...original.metadata.frames };
  const clips: AtlasMetadata['clips'] = { ...original.metadata.clips };
  for (const [row, [name, durations]] of Object.entries(frameDurations).entries()) {
    clips[name] = {
      loop: false,
      frames: durations.map((duration, col) => {
        const id = name + '-' + col;
        frames[id] = { x: col * 720, y: 1080 + row * 540,
          w: 720, h: 540, pivotX: 320, pivotY: 525 };
        return { frame: id, duration };
      }),
    };
  }
  const metadata = parseAtlas({ version: 1, image: 'ali-v3-review-only-in-memory.png',
    scale: original.metadata.scale, facing: original.metadata.facing,
    sampling: original.metadata.sampling, frames, clips });
  validateAtlasImage(metadata, width, height);
  const art = await new Promise<HTMLImageElement>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('Tidak bisa membuat atlas lokal.')); return; }
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal mendekode atlas lokal.')); };
      image.src = url;
    }, 'image/png');
  });
  return { metadata, image: art, idleBounds: original.idleBounds };
}
