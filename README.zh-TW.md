[English](./README.md) | 繁體中文
<div align="center">
	<img src="./dashboard/public/assets/cover.webp" width="180" height="180" alt="Chiwawa Logo">
	<h1>Chiwawa</h1>
	<p><strong>Discord 語音通知機器人</strong></p>
</div>

---

Chiwawa 是一個 Discord 機器人，當使用者**加入**或**離開**語音頻道時，會使用微軟的文字轉語音（TTS）技術發送**語音通知**。該機器人允許輕鬆自訂通知和 TTS 設定，並支援全域（管理員）和使用者特定的設定，可透過網頁儀表板進行管理。

此專案為一個 monorepo，包含以下幾個部分：
- **`/main`**：處理語音通知的核心 Discord 機器人。
- **`/dashboard`**：用於管理機器人和使用者設定的 TanStack Start 網頁應用程式。

---
## 主要功能

- **語音通知**：當使用者加入或離開語音頻道時，自動播放語音訊息。
- **可自訂訊息**：
    - 管理員可以為加入和離開事件設定預設的通知後綴。
    - 使用者可以透過網頁儀表板自訂自己的訊息格式（前綴、使用者名稱、後綴）或將通知靜音，可選擇套用於全域或個別伺服器。
- **網頁儀表板**：一個使用者友好的介面，用於管理機器人設定、使用者偏好等。
- **微軟 TTS 整合**：使用微軟 TTS 進行語音通知，可設定不同的語言和地區。
- **可設定**：透過環境變數管理設定，不同服務之間的關注點分離清晰。
- **管理員控制**：管理員有權修改全域機器人設定。
- **使用者個人化**：使用者可以個人化他們加入或離開語音頻道時通知的聲音，並可依伺服器分別設定。

---
## 架構

此專案的架構為一個 monorepo，包含兩個主要服務，並以 Postgres 和 Redis 作為後端：

- **`main`**：機器人的核心。此服務連接到 Discord，監聽語音狀態更新（使用者加入/離開頻道），並使用微軟 TTS 生成和播放語音通知。它會從 Postgres 讀寫應用程式設定與使用者設定，並使用 Redis 快取已解析的語音並與 `dashboard` 協調狀態。
- **`dashboard`**：一個 TanStack Start（React）應用程式，同時提供網頁圖形化使用者介面與其後端 API，供管理員和使用者設定機器人的設定和個人通知偏好。
- **`postgres`**：儲存應用程式設定與每個使用者/伺服器的通知設定。
- **`redis`**：快取每個使用者/伺服器已解析的 TTS 語音，並協調 `main` 與 `dashboard` 之間的伺服器成員/設定更新。

所有服務均以 TypeScript 編寫，並已設定為協同工作。

---
## 服務組合

您可以根據需求以不同的組合運行這些服務。您可以修改 `docker-compose.yml` 檔案，只運行您需要的服務。

-   **`main` + `dashboard` + `postgres` + `redis`（完整體驗）**
    -   提供所有功能：語音通知，以及便於設定全域與個別使用者/伺服器設定的網頁儀表板。

-   **`main` + `postgres` + `redis`（僅機器人，無儀表板）**
    -   運行核心機器人並持久化設定，但沒有透過介面變更設定的方式（適合您在別處運行儀表板，或直接在 Postgres 中管理設定的情況）。

-   **僅 `main`（核心功能，無資料庫）**
    -   僅運行核心語音通知機器人，不含資料庫支援。儀表板將不可用。當不運行 Postgres/Redis 或使用者沒有自訂設定時，訊息將使用機器人的預設後綴（透過環境變數配置）和使用者的顯示名稱生成。使用者特定的自訂功能將不會被儲存。(請參閱下方「暱稱語音自訂格式」以了解無資料庫的高階選項。)

---
## 暱稱語音自訂格式

當機器人未運行資料庫或使用者沒有個人化設定時，`main` 服務仍然允許使用者透過格式化他們的 Discord 暱稱來影響語音通知使用的語音模型和語言。

**格式**：`[你的名字][:[語言]-[語音模型]][.]`

**範例**：
-   `你的酷名字:en-US-JennyNeural` (自訂語音模型和語言)
-   `你的酷名字.` (移除預設後綴，使用預設語音模型和語言)
-   `你的酷名字:en-US-JennyNeural.` (自訂語音模型和語言，移除預設後綴)

**組成部分**：
-   **`[你的名字]`**：您在 Discord 中希望顯示的名稱。
-   **`:[語言]-[語音模型]` (可選)**：指定所需的語言和語音模型。
    -   **`[語言]`**：所需的語言代碼（例如，`en-US`，`zh-TW`）。
    -   **`[語音模型]`**：要使用的特定語音模型（例如，`JennyNeural`，`HsiaoChenNeural`）。
-   **`.` (可選)**：在暱稱的最後面加上一個句點，以移除預設的加入/離開後綴（例如，「加入了頻道」）。

即使沒有資料庫連線或個人使用者設定，這也允許基本的語音自訂。

---
## 先決條件

在開始之前，請確保您已安裝並設定好以下項目：

1.  **Docker** 和 **Docker Compose**：用於運行各服務、Postgres 與 Redis。
2.  **Discord Bot Token**：從 [Discord 開發者入口網站](https://discord.com/developers/applications) 取得。
3.  **Discord OAuth2 憑證**（Client ID/Secret）：僅在運行 `dashboard` 服務、需要 Discord 登入時才需要。
4.  **Microsoft TTS Token**：在 [Microsoft Azure](https://azure.microsoft.com/) 上設定一個 TTS 資源以啟用文字轉語音功能。

---
## 使用 Docker Compose 部署（建議）

要讓 Chiwawa 運行起來，最簡單的方法是使用提供的 `docker-compose.yml` 檔案，該檔案會從本機的 Dockerfile 建置 `main` 與 `dashboard` 映像檔，並與 Postgres、Redis 一起運行。

1.  **產生共用的 models**
    `main` 與 `dashboard` 都會匯入從 `proto/v1/models.proto` 產生的 TypeScript 型別（`src/models/models.ts`），但此檔案已被 gitignore，且各自的 Dockerfile 不會自動產生它（每個服務的建置上下文並不包含相鄰的 `proto/` 目錄）。請在建置前於 `main/` 與 `dashboard/` **兩者**中執行：
    ```bash
    bun run proto:compile
    ```
    每當 `proto/v1/models.proto` 變更時，以及每次執行 `docker compose build`/`up --build` 之前，都請在對應的服務中重新執行一次。

2.  **為 Docker Compose 設定環境變數**
    在專案的根目錄中建立一個 `.env` 檔案（可參考 `.env.example` 範本）。`docker-compose` 將使用此 `.env` 檔案將環境變數傳遞給每個服務。

    ```env
    # Postgres（由 main 和 dashboard 使用）
    POSTGRES_USER=chiwawa
    POSTGRES_PASSWORD=your_secure_password
    POSTGRES_DB=chiwawa

    # 連線 URL（postgres/redis 為 compose 網路中的服務名稱）
    DATABASE_URL=postgres://chiwawa:your_secure_password@postgres:5432/chiwawa
    REDIS_URL=redis://redis:6379

    # Discord 機器人權杖（main）
    APP_DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN

    # 預設語音通知設定（main + dashboard）
    DEFAULT_JOIN_SUFFIX=joined the channel
    DEFAULT_LEAVE_SUFFIX=left the channel
    DEFAULT_VOICE_MODEL=en-US-JennyNeural

    # 微軟 TTS 設定（main + dashboard）
    TTS_REGION=YOUR_TTS_REGION
    TTS_APIKEY=YOUR_TTS_API_KEY

    # 管理員使用者 ID（以逗號分隔）
    ADMINS=YOUR_ADMIN_USER_ID_1,YOUR_ADMIN_USER_ID_2

    # Discord OAuth2 設定（僅 dashboard 需要）
    CLIENT_ID=YOUR_DISCORD_APPLICATION_CLIENT_ID
    CLIENT_SECRET=YOUR_DISCORD_APPLICATION_CLIENT_SECRET
    REDIRECT_URI=http://localhost/callback # 必須與 Discord 上註冊的重新導向 URI 相符
    ```

    `docker-compose.yml` 預設沒有為 `dashboard` 服務發布主機連接埠（只有 Postgres 和 Redis 有）。如果您想從 compose 網路外部存取它，請在 `dashboard` 底下加入 `ports:` 設定（例如 `"80:3000"`）。

3.  **使用 Docker Compose 運行**
    ```bash
    docker compose up -d --build
    ```
    此指令將會：
    - 從本機的 Dockerfile 建置 `main` 與 `dashboard` 映像檔。
    - 啟動 Postgres（首次執行時會以 `proto/v1/init.sql` 進行初始化）與 Redis。
    - 在 Postgres 與 Redis 回報健康狀態後，啟動 `main` 機器人與 `dashboard`。

---
## 設定

設定是透過環境變數處理的。

### Postgres

| **環境變數**          | **用途**            |
| ---------------------- | ------------------- |
| `POSTGRES_USER`         | Postgres 使用者名稱。 |
| `POSTGRES_PASSWORD`     | Postgres 密碼。       |
| `POSTGRES_DB`           | Postgres 資料庫名稱。 |

### `main` 服務

| **環境變數**          | **用途**                                                     | **預設值** |
| ----------------------- | -------------------------------------------------------------- | ---------- |
| `APP_DISCORD_TOKEN`     | Discord 機器人權杖。                                            | `""`       |
| `DATABASE_URL`          | Postgres 連線 URL。                                             | `""`       |
| `REDIS_URL`             | Redis 連線 URL。                                                | `""`       |
| `DEFAULT_JOIN_SUFFIX`   | 加入訊息的備援後綴。                                            | `""`       |
| `DEFAULT_LEAVE_SUFFIX`  | 離開訊息的備援後綴。                                            | `""`       |
| `DEFAULT_VOICE_MODEL`   | 備援的微軟 TTS 語音模型。                                       | `""`       |
| `TTS_REGION`            | 微軟 TTS API 的地區。                                           | `""`       |
| `TTS_APIKEY`            | 微軟 TTS API 金鑰。                                             | `""`       |
| `ADMINS`                | 以逗號分隔的 Discord 使用者 ID；若 Postgres 中尚無應用程式設定，將用於建立初始管理員。 | `""` |

### `dashboard` 服務

| **環境變數**          | **用途**                                                                   | **預設值** |
| ----------------------- | ------------------------------------------------------------------------------ | ---------- |
| `DATABASE_URL`          | Postgres 連線 URL。**必填。**                                                   | —          |
| `REDIS_URL`             | Redis 連線 URL。**必填。**                                                      | —          |
| `CLIENT_ID`             | Discord 應用程式用戶端 ID，用於建立 OAuth2 登入網址。**必填。**                 | —          |
| `CLIENT_SECRET`         | Discord 應用程式用戶端密鑰，用於交換/更新 OAuth2 權杖。**必填。**               | —          |
| `REDIRECT_URI`          | Discord OAuth2 重新導向 URI；必須與 Discord 上註冊的回呼相符。**必填。**        | —          |
| `ADMINS`                | 以逗號分隔的 Discord 使用者 ID；若 Postgres 中尚無應用程式設定，將用於建立初始管理員。**必填。** | — |
| `DEFAULT_JOIN_SUFFIX`   | 尚未有應用程式設定時所顯示/使用的備援後綴。                                     | `""`       |
| `DEFAULT_LEAVE_SUFFIX`  | 尚未有應用程式設定時所顯示/使用的備援後綴。                                     | `""`       |
| `DEFAULT_VOICE_MODEL`   | 尚未有應用程式設定時所顯示/使用的備援語音模型。                                 | `""`       |
| `TTS_REGION`            | 尚未有應用程式設定時所顯示/使用的備援微軟 TTS 地區。                            | `""`       |
| `TTS_APIKEY`            | 尚未有應用程式設定時所顯示/使用的備援微軟 TTS 金鑰。                            | `""`       |
| `BASE_PATH`             | 將儀表板掛載到子路徑（例如 `/dashboard/`）而非 `/`。                            | `"/"`      |

上表中 `dashboard` 標示為必填的變數，若缺少會導致服務啟動時立即失敗；其餘變數僅在應用程式設定第一次建立時作為預設值使用（之後管理員可以直接在儀表板中修改）。
