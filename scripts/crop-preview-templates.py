#!/usr/bin/env python3
"""
Crop Team Preview enemy thumbs using the SAME constants as src/lib/roi.ts (ROI Doc v1.2).

Usage:
  python scripts/crop-preview-templates.py [source.png] [out_dir]

Defaults: public/fixtures/team-preview.png → public/templates/

Do NOT change panel/thumb numbers here without updating roi.ts (and Doc) in lockstep.
Forms/Mega/shiny, Rotom appliances, Lycanroc day/night, Hippowdon gender colors
need separate template files when expanded.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError as e:
    raise SystemExit("Need Pillow: pip install pillow") from e

ROOT = Path(__file__).resolve().parents[1]

# Locked — mirror src/lib/roi.ts
ENEMY_PANEL = {"left": 0.811, "top": 0.143, "right": 0.965, "bottom": 0.832}
THUMB_CROP = {"left": 0.20, "right": 0.55, "topInset": 0.25, "bottomInset": 0.05}
TEMPLATE_SIZE = 64
SLOT_COUNT = 6
TARGET_ASPECT = 16 / 9

# VGC seed showdownIds (圖二 top→bottom). Label files with these ids.
SEED_SLOTS = [
    {"speciesId": "noivern", "speciesNameZh": "音爆音波", "formNote": None},
    {"speciesId": "lycanroc", "speciesNameZh": "鬃岩狼人", "formNote": "Midday / 白晝"},
    {"speciesId": "politoed", "speciesNameZh": "蚊香蛙皇", "formNote": None},
    {"speciesId": "rotom", "speciesNameZh": "洛托姆", "formNote": "base form (not appliances)"},
    {"speciesId": "kangaskhan", "speciesNameZh": "袋獸", "formNote": None},
    {"speciesId": "hippowdon", "speciesNameZh": "河馬獸", "formNote": None},
]


def content_rect(frame_w: int, frame_h: int) -> tuple[int, int, int, int]:
    if frame_w <= 0 or frame_h <= 0:
        return 0, 0, max(1, frame_w), max(1, frame_h)
    aspect = frame_w / frame_h
    if aspect > TARGET_ASPECT:
        width = int(frame_h * TARGET_ASPECT)
        x = (frame_w - width) // 2
        return x, 0, width, frame_h
    if aspect < TARGET_ASPECT:
        height = int(frame_w / TARGET_ASPECT)
        y = (frame_h - height) // 2
        return 0, y, frame_w, height
    return 0, 0, frame_w, frame_h


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "public/fixtures/team-preview.png"
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "public/templates"
    out_dir.mkdir(parents=True, exist_ok=True)

    im = Image.open(src).convert("RGB")
    cx, cy, cw, ch = content_rect(*im.size)
    px = int(cx + ENEMY_PANEL["left"] * cw)
    py = int(cy + ENEMY_PANEL["top"] * ch)
    pw = max(1, int((ENEMY_PANEL["right"] - ENEMY_PANEL["left"]) * cw))
    ph = max(1, int((ENEMY_PANEL["bottom"] - ENEMY_PANEL["top"]) * ch))

    templates = []
    for slot, meta in enumerate(SEED_SLOTS):
        slot_h = ph / SLOT_COUNT
        sx, sy, sw, sh = px, int(py + slot * slot_h), pw, max(1, int(slot_h))
        tx = int(sx + sw * THUMB_CROP["left"])
        ty = int(sy + sh * THUMB_CROP["topInset"])
        tw = max(1, int(sw * (THUMB_CROP["right"] - THUMB_CROP["left"])))
        th = max(1, int(sh * (1 - THUMB_CROP["topInset"] - THUMB_CROP["bottomInset"])))
        crop = im.crop((tx, ty, tx + tw, ty + th)).resize(
            (TEMPLATE_SIZE, TEMPLATE_SIZE), Image.Resampling.LANCZOS
        )
        sid = meta["speciesId"]
        dest = out_dir / f"{sid}.png"
        crop.save(dest, "PNG")
        templates.append({**meta, "file": f"{sid}.png", "slotSource": slot,
                          "cropPx": {"x": tx, "y": ty, "w": tw, "h": th}})
        print(f"{slot + 1} {sid} -> {dest.relative_to(ROOT)}")

    manifest = {
        "source": str(src),
        "roiDoc": "v1.2",
        "panel": ENEMY_PANEL,
        "thumbCrop": THUMB_CROP,
        "templateSize": TEMPLATE_SIZE,
        "notes": (
            "Team Preview small thumbs only (NOT HOME art). "
            "Forms/Mega/shiny separate later. Rotom appliances, Lycanroc day/night, "
            "Hippowdon gender color diffs need separate templates when expanded."
        ),
        "templates": templates,
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("wrote", out_dir / "manifest.json")


if __name__ == "__main__":
    main()
