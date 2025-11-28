[English](./README.md) | [繁體中文](./README.zh-TW.md)

# Chiwawa - Discord 語音通知機器人

Chiwawa 是一個 Discord 機器人，當使用者**加入**或**離開**語音頻道時，會使用微軟的文字轉語音（TTS）技術發送**語音通知**。該機器人允許輕鬆自訂通知和 TTS 設定，並支援全域（管理員）和使用者特定的設定，可透過網頁儀表板進行管理。

此專案為一個 monorepo，包含以下幾個部分：
- **`/main`**：處理語音通知的核心 Discord 機器人。
- **`/commands`**：用於部署 Discord 斜線指令的服務。
- **`/web-dashboard`**：用於管理機器人和使用者設定的 Next.js 網頁應用程式。

---
## 主要功能

- **語音通知**：當使用者加入或離開語音頻道時，自動播放語音訊息。
- **可自訂訊息**：
    - 管理員可以為加入和離開事件設定預設的通知後綴。
    - 使用者可以透過網頁儀表板自訂自己的訊息格式（前綴、使用者名稱、後綴）或將通知靜音。
- **網頁儀表板**：一個使用者友好的介面，用於管理機器人設定、使用者偏好等。
- **國際化**：網頁儀表板支援多種語言（英文和繁體中文），並會自動偵測使用者的瀏覽器語言。使用者也可以在儀表板中手動切換語言。
- **微軟 TTS 整合**：使用微軟 TTS 進行語音通知，可設定不同的語言和地區。
- **可設定**：透過環境變數管理設定，不同服務之間的關注點分離清晰。
- **管理員控制**：管理員有權修改全域機器人設定。
- **使用者個人化**：使用者可以個人化他們加入或離開語音頻道時通知的聲音。

---
## 架構

此專案的架構為一個 monorepo，包含三個主要服務：

- **`main`**：機器人的核心。此服務連接到 Discord，監聽語音狀態更新（使用者加入/離開頻道），並使用微軟 TTS 生成和播放語音通知。它還為網頁儀表板提供後端 API。
- **`commands`**：一個獨立的服務，負責向 Discord 註冊和更新機器人的斜線指令。
- **`web-dashboard`**：一個 Next.js 應用程式，提供一個網頁圖形化使用者介面，供管理員和使用者設定機器人的設定和個人通知偏好。

所有服務均以 TypeScript 編寫，並已設定為協同工作。

---
## 服務組合

您可以根據需求以不同的組合運行這些服務。您可以修改 `docker-compose.yml` 檔案，只運行您需要的服務。

-   **`main` + `commands` + `web-dashboard` + `mongodb` (完整體驗)**
    -   提供所有功能：語音通知、用於互動的斜線指令，以及便於設定的網頁儀表板。

-   **`main` + `web-dashboard` + `mongodb` (網頁管理)**
    -   運行核心機器人與網頁儀表板進行設定。斜線指令將不可用。

-   **`main` + `commands` + `mongodb` (無頭模式)**
    -   運行核心機器人並支援斜線指令，但沒有網頁儀面儀表板。設定必須完全透過環境變數進行管理。

-   **`main` only (核心功能)**
    -   僅運行核心語音通知機器人，不含資料庫支援。斜線指令和網頁儀表板將不可用。當不運行 MongoDB 或使用者沒有自訂設定時，訊息將使用機器人的預設後綴（透過環境變數配置）和使用者的顯示名稱生成。使用者特定的自訂功能將不會被儲存。(請參閱下方「暱稱語音自訂格式」以了解無資料庫的高階選項。)

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

即使沒有 MongoDB 連線或個人使用者設定，這也允許基本的語音自訂。

---
## 先決條件

在開始之前，請確保您已安裝並設定好以下項目：

1.  **Docker** 和 **Docker Compose**：用於運行服務和 MongoDB 實例。
2.  **Discord Bot Token**：從 [Discord 開發者入口網站](https://discord.com/developers/applications) 取得。
3.  **Microsoft TTS Token**：在 [Microsoft Azure](https://azure.microsoft.com/) 上設定一個 TTS 資源以啟用文字轉語音功能。

---
## 使用 Docker Compose 部署（建議）

要讓 Chiwawa 運行起來，最簡單的方法是使用提供的 `docker-compose.yml` 檔案，該檔案利用了為每個服務（`main`、`commands`、`web-dashboard`）和 MongoDB 資料庫預先建置的 Docker 映像檔。

1.  **為 Docker Compose 設定環境變數**
    在專案的根目錄中建立一個 `.env` 檔案。`docker-compose` 將使用此 `.env` 檔案將環境變數傳遞給每個服務。

    有關環境變數的完整列表，請參閱下面的**設定**部分。以下是您可以放在專案根目錄中的 `.env` 檔案範例：

    ```env
    # Discord 機器人權杖
    APP_DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN
    APPLICATION_ID=YOUR_DISCORD_APPLICATION_ID # 您的 Discord 應用程式的用戶端 ID
    GUILD_ID=YOUR_DISCORD_GUILD_ID # 用於指令部署的伺服器 ID（可選，用於測試）

    # 微軟 TTS 設定
    TTS_REGION=YOUR_TTS_REGION
    TTS_API_KEY=YOUR_TTS_API_KEY
    TTS_DEFAULT_VOICE_MODULE=en-US # 範例：en-US

    # MongoDB 設定（由 main 和 web-dashboard 使用）
    MONGO_ROOT_USERNAME=chiwawa-user
    MONGO_ROOT_PASSWORD=your_secure_password
    MONGO_DATABASE=chiwawa_db
    DATABASE_URL=mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017/${MONGO_DATABASE}?authSource=admin

    # 管理員使用者 ID（以逗號分隔）
    ADMINS=YOUR_ADMIN_USER_ID_1,YOUR_ADMIN_USER_ID_2

    # API 和 OAuth2 設定（用於 web-dashboard）
    CLIENT_ID=YOUR_DISCORD_APPLICATION_CLIENT_ID # 與 APPLICATION_ID 相同
    CLIENT_SECRET=YOUR_DISCORD_APPLICATION_CLIENT_SECRET
    REDIRECT_URI=http://localhost/api/oauth2/callback # 或您部署的 URL
    API_SESSION_SECRET=YOUR_RANDOM_SESSION_SECRET
    ```
    **重要**：請確保您的 `.env` 檔案中的 `TTS_API_KEY` 與 `main` 服務設定表中提到的 `TTS_API_KEY` 相符。

2.  **使用 Docker Compose 運行**
    ```bash
    docker-compose up -d
    ```
    此指令將會：
    - 拉取 `lucap9056/chiwawa`、`lucap9056/chiwawa-commands` 和 `lucap9056/chiwawa-dashboard` Docker 映像檔。
    - 啟動 `main` 機器人、`commands` 服務、`web-dashboard` 和一個 MongoDB 實例。
    - `commands` 服務將在啟動時自動部署 Discord 指令。
    - 網頁儀表板將可透過 `http://localhost` 存取。

---
## 設定

設定是透過環境變數處理的。下表詳細說明了每個服務的變數。

### `main` 服務

| **環境變數**          | **用途**                                          | **預設值**             |
| -------------------------- | --------------------------------------------------------- | ------------------------- |
| `ADMINS`                   | 以逗號分隔的管理員使用者 ID 列表。                     | `""`                      |
| `APP_DISCORD_TOKEN`        | Discord 機器人權杖。                                 | `""`                      |
| `DEFAULT_JOIN_SUFFIX`      | 加入訊息的後綴。                                | `"joined the channel"`    |
| `DEFAULT_LEAVE_SUFFIX`     | 離開訊息的後綴。                                | `"left the channel"`      |
| `TTS_REGION`               | 微軟 TTS API 的地區。                               | `""`                      |
| `TTS_API_KEY`              | 微軟 TTS API 權杖。                                 | `""`                      |
| `TTS_DEFAULT_LANGUAGE`     | TTS 引擎的預設語言。                         | `"en-US"`                 |
| `DATABASE_URI`             | MongoDB 連線 URI。                                  | `""`                      |
| `API_PORT`                 | 後端 API 服務的連接埠。                          | `"80"`                    |
| `API_REDIRECT_URI`         | OAuth2 驗證的重新導向 URI。                  | `""`                      |
| `API_SESSION_SECRET`       | API 會話管理用的密鑰。                          | `""`                      |
| `APP_ID`                   | OAuth2 應用程式用戶端 ID。                        | `""`                      |
| `APP_SECRET`               | OAuth2 應用程式用戶端密鑰。                        | `""`                      |

### `commands` 服務

| **環境變數**       | **用途**                     | **預設值** |
| ------------------------ | ---------------------------- | ----------------- |
| `APP_DISCORD_TOKEN`      | Discord 機器人權杖。             | `""`              |
| `APPLICATION_ID`         | Discord 應用程式用戶端 ID。      | `""`              |
| `GUILD_ID`               | 用於測試的 Discord 伺服器 ID。   | `""`              |

### `web-dashboard` 服務

| **環境變數**       | **用途**                         | **預設值** |
| ------------------------ | -------------------------------- | ----------------- |
| `ADMINS`                 | 以逗號分隔的管理員使用者 ID 列表。  | `""`              |
| `DATABASE_URI`           | MongoDB 連線 URI。             | `""`              |

---
## 授權

此專案根據 MIT 授權條款授權。詳情請參閱 [LICENSE](./main/LICENSE) 檔案。
