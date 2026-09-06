# Pokémon Champions 對戰助手（v0.1 scaffold）

Electron + Vite + React（TypeScript）四區深色 UI 骨架。

對齊預設：OBS 虛擬鏡頭、本地縮圖辨認、Spe 手填、championsbattledata Doubles。

## 快速開始

安裝依賴後：

- 網頁預覽：執行套件腳本 dev
- 桌面：執行套件腳本 electron:dev
- 建置：執行套件腳本 build

指令形式為套件管理器的 run <腳本名>。

## 介面四區

1. 左：我方隊伍 — 6 卡；Showdown paste / JSON 匯入
2. 中上：擷取預覽 — getUserMedia / OBS；辨認敵方隊伍、生成對方隊伍
3. 中下：速度軸 — 敵方減速0/中性0/中性32/加速0；我方 Spe 手填
4. 右：敵方隊伍 — 未識別 + 手動覆寫；離線屬性抗性；top-6 招式 stub

## OBS 設定

1. OBS 啟動虛擬攝影機
2. 本程式開啟鏡頭，選 OBS Virtual Camera
3. 調整畫面使敵方右側六縮圖落入紅色 ROI

## ROI 備註

見 src/lib/recognize.ts 的 ROI 常數（相對座標 0-1）。
辨認：抓幀 -> 裁切 -> 本地 hash stub -> 低信心顯示未識別。無雲端 vision。

## 招式快取

src/lib/movesCache.ts：建議路徑 {userData}/.moves-cache/YYYY-MM-DD/{speciesKey}.json
目前為 memory + localStorage stub（Doubles 取向）。

## 非目標

- 雲端 vision / 讀遊戲記憶體 / 完整圖鑑
- 真實爬取 championsbattledata
- 正式發行流程細節

## 目錄

- electron/
- src/components/
- src/lib/
- src/App.tsx

Pokémon 為相關權利方商標；本專案與官方無關。
