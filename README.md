[English](./README.md) | [中文](./README.zh-TW.md)

# Chiwawa - Discord Voice Notification Bot

Chiwawa is a Discord bot that sends **voice notifications** when users **join** or **leave** a voice channel, using Microsoft Text-to-Speech (TTS) technology. The bot allows for easy customization of notifications and TTS settings, with support for both global (admin) and user-specific configurations, managed through a web dashboard.

This project is a monorepo containing the following components:
- **`/main`**: The core Discord bot that handles voice notifications.
- **`/commands`**: A service for deploying Discord slash commands.
- **`/web-dashboard`**: A Next.js web application for managing the bot and user settings.

---
## Key Features

- **Voice Notifications**: Automatically plays a voice message when a user joins or leaves a voice channel.
- **Customizable Messages**:
	- Admins can set default notification suffixes for join and leave events.
	- Users can customize their own message format (prefix, username, suffix) or mute the notifications via the web dashboard.
- **Web Dashboard**: A user-friendly interface to manage bot settings, user preferences, and more.
- **Microsoft TTS Integration**: Uses Microsoft TTS for voice notifications, configurable with different languages and regions.
- **Configurable**: Settings are managed through environment variables, with a clear separation of concerns between the different services.
- **Admin Controls**: Admins have the ability to modify global bot settings.
- **User Personalization**: Users can personalize how notifications sound when they join or leave a voice channel.

---
## Architecture

The project is structured as a monorepo with three main services:

- **`main`**: The core of the bot. This service connects to Discord, listens for voice state updates (users joining/leaving channels), and uses Microsoft TTS to generate and play voice notifications. It also provides the backend API for the web dashboard.
- **`commands`**: A separate service responsible for registering and updating the bot's slash commands with Discord.
- **`web-dashboard`**: A Next.js application that provides a web-based graphical user interface for administrators and users to configure the bot's settings and their personal notification preferences.

All services are written in TypeScript and are configured to work together.

---
## Service Combinations

The services can be run in different combinations depending on your needs. You can modify the `docker-compose.yml` file to run only the services you require.

-   **`main` + `commands` + `web-dashboard` + `mongodb` (Full Experience)**
    -   Provides all features: voice notifications, slash commands for interaction, and a web dashboard for easy configuration.

-   **`main` + `web-dashboard` + `mongodb` (Web Managed)**
    -   Runs the core bot with a web dashboard for configuration. Slash commands will not be available.

-   **`main` + `commands` + `mongodb` (Headless)**
    -   Runs the core bot with slash command support, but without the web dashboard. Configuration must be managed entirely through environment variables.

-   **`main` only (Core Functionality)**
    -   Runs only the core voice notification bot without database support. Slash commands and the web dashboard will be unavailable. When running without MongoDB or if a user has no custom settings, messages will be generated using the bot's default suffixes (configured via environment variables) and the user's display name. User-specific customizations will not be saved. (See "Nickname Formatting for Voice Customization" below for advanced options without a database.)

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

This allows for basic voice customization even without a MongoDB connection or individual user settings.


---
## Prerequisites

Before you begin, ensure you have the following installed and configured:

1.  **Docker** and **Docker Compose**: For running the services and MongoDB instance.
2.  **Discord Bot Token**: Obtain it from the [Discord Developer Portal](https://discord.com/developers/applications).
3.  **Microsoft TTS Token**: Set up a TTS resource on [Microsoft Azure](https://azure.microsoft.com/) to enable text-to-speech capabilities.

---
## Deployment with Docker Compose (Recommended)

The easiest way to get Chiwawa running is by using the provided `docker-compose.yml` file, which utilizes pre-built Docker images for each service (`main`, `commands`, `web-dashboard`) and a MongoDB database.

1.  **Configure Environment Variables for Docker Compose**
    Create a `.env` file in the root directory of the project. This `.env` file will be used by `docker-compose` to pass environment variables to each service.

    Refer to the **Configuration** section below for the full list of environment variables. Here's an example of a `.env` file that you would place in the project root:

    ```env
    # Discord Bot Token
    APP_DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN
    APPLICATION_ID=YOUR_DISCORD_APPLICATION_ID # Client ID for your Discord Application
    GUILD_ID=YOUR_DISCORD_GUILD_ID # Server ID for commands deployment (optional, for testing)

    # Microsoft TTS Configuration
    TTS_REGION=YOUR_TTS_REGION
    TTS_API_KEY=YOUR_TTS_API_KEY
    TTS_DEFAULT_VOICE_MODULE=en-US # Example: en-US

    # MongoDB Configuration (used by main and web-dashboard)
    MONGO_ROOT_USERNAME=chiwawa-user
    MONGO_ROOT_PASSWORD=your_secure_password
    MONGO_DATABASE=chiwawa_db
    DATABASE_URL=mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017/${MONGO_DATABASE}?authSource=admin

    # Admin User IDs (comma-separated)
    ADMINS=YOUR_ADMIN_USER_ID_1,YOUR_ADMIN_USER_ID_2

    # API and OAuth2 Configuration (for web-dashboard)
    CLIENT_ID=YOUR_DISCORD_APPLICATION_CLIENT_ID # Same as APPLICATION_ID
    CLIENT_SECRET=YOUR_DISCORD_APPLICATION_CLIENT_SECRET
    REDIRECT_URI=http://localhost/api/oauth2/callback # Or your deployed URL
    API_SESSION_SECRET=YOUR_RANDOM_SESSION_SECRET
    ```
    **Important**: Ensure that `TTS_API_KEY` in your `.env` matches the `TTS_TOKEN` mentioned in the `main` service configuration table.

2.  **Run with Docker Compose**
    ```bash
    docker-compose up -d
    ```
    This command will:
    - Pull the `lucap9056/chiwawa`, `lucap9056/chiwawa-commands`, and `lucap9056/chiwawa-dashboard` Docker images.
    - Start the `main` bot, `commands` service, `web-dashboard`, and a MongoDB instance.
    - The `commands` service will automatically deploy Discord commands on startup.
    - The web dashboard will be accessible via `http://localhost`.

---
## Configuration

Configuration is handled via environment variables. The following tables detail the variables for each service.

### `main` Service

| **Environment Variable**   | **Purpose**                                               | **Default Value**         |
| -------------------------- | --------------------------------------------------------- | ------------------------- |
| `ADMINS`                   | Comma-separated list of admin user IDs.                   | `""`                      |
| `APP_DISCORD_TOKEN`        | Discord bot token.                                        | `""`                      |
| `DEFAULT_JOIN_SUFFIX`      | Suffix for the join message.                              | `"joined the channel"`    |
| `DEFAULT_LEAVE_SUFFIX`     | Suffix for the leave message.                             | `"left the channel"`      |
| `TTS_REGION`               | Region for Microsoft TTS API.                             | `""`                      |
| `TTS_API_KEY`              | Microsoft TTS API token.                                  | `""`                      |
| `TTS_DEFAULT_LANGUAGE`     | Default language for the TTS engine.                      | `"en-US"`                 |
| `DATABASE_URI`             | MongoDB connection URI.                                   | `""`                      |
| `API_PORT`                 | Port for the backend API service.                         | `"80"`                    |
| `API_REDIRECT_URI`         | Redirect URI for OAuth2 authentication.                   | `""`                      |
| `API_SESSION_SECRET`       | Secret for API session management.                        | `""`                      |
| `APP_ID`                   | OAuth2 application client ID.                             | `""`                      |
| `APP_SECRET`               | OAuth2 application client secret.                         | `""`                      |

### `commands` Service

| **Environment Variable** | **Purpose**                  | **Default Value** |
| ------------------------ | ---------------------------- | ----------------- |
| `APP_DISCORD_TOKEN`      | Discord bot token.           | `""`              |
| `APPLICATION_ID`         | Discord application client ID. | `""`              |
| `GUILD_ID`               | Discord Server ID for testing. | `""`              |

### `web-dashboard` Service

| **Environment Variable** | **Purpose**                      | **Default Value** |
| ------------------------ | -------------------------------- | ----------------- |
| `ADMINS`                 | Comma-separated list of admin user IDs. | `""`              |
| `DATABASE_URI`           | MongoDB connection URI.          | `""`              |

---
## License

This project is licensed under the MIT License. See the [LICENSE](./main/LICENSE) file for details.