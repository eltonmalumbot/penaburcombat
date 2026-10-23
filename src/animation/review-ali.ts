import { loadAtlas, parseAtlas, validateAtlasImage } from './atlas.ts';
import type { SpriteAtlas, AtlasMetadata } from './atlas.ts';

/**
 * Browser-local, review-only Ali V3 candidate. NEVER persists bytes or changes
 * public/assets/fighters/ali.png. The SHA pin is for the existing imperfect V3.
 */
export const ALI_V3_SHA256 = '6b73f725013558b0b08f7cd1c91efdbd7bb1d8df2c3ddf588251ac9bf37f878a';
export const ALI_V4_SHA256 = 'b998f44db137f601617852e9fb7083a17c507839e60d562015fce8df4e660325';
export const ALI_V5_SHA256 = '43b0140642cf023be71f3d8d1bd69ca391d43f39abad35cf287cf8d21b06b521';
export type AliCandidateEdition = 'V3' | 'V4' | 'V5';
const frameDurations = {
  light1: [.04, .04, .035, .055, .09, .09],
  light2: [.04, .04, .035, .055, .09, .09],
  light3: [.05, .04, .03, .045, .045, .18],
} as const;
const sizes = { width: 4320, height: 1620 } as const;

const sha256 = async (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte =>
    byte.toString(16).padStart(2, '0')).join('');

async function decodeFile(file: File): Promise<HTMLImageElement> {
  // Reuse the checked File blob directly; avoid duplicating its PNG bytes.
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    return image;
  } finally { URL.revokeObjectURL(url); }
}

/** Strict checks happen before any selected candidate reaches the drawing loop. */
export async function loadAliForReview(file: File): Promise<{ atlas: SpriteAtlas; edition: AliCandidateEdition }> {
  if (file.size > 20 * 1024 * 1024 || file.size < 100)
    throw new Error('Ukuran PNG kandidat tidak sesuai (maksimal 20 MB).');
  const checksum = await sha256(await file.arrayBuffer());
  const edition: AliCandidateEdition | null = checksum === ALI_V3_SHA256 ? 'V3' :
    checksum === ALI_V4_SHA256 ? 'V4' : checksum === ALI_V5_SHA256 ? 'V5' : null;
  if (!edition) throw new Error('Checksum salah. Pilih ali-combat-frames.png dari ZIP V3, Repair V4, atau FX Polish V5 asli.');
  const image = await decodeFile(file);
  validateCandidateImage(image);
  const original = await loadAtlas('/assets/fighters/ali.json');
  return { atlas: await assembleAliReviewAtlas(original, image), edition };
}

function validateCandidateImage(image: HTMLImageElement): void {
  if (image.naturalWidth !== sizes.width || image.naturalHeight !== sizes.height)
    throw new Error('Kandidat harus berukuran 4320×1620 piksel.');
}

/**
 * No giant 4320x2700 Canvas copy or PNG re-encoding. A drawing-time virtual
 * atlas maps y>=1080 to a separate candidate bitmap; original idle/walk stays
 * in its existing decoded image. External files MUST pass SHA verification.
 */
export function assembleAliReviewAtlas(original: SpriteAtlas, candidate: HTMLImageElement): SpriteAtlas {
  validateCandidateImage(candidate);
  if (original.image.naturalWidth !== 1600 || original.image.naturalHeight !== 1080
      || original.metadata.image !== 'ali.png' || original.metadata.facing !== 'right')
    throw new Error('Atlas Ali asli tidak sesuai kontrak yang sudah disetujui.');

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
  // Validate all frame rectangles against the VIRTUAL 4320x2700 layout.
  // Two existing images are drawn separately by GameRenderer.drawFighter.
  validateAtlasImage(metadata, 4320, 2700);
  return { metadata, image: original.image, idleBounds: original.idleBounds,
    combatPreview: { image: candidate, startY: 1080 } };
}
