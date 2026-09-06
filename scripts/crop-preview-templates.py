#!/usr/bin/env python3
"""
Crop Team Preview enemy thumbs using the SAME constants as src/lib/roi.ts (ROI Doc v1.2).

Usage:
  python scripts/crop-preview-templates.py [source.png] [out_dir]
  python scripts/crop-preview-templates.py public/fixtures/team-preview-test-1.png \\
      --slots=gengar,sableye,zoroark,basculegion,annihilape,sinistcha --merge

Defaults: public/fixtures/team-preview.png → public/templates/

Do NOT change panel/thumb numbers here without updating roi.ts (and Doc) in lockstep.
Forms/Mega/shiny, Rotom appliances, Lycanroc day/night, Hippowdon gender colors
need separate template files when expanded.
"""
from __future__ import annotations

import argparse
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

ZH_FALLBACK = {
    "gengar": "耿鬼",
    "sableye": "勾魂眼",
    "zoroark": "索羅亞克",
    "basculegion": "幽尾玄魚",
    "annihilape": "棄世猴",
    "sinistcha": "來悲粗茶",
    "charizard": "噴火龍",
    "bellibolt": "電肚蛙",
    "scovillain": "辣椒傑作",
    "archaludon": "鋁鋼橋龍",
    "blastoise": "水箭龜",
}


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


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("source", nargs="?", default=str(ROOT / "public/fixtures/team-preview.png"))
    p.add_argument("out_dir", nargs="?", default=str(ROOT / "public/templates"))
    p.add_argument(
        "--slots",
        default=None,
        help="Comma-separated showdownIds for the 6 enemy slots (top→bottom). "
        "Default: 圖二 seed order.",
    )
    p.add_argument(
        "--merge",
        action="store_true",
        help="Merge new crops into existing manifest.json (by speciesId) instead of replacing.",
    )
    p.add_argument("--fixture-label", default=None, help="Optional fixture label stored in manifest entries.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    src = Path(args.source)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.slots:
        ids = [s.strip() for s in args.slots.split(",") if s.strip()]
        if len(ids) != SLOT_COUNT:
            raise SystemExit(f"--slots needs exactly {SLOT_COUNT} ids, got {len(ids)}: {ids}")
        slots_meta = [
            {
                "speciesId": sid,
                "speciesNameZh": ZH_FALLBACK.get(sid, sid),
                "formNote": None,
            }
            for sid in ids
        ]
    else:
        slots_meta = list(SEED_SLOTS)

    fixture_label = args.fixture_label or src.stem

    im = Image.open(src).convert("RGB")
    cx, cy, cw, ch = content_rect(*im.size)
    px = int(cx + ENEMY_PANEL["left"] * cw)
    py = int(cy + ENEMY_PANEL["top"] * ch)
    pw = max(1, int((ENEMY_PANEL["right"] - ENEMY_PANEL["left"]) * cw))
    ph = max(1, int((ENEMY_PANEL["bottom"] - ENEMY_PANEL["top"]) * ch))

    templates = []
    for slot, meta in enumerate(slots_meta):
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
        entry = {
            **meta,
            "file": f"{sid}.png",
            "slotSource": slot,
            "cropPx": {"x": tx, "y": ty, "w": tw, "h": th},
            "source": "roi-crop",
            "fixture": fixture_label,
        }
        templates.append(entry)
        print(f"{slot + 1} {sid} -> {dest.relative_to(ROOT)}")

    manifest_path = out_dir / "manifest.json"
    if args.merge and manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        by_id = {t["speciesId"]: t for t in manifest.get("templates", [])}
        for t in templates:
            by_id[t["speciesId"]] = t
        seed_order = [s["speciesId"] for s in SEED_SLOTS]
        merged = []
        for sid in seed_order:
            if sid in by_id:
                merged.append(by_id.pop(sid))
        for sid in sorted(by_id.keys()):
            merged.append(by_id[sid])
        templates = merged
        source_note = manifest.get("source", "roi-crop")
        if fixture_label not in str(source_note):
            source_note = f"{source_note} + {fixture_label}"
    else:
        source_note = str(src)
        manifest = {}

    manifest.update(
        {
            "source": source_note,
            "roiDoc": "v1.2",
            "panel": ENEMY_PANEL,
            "thumbCrop": THUMB_CROP,
            "templateSize": TEMPLATE_SIZE,
            "notes": (
                "PRIMARY recognition templates: ROI Doc v1.2 Team Preview crops (NOT HOME art). "
                "Forms/Mega/shiny separate later. CBD menu sprites under "
                "assets/templates/preview-thumbs/ (source: cbd) are optional secondary."
            ),
            "templates": templates,
            "defaultSource": "roi-crop",
            "sourceKind": "roi-crop",
        }
    )
    # Guard: ROI must stay locked
    assert manifest["panel"] == ENEMY_PANEL
    assert manifest["thumbCrop"] == THUMB_CROP
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("wrote", manifest_path.relative_to(ROOT), f"({len(templates)} templates)")


if __name__ == "__main__":
    main()
