#!/usr/bin/env python3
"""Build or verify an unapproved Elton HD combat atlas; never install game assets.

Expected source: .local-art/elton-input/frames/{light1,light2,light3,heavy,skill,ultimate}-00..05.png.
All source PNGs are 720x540, transparent RGBA, with native facing right.
Outputs are placed in a fresh OS temporary folder, outside public/ and dist/.
"""
import hashlib
import json
from pathlib import Path
from tempfile import mkdtemp

from PIL import Image

APPROVED_ELTON_SHA = "685823f1b1021e9d661a5157725db2653ceb4cc1478c176d0ba5f1c6dc52b7f0"
MOVES = ("light1", "light2", "light3", "heavy", "skill", "ultimate")
WIDTH, HEIGHT = 720, 540
FRAMES_PER_MOVE = 6
# Two startup, two active and two recovery frames per move, preserving moves.ts
# startup / active / recovery windows. No gameplay timing changes.
TIMINGS = {
    "light1": (.04, .04, .045, .045, .09, .09),
    "light2": (.04, .04, .045, .045, .09, .09),
    "light3": (.06, .06, .045, .045, .09, .09),
    "heavy": (.10, .10, .06, .06, .15, .15),
    "skill": (.115, .115, .07, .07, .145, .145),
    "ultimate": (.20, .20, .125, .125, .25, .25),
}
EXPECTED_PHASES = {
    "light1": (.08, .09, .18),
    "light2": (.08, .09, .18),
    "light3": (.12, .09, .18),
    "heavy": (.20, .12, .30),
    "skill": (.23, .14, .29),
    "ultimate": (.40, .25, .50),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def frame_names():
    return [f"{move}-{i:02}.png" for move in MOVES for i in range(FRAMES_PER_MOVE)]


def check_reference(repo_root: Path) -> str:
    target = repo_root / "public/assets/fighters/elton.png"
    hash_file = repo_root / "public/assets/fighters/elton.png.sha256"
    if target.is_symlink() or hash_file.is_symlink():
        raise ValueError("Approved Elton reference must not be a symlink")
    parts = hash_file.read_text(encoding="utf-8").split()
    if len(parts) != 2 or parts[1] != "elton.png" or parts[0] != APPROVED_ELTON_SHA:
        raise ValueError("Elton approved reference pin mismatch")
    if sha256(target) != APPROVED_ELTON_SHA:
        raise ValueError("Elton approved reference bytes changed")
    return APPROVED_ELTON_SHA


def check_frame(path: Path) -> Image.Image:
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 10 * 1024 * 1024:
        raise ValueError("Missing, symlinked or oversized frame: " + path.name)
    with Image.open(path) as loaded:
        if loaded.format != "PNG" or loaded.mode != "RGBA" or loaded.size != (WIDTH, HEIGHT):
            raise ValueError("Expected 720x540 RGBA PNG: " + path.name)
        frame = loaded.copy()
    alpha = frame.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None or bounds[0] < 4 or bounds[1] < 4 or bounds[2] > WIDTH - 4 or bounds[3] > HEIGHT - 4:
        raise ValueError("Insufficient transparent 4px margin: " + path.name)
    if not 505 <= bounds[3] <= 535:
        raise ValueError("Feet/ground reference out of range: " + path.name)
    if sum(alpha.histogram()[32:]) < 10000:
        raise ValueError("Silhouette incomplete or nearly transparent: " + path.name)
    return frame


def check_timing(clips):
    if not isinstance(clips, dict) or set(clips) != set(MOVES):
        raise ValueError("Expected all six Elton attack clips")
    for move in MOVES:
        sequence = clips[move]
        if sequence.get("loop") is not False:
            raise ValueError("Attack clips must not loop: " + move)
        frames = sequence.get("frames")
        if not isinstance(frames, list) or len(frames) != FRAMES_PER_MOVE:
            raise ValueError("Incorrect frame count: " + move)
        if [f.get("frame") for f in frames] != [
            f"{move}-{i}" for i in range(FRAMES_PER_MOVE)
        ] or [f.get("duration") for f in frames] != list(TIMINGS[move]):
            raise ValueError("Frame order or duration mismatch: " + move)
        timings = TIMINGS[move]
        phases = (sum(timings[:2]), sum(timings[2:4]), sum(timings[4:]))
        if any(abs(a - b) > 1e-9 for a, b in zip(phases, EXPECTED_PHASES[move])):
            raise ValueError("Artwork timing does not match combat windows: " + move)


def make_clips():
    return {
        move: {"loop": False, "frames": [
            {"frame": f"{move}-{i}", "duration": duration}
            for i, duration in enumerate(TIMINGS[move])
        ]} for move in MOVES
    }


def build(source: Path, repo_root: Path, artist: str, permission: str) -> Path:
    if not artist.strip() or not permission.strip():
        raise ValueError("Artist provenance and usage permission notes are required")
    if len(artist) > 2000 or len(permission) > 2000:
        raise ValueError("Art provenance notes are too long")
    reference_sha = check_reference(repo_root)
    if (source / "frames").is_symlink():
        raise ValueError("Frame directory must not be a symlink")
    clips = make_clips()
    check_timing(clips)
    # Validate every frame before creating any output.
    loaded = {}
    pixel_hashes = set()
    for move in MOVES:
        for i in range(FRAMES_PER_MOVE):
            name = f"{move}-{i:02}.png"
            frame = check_frame(source / "frames" / name)
            pixel_hash = hashlib.sha256(frame.tobytes()).hexdigest()
            if pixel_hash in pixel_hashes:
                raise ValueError("Repeated identical pose in " + move)
            pixel_hashes.add(pixel_hash)
            loaded[name] = frame
    target = Path(mkdtemp(prefix="elton-hd-review-"))
    (target / "frames").mkdir()
    atlas = Image.new("RGBA", (FRAMES_PER_MOVE * WIDTH, len(MOVES) * HEIGHT))
    qa = []
    for row, move in enumerate(MOVES):
        for i in range(FRAMES_PER_MOVE):
            name = f"{move}-{i:02}.png"
            output = target / "frames" / name
            frame = loaded[name]
            frame.save(output)
            qa.append({"frame": name, "sha256": sha256(output)})
            atlas.paste(frame, (i * WIDTH, row * HEIGHT))
    sheet = target / "elton-combat-frames.png"
    atlas.save(sheet)
    manifest = {
        "fighter": "Elton",
        "version": 1,
        "status": "REVIEW_ONLY_ART_NOT_APPROVED",
        "isApprovedProductionArt": False,
        "approvedOriginalEltonSha256": reference_sha,
        "artistProvenance": artist.strip(),
        "usagePermissionNote": permission.strip(),
        "frameWidth": WIDTH,
        "frameHeight": HEIGHT,
        "pivot": {"x": 320, "y": 525},
        "nativeFacing": "right",
        "combatOnlySha256": sha256(sheet),
        "clips": clips,
        "frameQA": qa,
    }
    (target / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    verify(target)
    from elton_art_review import write_review
    write_review(target, manifest)
    print("REVIEW-ONLY Elton candidate:", target)
    print("DO NOT copy into public/ or merge into main without owner signoff")
    return target


def read_review_manifest(root: Path):
    doc = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    if (
        doc.get("fighter") != "Elton"
        or doc.get("version") != 1
        or doc.get("status") != "REVIEW_ONLY_ART_NOT_APPROVED"
        or doc.get("isApprovedProductionArt") is not False
        or doc.get("approvedOriginalEltonSha256") != APPROVED_ELTON_SHA
        or not doc.get("artistProvenance")
        or not doc.get("usagePermissionNote")
        or doc.get("pivot") != {"x": 320, "y": 525}
        or doc.get("nativeFacing") != "right"
        or doc.get("frameWidth") != WIDTH
        or doc.get("frameHeight") != HEIGHT
    ):
        raise ValueError("Elton manifest is not a valid review-only candidate")
    return doc


def checked_frame_hashes(doc):
    entries = doc.get("frameQA")
    if not isinstance(entries, list):
        raise ValueError("Missing frame checksum manifest")
    names = frame_names()
    found = [entry.get("frame") for entry in entries if isinstance(entry, dict)]
    if len(entries) != len(names) or len(set(found)) != len(names) or set(found) != set(names):
        raise ValueError("Expected 36 unique frame checksums")
    return {entry["frame"]: entry["sha256"] for entry in entries}


def check_atlas_frames(root: Path, atlas, expected):
    pixels_seen = set()
    for row, move in enumerate(MOVES):
        for col in range(FRAMES_PER_MOVE):
            name = f"{move}-{col:02}.png"
            path = root / "frames" / name
            if sha256(path) != expected[name]:
                raise ValueError("Elton frame checksum mismatch: " + name)
            frame = check_frame(path)
            digest = hashlib.sha256(frame.tobytes()).hexdigest()
            if digest in pixels_seen:
                raise ValueError("Repeated identical pose in candidate: " + name)
            pixels_seen.add(digest)
            box = (col * WIDTH, row * HEIGHT, (col + 1) * WIDTH, (row + 1) * HEIGHT)
            if atlas.crop(box).tobytes() != frame.tobytes():
                raise ValueError("Elton atlas pixels differ: " + name)


def verify(root: Path):
    doc = read_review_manifest(root)
    check_timing(doc.get("clips"))
    expected = checked_frame_hashes(doc)
    sheet = root / "elton-combat-frames.png"
    if sha256(sheet) != doc.get("combatOnlySha256"):
        raise ValueError("Elton atlas checksum mismatch")
    with Image.open(sheet) as atlas:
        if atlas.format != "PNG" or atlas.mode != "RGBA" or atlas.size != (
            FRAMES_PER_MOVE * WIDTH, len(MOVES) * HEIGHT
        ):
            raise ValueError("Expected 4320x3240 RGBA Elton atlas")
        check_atlas_frames(root, atlas, expected)
    print("PASS: 36 Elton frames, timings and pixels; ART NOT APPROVED")


if __name__ == "__main__":
    # No CLI arguments whatsoever: no untrusted path or metadata crosses the
    # command line. Codex/artist files belong in the fixed gitignored inbox.
    repo_root = Path(__file__).resolve().parent.parent
    inbox = repo_root / ".local-art/elton-input"
    metadata = inbox / "provenance.json"
    if metadata.is_symlink():
        raise ValueError("Provenance must not be a symlink")
    notes = json.loads(metadata.read_text(encoding="utf-8"))
    if not isinstance(notes, dict):
        raise ValueError("Provenance must be a JSON object")
    artist = notes.get("artistProvenance")
    rights = notes.get("usagePermissionNote")
    if not isinstance(artist, str) or not isinstance(rights, str):
        raise ValueError("Artist provenance and usage permission notes must be strings")
    build(inbox, repo_root, artist, rights)
