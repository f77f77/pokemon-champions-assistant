#!/usr/bin/env python3
"""Cut Champions sprite_poke_3 cells into public/templates/ (RGBA, letterboxed 64).

Requires local sheet + CSS (not committed):
  /workspace/official-sprite-poke-3-channel.png
  /workspace/champ-sprite_poke_3.css

Yellow thumb geometry (mirror src/lib/roi.ts): square side = red card height.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError as e:
    raise SystemExit("Need Pillow") from e

ROOT = Path(__file__).resolve().parents[1]
SHEET = Path("/workspace/official-sprite-poke-3-channel.png")
CSS = Path("/workspace/champ-sprite_poke_3.css")
OUT = ROOT / "public/templates"
CELL = 128
TEMPLATE_SIZE = 64
ENEMY_PANEL = {"left": 0.811, "top": 0.143, "right": 0.965, "bottom": 0.832}
THUMB_CROP = {"left": 0.18, "right": 0.60, "topInset": 0.0, "bottomInset": 0.0}


def main() -> int:
    if not SHEET.exists() or not CSS.exists():
        print("Missing local sheet/CSS under /workspace/", file=sys.stderr)
        return 1
    css = CSS.read_text()
    pat = re.compile(
        r"\.sprite-poke-ui_PokeIcon_02_(\d+)_(\d+)_(\d+)\s*\{\s*background-size:[^;]+;"
        r"\s*background-position:\s*([0-9.]+)%\s+([0-9.]+)%;",
        re.S,
    )
    pos = {}
    for m in pat.finditer(css):
        dex, form = int(m.group(1)), int(m.group(2))
        col = int(round(float(m.group(4)) / 6.25))
        row = int(round(float(m.group(5)) / (100 / 15)))
        pos[(dex, form, 0)] = (col, row)

    pokemon = json.loads((ROOT / "data/pokemon.json").read_text())
    allow = json.loads((ROOT / "data/allowlist.json").read_text())["showdownIds"]
    manual = {"aegislash": (681, 0), "empoleon": (395, 0)}
    zh_fb = {
        "aegislash": "堅盾劍怪",
        "empoleon": "帝王拿波",
        "rotomwash": "清洗洛托姆",
        "ninetalesalola": "阿羅拉九尾",
    }

    def resolve(sid: str) -> tuple[int, int]:
        if sid in manual:
            return manual[sid]
        for e in pokemon:
            if e["showdownId"] == sid:
                dex = e["nationalDex"]
                if dex == 479:
                    order = [
                        "rotom",
                        "rotomheat",
                        "rotomwash",
                        "rotomfrost",
                        "rotomfan",
                        "rotommow",
                    ]
                    return dex, order.index(sid) if sid in order else 0
                if dex == 38:
                    return dex, 1 if sid == "ninetalesalola" else 0
                if dex == 902:
                    return dex, 1 if sid == "basculegionf" else 0
                return dex, 0
        raise KeyError(sid)

    def trim_alpha(cell: Image.Image, thr: int = 12, pad: int = 1) -> Image.Image:
        """Crop transparent padding so sprite fills similar fraction as in-card icons."""
        rgba = cell.convert("RGBA")
        a = list(rgba.getdata())
        w, h = rgba.size
        xs = [i % w for i, p in enumerate(a) if p[3] > thr]
        ys = [i // w for i, p in enumerate(a) if p[3] > thr]
        if len(xs) < 8:
            return rgba
        x0, x1 = max(0, min(xs) - pad), min(w, max(xs) + 1 + pad)
        y0, y1 = max(0, min(ys) - pad), min(h, max(ys) + 1 + pad)
        return rgba.crop((x0, y0, x1, y1))

    def letterbox_rgba(cell: Image.Image) -> Image.Image:
        cell = trim_alpha(cell.convert("RGBA"))
        canvas = Image.new("RGBA", (TEMPLATE_SIZE, TEMPLATE_SIZE), (0, 0, 0, 0))
        w, h = cell.size
        scale = min(TEMPLATE_SIZE / max(1, w), TEMPLATE_SIZE / max(1, h))
        nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
        resized = cell.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas.paste(resized, ((TEMPLATE_SIZE - nw) // 2, (TEMPLATE_SIZE - nh) // 2), resized)
        return canvas

    wanted = list(dict.fromkeys(list(allow) + ["aegislash", "empoleon", "rotomwash", "ninetalesalola"]))
    sheet = Image.open(SHEET).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()

    templates = []
    for sid in wanted:
        try:
            dex, form = resolve(sid)
        except KeyError:
            print("skip", sid)
            continue
        key = (dex, form, 0)
        if key not in pos:
            key = (dex, 0, 0)
            form = 0
        if key not in pos:
            print("no cell", sid, dex, form)
            continue
        col, row = pos[key]
        cell = sheet.crop((col * CELL, row * CELL, col * CELL + CELL, row * CELL + CELL))
        fname = f"{sid}.png"
        letterbox_rgba(cell).save(OUT / fname, "PNG")
        zh = zh_fb.get(sid)
        en = sid
        for e in pokemon:
            if e["showdownId"] == sid:
                zh = zh or e["names"].get("zh-Hant")
                en = e["names"].get("en") or sid
                break
        templates.append(
            {
                "speciesId": sid,
                "speciesNameZh": zh or sid,
                "speciesNameEn": en,
                "file": fname,
                "formNote": f"sprite_poke_3 RGBA cell dex={dex:04d} form={form:02d}",
                "sheetCell": {"col": col, "row": row, "dex": dex, "form": form, "px": CELL},
                "source": "sprite_poke_3",
            }
        )
        print("OK", sid)

    manifest = {
        "source": "Champions sprite_poke_3 official sheet cells (RGBA cut; alpha-masked gray match)",
        "sheet": "sprite_poke_3 (local cut only; raw sheet not committed)",
        "roiDoc": "v1.3-square-thumb",
        "panel": ENEMY_PANEL,
        "thumbCrop": THUMB_CROP,
        "thumbGeometry": "square side = red card (slot) height; left offset on sprite",
        "templateSize": TEMPLATE_SIZE,
        "notes": (
            "PRIMARY templates from sprite_poke_3 (alpha-trimmed cells). Match grayscale with alpha∩query mask. "
            "Capture: square yellow ROI → contain/letterbox 64, never stretch."
        ),
        "templates": templates,
        "defaultSource": "sprite_poke_3",
        "sourceKind": "sprite_poke_3",
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote {len(templates)} templates")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
