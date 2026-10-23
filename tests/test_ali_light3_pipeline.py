"""Executable synthetic tests for guarded Ali Light3 F4/F5 art handoff.

Tests never approve artwork and do not depend on proprietary/review PNG bytes.
They exercise the REAL rebuild+validator modules with a temporary fixture whose
locally generated SHA is patched into the test-only source guard.
"""
import json
import copy
import shutil
import sys
import tempfile
import unittest
from hashlib import sha256
from pathlib import Path
from unittest.mock import patch
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import ali_light3_rebuild as reb
import ali_light3_validate as val


class AliLight3PipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="ali-light3-test-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root / "source-v5"
        (self.source / "frames").mkdir(parents=True)
        self.frames = []
        atlas = Image.new("RGBA", (4320, 1620))
        hashes = []
        for row, move in enumerate(reb.MOVES):
            for col in range(6):
                name = f"{move}-{col:02}.png"
                frame = self.sample(col + 6 * row)
                dest = self.source / "frames" / name
                frame.save(dest)
                self.frames.append(name)
                atlas.paste(frame, (col * 720, row * 540))
                hashes.append({"frame": name, "sha256": reb.checksum(dest)})
        atlas.save(self.source / "ali-combat-frames.png")
        self.source_sha = reb.checksum(self.source / "ali-combat-frames.png")
        self.source_manifest = {
            "fighter": "Ali", "version": 5, "isApprovedProductionArt": False,
            "combatOnlySha256": self.source_sha,
            "clipTiming": reb.TIMING,
            "clips": {
                m: {
                    "loop": False,
                    "frames": [
                        {"frame": f"{m}-{n}", "duration": d}
                        for n, d in enumerate(reb.TIMING[m])
                    ],
                }
                for m in reb.MOVES
            },
            "frameQA": hashes,
        }
        (self.source / "manifest.json").write_text(
            json.dumps(self.source_manifest), encoding="utf-8")
        self.frame4 = self.root / "independent-F4.png"
        self.frame5 = self.root / "independent-F5.png"
        self.sample(31).save(self.frame4)
        self.sample(43).save(self.frame5)
        self.guard1 = patch.object(reb, "SOURCE_SHA", self.source_sha)
        self.guard2 = patch.object(val, "SOURCE_SHA", self.source_sha)
        self.guard1.start()
        self.guard2.start()
        self.addCleanup(self.guard1.stop)
        self.addCleanup(self.guard2.stop)

    @staticmethod
    def sample(seed):
        img = Image.new("RGBA", (720, 540))
        paint = ImageDraw.Draw(img)
        paint.rectangle((70 + seed, 45, 310 + seed, 524),
                        fill=(20 + seed * 3 % 170, 100, 220, 255))
        paint.ellipse((340 + seed, 270, 410 + seed, 342),
                      fill=(20, 185, 240, 230))
        return img

    def create_candidate(self):
        with patch.object(reb, "mkdtemp", side_effect=lambda **kwargs:
                          tempfile.mkdtemp(dir=self.root, **kwargs)):
            reb.write_review_candidate(
                self.source, self.frame4, self.frame5,
                "Artist review fixture; synthetic test, no production rights claim")
        matches = list(self.root.glob("ali-light3-review-*"))
        self.assertEqual(len(matches), 1)
        return matches[0]

    def test_full_rebuild_preserves_other_16_frames_and_never_approves_art(self):
        original_sha = self.source_sha
        original_manifest = (self.source / "manifest.json").read_bytes()
        candidate = self.create_candidate()
        self.assertTrue((candidate / "ali-combat-frames.png").is_file())
        val.verify(candidate)
        data = json.loads((candidate / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(data["version"], 6)
        self.assertIs(data["isApprovedProductionArt"], False)
        self.assertEqual(data["sourceV5AtlasSha256"], original_sha)
        self.assertEqual(data["alteredFrames"], list(reb.REPLACED))
        self.assertEqual(len(data["frameQA"]), 18)
        self.assertEqual(reb.checksum(self.source / "ali-combat-frames.png"), original_sha)
        self.assertEqual((self.source / "manifest.json").read_bytes(), original_manifest)
        for name in self.frames:
            updated = candidate / "frames" / name
            if name in reb.REPLACED:
                self.assertNotEqual(reb.checksum(updated),
                                    reb.checksum(self.source / "frames" / name))
            else:
                with Image.open(updated) as a, Image.open(self.source / "frames" / name) as b:
                    self.assertEqual(a.tobytes(), b.tobytes(), name)

    def test_rejects_clone_and_non_rgba_or_cropped_frames(self):
        shutil.copyfile(self.source / "frames" / "light3-01.png", self.frame4)
        with self.assertRaisesRegex(ValueError, "Cloned V5 pose"):
            self.create_candidate()
        self.sample(31).save(self.frame4)
        self.sample(43).convert("RGB").save(self.frame5)
        with self.assertRaisesRegex(ValueError, "720x540 RGBA"):
            self.create_candidate()
        self.sample(43).save(self.frame5)
        bad = Image.new("RGBA", (720, 540))
        ImageDraw.Draw(bad).rectangle((0, 0, 320, 539), fill=(2, 3, 4, 255))
        bad.save(self.frame4)
        with self.assertRaisesRegex(ValueError, "margin"):
            self.create_candidate()

    def test_rejects_missing_provenance_and_source_mutation(self):
        with self.assertRaisesRegex(ValueError, "provenance"):
            reb.write_review_candidate(self.source, self.frame4, self.frame5, "")
        with open(self.source / "frames" / "light1-00.png", "ab") as fd:
            fd.write(b"tampered")
        with self.assertRaisesRegex(ValueError, "Mutated V5 source frame"):
            self.create_candidate()

    def test_validator_rejects_bad_frame_checksum_and_attack_timing(self):
        candidate = self.create_candidate()
        frame_path = candidate / "frames" / "light2-01.png"
        with open(frame_path, "ab") as fd:
            fd.write(b"tampered")
        with self.assertRaisesRegex(ValueError, "Frame checksum mismatch"):
            val.verify(candidate)
        docpath = candidate / "manifest.json"
        doc = json.loads(docpath.read_text(encoding="utf-8"))
        doc["frameQA"] = [
            {**entry, "sha256": val.sha(frame_path)}
            if entry["frame"] == "light2-01.png" else entry
            for entry in doc["frameQA"]
        ]
        doc["clips"]["light3"]["frames"][0]["duration"] = .20
        docpath.write_text(json.dumps(doc), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "timing drift"):
            val.verify(candidate)

    @staticmethod
    def invalid_timing_variants(manifest):
        for label in ("same-total", "nonfinite", "frame-order", "timing-metadata"):
            doc = copy.deepcopy(manifest)
            frames = doc["clips"]["light3"]["frames"]
            if label == "same-total":
                frames[0]["duration"] = .06
                frames[1]["duration"] = .03
            elif label == "nonfinite":
                frames[0]["duration"] = float("nan")
            elif label == "frame-order":
                frames[3]["frame"], frames[4]["frame"] = frames[4]["frame"], frames[3]["frame"]
            else:
                doc["clipTiming"]["light3"] = [.06, .03, .03, .045, .045, .18]
            yield label, doc

    def test_source_rejects_contact_timing_drift_and_reordered_frames(self):
        for label, doc in self.invalid_timing_variants(self.source_manifest):
            with self.subTest(label=label):
                (self.source / "manifest.json").write_text(json.dumps(doc), encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "timing drift|frame order"):
                    reb.validate_source(self.source)

    def test_candidate_rejects_contact_timing_drift_and_reordered_frames(self):
        candidate = self.create_candidate()
        path = candidate / "manifest.json"
        manifest = json.loads(path.read_text(encoding="utf-8"))
        for label, doc in self.invalid_timing_variants(manifest):
            with self.subTest(label=label):
                path.write_text(json.dumps(doc), encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "timing drift|frame order"):
                    val.verify(candidate)


if __name__ == "__main__":
    unittest.main()
