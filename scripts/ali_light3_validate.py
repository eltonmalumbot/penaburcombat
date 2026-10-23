#!/usr/bin/env python3
"""Read-only integrity gate for unapproved Ali V6 candidate source bytes."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

SOURCE_SHA = "43b0140642cf023be71f3d8d1bd69ca391d43f39abad35cf287cf8d21b06b521"
TIMINGS = {"light1": .35, "light2": .35, "light3": .39}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def manifest_at(directory):
    doc = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    valid = (
        doc.get("fighter") == "Ali" and doc.get("version") == 6
        and doc.get("isApprovedProductionArt") is False
        and doc.get("status") == "NEW_KEYFRAMES_CANDIDATE_REVIEW_REQUIRED"
        and doc.get("sourceV5AtlasSha256") == SOURCE_SHA
        and bool(doc.get("artistProvenance"))
    )
    if not valid:
        raise ValueError("Expected unapproved Ali V6 derived from pinned V5")
    return doc


def check_frame(directory, atlas, expected_hashes, move, row, col):
    name = f"{move}-{col:02}.png"
    path = directory / "frames" / name
    if expected_hashes.get(name) != sha(path):
        raise ValueError("Frame checksum mismatch: " + name)
    with Image.open(path) as frame:
        if frame.mode != "RGBA" or frame.size != (720, 540):
            raise ValueError("Wrong frame dimensions: " + name)
        rect = (col * 720, row * 540, (col + 1) * 720, (row + 1) * 540)
        if atlas.crop(rect).tobytes() != frame.tobytes():
            raise ValueError("Atlas/source pixels differ: " + name)


def check_clip(directory, atlas, doc, expected_hashes, row, move, seconds):
    clip = doc["clips"][move]
    clips = clip["frames"]
    if clip["loop"] is not False or len(clips) != 6:
        raise ValueError("Expected 6 nonlooping frames for " + move)
    if abs(sum(frame["duration"] for frame in clips) - seconds) > 1e-8:
        raise ValueError("Attack timing drift for " + move)
    for col in range(6):
        check_frame(directory, atlas, expected_hashes, move, row, col)


def verify(directory):
    doc = manifest_at(directory)
    entries = doc["frameQA"]
    expected = {item["frame"]: item["sha256"] for item in entries}
    if len(entries) != 18 or len(expected) != 18:
        raise ValueError("Incomplete 18-frame QA manifest")
    sheet = directory / "ali-combat-frames.png"
    if sha(sheet) != doc["combatOnlySha256"]:
        raise ValueError("Atlas SHA-256 differs")
    with Image.open(sheet) as atlas:
        if atlas.size != (4320, 1620) or atlas.mode != "RGBA":
            raise ValueError("Expected 4320x1620 RGBA atlas")
        for row, (move, seconds) in enumerate(TIMINGS.items()):
            check_clip(directory, atlas, doc, expected, row, move, seconds)
    print("PASS: 18 frame hashes, exact RGBA atlas and combat timing; ART NOT APPROVED")


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--root", type=Path, required=True)
    verify(cli.parse_args().root)
