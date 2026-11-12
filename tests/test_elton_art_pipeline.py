"""Synthetic, no-artwork-leakage tests for Elton's review-only HD intake."""
import copy
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import elton_art_pipeline as art


class EltonArtIntakeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="elton-art-test-")
        cls.root = Path(cls.tmp.name)
        cls.repo = cls.root / "repo"
        reference = cls.repo / "public/assets/fighters"
        reference.mkdir(parents=True)
        Image.new("RGBA", (10, 10), (10, 20, 30, 255)).save(reference / "elton.png")
        cls.ref_sha = art.sha256(reference / "elton.png")
        (reference / "elton.png.sha256").write_text(
            cls.ref_sha + "  elton.png\n", encoding="utf-8"
        )
        cls.source = cls.root / "artist"
        (cls.source / "frames").mkdir(parents=True)
        for seed, name in enumerate(art.frame_names()):
            image = Image.new("RGBA", (art.WIDTH, art.HEIGHT))
            draw = ImageDraw.Draw(image)
            offset = seed % 12
            draw.rectangle((70 + offset, 45, 340 + offset, 524),
                           fill=(25 + seed * 3, 60 + seed * 2, 130, 255))
            draw.ellipse((390, 270 + seed % 9, 430, 322),
                         fill=(20, 180, 230, 220))
            image.save(cls.source / "frames" / name)
        cls.original_hashes = {
            name: art.sha256(cls.source / "frames" / name)
            for name in art.frame_names()
        }
        cls.pin = patch.object(art, "APPROVED_ELTON_SHA", cls.ref_sha)
        cls.pin.start()
        with patch.object(art, "mkdtemp", side_effect=lambda **kw: tempfile.mkdtemp(dir=cls.root, **kw)):
            cls.candidate = art.build(
                cls.source, cls.repo, "Original local artwork review fixture",
                "Synthetic test usage permission only"
            )

    @classmethod
    def tearDownClass(cls):
        cls.pin.stop()
        cls.tmp.cleanup()

    def test_full_candidate_is_unapproved_and_exact(self):
        art.verify(self.candidate)
        doc = json.loads((self.candidate / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(doc["status"], "REVIEW_ONLY_ART_NOT_APPROVED")
        self.assertIs(doc["isApprovedProductionArt"], False)
        self.assertEqual(doc["approvedOriginalEltonSha256"], self.ref_sha)
        self.assertEqual(len(doc["frameQA"]), 36)
        self.assertEqual(set(doc["clips"]), set(art.MOVES))
        with Image.open(self.candidate / "elton-combat-frames.png") as sheet:
            self.assertEqual(sheet.size, (4320, 3240))
        self.assertEqual(self.original_hashes, {
            name: art.sha256(self.source / "frames" / name)
            for name in art.frame_names()
        })
        for move, durations in art.TIMINGS.items():
            phases = art.EXPECTED_PHASES[move]
            self.assertAlmostEqual(sum(durations[:2]), phases[0])
            self.assertAlmostEqual(sum(durations[2:4]), phases[1])
            self.assertAlmostEqual(sum(durations[4:]), phases[2])

    def test_rejects_bad_timing_and_false_approval(self):
        file = self.candidate / "manifest.json"
        original = file.read_bytes()
        try:
            doc = json.loads(original)
            doc["clips"]["heavy"]["frames"][1]["duration"] = .15
            file.write_text(json.dumps(doc), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "duration mismatch"):
                art.verify(self.candidate)
            doc = json.loads(original)
            doc["isApprovedProductionArt"] = True
            file.write_text(json.dumps(doc), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "valid review-only"):
                art.verify(self.candidate)
        finally:
            file.write_bytes(original)

    def test_rejects_tampered_frame(self):
        file = self.candidate / "frames/light2-03.png"
        original = file.read_bytes()
        try:
            file.write_bytes(original + b"appended-invalid-signature")
            with self.assertRaisesRegex(ValueError, "frame checksum mismatch"):
                art.verify(self.candidate)
        finally:
            file.write_bytes(original)

    def test_rejects_cloned_poses_and_margins_before_writing(self):
        frame = self.source / "frames/light3-04.png"
        original = frame.read_bytes()
        try:
            shutil.copyfile(self.source / "frames/light3-03.png", frame)
            with self.assertRaisesRegex(ValueError, "Repeated identical pose"):
                art.build(self.source, self.repo, "Artist", "Usage granted")
            image = Image.new("RGBA", (art.WIDTH, art.HEIGHT))
            ImageDraw.Draw(image).rectangle((0, 0, 500, 539), fill=(50, 70, 200, 255))
            image.save(frame)
            with self.assertRaisesRegex(ValueError, "transparent 4px margin"):
                art.build(self.source, self.repo, "Artist", "Usage granted")
        finally:
            frame.write_bytes(original)

    def test_rejects_reference_and_missing_rights(self):
        with self.assertRaisesRegex(ValueError, "usage permission"):
            art.build(self.source, self.repo, "Artist", "")
        file = self.repo / "public/assets/fighters/elton.png.sha256"
        original = file.read_bytes()
        try:
            file.write_text("0" * 64 + "  elton.png\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "reference pin mismatch"):
                art.build(self.source, self.repo, "Artist", "Approved for local review")
        finally:
            file.write_bytes(original)

    def test_rejects_corrupted_atlas_and_missing_frame(self):
        path = self.candidate / "elton-combat-frames.png"
        original = path.read_bytes()
        try:
            path.write_bytes(original + b"tamper")
            with self.assertRaisesRegex(ValueError, "atlas checksum mismatch"):
                art.verify(self.candidate)
        finally:
            path.write_bytes(original)
        path = self.candidate / "frames/ultimate-05.png"
        saved = path.read_bytes()
        try:
            path.unlink()
            with self.assertRaises((FileNotFoundError, ValueError)):
                art.verify(self.candidate)
        finally:
            path.write_bytes(saved)


if __name__ == "__main__":
    unittest.main()
