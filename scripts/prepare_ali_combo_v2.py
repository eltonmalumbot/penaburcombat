#!/usr/bin/env python3
"""Safely validate/stage Ali Light Combo V2 from the user-reviewed local art pack.

This script is code-only: it does not download art, modify main, commit, merge,
or deploy. Without --apply it performs validation and a no-write dry run.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import subprocess
import sys

APPROVED_ALI_SHA = "3d33a2327da2de6be3d1e4d3270f2c922df44aad11892c61135dac84b3408905"
PACK_HASHES = {
    "integrate_ali_combat.py": "217b919b3e6435131f54acf73b9fe3b4935a1b3314beff258063219c5ff63ee0",
    "validate_pack.py": "9594afd4df0404dbfd6c7a49ec556877ad126a675db7b01af3955674ce30ba71",
    "manifest.json": "a165a3b5a282923893e36ac3af0777763971e37600a9ba6055d47d658f38aa38",
    "ali-combat-frames.png": "1e206d68e0a20ee55ba99af18e09ab5ef856ad0d0ea10cb766588d2351fcf7e6",
    "ali-combat.test.ts": "1a2b263603534bc91edb3907fc47bf01dd42e4b3e71478215683d7389f7972cc",
}

def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", type=pathlib.Path, required=True,
                        help="Extracted PENABUR_Combat_Ali_Light_Combo_Art_Pack_V2 directory")
    parser.add_argument("--repo", type=pathlib.Path, default=pathlib.Path.cwd())
    parser.add_argument("--apply", action="store_true",
                        help="Write unapproved candidate to the current feature branch")
    parser.add_argument("--visual-approved", action="store_true",
                        help="Confirm human review of all 18 PNG frames and their effects")
    args = parser.parse_args()
    pack, repo = args.pack.resolve(), args.repo.resolve()
    for name, expected in PACK_HASHES.items():
        path = pack / name
        if not path.is_file() or sha256(path) != expected:
            parser.error("Missing or changed V2 pack asset: " + name)
    if sha256(repo / "public/assets/fighters/ali.png") != APPROVED_ALI_SHA:
        parser.error("Original approved GitHub Ali PNG is missing or modified")
    manifest = json.loads((pack / "manifest.json").read_text())
    if (manifest.get("isApprovedProductionArt") is not False
        or manifest.get("originalRepoAssetSha256") != APPROVED_ALI_SHA
        or manifest.get("combatOnlySha256") != PACK_HASHES["ali-combat-frames.png"]):
        parser.error("Candidate provenance, hash or approval contract changed")
    branch = subprocess.check_output(
        ["git", "-C", str(repo), "branch", "--show-current"], text=True
    ).strip()
    if not branch or not branch.startswith("phase3a/") or branch == "phase3a/ali-hd-combat-animation":
        parser.error("Use a separate phase3a/ feature branch; never install on main or PR #8 branch")
    if args.apply and not args.visual_approved:
        parser.error("--apply requires --visual-approved, after actual visual inspection")
    subprocess.run([sys.executable, str(pack / "validate_pack.py")], cwd=pack, check=True)
    cmd = [sys.executable, str(pack / "integrate_ali_combat.py"), "--repo", str(repo)]
    if not args.apply:
        cmd.append("--dry-run")
    subprocess.run(cmd, cwd=pack, check=True)
    if args.apply:
        print("Candidate files staged locally. RUN npm test, npm run build, "
              "npm run test:atlas and npm run test:e2e before commit/PR. "
              "Do not merge without visual approval and Preview verification.")
    else:
        print("NO WRITE: V2 pack and approved base are valid. To stage after "
              "review, rerun with --apply --visual-approved.")

if __name__ == "__main__":
    main()
