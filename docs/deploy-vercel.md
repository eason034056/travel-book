# 部署到 Vercel

本專案為 Next.js 15 App Router，可直接在 Vercel 上部署。以下為步驟與環境變數設定。

## 一、前置準備

1. **Vercel 帳號**：到 [vercel.com](https://vercel.com) 註冊或登入。
2. **程式碼在 Git**：專案需在 GitHub / GitLab / Bitbucket，Vercel 會從 Git 部署。
   - 若尚未建立 repo，可先：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # 在 GitHub 建立新 repo 後：
   git remote add origin https://github.com/<你的帳號>/<repo名>.git
   git branch -M main
   git push -u origin main
   ```
3. **生產環境網域**：部署後會得到 `https://<專案名>.vercel.app`，之後要填進 Google OAuth 與 `APP_URL`。

---

## 二、在 Vercel 建立專案

### 方式 A：網頁介面（推薦）

1. 登入 [Vercel](https://vercel.com) → **Add New** → **Project**。
2. **Import** 你的 Git repository（例如 GitHub 的 `travel` 或 `travel-book`）。
3. **Configure Project**：
   - **Framework Preset**：應自動為 **Next.js**。
   - **Root Directory**：維持 `./`（若專案在 repo 根目錄）。
   - **Build Command**：`npm run build`（預設即可）。
   - **Output Directory**：留空（Next.js 預設）。
   - **Install Command**：`npm install`（預設即可）。
4. 先不要點 Deploy，到下一步設定環境變數。

### 方式 B：Vercel CLI

```bash
# 安裝 Vercel CLI（若尚未安裝）
npm i -g vercel

# 在專案根目錄執行
cd /Users/wuyusen/Desktop/travel
vercel
```

依提示登入、連結 Git，並在第一次部署前到 Vercel 專案設定裡加入環境變數（見下一節）。

---

## 三、環境變數（必填）

在 Vercel 專案：**Settings → Environment Variables**，為 **Production**（以及若有使用 Preview 則可一併設 **Preview**）加入下列變數。  
值請從本機 `.env.local` 複製，並把 `APP_URL` 改為正式網址。

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `AUTH_SECRET` | NextAuth 用，建議用 `openssl rand -base64 32` 產生 | 一組 base64 字串 |
| `GOOGLE_CLIENT_ID` | Google OAuth 用戶端 ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 用戶端密鑰 | 字串 |
| `APP_URL` | **正式網址**（勿用 localhost） | `https://travel-book.vercel.app` |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google 試算表 ID | 試算表 URL 中的 ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 服務帳戶 Email | `xxx@xxx.iam.gserviceaccount.com` |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | 服務帳戶私鑰（整段含 `-----BEGIN/END-----`） | 多行字串，在 Vercel 可保留 `\n` 或實際換行 |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | 字串 |
| `R2_BUCKET_NAME` | R2 bucket 名稱 | 字串 |
| `R2_ACCESS_KEY_ID` | R2 存取金鑰 ID | 字串 |
| `R2_SECRET_ACCESS_KEY` | R2 秘密金鑰 | 字串 |
| `R2_ENDPOINT` | 選填，預設會用 `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` | 同上或自訂 endpoint URL |
| `SEED_OWNER_EMAIL` | 種子資料擁有者 Email（與 Google 登入帳號一致） | 用來辨識 owner 的 email |

**注意：**

- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` 若含換行，在 Vercel 可貼上整段（含換行），或使用 `\n` 表示換行（與本機 `.env.local` 一致即可）。
- 部署完成後請把 **正式網址** 填回 Google OAuth 的「已授權的重新導向 URI」  
  （例如 `https://<你的網域>/api/auth/callback/google`），否則登入會失敗。
- 照片上傳現在是「瀏覽器直傳 R2」，目的是避開 Vercel Function request body 限制，所以 **R2 bucket 一定要設定 CORS**。

建議的 R2 CORS 設定：

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://<你的正式網域>"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"]
  }
]
```

若你同時會使用自訂網域與 `*.vercel.app` 網域，兩個 origin 都要加進去。

---

## 四、Google OAuth 設定（生產環境）

1. 開啟 [Google Cloud Console](https://console.cloud.google.com/) → 你的專案 → **APIs & Services** → **Credentials**。
2. 編輯用來登入的 **OAuth 2.0 用戶端 ID**（Web 應用程式類型）。
3. **已授權的 JavaScript 來源** 新增：`https://<你的-vercel-網域>`（例如 `https://travel-book.vercel.app`）。
4. **已授權的重新導向 URI** 新增：`https://<你的-vercel-網域>/api/auth/callback/google`。
5. 儲存。

若使用自訂網域，請一併把自訂網域加入上述兩處。

---

## 五、部署與驗證

1. 儲存所有環境變數後，在 Vercel 點 **Deploy**（或推送 commit 觸發自動部署）。
2. 部署完成後開啟 **Visit** 或專案網址。
3. 確認：
   - 首頁可開啟。
   - 點選 Google 登入可成功導向並回到 App（若 404/redirect 錯誤，請再檢查 OAuth 重新導向 URI 與 `APP_URL`）。
   - 有設定 Google Sheets + R2 時，可建立/查看行程、上傳照片。

若 build 失敗，請在 Vercel 的 **Deployments** 點該次部署 → **Building** 查看錯誤日誌；多數為缺少環境變數或 TypeScript/依賴錯誤。

---

## 六、自訂網域（選用）

在 Vercel 專案：**Settings → Domains**，新增你的網域並依指示設定 DNS（CNAME 或 A record）。  
設定完成後，記得：

1. 把 **Settings → Environment Variables** 裡的 `APP_URL` 改為自訂網域（例如 `https://travel.yourdomain.com`）。
2. 在 Google OAuth 的「已授權的 JavaScript 來源」與「已授權的重新導向 URI」加入自訂網域。

重新部署後即可用自訂網域存取。

---

## 七、常見問題

- **Build 失敗：找不到模組 / TypeScript 錯誤**  
  請在本地執行 `npm run build` 與 `npm run typecheck`，修正後再 push。

- **登入後 500 或 redirect 錯誤**  
  檢查 `AUTH_SECRET`、`APP_URL` 是否為正式網址，以及 Google OAuth 重新導向 URI 是否包含正式網址。

- **照片無法上傳或無法顯示**  
  檢查 R2 五個環境變數是否正確、R2 bucket 與金鑰權限是否允許上傳與讀取，並確認 bucket CORS 已允許 `http://localhost:3000` 與正式網站 origin 的 `PUT` 請求。

- **Google Sheets 讀寫失敗**  
  確認試算表已分享給 `GOOGLE_SERVICE_ACCOUNT_EMAIL`（編輯權限），且 `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` 格式正確。
