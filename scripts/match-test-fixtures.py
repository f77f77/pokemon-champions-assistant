#!/usr/bin/env python3
"""
Match both Team Preview test fixtures against public/templates/ (ROI Doc v1.2).

Reports per-slot predicted vs expected and overall accuracy (12 enemy slots).
ROI constants locked — mirror src/lib/roi.ts / crop-preview-templates.py.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError as e:
    raise SystemExit("Need Pillow: pip install pillow") from e

ROOT = Path(__file__).resolve().parents[1]

# Locked — mirror src/lib/roi.ts (DO NOT change)
ENEMY_PANEL = {"left": 0.811, "top": 0.143, "right": 0.965, "bottom": 0.832}
THUMB_CROP = {"left": 0.20, "right": 0.55, "topInset": 0.25, "bottomInset": 0.05}
TEMPLATE_SIZE = 64
SLOT_COUNT = 6
TARGET_ASPECT = 16 / 9
CONFIDENCE_THRESHOLD = 0.55

FIXTURES = [
    {
        "path": ROOT / "public/fixtures/team-preview-test-1.png",
        "label": "team-preview-test-1",
        "expected": [
            "gengar",
            "sableye",
            "zoroark",
            "basculegion",
            "annihilape",
            "sinistcha",  # crop: tea bowl / whisk — 來悲粗茶 (not Poltchageist / Brambleghast)
        ],
    },
    {
        "path": ROOT / "public/fixtures/team-preview-test-2.png",
        "label": "team-preview-test-2",
        "expected": [
            "charizard",
            "bellibolt",
            "scovillain",
            "archaludon",
            "blastoise",
            "sableye",
        ],
    },
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


def to_gray(im: Image.Image) -> list[float]:
    rgb = im.convert("RGB").resize((TEMPLATE_SIZE, TEMPLATE_SIZE), Image.Resampling.LANCZOS)
    pix = rgb.load()
    out: list[float] = []
    for y in range(TEMPLATE_SIZE):
        for x in range(TEMPLATE_SIZE):
            r, g, b = pix[x, y]
            out.append(0.299 * r + 0.587 * g + 0.114 * b)
    return out


def average_hash(gray: list[float], size: int = 8) -> str:
    side = TEMPLATE_SIZE
    block = side // size
    vals = []
    for gy in range(size):
        for gx in range(size):
            s = 0.0
            for by in range(block):
                for bx in range(block):
                    s += gray[(gy * block + by) * side + (gx * block + bx)]
            vals.append(s / (block * block))
    avg = sum(vals) / len(vals)
    return "".join("1" if v >= avg else "0" for v in vals)


def ncc(a: list[float], b: list[float]) -> float:
    n = min(len(a), len(b))
    if n == 0:
        return 0.0
    mean_a = sum(a[:n]) / n
    mean_b = sum(b[:n]) / n
    num = den_a = den_b = 0.0
    for i in range(n):
        da = a[i] - mean_a
        db = b[i] - mean_b
        num += da * db
        den_a += da * da
        den_b += db * db
    den = math.sqrt(den_a * den_b)
    if den < 1e-6:
        return 0.0
    return num / den


def ssd_similarity(a: list[float], b: list[float]) -> float:
    n = min(len(a), len(b))
    if n == 0:
        return 0.0
    s = 0.0
    for i in range(n):
        d = (a[i] - b[i]) / 255.0
        s += d * d
    return max(0.0, 1.0 - math.sqrt(s / n) * 2.0)


def hamming(a: str, b: str) -> int:
    n = min(len(a), len(b))
    return sum(1 for i in range(n) if a[i] != b[i]) + abs(len(a) - len(b))


def confidence(gray: list[float], hash_s: str, tmpl_gray: list[float], tmpl_hash: str) -> float:
    ncc_score = (ncc(gray, tmpl_gray) + 1) / 2
    ssd_score = ssd_similarity(gray, tmpl_gray)
    hash_bits = max(len(hash_s), len(tmpl_hash)) or 64
    hash_score = max(0.0, 1.0 - hamming(hash_s, tmpl_hash) / (hash_bits * 0.35))
    return min(1.0, ncc_score * 0.55 + ssd_score * 0.25 + hash_score * 0.2)


def crop_slot(im: Image.Image, slot: int) -> Image.Image:
    cx, cy, cw, ch = content_rect(*im.size)
    px = int(cx + ENEMY_PANEL["left"] * cw)
    py = int(cy + ENEMY_PANEL["top"] * ch)
    pw = max(1, int((ENEMY_PANEL["right"] - ENEMY_PANEL["left"]) * cw))
    ph = max(1, int((ENEMY_PANEL["bottom"] - ENEMY_PANEL["top"]) * ch))
    slot_h = ph / SLOT_COUNT
    sx, sy, sw, sh = px, int(py + slot * slot_h), pw, max(1, int(slot_h))
    tx = int(sx + sw * THUMB_CROP["left"])
    ty = int(sy + sh * THUMB_CROP["topInset"])
    tw = max(1, int(sw * (THUMB_CROP["right"] - THUMB_CROP["left"])))
    th = max(1, int(sh * (1 - THUMB_CROP["topInset"] - THUMB_CROP["bottomInset"])))
    return im.crop((tx, ty, tx + tw, ty + th))


def load_templates(tmpl_dir: Path) -> list[dict]:
    """Load all manifest entries (multiple files may share a speciesId)."""
    manifest = json.loads((tmpl_dir / "manifest.json").read_text(encoding="utf-8"))
    templates: list[dict] = []
    for entry in manifest.get("templates", []):
        sid = entry["speciesId"]
        fpath = tmpl_dir / entry.get("file", f"{sid}.png")
        if not fpath.exists():
            print(f"WARN missing template file: {fpath}")
            continue
        g = to_gray(Image.open(fpath))
        templates.append(
            {"speciesId": sid, "gray": g, "hash": average_hash(g), "meta": entry, "file": fpath.name}
        )
    return templates


def main() -> int:
    tmpl_dir = ROOT / "public/templates"
    templates = load_templates(tmpl_dir)
    if not templates:
        print("No templates loaded")
        return 1

    all_rows = []
    correct = 0
    total = 0
    n_ids = len({t["speciesId"] for t in templates})

    print(f"Templates: {len(templates)} files / {n_ids} speciesIds from {tmpl_dir.relative_to(ROOT)}")
    print(f"ROI locked: panel={ENEMY_PANEL} thumb={THUMB_CROP}")

    for fx in FIXTURES:
        src = fx["path"]
        im = Image.open(src).convert("RGB")
        print(f"\n=== {fx['label']} ({src.relative_to(ROOT)}) ===")
        print(f"{'slot':<4} {'expected':<14} {'matched':<14} {'conf':>6}  ok")
        for slot, expected in enumerate(fx["expected"]):
            crop = crop_slot(im, slot)
            gray = to_gray(crop)
            h = average_hash(gray)
            best_id, best_c = None, -1.0
            for t in templates:
                c = confidence(gray, h, t["gray"], t["hash"])
                if c > best_c:
                    best_id, best_c = t["speciesId"], c
            ok = best_id == expected and best_c >= CONFIDENCE_THRESHOLD
            if ok:
                correct += 1
            total += 1
            mark = "Y" if ok else "N"
            print(f"{slot:<4} {expected:<14} {best_id or '-':<14} {best_c:6.3f}  {mark}")
            all_rows.append(
                {
                    "fixture": fx["label"],
                    "slot": slot,
                    "expected": expected,
                    "matched": best_id,
                    "confidence": round(best_c, 4),
                    "ok": ok,
                }
            )

    accuracy = f"{correct}/{total}"
    print(f"\nOverall accuracy: {accuracy}")

    out_md = ROOT / "docs/match-test-fixtures-results.md"
    out_json = ROOT / "docs/match-test-fixtures-results.json"
    out_md.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        "# Test fixture match results",
        "",
        f"- Fixtures: `public/fixtures/team-preview-test-1.png`, `team-preview-test-2.png`",
        f"- Templates: `public/templates/*.png` (ROI Doc v1.2 crops, `source: roi-crop`; {len(templates)} files / {n_ids} ids)",
        f"- Matcher: NCC×0.55 + SSD×0.25 + aHash×0.20 (same weights as `recognize.ts`)",
        f"- Threshold: {CONFIDENCE_THRESHOLD}",
        f"- ROI Doc: v1.2 (panel/thumb constants **locked**)",
        f"- **Overall accuracy: {accuracy}**",
        "",
        "## Slot 6 identity (test-1)",
        "",
        "- Crop shows tea-bowl / whisk silhouette → **sinistcha** (來悲粗茶), not Poltchageist (斯魔茶) or Brambleghast (怖納噬草).",
        "- Test-1 slot 3 labeled **zoroark** (Unovan base; crop is dark gray + red mane, not Hisuian white).",
        "",
    ]

    for fx in FIXTURES:
        rows = [r for r in all_rows if r["fixture"] == fx["label"]]
        fx_ok = sum(1 for r in rows if r["ok"])
        lines += [
            f"## {fx['label']}",
            "",
            f"**Accuracy: {fx_ok}/{len(rows)}**",
            "",
            "| slot | expected | matched | confidence | ok |",
            "|------|----------|---------|------------|----|",
        ]
        for r in rows:
            lines.append(
                f"| {r['slot']} | {r['expected']} | {r['matched']} | {r['confidence']:.4f} | {'Y' if r['ok'] else 'N'} |"
            )
        lines.append("")

    lines += [
        "## Notes",
        "",
        "- Prefer **ROI-crop** seeds in `public/templates/` for Team Preview recognition.",
        "- CBD menu sprites under `assets/templates/preview-thumbs/` (`source: cbd`) fill gaps only;",
        "  recognition default stays ROI crops.",
        "- `recognize.ts` loads all `manifest.json` entries (not only the original 6 圖二 seeds).",
        "- ROI constants must stay locked (`src/lib/roi.ts` ↔ crop/match scripts).",
        "",
    ]
    out_md.write_text("\n".join(lines), encoding="utf-8")
    out_json.write_text(
        json.dumps(
            {
                "accuracy": accuracy,
                "correct": correct,
                "total": total,
                "templateCount": len(templates), "speciesIdCount": len({t["speciesId"] for t in templates}),
                "threshold": CONFIDENCE_THRESHOLD,
                "rows": all_rows,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {out_md.relative_to(ROOT)}")
    print(f"Wrote {out_json.relative_to(ROOT)}")
    return 0 if correct == total else 2


if __name__ == "__main__":
    raise SystemExit(main())
