#!/usr/bin/env python3
"""Create a read-only, bidirectional Light3 F3-F6 visual review sheet from a VERIFIED V6 candidate.

The sheet is evidence for human review, not artwork approval. Never changes
source frames, atlases, manifests, or the live game's production assets.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps
from ali_light3_validate import verify

FRAME_IDS = (2, 3, 4, 5)
FRAME_W, FRAME_H = 720, 540
HEADER_H = 36
PIVOT_X, PIVOT_Y = 320, 525
TILE_H = FRAME_H + HEADER_H


def review_sheet(root: Path) -> Image.Image:
    """Only draw from the exact 18-frame, V6 integrity-verified review bundle."""
    verify(root)
    sheet = Image.new("RGB", (4 * FRAME_W, 2 * TILE_H), (27, 35, 46))
    draw = ImageDraw.Draw(sheet)
    for row, facing in enumerate(("RIGHT (native)", "LEFT (mirrored)")):
        for col, index in enumerate(FRAME_IDS):
            name = f"light3-{index:02}.png"
            with Image.open(root / "frames" / name) as source:
                frame = source.convert("RGBA")
            if row:
                frame = ImageOps.mirror(frame)
            background = Image.new("RGBA", (FRAME_W, FRAME_H), (236, 241, 246, 255))
            pattern = ImageDraw.Draw(background)
            for y in range(0, FRAME_H, 32):
                for x in range(0, FRAME_W, 32):
                    if (x // 32 + y // 32) % 2:
                        pattern.rectangle((x, y, min(FRAME_W - 1, x + 31),
                                           min(FRAME_H - 1, y + 31)),
                                          fill=(212, 221, 231, 255))
            background.alpha_composite(frame)
            left, top = col * FRAME_W, row * TILE_H + HEADER_H
            sheet.paste(background.convert("RGB"), (left, top))
            draw.text((left + 16, top - HEADER_H + 10),
                      f"Ali Light3 F{index + 1}  |  {facing}",
                      fill=(247, 249, 252))
            # Registration diagnostics: mirror the X pivot with the pixels,
            # but keep the ground baseline fixed in each orientation.
            pivot_x = FRAME_W - 1 - PIVOT_X if row else PIVOT_X
            draw.line((left, top + PIVOT_Y, left + FRAME_W - 1, top + PIVOT_Y),
                      fill=(236, 95, 30), width=2)
            draw.line((left + pivot_x, top + PIVOT_Y - 12,
                       left + pivot_x, top + PIVOT_Y + 12),
                      fill=(25, 120, 225), width=2)
    return sheet


def save_review_sheet(root: Path, output: Path) -> None:
    result = review_sheet(root)
    # Exclusive create: never overwrite an existing QA artifact or input PNG.
    with output.open("xb") as target:
        result.save(target, format="PNG")
    print("BIDIRECTIONAL VISUAL REVIEW (NOT ART APPROVAL):", output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True,
                        help="Directory from ali_light3_rebuild.py with manifest.json")
    parser.add_argument("--output", type=Path, required=True,
                        help="New PNG path; will NOT overwrite an existing file")
    args = parser.parse_args()
    save_review_sheet(args.root, args.output)
