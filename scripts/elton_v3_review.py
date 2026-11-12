#!/usr/bin/env python3
"""Fixed local V3 intake and V2/V3 evidence; never install production art."""
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

from elton_art_pipeline import MOVES, build, sha256, verify

V2_ATLAS_SHA = '238acc8beaa136dc433e2a684c574e81db67d8bcf488c764cdd0e25d1077c1d6'
V2_ZIP_SHA = '29cbfc674d139115a1effa3380541d6c88684b696c1630607341c24bb14af103'


def _panel_background() -> Image.Image:
    panel = Image.new('RGB', (240, 180), '#dce4ec')
    draw = ImageDraw.Draw(panel)
    for y in range(0, 180, 12):
        for x in range(0, 240, 12):
            if (x // 12 + y // 12) % 2:
                draw.rectangle((x, y, x + 11, y + 11), fill='#b8c6d4')
    return panel


def _comparison_pose(sheet, panel, root, move, i, left, position):
    x, y = position
    sheet.paste(panel, (x, y))
    with Image.open(root / 'frames' / f'{move}-{i:02}.png') as source:
        pose = source.resize((240, 180), Image.Resampling.LANCZOS)
        if left:
            pose = ImageOps.mirror(pose)
        sheet.paste(pose, (x, y), pose)


def compare_sheet(baseline: Path, candidate: Path) -> None:
    """All 36 pairs, native and mirrored, at one-third scale."""
    width, height, label = 240, 180, 24
    sheet = Image.new('RGB', (6 * width, 24 * (height + label)), '#dce4ec')
    draw = ImageDraw.Draw(sheet)
    panel = _panel_background()
    for move_index, move in enumerate(MOVES):
        for row_index, (root, edition, left) in enumerate([
            (baseline, 'V2 RIGHT', False), (candidate, 'V3 RIGHT', False),
            (baseline, 'V2 LEFT', True), (candidate, 'V3 LEFT', True),
        ]):
            y = (move_index * 4 + row_index) * (height + label)
            for i in range(6):
                x = i * width
                draw.text((x + 4, y + 4), f'{move} F{i:02} {edition}', fill='black')
                _comparison_pose(sheet, panel, root, move, i, left, (x, y + label))
                draw.line((x, y + label + 175, x + width - 1, y + label + 175), fill='#e96317')
    sheet.save(candidate / 'v2-v3-comparison.png')


def sole_centers(path: Path):
    """Alpha-weighted sole-band centroids, not an anatomy certificate."""
    with Image.open(path) as source:
        alpha = source.getchannel('A')
        centers = []
        for start, end in [(0, 320), (320, 720)]:
            points = [(x, alpha.getpixel((x, y))) for y in range(500, 525)
                      for x in range(start, end) if alpha.getpixel((x, y)) >= 128]
            weight = sum(value for _, value in points)
            centers.append(round(sum(x * value for x, value in points) / weight, 2)
                           if weight else None)
        return centers


def revision_manifest(baseline: Path, candidate: Path, doc: dict) -> dict:
    old = json.loads((baseline / 'manifest.json').read_text(encoding='utf-8'))
    previous = {entry['frame']: entry['sha256'] for entry in old['frameQA']}
    revisions = []
    for entry in doc['frameQA']:
        name = entry['frame']
        revisions.append({
            'frame': name, 'v2Sha256': previous[name], 'v3Sha256': entry['sha256'],
            'changed': previous[name] != entry['sha256'],
            'v2SoleCentroids': sole_centers(baseline / 'frames' / name),
            'v3SoleCentroids': sole_centers(candidate / 'frames' / name),
        })
    return {'candidateEdition': 'V3', 'artApproved': False,
            'baselineV2AtlasSha256': V2_ATLAS_SHA, 'baselineV2ZipSha256': V2_ZIP_SHA,
            'atlasSha256': doc['combatOnlySha256'], 'frames': revisions}


def main() -> Path:
    repo = Path(__file__).resolve().parent.parent
    local = repo / '.local-art'
    baseline = local / 'elton-review-1ff7013-v2'
    archive = local / 'elton-review-1ff7013-v2.zip'
    source = local / 'elton-v3-work'
    if sha256(archive) != V2_ZIP_SHA or sha256(baseline / 'elton-combat-frames.png') != V2_ATLAS_SHA:
        raise ValueError('Original V2 baseline checksum changed')
    verify(baseline)
    notes = json.loads((source / 'provenance.json').read_text(encoding='utf-8'))
    target = build(source, repo, notes['artistProvenance'], notes['usagePermissionNote'])
    doc = json.loads((target / 'manifest.json').read_text(encoding='utf-8'))
    doc.update(candidateEdition='V3', baselineV2AtlasSha256=V2_ATLAS_SHA,
               baselineV2ZipSha256=V2_ZIP_SHA)
    (target / 'manifest.json').write_text(json.dumps(doc, indent=2) + '\n', encoding='utf-8')
    shutil.copyfile(target / 'two-facings.png', target / 'two-facings-v3.png')
    compare_sheet(baseline, target)
    revisions = revision_manifest(baseline, target, doc)
    (target / 'revisions-v3.json').write_text(json.dumps(revisions, indent=2) + '\n', encoding='utf-8')
    verify(target)
    print('V3 REVIEW-ONLY package:', target)
    return target


if __name__ == '__main__':
    main()
