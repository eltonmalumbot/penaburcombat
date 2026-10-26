#!/usr/bin/env python3
"""Build an UNAPPROVED Ali V6 atlas from independently authored Light3 F4/F5.

Requires Pillow. No source files, Git files, or existing output folders change.
Use scripts/ali_light3_validate.py against the resulting output directory.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from tempfile import mkdtemp
from PIL import Image

SOURCE_SHA = "43b0140642cf023be71f3d8d1bd69ca391d43f39abad35cf287cf8d21b06b521"
MOVES = ("light1", "light2", "light3")
TIMES = {"light1": .35, "light2": .35, "light3": .39}
TIMING = {
    "light1": [.04,.04,.035,.055,.09,.09],
    "light2": [.04,.04,.035,.055,.09,.09],
    "light3": [.05,.04,.03,.045,.045,.18],
}
REPLACED = ("light3-03.png", "light3-04.png")


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_frame(path):
    if not path.is_file():
        raise ValueError("Missing PNG: " + str(path))
    with Image.open(path) as f:
        if f.format != "PNG" or f.mode != "RGBA" or f.size != (720, 540):
            raise ValueError("Frame must be untrimmed 720x540 RGBA PNG: " + str(path))
        frame = f.copy()
    rect = frame.getchannel("A").getbbox()
    if rect is None or rect[0] < 4 or rect[1] < 4 or rect[2] > 716 or rect[3] > 536:
        raise ValueError("Transparent margin is insufficient: " + str(path))
    if not 505 <= rect[3] <= 535:
        raise ValueError("Expected ground baseline not detected: " + str(path))
    if sum(frame.getchannel("A").histogram()[32:]) < 10000:
        raise ValueError("Insufficient silhouette alpha: " + str(path))
    return frame, rect


def validate_clip_timing(manifest, name):
    """Protect contact timing and ordered poses, not only total attack length."""
    clip = manifest.get("clips", {}).get(name, {})
    entries = clip.get("frames", [])
    if (clip.get("loop") is not False or not isinstance(entries, list)
        or len(entries) != 6 or not all(isinstance(entry, dict) for entry in entries)):
        raise ValueError("Expected 6 nonlooping frames for " + name)
    durations = [entry.get("duration") for entry in entries]
    if (durations != TIMING[name]
        or manifest.get("clipTiming", {}).get(name) != TIMING[name]):
        raise ValueError("Attack timing drift for " + name)
    if [entry.get("frame") for entry in entries] != [f"{name}-{i}" for i in range(6)]:
        raise ValueError("Unexpected frame order for " + name)


def validate_source(source):
    manifest = json.loads((source / "manifest.json").read_text(encoding="utf-8"))
    if (manifest.get("version") != 5 or manifest.get("fighter") != "Ali"
        or manifest.get("isApprovedProductionArt") is not False
        or manifest.get("combatOnlySha256") != SOURCE_SHA
        or checksum(source / "ali-combat-frames.png") != SOURCE_SHA):
        raise ValueError("Unexpected or mutated Ali V5 source")
    qa = {item["frame"]: item["sha256"] for item in manifest["frameQA"]}
    if len(qa) != 18:
        raise ValueError("Expected exactly 18 original V5 frame hashes")
    frames = {}
    for name in MOVES:
        validate_clip_timing(manifest, name)
        for i in range(6):
            filename = f"{name}-{i:02}.png"
            path = source / "frames" / filename
            if qa.get(filename) != checksum(path):
                raise ValueError("Mutated V5 source frame: " + filename)
            frames[filename] = load_frame(path)[0]
    return manifest, frames


def write_review_candidate(source, art4, art5, provenance):
    if not provenance.strip():
        raise ValueError("Artist/rights provenance is required")
    manifest, frames = validate_source(source)
    replacement = []
    for name, path in zip(REPLACED, (art4, art5)):
        art, bbox = load_frame(path)
        if any(art.tobytes() == old.tobytes() for old in frames.values()):
            raise ValueError("Cloned V5 pose supplied instead of independently authored " + name)
        replacement.append((name, art, list(bbox), path.name))
        frames[name] = art
    if replacement[0][1].tobytes() == replacement[1][1].tobytes():
        raise ValueError("Light3 F4/F5 must be distinct independently authored poses")
    # Security: output path is never read from CLI arguments. mkdtemp creates
    # a fresh user-owned directory with nonpredictable name, no traversal.
    target = Path(mkdtemp(prefix="ali-light3-review-"))
    (target / "frames").mkdir()
    atlas = Image.new("RGBA", (4320, 1620))
    qa = []
    for row, move in enumerate(MOVES):
        for i in range(6):
            filename = f"{move}-{i:02}.png"
            path = target / "frames" / filename
            frames[filename].save(path)
            qa.append({"frame": filename, "sha256": checksum(path)})
            # No alpha compositing: preserves every RGBA pixel in each cell exactly.
            atlas.paste(frames[filename], (i * 720, row * 540))
    sheet = target / "ali-combat-frames.png"
    atlas.save(sheet)
    doc = copy.deepcopy(manifest)
    doc.update({
        "version": 6,
        "status": "NEW_KEYFRAMES_CANDIDATE_REVIEW_REQUIRED",
        "isApprovedProductionArt": False,
        "reviewStatus": "MANUAL_ART_AND_DEVICE_REVIEW_REQUIRED",
        "sourceV5AtlasSha256": SOURCE_SHA,
        "combatOnlySha256": checksum(sheet),
        "frameQA": qa,
        "alteredFrames": list(REPLACED),
        "artistProvenance": provenance,
        "reauthoredFrames": [
            {"frame": name, "sourceFile": filename, "bbox": bbox}
            for name, _, bbox, filename in replacement
        ],
    })
    (target / "manifest.json").write_text(
        json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("REVIEW-ONLY V6 written:", target)
    print("Candidate atlas SHA-256:", doc["combatOnlySha256"])
    print("THIS DOES NOT APPROVE OR INSTALL ART.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-v5", type=Path, required=True)
    parser.add_argument("--frame4", type=Path, required=True)
    parser.add_argument("--frame5", type=Path, required=True)
    parser.add_argument("--artist-provenance", required=True)
    args = parser.parse_args()
    write_review_candidate(
        args.source_v5, args.frame4, args.frame5, args.artist_provenance)
