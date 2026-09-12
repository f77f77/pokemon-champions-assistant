# Team Preview fixtures

Formal recognition inputs are **raw 16:9 Team Preview screenshots**, not screenshots of this app.

| File | Notes |
|------|--------|
| `team-preview-test-1.jpg` | 1920×1080 test capture #1 |
| `team-preview-test-2.jpg` | 1920×1080 test capture #2 |
| `team-preview-test-3.jpg` | 1920×1080 test capture #3 |
| `team-preview-test-4.jpg` | 1920×1080 test capture #4 |

「載入測試圖」按鈕會依序循環這四張。

Reproduce with the **browser** path (same `recognize.ts` as GitHub Pages), not only Python:

```bash
npx vite --port 5173
node scripts/match-recognize-browser.mjs
```

`getUserMedia` and 「載入測試圖」 both call `recognizeEnemyTeamFromCanvas`.
