#!/usr/bin/env python3
"""
Match Team Preview test fixtures against public/templates/ (sprite_poke_3).

Pipeline (pose/scale alignment):
  1. Yellow square ROI (side = red card height; locked panel + THUMB left)
  2. Suppress near-maroon card background → black
  3. Content-aware square recenter on non-black sprite blob
  4. Resize to TEMPLATE_SIZE (square crop → no letterbox pad)
  5. Multi-scale + small translation sweep of query
  6. Grayscale NCC/SSD/aHash with mask = template_alpha ∩ query_nonblack

ROI constants locked — mirror src/lib/roi.ts.
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

try:
    import numpy as np
except ImportError as e:
    raise SystemExit("Need numpy") from e

ROOT = Path(__file__).resolve().parents[1]

# Locked — mirror src/lib/roi.ts (DO NOT change panel; THUMB left only if square misses center)
ENEMY_PANEL = {"left": 0.811, "top": 0.143, "right": 0.965, "bottom": 0.832}
THUMB_CROP = {"left": 0.18, "right": 0.60, "topInset": 0.0, "bottomInset": 0.0}
TEMPLATE_SIZE = 64
SLOT_COUNT = 6
CARD_GAP_FRAC = 0.08  # fraction of pitch that is inter-card gap (mirror src/lib/roi.ts)
TARGET_ASPECT = 16 / 9
CONFIDENCE_THRESHOLD = 0.55

# Multi-scale + translation (query relative to 64×64)
MATCH_SCALES = (0.8, 0.95, 1.1, 1.25, 1.4)
MATCH_SHIFTS = (-8, -4, 0, 4, 8)

FIXTURES = [
    {
        "path": ROOT / "public/fixtures/team-preview-test-1.png",
        "label": "team-preview-test-1",
        "expected": [
            "charizard",
            "aerodactyl",
            "meowscarada",
            "garchomp",
            "rotomwash",
            "aegislash",
        ],
    },
    {
        "path": ROOT / "public/fixtures/team-preview-test-2.png",
        "label": "team-preview-test-2",
        "expected": [
            "whimsicott",
            "charizard",
            "basculegion",
            "kingambit",
            "sneasler",
            "garchomp",
        ],
    },
    {
        "path": ROOT / "public/fixtures/team-preview-test-3.png",
        "label": "team-preview-test-3",
        "expected": [
            "ninetalesalola",
            "empoleon",
            "garchomp",
            "staraptor",
            "whimsicott",
            "charizard",
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


def letterbox_to_template(im: Image.Image, *, keep_alpha: bool = False) -> Image.Image:
    """Contain/letterbox into TEMPLATE_SIZE×TEMPLATE_SIZE (never stretch)."""
    if keep_alpha:
        rgba = im.convert("RGBA")
        canvas = Image.new("RGBA", (TEMPLATE_SIZE, TEMPLATE_SIZE), (0, 0, 0, 0))
        w, h = rgba.size
        scale = min(TEMPLATE_SIZE / max(1, w), TEMPLATE_SIZE / max(1, h))
        nw = max(1, int(round(w * scale)))
        nh = max(1, int(round(h * scale)))
        resized = rgba.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas.paste(resized, ((TEMPLATE_SIZE - nw) // 2, (TEMPLATE_SIZE - nh) // 2), resized)
        return canvas
    rgb = im.convert("RGB")
    canvas = Image.new("RGB", (TEMPLATE_SIZE, TEMPLATE_SIZE), (0, 0, 0))
    w, h = rgb.size
    scale = min(TEMPLATE_SIZE / max(1, w), TEMPLATE_SIZE / max(1, h))
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    resized = rgb.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((TEMPLATE_SIZE - nw) // 2, (TEMPLATE_SIZE - nh) // 2))
    return canvas


def to_gray_arr(im: Image.Image) -> np.ndarray:
    rgb = np.asarray(letterbox_to_template(im).convert("RGB"), dtype=np.float32)
    return 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]


def to_gray_and_mask(im: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    rgba = letterbox_to_template(im, keep_alpha=True).convert("RGBA")
    arr = np.asarray(rgba)
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    gray = gray.astype(np.float32)
    # composite transparent → black for gray
    a = arr[:, :, 3]
    gray = np.where(a > 12, gray, 0.0).astype(np.float32)
    mask = (a > 12).astype(np.float32)
    return gray, mask


def average_hash(gray: np.ndarray, size: int = 8) -> str:
    side = TEMPLATE_SIZE
    block = side // size
    vals = []
    for gy in range(size):
        for gx in range(size):
            vals.append(float(gray[gy * block : (gy + 1) * block, gx * block : (gx + 1) * block].mean()))
    avg = sum(vals) / len(vals)
    return "".join("1" if v >= avg else "0" for v in vals)


def ncc(a: np.ndarray, b: np.ndarray, mask: np.ndarray | None = None) -> float:
    if mask is not None:
        m = mask > 0
        if int(m.sum()) < 8:
            return 0.0
        aa = a[m]
        bb = b[m]
    else:
        aa = a.ravel()
        bb = b.ravel()
    aa = aa - aa.mean()
    bb = bb - bb.mean()
    den = math.sqrt(float((aa * aa).sum()) * float((bb * bb).sum()))
    if den < 1e-6:
        return 0.0
    return float((aa * bb).sum() / den)


def ssd_similarity(a: np.ndarray, b: np.ndarray, mask: np.ndarray | None = None) -> float:
    if mask is not None:
        m = mask > 0
        if int(m.sum()) < 8:
            return 0.0
        aa = a[m]
        bb = b[m]
    else:
        aa = a.ravel()
        bb = b.ravel()
    d = ((aa - bb) / 255.0) ** 2
    return max(0.0, 1.0 - math.sqrt(float(d.mean())) * 2.0)


def hamming(a: str, b: str) -> int:
    n = min(len(a), len(b))
    return sum(1 for i in range(n) if a[i] != b[i]) + abs(len(a) - len(b))


def confidence(gray: np.ndarray, hash_s: str, tmpl_gray: np.ndarray, tmpl_hash: str, mask: np.ndarray | None = None) -> float:
    ncc_score = (ncc(gray, tmpl_gray, mask) + 1) / 2
    ssd_score = ssd_similarity(gray, tmpl_gray, mask)
    hash_bits = max(len(hash_s), len(tmpl_hash)) or 64
    hash_score = max(0.0, 1.0 - hamming(hash_s, tmpl_hash) / (hash_bits * 0.35))
    return min(1.0, ncc_score * 0.55 + ssd_score * 0.25 + hash_score * 0.2)


def crop_slot(im: Image.Image, slot: int, *, card_body: bool = False) -> Image.Image:
    """Yellow square crop for matching.

    Default card_body=False → side = full pitch (matches app recognition; ~15/18).
    card_body=True → side = pitch×(1-CARD_GAP_FRAC) (overlay yellow geometry).
    """
    cx, cy, cw, ch = content_rect(*im.size)
    px = int(cx + ENEMY_PANEL["left"] * cw)
    py = int(cy + ENEMY_PANEL["top"] * ch)
    pw = max(1, int((ENEMY_PANEL["right"] - ENEMY_PANEL["left"]) * cw))
    ph = max(1, int((ENEMY_PANEL["bottom"] - ENEMY_PANEL["top"]) * ch))
    pitch = ph / SLOT_COUNT
    gap = CARD_GAP_FRAC if card_body else 0.0
    body_h = pitch * (1 - gap)
    top_inset = pitch * (gap / 2)
    sx, sw = px, pw
    sy = int(py + slot * pitch + top_inset)
    sh = max(1, int(body_h))
    side = sh
    tx = int(sx + sw * THUMB_CROP["left"])
    max_x = sx + max(0, sw - side)
    tx = min(max(sx, tx), max_x)
    ty = sy
    return im.crop((tx, ty, tx + side, ty + side))


def is_maroon(arr: np.ndarray) -> np.ndarray:
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    return (r > 70) & (r > g * 1.5) & (r > b * 1.3) & (g < 100) & (b < 110)


def suppress_card_background(crop: Image.Image) -> Image.Image:
    """Zero near-maroon red-card pixels (and thin bottom UI bar)."""
    arr = np.asarray(crop.convert("RGB")).copy()
    arr[is_maroon(arr)] = 0
    dark = arr.sum(axis=2) < 45
    for y in range(arr.shape[0] - 1, max(0, arr.shape[0] - 12), -1):
        if dark[y].mean() > 0.55:
            arr[y, :] = 0
    return Image.fromarray(arr)


def content_aware_square(crop: Image.Image, pad: int = 6) -> Image.Image:
    """Tight square around non-black sprite blob, then return that crop."""
    g = np.asarray(crop.convert("RGB")).sum(axis=2)
    sm = g > 20
    ys, xs = np.where(sm)
    if len(xs) < 16:
        return crop
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    side = max(x1 - x0, y1 - y0) + pad
    w, h = crop.size
    side = min(side, w, h)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    sx = max(0, min(int(round(cx - side / 2)), w - side))
    sy = max(0, min(int(round(cy - side / 2)), h - side))
    return crop.crop((sx, sy, sx + side, sy + side))


def prep_query(crop: Image.Image) -> np.ndarray:
    """BG suppress → content recenter → 64×64 gray."""
    q = suppress_card_background(crop)
    q = content_aware_square(q)
    # square → resize (equivalent to letterbox with no pad)
    rgb = q.convert("RGB").resize((TEMPLATE_SIZE, TEMPLATE_SIZE), Image.Resampling.LANCZOS)
    arr = np.asarray(rgb, dtype=np.float32)
    return 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]


def iter_query_variants(gray0: np.ndarray):
    """Yield gray HxW variants at MATCH_SCALES × MATCH_SHIFTS."""
    yield gray0
    gimg = Image.fromarray(np.clip(gray0, 0, 255).astype(np.uint8), mode="L")
    for sc in MATCH_SCALES:
        nw = max(1, int(round(TEMPLATE_SIZE * sc)))
        r = gimg.resize((nw, nw), Image.Resampling.BILINEAR)
        for dy in MATCH_SHIFTS:
            for dx in MATCH_SHIFTS:
                if abs(sc - 1.0) < 1e-6 and dx == 0 and dy == 0:
                    continue
                if nw >= TEMPLATE_SIZE:
                    x = max(0, min((nw - TEMPLATE_SIZE) // 2 + dx, nw - TEMPLATE_SIZE))
                    y = max(0, min((nw - TEMPLATE_SIZE) // 2 + dy, nw - TEMPLATE_SIZE))
                    yield np.asarray(r.crop((x, y, x + TEMPLATE_SIZE, y + TEMPLATE_SIZE)), dtype=np.float32)
                else:
                    ox = (TEMPLATE_SIZE - nw) // 2 + dx
                    oy = (TEMPLATE_SIZE - nw) // 2 + dy
                    if ox < 0 or oy < 0 or ox + nw > TEMPLATE_SIZE or oy + nw > TEMPLATE_SIZE:
                        continue
                    canvas = np.zeros((TEMPLATE_SIZE, TEMPLATE_SIZE), dtype=np.float32)
                    canvas[oy : oy + nw, ox : ox + nw] = np.asarray(r, dtype=np.float32)
                    yield canvas


def load_templates(tmpl_dir: Path) -> list[dict]:
    manifest = json.loads((tmpl_dir / "manifest.json").read_text(encoding="utf-8"))
    templates: list[dict] = []
    for entry in manifest.get("templates", []):
        sid = entry["speciesId"]
        fpath = tmpl_dir / entry.get("file", f"{sid}.png")
        if not fpath.exists():
            print(f"WARN missing template file: {fpath}")
            continue
        g, mask = to_gray_and_mask(Image.open(fpath))
        templates.append(
            {
                "speciesId": sid,
                "gray": g,
                "mask": mask,
                "hash": average_hash(g),
                "meta": entry,
                "file": fpath.name,
            }
        )
    return templates


def match_slot(gray0: np.ndarray, templates: list[dict]) -> tuple[str | None, float]:
    best_id: str | None = None
    best_c = -1.0
    for g in iter_query_variants(gray0):
        qmask = (g > 12).astype(np.float32)
        h = average_hash(g)
        for t in templates:
            mask = t["mask"] * qmask
            c = confidence(g, h, t["gray"], t["hash"], mask)
            if c > best_c:
                best_c = c
                best_id = t["speciesId"]
    return best_id, best_c


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
    print(f"ROI locked: panel={ENEMY_PANEL} thumb={THUMB_CROP} CARD_GAP_FRAC={CARD_GAP_FRAC}")
    print(f"Match: bg-suppress + content-recenter + scales={MATCH_SCALES} shifts={MATCH_SHIFTS}")
    print(f"Mask: template_alpha ∩ query_nonblack; conf weights NCC×0.55+SSD×0.25+aHash×0.20")

    for fx in FIXTURES:
        src = fx["path"]
        im = Image.open(src).convert("RGB")
        print(f"\n=== {fx['label']} ({src.relative_to(ROOT)}) ===")
        print(f"{'slot':<4} {'expected':<14} {'matched':<14} {'conf':>6}  ok")
        for slot, expected in enumerate(fx["expected"]):
            crop = crop_slot(im, slot)
            gray0 = prep_query(crop)
            best_id, best_c = match_slot(gray0, templates)
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
        f"- Fixtures: `public/fixtures/team-preview-test-1/2/3.png`",
        f"- Templates: `public/templates/*.png` (sprite_poke_3 alpha-trimmed cells; {len(templates)} files / {n_ids} ids)",
        f"- Matcher: BG suppress + content-aware recenter + multi-scale/shift; NCC×0.55 + SSD×0.25 + aHash×0.20",
        f"- Mask: template alpha ∩ query non-black",
        f"- Scales: `{list(MATCH_SCALES)}`; shifts: `{list(MATCH_SHIFTS)}`",
        f"- Threshold: {CONFIDENCE_THRESHOLD}",
        f"- ROI Doc: v1.3-square-thumb (panel/thumb constants **locked**)",
        f"- **Overall accuracy: {accuracy}**",
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

    misses = [r for r in all_rows if not r["ok"]]
    lines += [
        "## Misses",
        "",
    ]
    if not misses:
        lines.append("- None")
    else:
        for r in misses:
            lines.append(
                f"- `{r['fixture']}` slot {r['slot']}: expected **{r['expected']}**, matched **{r['matched']}** ({r['confidence']:.3f})"
            )
    lines += [
        "",
        "## Notes",
        "",
        "- Overlay yellow is a **square** with side = red card **body** height (pitch×(1-CARD_GAP_FRAC), CARD_GAP_FRAC=0.08) via `thumbCssPercent`/`cardRect`.",
        "- Recognition/match crop uses **full pitch** square (side=pitch; `card_body=False`) — card-body shrink regresses fixtures; `THUMB_CROP.left = 0.18`.",
        "- Templates trimmed of transparent padding from sprite_poke_3 cells, then contain/letterbox to 64.",
        "- Capture path suppresses maroon card BG and recenters on the sprite blob before multi-scale match.",
        "- `recognize.ts` mirrors this pipeline.",
        "",
    ]
    out_md.write_text("\n".join(lines), encoding="utf-8")
    out_json.write_text(
        json.dumps(
            {
                "accuracy": accuracy,
                "correct": correct,
                "total": total,
                "templateCount": len(templates),
                "speciesIdCount": n_ids,
                "threshold": CONFIDENCE_THRESHOLD,
                "scales": list(MATCH_SCALES),
                "shifts": list(MATCH_SHIFTS),
                "rows": all_rows,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {out_md.relative_to(ROOT)}")
    print(f"Wrote {out_json.relative_to(ROOT)}")
    return 0 if correct >= 12 else 2


if __name__ == "__main__":
    raise SystemExit(main())
