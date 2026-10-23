#!/usr/bin/env python3
"""Validate a V6 candidate's frame-to-atlas integrity; never approves art."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

SOURCE_SHA = "43b0140642cf023be71f3d8d1bd69ca391d43f39abad35cf287cf8d21b06b521"
TIMINGS = {"light1": .35, "light2": .35, "light3": .39}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(directory):
    doc = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    if (doc.get("fighter") != "Ali" or doc.get("version") != 6
        or doc.get("isApprovedProductionArt") is not False
        or doc.get("status") != "NEW_KEYFRAMES_CANDIDATE_REVIEW_REQUIRED"
        or doc.get("sourceV5AtlasSha256") != SOURCE_SHA
        or not doc.get("artistProvenance")):
        raise ValueError("Expected unapproved Ali V6 derived from pinned V5")
    files = {item["frame"]: item["sha256"] for item in doc["frameQA"]}
    if len(files) != 18 or len(doc["frameQA"]) != 18:
        raise ValueError("Incomplete frame QA manifest")
    sheet = directory / "ali-combat-frames.png"
    if sha(sheet) != doc["combatOnlySha256"]:
        raise ValueError("Atlas SHA-256 mismatch")
    with Image.open(sheet) as atlas:
        if atlas.size != (4320, 1620) or atlas.mode != "RGBA":
            raise ValueError("Atlas must be 4320x1620 RGBA")
        for row, (move, seconds) in enumerate(TIMINGS.items()):
            clip = doc["clips"][move]
            if (clip["loop"] is not False or len(clip["frames"]) != 6
                or abs(sum(f["duration"] for f in clip["frames"]) - seconds) > 1e-8):
                raise ValueError("Attack timing drift: " + move)
            for i in range(6):
                name = f"{move}-{i:02}.png"
                path = directory / "frames" / name
                if files.get(name) != sha(path):
                    raise ValueError("Frame checksum mismatch: " + name)
                with Image.open(path) as frame:
                    if frame.mode != "RGBA" or frame.size != (720, 540):
                        raise ValueError("Wrong frame dimensions: " + name)
                    rect = (i*720, row*540, (i+1)*720, (row+1)*540)
                    if atlas.crop(rect).tobytes() != frame.tobytes():
                        raise ValueError("Atlas contains altered/misaligned pixels: " + name)
    print("PASS integrity: 18 RGBA frames and combat timing. NOT ART APPROVED.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    verify(parser.parse_args().root)
