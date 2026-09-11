# Team Preview fixtures

Formal recognition inputs are **raw 16:9 Team Preview screenshots**, not screenshots of this app.

| File | Notes |
|------|--------|
| `team-preview-live-latest.jpg` | 1920×1080 live capture. Expected: Froslass, Garchomp, **Basculegion-M**, Kingambit, Sneasler, Golisopod. |

The 2026-09-11 Pages report (slot 3 「未識別」 with a Basculegion-M crop) is **this same Team Preview** shown inside the app chrome. Do **not** feed the full app screenshot into `ENEMY_PANEL` — that ROI is relative to the game frame, so it would crop the enemy **card column** instead of the in-game thumbs.

Reproduce with the **browser** path (same `recognize.ts` as GitHub Pages), not only Python:

```bash
npx vite --port 5173
node scripts/match-recognize-browser.mjs
```

`getUserMedia` and 「載入測試圖」 both call `recognizeEnemyTeamFromCanvas`.
