# 🏋️ 怪獸訓練紀錄 App — 設定與部署說明

這是把原本的 HTML 升級成「**所有裝置都能檢視、上傳、匯出，並且雲端自動同步**」的程式。
手機、平板、電腦只要打開同一個網址就能看到同一份紀錄；任何裝置新增，其他裝置重新整理就會同步。

---

## 📁 這個資料夾有什麼

| 檔案 | 用途 | 要不要改 |
|---|---|---|
| `index.html` | 主程式 | ❌ 不用改 |
| `config.js` | **雲端同步的設定（要填 2 個值）** | ✅ 要改 |
| `manifest.webmanifest` / `sw.js` | 讓它能「安裝成 App」、可離線 | ❌ 不用改 |
| `icon-*.png` | App 圖示 | ❌ 不用改 |

> 即使**完全不設定雲端**，直接用也可以——只是紀錄只會存在「當下這台裝置」（畫面右上角會顯示「本機模式」）。
> 要做到跨裝置同步，請完成下面 **步驟 1 + 步驟 2**。

---

## ✅ 步驟 1：建立免費雲端資料庫（Supabase，約 5 分鐘）

1. 到 <https://supabase.com> → 點 **Start your project** → 用 Google 或 Email 註冊（免費）。
2. 點 **New project**：
   - Name：隨意（例如 `monster-train`）
   - Database Password：自己設一組（記下來即可，平常用不到）
   - Region：選 **Northeast Asia (Tokyo)** 之類離台灣近的
   - 按 **Create new project**，等它跑好（約 1–2 分鐘）。
3. 左側選 **SQL Editor** → **New query** → 把下面整段貼上 → 按 **Run**：

   ```sql
   create table if not exists sessions (
     id uuid primary key default gen_random_uuid(),
     year int,
     date text,
     full_date text,
     content text,
     volume numeric,
     created_at timestamptz default now()
   );
   alter table sessions enable row level security;
   create policy "anon read"   on sessions for select using (true);
   create policy "anon insert" on sessions for insert with check (true);
   create policy "anon delete" on sessions for delete using (true);
   ```
   看到 **Success. No rows returned** 就成功了。

4. 左側選 **Project Settings（齒輪）→ API**，複製這兩個值：
   - **Project URL**（例：`https://abcdefgh.supabase.co`）
   - **anon public** 那把 key（很長一串，開頭通常是 `eyJ...`）

---

## ✅ 步驟 2：把兩個值填進 `config.js`

用記事本／文字編輯器打開 `config.js`，把剛剛複製的兩個值貼進去：

```js
window.MONSTER_CONFIG = {
  SUPABASE_URL: "https://abcdefgh.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJI....(你的 anon key)"
};
```

存檔即可。下次打開 App，右上角會從「本機模式」變成綠燈「已同步」。

---

## ✅ 步驟 3：放上網路，取得固定網址（讓所有裝置都能開）

最簡單的免費做法：**Netlify Drop**

1. 到 <https://app.netlify.com/drop>
2. 把整個 **`怪獸訓練App` 資料夾** 直接拖進網頁。
3. 幾秒後會得到一個網址（例：`https://你的名字.netlify.app`）——這就是你的 App 網址。
4. 手機、電腦、平板都用這個網址開即可。

> 其他選擇：**Cloudflare Pages**、**GitHub Pages** 也可以（都免費、都支援 https）。
> 重點：一定要用 **https 網址**，這樣才能「安裝成 App」並離線使用。

---

## ✅ 步驟 4：在手機上「安裝成 App」

- **iPhone（Safari）**：開啟網址 → 點下方「分享」→「加入主畫面」。
- **Android（Chrome）**：開啟網址 → 右上「⋮」→「安裝應用程式／加到主畫面」。

之後就像一般 App 一樣，從主畫面點開、可離線看舊紀錄。

---

## 🧩 怎麼用

- **➕ 新增訓練**：手動逐項輸入、或直接「貼上」一整段訓練文字（會自動算訓練量）。新增後自動上傳雲端。
- **📤 匯入**：把舊的 `怪獸訓練紀錄.csv` 或匯出的 `.json` 拖進來，自動去除重複、批次上傳。
- **📥 匯出 CSV / 💾 匯出 JSON**：把全部紀錄（歷史 + 新增）下載成檔案備份。
- **🗑 刪除**：滑到自己新增的卡片，點右上角垃圾桶（歷史 239 筆為基準資料，不提供刪除）。
- **右上角狀態燈**：綠＝已同步、橘＝本機模式、紅＝同步異常（點一下可重新同步）。

> 圖表（進步追蹤、訓練量）會自動把你新增的紀錄一起算進去並更新。

---

## 🔒 關於隱私（請看一下）

為了「不用登入、打開就能用」，這個設定讓**任何拿到你網址與 anon key 的人都能讀寫**你的紀錄。
對個人重訓日誌通常足夠，但請：

- 不要把你的網址 / `config.js` 公開貼到網路上。
- 如果之後想要「需要登入才能看」，可以再加上 Supabase 的帳號登入（Auth）+ 依使用者隔離資料——需要時再跟我說，我可以幫你升級。

---

## 🛠 小提醒

- 改了 `config.js` 之後，記得**重新部署（重拖一次資料夾）**或在頁面**重新整理一兩次**讓快取更新。
- 換新版本後若手機還顯示舊畫面：把 App 關掉重開，或在瀏覽器重新整理即可。
