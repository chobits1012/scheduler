# ShiftSync 專案交接報告

> 給下一個對話／開發者用的完整背景。最後更新：2026-06-24

---

## 一、專案是什麼

| 項目 | 內容 |
|------|------|
| **名稱** | ShiftSync — Dual Job Scheduler |
| **用途** | 雙（多）工作排班管理，Japandi 風格月曆 UI |
| **本機路徑** | `/Users/jameswang/dual_job_scheduler_James` |
| **正式部署** | https://scheduler-three-tau.vercel.app/ |
| **預設工作** | `job-a` 小狐狸、`job-b` **開溜**（公司班表匯入目標） |

---

## 二、技術棧

- React 19 + TypeScript + Vite 6
- Tailwind（CDN + inline classes）
- **本機班表**：`localStorage`
- **雲端備份（選用）**：Firebase Auth + Firestore（需貼 `firebaseConfig`）
- **匯入班表（新做）**：Google Identity Services OAuth + Sheets API **唯讀**
- 匯出：`.ics`（已有）

---

## 三、使用者需求與決策（重要）

### 已確認的產品方向

1. **先做「讀取」公司 Google 試算表 → 匯入 ShiftSync → 匯出 .ics**
2. **不做寫回**公司試算表（怕改亂班表）
3. 匯入採 **覆蓋**「開溜」該月份舊班表（使用者目前沒手動排班）
4. **Firebase / Supabase 雲端同步** 是另一件事，暫不優先
5. 已把 **Google 登入從 Firebase 拆開**，匯入班表不需 Firebase

### 公司試算表（開溜製造所）

- **試算表 ID**：`1ms4h5iJwgIhW2et2jA3e9Xynm4mf3RrGA3kAbr5Fok4`
- **分頁命名**：`7演員`（數字=月份，中文=職位）
- **使用者職位**：演員
- **使用者姓名**：王捷仟
- **參考 HTML 匯出**：`/Users/jameswang/Desktop/開溜製造所_班表/7演員.html`

### 試算表格式（使用者視角，以截圖為準）

```
A 欄：名字（王捷仟，合併約 243–257 列）
每天 3 欄：時間 | 排班 | 狀態
7/1 = H,I,J → 7/2 = K,L,M → 7/3 = N,O,P …
```

- **灰底 = X** = 不可排（A1 圖例）
- **排班欄**有白底 + 內容才算有班（如 `16:00 寂`、`19:20 黃`）
- **寂、黃、卦、洋** 等是 **主題簡寫**，不是搭檔名字 → 匯入時放 `note`
- 左側還有 **給班區**（CDE 起），與右側 **時間|排班|狀態** 並存；程式應只讀含「時間」的子欄位區塊

---

## 四、本次已實作（未 commit）

### 新增檔案

| 檔案 | 用途 |
|------|------|
| `services/googleAuth.ts` | GIS Token Client，唯讀 scope，`ensureGoogleAccessToken()` |
| `hooks/useGoogleAuth.ts` | Google 登入狀態（獨立於 Firebase） |
| `hooks/useGoogleSheets.ts` | 讀取試算表 → 解析 → `previewShifts` |
| `utils/sheetImport.ts` | 解析邏輯：`findUserBlock`、`buildDayColumnMap`、`parseShiftCell` |
| `components/SyncConfigModal.tsx` | 匯入 UI：設定 → 預覽 → 確認匯入 |
| `google-gis.d.ts` | `window.google` 型別 |
| `.env.example` | 環境變數範本 |
| `GOOGLE_SHEETS_SYNC_SPEC.md` | 舊版「寫回灰底」規格（已過時，僅供參考） |

### 修改檔案

| 檔案 | 變更 |
|------|------|
| `App.tsx` | 匯入班表按鈕、覆蓋開溜邏輯、接 `useGoogleAuth` |
| `hooks/useAuth.ts` | Firebase 登入移除 Sheets scope；logout 不清 Google token |
| `types.ts` | 簡化 `SyncConfig`；新增 storage keys |
| `index.html` | 本機 dev 停用 Service Worker（避免空白頁） |

### 本機設定（已建立，gitignore）

`.env.local`（`*.local` 已在 `.gitignore`，勿 commit）：

```env
VITE_GOOGLE_CLIENT_ID=31480623031-3aqe2occl9uh057sf4mllc2j65ok4ca3.apps.googleusercontent.com
```

---

## 五、Google Cloud 設定狀態

| 項目 | 狀態 |
|------|------|
| GCP 專案 | `dual job helper` |
| OAuth 用戶端 | 網頁應用程式，已建立 |
| Client ID | 見 `.env.local` |
| Client Secret | **前端不需要**，勿 commit |
| 測試使用者 | 需包含 `chobits1012@gmail.com`（曾遇 403 access_denied） |
| Sheets API | 需確認已啟用 |
| JS 來源應有 | `http://localhost:3000`、`http://127.0.0.1:3000`、`https://scheduler-three-tau.vercel.app` |

### Vercel（尚未設定）

在 Vercel → **Settings → Environment Variables** 新增：

```env
VITE_GOOGLE_CLIENT_ID=31480623031-3aqe2occl9uh057sf4mllc2j65ok4ca3.apps.googleusercontent.com
```

勾選 Production、Preview，儲存後 **Redeploy**。

---

## 六、匯入流程（程式設計）

```
使用者點「匯入班表」
  → SyncConfigModal
  → Google 登入（GIS, spreadsheets.readonly）
  → 填 URL / 分頁名 / 姓名
  → loadShiftsFromSheet()
      1. parseMonthFromSheetName("7演員") → month=7
      2. GET A1:A1000 找王捷仟
      3. GET 1:3 建 dayColumns（含「時間」的 3 欄組）
      4. GET 使用者區塊 A{start}:CZ{end}
      5. parseUserBlockToShifts → Shift[]
  → 預覽 → 確認匯入
  → App 覆蓋 job-b 該月 shifts
```

### 覆蓋邏輯（`App.tsx`）

- `jobId = JOB_B_ID`（`job-b` = 開溜）
- 移除同年同月、同 job-b 的 shifts，再 append 匯入結果

---

## 七、已知問題（下一個對話要修）

### P0：按「讀取並預覽」跑一下後沒反應

**使用者狀態**：Google 已登入、已貼班表，按鈕有 loading，但沒進預覽、沒明顯錯誤。

**可能原因（依優先序）**：

1. **錯誤被吃掉、UI 沒顯示**  
   `SyncConfigModal.handlePreview` 的 `catch {}` 空著，錯誤只在 `sheetError`，可能被 `onClearPreview` 清掉或使用者沒注意到紅框。

2. **`buildDayColumnMap` 回傳空陣列**  
   條件 `sub.includes('時間')` 可能過嚴；給班區與排班區子欄位順序因日而異。  
   → 錯誤訊息：「無法解析班表日期欄位」

3. **年份**  
   `year = currentDate.getFullYear()` → 2026；若班表實際是其他年份，日期會錯（通常不會導致 0 筆）。

4. **找到 0 筆可匯入**  
   → 錯誤：「讀取成功，但沒有找到可匯入的排班」

5. **Sheets API 403**  
   → 需啟用 API 或確認 Gmail 能開啟試算表

6. **分頁名稱**  
   必須與 Google 分頁完全一致（如 `7演員`）

**建議除錯步驟**：

1. 用 `7演員.html` 離線測 `utils/sheetImport.ts`
2. 在 `loadShiftsFromSheet` 加 log：`userBlock`、`dayColumns.length`、`shifts.length`
3. `SyncConfigModal` 顯示 `sheetError`，不要 silent catch
4. 必要時放寬 `buildDayColumnMap` 或依 HIJ=7/1 固定欄位 offset

### P1：本機空白頁

- 原因：port 3000 被占用 → Vite 改跑 3001；或 Service Worker 快取
- 已改 `index.html`：本機 unregister SW
- 開發：`npm run dev` → http://127.0.0.1:3000/

### P2：`buildDayColumnMap` 與實際表可能不完全對齊

從 HTML 分析：

- 表頭 `7/1` 在 C 欄起（給班區）；使用者畫面上 **HIJ = 7/1** 是右側「時間|排班|狀態」區
- 程式用「含時間的子欄位」過濾，可能漏天或對錯欄
- **建議**：掃描子標題列找連續 `時間|排班|狀態`，或允許設定排班區起始欄（H）

### P3：死碼

- `App.tsx` 仍 import `generateAvailabilityMessage`、`isAiModalOpen`（AI UI 已移除）
- `GOOGLE_SHEETS_SYNC_SPEC.md` 描述舊「寫回」邏輯

### 未做

- Vercel 環境變數
- `使用說明.md` 更新匯入章節
- Git commit / push
- `sheetImport.ts` 單元測試（建議用 `7演員.html`）

---

## 八、專案結構速查

```
App.tsx                         # 主 UI、匯入/覆蓋 handler
components/SyncConfigModal.tsx  # 匯入 modal
hooks/useGoogleAuth.ts          # Google 登入（匯入用）
hooks/useGoogleSheets.ts        # 讀表 API
hooks/useAuth.ts                # Firebase（雲端備份用）
hooks/useCloudSync.ts           # localStorage ↔ Firestore
utils/sheetImport.ts            # 解析核心
services/googleAuth.ts          # GIS token
services/firebase.ts            # Firebase init
types.ts                        # Job, Shift, SyncConfig
使用說明.md                      # 舊手冊（未含匯入）
```

---

## 九、本機開發

```bash
cd /Users/jameswang/dual_job_scheduler_James
npm install
# 確認 .env.local 有 VITE_GOOGLE_CLIENT_ID
npm run dev
# 開 http://127.0.0.1:3000/
```

**測試匯入**（不需 Firebase）：

1. 側邊欄 **匯入班表**
2. 登入 Google
3. 試算表 URL、分頁 `7演員`、姓名 `王捷仟`
4. **讀取並預覽**

---

## 十、Git 狀態（2026-06-24）

- **Branch**：`main`（與 origin 同步）
- **未 commit**：匯入功能相關所有新檔與修改
- **最後 commit**：`21a4ab1` Docs: Update HelpModal with full user manual content

---

## 十一、建議下一階段任務

### 第一優先：修「讀取並預覽無反應」

1. `SyncConfigModal`：catch 時顯示錯誤；避免打開 modal 時清掉剛產生的 error
2. `loadShiftsFromSheet`：加診斷資訊（找到幾天、幾筆）
3. 用 `7演員.html` 驗證 `buildDayColumnMap` + `parseUserBlockToShifts`
4. 若 parser 有問題，依 **HIJ=7/1** 重寫欄位對應

### 第二優先：體驗與部署

5. Vercel 設 `VITE_GOOGLE_CLIENT_ID` 並 redeploy
6. 更新 `使用說明.md`
7. commit 並 push

### 第三優先（可選）

8. 清 AI 死碼
9. 刪除或封存舊寫回規格
10. 年份：從分頁或 UI 選擇，勿寫死 `currentDate.getFullYear()`

---

## 十二、給新對話的開場 prompt（可直接複製）

```
我在做 ShiftSync 專案（/Users/jameswang/dual_job_scheduler_James）。
請先讀 HANDOFF.md。
已實作 Google Sheets 唯讀匯入到「開溜」工作區，但按「讀取並預覽」後沒反應。
請用 7演員.html 驗證 sheetImport 解析，修 bug 並讓預覽能顯示班次。
公司表：試算表 ID 1ms4h5iJwgIhW2et2jA3e9Xynm4mf3RrGA3kAbr5Fok4，分頁 7演員，姓名王捷仟。
Google Client ID 在 .env.local。使用者 Gmail: chobits1012@gmail.com。
```

---

## 十三、關鍵程式碼位置

| 檔案 | 說明 |
|------|------|
| `utils/sheetImport.ts` → `buildDayColumnMap` | 日期欄對應，可能是 bug 點 |
| `components/SyncConfigModal.tsx` → `handlePreview` | `catch {}` 靜默吞錯 |
| `hooks/useGoogleSheets.ts` → `loadShiftsFromSheet` | API + 解析入口 |
| `App.tsx` → `handleImportSheetShifts` | 覆蓋開溜該月 |
