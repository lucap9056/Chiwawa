[English](./README.md) | [中文](./README.zh-TW.md)

# Chiwawa - Discord Voice Notification Bot

Chiwawa is a Discord bot that sends **voice notifications** when users **join** or **leave** a voice channel, using Microsoft Text-to-Speech (TTS) technology. The bot allows for easy customization of notifications and TTS settings, with support for both global (admin) and user-specific configurations, managed through a web dashboard.

This project is a monorepo containing the following components:
- **`/main`**: The core Discord bot that handles voice notifications.
- **`/dashboard`**: A TanStack Start web application for managing the bot and user settings.

---
## Key Features

- **Voice Notifications**: Automatically plays a voice message when a user joins or leaves a voice channel.
- **Customizable Messages**:
	- Admins can set default notification suffixes for join and leave events.
	- Users can customize their own message format (prefix, username, suffix) or mute the notifications via the web dashboard, either globally or per server.
- **Web Dashboard**: A user-friendly interface to manage bot settings, user preferences, and more.
- **Microsoft TTS Integration**: Uses Microsoft TTS for voice notifications, configurable with different languages and regions.
- **Configurable**: Settings are managed through environment variables, with a clear separation of concerns between the different services.
- **Admin Controls**: Admins have the ability to modify global bot settings.
- **User Personalization**: Users can personalize how notifications sound when they join or leave a voice channel, per server if they wish.

---
## Architecture

The project is structured as a monorepo with two main services, backed by Postgres and Redis:

- **`main`**: The core of the bot. This service connects to Discord, listens for voice state updates (users joining/leaving channels), and uses Microsoft TTS to generate and play voice notifications. It reads/writes app config and user settings from Postgres and uses Redis for caching resolved speech and coordinating with the dashboard.
- **`dashboard`**: A TanStack Start (React) application that provides both a web-based graphical user interface and its backend API, for administrators and users to configure the bot's settings and their personal notification preferences.
- **`postgres`**: Stores app config and per-user/per-guild notification settings.
- **`redis`**: Caches resolved TTS speech per user/guild and coordinates guild-membership/config updates between `main` and `dashboard`.

All services are written in TypeScript and are configured to work together.

---
## Service Combinations

The services can be run in different combinations depending on your needs. You can modify the `docker-compose.yml` file to run only the services you require.

-   **`main` + `dashboard` + `postgres` + `redis` (Full Experience)**
    -   Provides all features: voice notifications and a web dashboard for easy configuration of global and per-user/per-guild settings.

-   **`main` + `postgres` + `redis` (Bot Only, No Dashboard)**
    -   Runs the core bot with persisted settings, but without a way to change them through a UI (useful if you run the dashboard elsewhere, or manage settings directly in Postgres).

-   **`main` only (Core Functionality, No Database)**
    -   Runs only the core voice notification bot without database support. The dashboard will be unavailable. When running without Postgres/Redis or if a user has no custom settings, messages will be generated using the bot's default suffixes (configured via environment variables) and the user's display name. User-specific customizations will not be saved. (See "Nickname Formatting for Voice Customization" below for advanced options without a database.)

---
## Nickname Formatting for Voice Customization

When the bot is running without a database or when a user has no personalized settings, the `main` service can still allow users to influence the voice model and language used for their voice notifications. This is achieved by formatting the user's Discord nickname with a specific syntax.

**Format**: `[Your Name][:[language]-[voice_model]][.]`

**Examples**:
-   `YourAwesomeName:en-US-JennyNeural` (Custom voice model and language)
-   `YourAwesomeName.` (Remove default suffix, use default voice model and language)
-   `YourAwesomeName:en-US-JennyNeural.` (Custom voice model and language, remove default suffix)

**Components**:
-   **`[Your Name]`**: Your desired display name in Discord.
-   **`:[language]-[voice_model]` (Optional)**: Specify the desired language and voice model.
    -   **`[language]`**: The desired language code (e.g., `en-US`, `zh-TW`).
    -   **`[voice_model]`**: The specific voice model to use (e.g., `JennyNeural`, `HsiaoChenNeural`).
-   **`.` (Optional)**: Add a period at the very end of your nickname to remove the default join/leave suffix (e.g., "joined the channel").

This allows for basic voice customization even without a database connection or individual user settings.


---
## Prerequisites

Before you begin, ensure you have the following installed and configured:

1.  **Docker** and **Docker Compose**: For running the services along with Postgres and Redis.
2.  **Discord Bot Token**: Obtain it from the [Discord Developer Portal](https://discord.com/developers/applications).
3.  **Discord OAuth2 Credentials** (Client ID/Secret): Required only if you're running the `dashboard` service, for Discord login.
4.  **Microsoft TTS Token**: Set up a TTS resource on [Microsoft Azure](https://azure.microsoft.com/) to enable text-to-speech capabilities.

---
## Deployment with Docker Compose (Recommended)

The easiest way to get Chiwawa running is by using the provided `docker-compose.yml` file, which builds the `main` and `dashboard` images locally from their Dockerfiles and runs them alongside Postgres and Redis.

1.  **Generate the shared models**
    Both `main` and `dashboard` import generated TypeScript types from `proto/v1/models.proto` (`src/models/models.ts`), but that file is gitignored and isn't produced automatically by their Dockerfiles (each service's build context doesn't include the sibling `proto/` directory). Run this in **both** `main/` and `dashboard/` before building:
    ```bash
    bun run proto:compile
    ```
    Re-run it in a service whenever `proto/v1/models.proto` changes, and before every `docker compose build`/`up --build`.

2.  **Configure Environment Variables for Docker Compose**
    Create a `.env` file in the root directory of the project (see `.env.example` for a template). This `.env` file will be used by `docker-compose` to pass environment variables to each service.

    ```env
    # Postgres (used by main and dashboard)
    POSTGRES_USER=chiwawa
    POSTGRES_PASSWORD=your_secure_password
    POSTGRES_DB=chiwawa

    # Connection URLs (postgres/redis are the service names on the compose network)
    DATABASE_URL=postgres://chiwawa:your_secure_password@postgres:5432/chiwawa
    REDIS_URL=redis://redis:6379

    # Discord Bot Token (main)
    APP_DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN

    # Default voice notification settings (main + dashboard)
    DEFAULT_JOIN_SUFFIX=joined the channel
    DEFAULT_LEAVE_SUFFIX=left the channel
    DEFAULT_VOICE_MODEL=en-US-JennyNeural

    # Microsoft TTS Configuration (main + dashboard)
    TTS_REGION=YOUR_TTS_REGION
    TTS_APIKEY=YOUR_TTS_API_KEY

    # Admin User IDs (comma-separated)
    ADMINS=YOUR_ADMIN_USER_ID_1,YOUR_ADMIN_USER_ID_2

    # Discord OAuth2 Configuration (dashboard only)
    CLIENT_ID=YOUR_DISCORD_APPLICATION_CLIENT_ID
    CLIENT_SECRET=YOUR_DISCORD_APPLICATION_CLIENT_SECRET
    REDIRECT_URI=http://localhost/callback # Must match the redirect registered on Discord
    ```

    `docker-compose.yml` does not publish a host port for the `dashboard` service by default (only Postgres and Redis are). Add a `ports:` entry under `dashboard` (e.g. `"80:3000"`) if you want to reach it from outside the compose network.

3.  **Run with Docker Compose**
    ```bash
    docker compose up -d --build
    ```
    This command will:
    - Build the `main` and `dashboard` images from their local Dockerfiles.
    - Start Postgres (seeded from `proto/v1/init.sql` on first run) and Redis.
    - Start the `main` bot and the `dashboard`, once Postgres and Redis report healthy.

---
## Configuration

Configuration is handled via environment variables.

### Postgres

| **Environment Variable** | **Purpose**                          |
| ------------------------- | ------------------------------------ |
| `POSTGRES_USER`            | Postgres username.                    |
| `POSTGRES_PASSWORD`        | Postgres password.                    |
| `POSTGRES_DB`              | Postgres database name.               |

### `main` Service

| **Environment Variable**   | **Purpose**                                                | **Default** |
| --------------------------- | ----------------------------------------------------------- | ----------- |
| `APP_DISCORD_TOKEN`         | Discord bot token.                                           | `""`        |
| `DATABASE_URL`              | Postgres connection URL.                                     | `""`        |
| `REDIS_URL`                 | Redis connection URL.                                        | `""`        |
| `DEFAULT_JOIN_SUFFIX`       | Fallback suffix appended to the join message.                | `""`        |
| `DEFAULT_LEAVE_SUFFIX`      | Fallback suffix appended to the leave message.               | `""`        |
| `DEFAULT_VOICE_MODEL`       | Fallback Microsoft TTS voice model.                          | `""`        |
| `TTS_REGION`                | Region for the Microsoft TTS API.                            | `""`        |
| `TTS_APIKEY`                | Microsoft TTS API key.                                       | `""`        |
| `ADMINS`                    | Comma-separated Discord user IDs, bootstraps the initial admins if no app config exists yet in Postgres. | `""` |

### `dashboard` Service

| **Environment Variable**   | **Purpose**                                                                   | **Default** |
| --------------------------- | ------------------------------------------------------------------------------ | ----------- |
| `DATABASE_URL`              | Postgres connection URL. **Required.**                                         | —           |
| `REDIS_URL`                 | Redis connection URL. **Required.**                                            | —           |
| `CLIENT_ID`                 | Discord application client ID, used to build the OAuth2 login URL. **Required.** | —          |
| `CLIENT_SECRET`             | Discord application client secret, used to exchange/refresh OAuth2 tokens. **Required.** | —    |
| `REDIRECT_URI`              | Discord OAuth2 redirect URI; must match the callback registered on Discord. **Required.** | —    |
| `ADMINS`                    | Comma-separated Discord user IDs, bootstraps the initial admins if no app config exists yet in Postgres. **Required.** | — |
| `DEFAULT_JOIN_SUFFIX`       | Fallback suffix shown/used when no app config exists yet.                       | `""`        |
| `DEFAULT_LEAVE_SUFFIX`      | Fallback suffix shown/used when no app config exists yet.                       | `""`        |
| `DEFAULT_VOICE_MODEL`       | Fallback voice model shown/used when no app config exists yet.                  | `""`        |
| `TTS_REGION`                | Fallback Microsoft TTS region shown/used when no app config exists yet.         | `""`        |
| `TTS_APIKEY`                | Fallback Microsoft TTS API key shown/used when no app config exists yet.        | `""`        |
| `BASE_PATH`                 | Mount the dashboard under a sub-path (e.g. `/dashboard/`) instead of `/`.        | `"/"`       |

The `dashboard`'s `REQUIRED` variables above cause it to fail fast on startup if missing; the rest only seed the app config the first time it's created (an admin can change them afterwards from the dashboard itself).
