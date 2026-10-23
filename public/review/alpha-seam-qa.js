/**
 * Lightweight, dependency-free alpha truncation scanner for artist review.
 * A hard vertical crop creates an implausible jump in the number of opaque
 * pixels from one column to the next. This is a WARNING, not an art verdict.
 */
export function detectHardCuts(image, options = {}) {
  const threshold = options.alphaThreshold ?? 32;
  const minJump = options.minJump ?? 95;
  const frameWidth = options.frameWidth ?? 720;
  const frameHeight = options.frameHeight ?? 540;
  const cols = options.cols ?? 6;
  const rows = options.rows ?? 3;
  if (!image || image.naturalWidth !== frameWidth * cols || image.naturalHeight !== frameHeight * rows)
    throw new Error('Unexpected combat atlas dimensions for seam inspection');
  const testCanvas = document.createElement('canvas');
  testCanvas.width = frameWidth; testCanvas.height = frameHeight;
  const ctx = testCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D unavailable for seam inspection');
  const results = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    ctx.clearRect(0, 0, frameWidth, frameHeight);
    ctx.drawImage(image, col * frameWidth, row * frameHeight,
      frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    const data = ctx.getImageData(0, 0, frameWidth, frameHeight).data;
    const occupied = new Int32Array(frameWidth);
    for (let y = 0; y < frameHeight; y++)
      for (let x = 0; x < frameWidth; x++)
        if (data[(y * frameWidth + x) * 4 + 3] > threshold) occupied[x]++;
    const seams = [];
    for (let x = 1; x < frameWidth; x++) {
      const jump = occupied[x] - occupied[x - 1];
      if (Math.abs(jump) < minJump) continue;
      // Record strong transitions even if effects connect to adjacent art:
      // abrupt costume crops and hard-bounded effects can both appear.
      seams.push({ x, countBefore: occupied[x - 1], countAfter: occupied[x],
        jump, severity: Math.abs(jump) >= 160 ? 'high' : 'review' });
    }
    results.push({
      clip: 'light' + (row + 1), frame: col + 1, row, col, seams,
      needsReview: seams.length > 0,
      // Useful for grounded-foot QA, not a substitute for toe landmark review.
      bottomAlphaY: findBottomAlpha(data, frameWidth, frameHeight, threshold),
    });
  }
  return results;
}

function findBottomAlpha(data, width, height, threshold) {
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > threshold) return y;
  }
  return -1;
}
