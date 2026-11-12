"""Synthetic evidence checks, never character artwork or art acceptance."""
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'scripts'))
import elton_v3_review as v3


class EltonV3Tests(unittest.TestCase):
    def test_comparison_preserves_sources_and_maps_both_facings(self):
        with tempfile.TemporaryDirectory() as tmp:
            baseline, candidate = Path(tmp) / 'v2', Path(tmp) / 'v3'
            for root, color in [(baseline, (210, 20, 30, 255)), (candidate, (20, 50, 210, 255))]:
                (root / 'frames').mkdir(parents=True)
                for move in v3.MOVES:
                    for i in range(6):
                        image = Image.new('RGBA', (720, 540))
                        ImageDraw.Draw(image).rectangle((30, 120, 120, 400), fill=color)
                        image.save(root / 'frames' / f'{move}-{i:02}.png')
            before = {p: v3.sha256(p) for root in (baseline, candidate) for p in (root / 'frames').glob('*.png')}
            v3.compare_sheet(baseline, candidate)
            self.assertEqual(before, {p: v3.sha256(p) for p in before})
            with Image.open(candidate / 'v2-v3-comparison.png') as sheet:
                self.assertEqual(sheet.size, (1440, 4896))
                for y, color in [(90, (210, 20, 30)), (294, (20, 50, 210))]:
                    self.assertEqual(sheet.getpixel((20, y)), color)
                    self.assertEqual(sheet.getpixel((219, y + 408)), color)

    def test_wrong_baseline_pin_stops_before_build(self):
        with patch.object(v3, 'sha256', return_value='0' * 64):
            with patch.object(v3, 'build') as build:
                with self.assertRaisesRegex(ValueError, 'V2 baseline checksum changed'):
                    v3.main()
                build.assert_not_called()

    def test_sole_centers_do_not_certify_anatomy(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'synthetic.png'
            image = Image.new('RGBA', (720, 540))
            draw = ImageDraw.Draw(image)
            draw.rectangle((170, 500, 190, 524), fill=(20, 80, 220, 255))
            draw.rectangle((410, 500, 430, 524), fill=(20, 80, 220, 255))
            image.save(path)
            self.assertEqual(v3.sole_centers(path), [180.0, 420.0])
            Image.new('RGBA', (720, 540)).save(path)
            self.assertEqual(v3.sole_centers(path), [None, None])
