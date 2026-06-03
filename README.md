# Coast FIRE 規劃器

> 槓桿指數投資 + 準備金紀律的 **Coast FIRE** 規劃器。
> 單一 HTML、純前端、**離線運算、財務數字不外傳**;所有報酬皆為前瞻假設、非預測。

線上使用(部署後):**https://bisgerg.github.io/fire-planner/**

---

## 這是什麼

一個給台灣投資人用的退休／財務自由(FIRE)試算工具,特別著重在**槓桿 ETF(0050 正2、QLD)的真實風險揭露**。它不會跟你保證未來,而是用上千種市場劇本(蒙地卡羅 / 歷史重抽)算出**機率分布**與**最壞情況**,幫你看清楚:

- 你大概幾歲能達成 **Coast / Full / Barista FIRE**;
- 退休金夠不夠用到老(真實提領模擬,含序列風險);
- 用槓桿會把報酬與**回撤**各放大成什麼樣子。

## 特色

- **分頁式流程**:`使用導覽 → 設定 → 結果 → 風險與對照 → 觀念與來源`。
- **兩種模擬引擎**:
  - **參數化抽樣**(常態 + 肥尾 Student‑t,可自由設定年化/波動,平滑);
  - **歷史 block‑bootstrap**:用 **美股 + 美債 1928–2024 真實年報酬**(Damodaran NYU Stern)整段抽樣,保留**失落十年 / 序列風險 / 崩盤相關性**——通常會讓槓桿配置看起來更危險(這才是真相)。
- **正二/QLD 建模**:`2 × 標的 − 波動耗損 − 內扣 − 逆價差/融資`,逆價差/波動耗損/融資皆為可調滑桿。
- **五種「現金回市場機制」**:再平衡 + 崩盤加碼(預設)/ 純再平衡 / 純崩盤加碼(−12/−22/−32/−42)/ 深觸發原型712 / 買進持有,附**實際操作手法**。
- **歷史崩盤壓測**:把 1990 失落十年、2000 網路泡沫、2008 海嘯、2020 COVID 套到你的配置,與純 0050 對照。
- **最大回撤、退休成功率、生命週期降槓、分批進場、彈性提領**等。
- **逆價差自動更新**:GitHub Action 每月計算近 5 年台股 2x 逆價差,寫入 `carry.json`。
- 設定自動存於瀏覽器 `localStorage`,下次打開沿用。

## 檔案結構

```
index.html                      # 主程式(自包含:HTML + CSS + JS + 內嵌歷史資料)
carry.json                      # 逆價差估計值(GitHub Action 每月更新)
scripts/update_carry.js         # 逆價差計算腳本(Node,抓 Yahoo 0050/00631L 做 OLS)
.github/workflows/update-carry.yml  # 每月排程 + 手動觸發,提交 carry.json
```

## 部署(GitHub Pages)

1. Repo → **Settings → Pages** → Source 選 `Deploy from a branch`,Branch 選 `main` / `/ (root)`。
2. 等幾分鐘,即可由 `https://<user>.github.io/fire-planner/` 開啟。
3. 純靜態、無後端;逆價差由排程的 GitHub Action 自動更新 `carry.json`,網頁讀取即可。

## 方法論與資料來源

- **歷史報酬**:Damodaran(NYU Stern)美股 S&P 500、10 年期美債年報酬 1928–2024;CPI 換算實質。
- **逆價差驗證**:台灣證交所報酬指數、Yahoo Finance(0050 / 00631L)。
- 歷史模式中,台股/QQQ 等以**美股史代理**序列形狀(台股長期可靠資料不易取得),年內崩盤會被平滑;台股專屬的 1990 −80% 崩盤另見「歷史崩盤壓測」。

## 參考來源(策略概念)

- **大仁哥 / Capufish**(letf.com.tw 部落格、《槓桿 ETF 投資法》、PTT):50:50 槓桿配置、偏離帶再平衡、曝險刻度、生命週期、行為層。
- **onekoni**(PTT):準備金提列「712」框架 + 崩盤漸進加碼(−12/−22/−32/−42)。
- 學術:Bengen / Trinity(SWR)、Ayres‑Nalebuff(生命週期投資)、Merton / Perold‑Sharpe(固定比例/CPPI)、Markowitz‑Graham‑Bernstein(50:50 後悔最小化)。

## ⚠️ 免責聲明

本工具僅供**教育與試算用途,非投資建議**。所有報酬皆為前瞻假設、非保證,過去績效不代表未來。槓桿投資可能造成重大虧損,請依自身狀況審慎評估。

---

🤖 部分內容由 [Claude Code](https://claude.com/claude-code) 協助開發。
