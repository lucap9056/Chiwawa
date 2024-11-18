# Chiwawa - Discord Voice Notification Bot

Chiwawa is a Discord bot that sends **voice notifications** when users **join** or **leave** a voice channel, using Microsoft Text-to-Speech (TTS) technology. The bot allows for easy customization of notifications and TTS settings, with support for both global (admin) and user-specific configurations.

----
## Key Features

- **Voice Notifications**: Automatically plays a voice message when a user joins or leaves a voice channel.
- **Customizable Messages**:
	- Admins can set default notification suffixes for join and leave events.
	- Users can customize their own message format (prefix, username, suffix) or mute the notifications.
- **Microsoft TTS Integration**: Uses Microsoft TTS for the voice notification, which can be configured with different languages and regions.
- **Configurable Through File & Environment Variables**: Settings can be controlled via a configuration file (`config.json`) or environment variables, with precedence given to environment variables.
- **Admin Controls**: Admins have the ability to modify bot settings, including default TTS language and notification messages.
- **User Personalization**: Users can personalize how notifications sound when they join or leave a voice channel.

----
## Setup

### Prerequisites

1. **Node.js** (v14 or later).
2. **Discord Bot Token**: Obtain it from the [Discord Developer Portal](https://discord.com/developers/applications) .
3. **Microsoft TTS Token**: Set up a TTS resource on [Microsoft Azure](https://azure.microsoft.com/)  to enable text-to-speech capabilities.
4. **MongoDB** (version 3.6 or later): A MongoDB database is required for storing user data, preferences, and other application configurations. Ensure that MongoDB version 3.6 or higher is installed and running.
5. **Web Server**: Since this project is backend/frontend separated, you need to set up your own web server for integration.

----
## Installation

1. Clone the repository:
```bash
git clone https://github.com/lucap9056/Chiwawa.git
cd Chiwawa
```
2. Install dependencies:
```bash
npm install
```
3. Build the project: Since the project is written in TypeScript, you need to compile it before running the bot:
```bash
npm run build
```
4. After compiling the TypeScript files, the bot is ready to run.
5. Navigate to the web dashboard directory:
```bash
cd web-dashboard
```
6. Install dependencies for the web dashboard:
```bash
npm install
```
7. Build the web dashboard:
```bash
npm run build
```
Web Directory Output:
After building the web dashboard, the output files will be located in the `\web-dashboard\dist\ ` directory. These files can be deployed to a web server or used with the bot's API server for serving the management interface.

### Using a Web Server (Nginx, Caddy, Apache) to Serve Both API and Web Dashboard

1. Web Dashboard Configuration
- The web dashboard's build files are located in the \web-dashboard\dist\ directory after building with npm run build. These files should be served by the web server.
2. API Server Configuration
- The API server will handle requests to endpoints like /api. You'll need to set up a reverse proxy to forward these requests from the web server to the API server.

----
## Configuration
Configuration File (config.json)

If a config.json file does not exist, it will be created automatically. Here’s an example of a config.json file:

```json
{
  "adminIds": ["admin1_id", "admin2_id"],
  "discord": {
    "token": "YOUR_DISCORD_BOT_TOKEN",
    "tts": {
      "region": "YOUR_TTS_REGION",
      "token": "YOUR_TTS_TOKEN",
      "defaultLanguage": "en-US"
    },
    "defaultMessages": {
      "joinSuffix": "joined the channel",
      "leaveSuffix": "left the channel"
    }
  },
  "database": {
    "uri": "YOUR_MONGODB_URI"
  },
  "api": {
    "port": "80",
    "redirectUri": "YOUR_REDIRECT_URI",
    "sessionSecret": "YOUR_SESSION_SECRET",
    "oauth2": {
      "clientId": "YOUR_OAUTH2_CLIENT_ID",
      "clientSecret": "YOUR_OAUTH2_CLIENT_SECRET"
    }
  }
}
```
#### Environment Variables

Alternatively, you can set configuration through environment variables, which will override the settings in the config.json file.

Here’s a table that explains the environment variables used in the `LoadConfig` method, their purpose, and their default values:

|**Environment Variable** |**Purpose** |**Default Value** |
|-|-|-|
|`ADMINS` |List of admin user IDs (comma-separated). |`""` (empty string if not provided) |
|`DISCORD_TOKEN` |Discord bot token to authenticate with Discord API. |`""` (empty string if not provided) |
|`JOIN_SUFFIX` |Suffix for the join message (e.g., "joined the channel"). |`"joined the channel"` |
|`LEAVE_SUFFIX` |Suffix for the leave message (e.g., "left the channel"). |`"left the channel"` |
|`TTS_REGION` |Region for Microsoft TTS API (e.g., "eastus"). |`""` (empty string if not provided) |
|`TTS_TOKEN` |Microsoft TTS API token for text-to-speech. |`""` (empty string if not provided) |
|`TTS_DEFAULT_LANGUAGE` |Default language for the TTS engine (e.g., "en-US"). |`"en-US"` |
|`DATABASE_URI` |URI for the database connection. |`""` (empty string if not provided) |
|`API_PORT` |Port for the API service. |`"80"` |
|`API_REDIRECT_URI` |Redirect URI for OAuth2 authentication. |`""` (empty string if not provided) |
|`API_SESSION_SECRET` |Secret for API session management. |`""` (empty string if not provided) |
|`APP_ID` |OAuth2 application client ID. |`""` (empty string if not provided) |
|`APP_SECRET` |OAuth2 application client secret. |`""` (empty string if not provided) |
### Explanation:

- **ADMINS**: A comma-separated list of user IDs that have admin privileges to configure and manage the bot.
- **DISCORD_TOKEN**: The token that authenticates the bot with Discord. It’s required for the bot to connect to Discord servers.
- **JOIN_SUFFIX / LEAVE_SUFFIX**: Text that is added after the user’s name when they join or leave a voice channel.
- **TTS_REGION / TTS_TOKEN**: These are used to authenticate and configure the Microsoft TTS service. The region and token are needed to access the TTS API.
- **TTS_DEFAULT_LANGUAGE**: The default language for the TTS engine (e.g., `en-US` for English or `es-ES` for Spanish).
- **DATABASE_URI**: If used, this variable holds the URI for connecting to a database.
- **API_PORT**: Specifies the port on which the API service will run.
- **API_REDIRECT_URI**: Redirect URI for OAuth2 callbacks, required if OAuth2 is enabled.
- **API_SESSION_SECRET**: Used to secure API sessions.
- **APP_ID / APP_SECRET**: The client ID and secret used for OAuth2 authentication, required for integration with Discord.

----
## Running the Bot

After configuring the bot, compile the TypeScript files and start the bot:

1. Build the project:
```bash
npm run build
```
2. Start the bot:
```bash
npm start
```
This will run the bot, and it will send voice notifications when users join or leave voice channels in your Discord server.

---
## Voice Notification Behavior

### Default Notification Format

When a user joins or leaves a voice channel, the bot will play a voice notification with the following format:
- **For Joining**:- `[User Nickname] joined the channel`
- **For Leaving**:- `[User Nickname] left the channel`

### Customizing Notifications

#### Admin Customization

Admins can configure default suffixes for join and leave messages. For example:
- **Join Suffix**: "joined the channel"
- **Leave Suffix**: "left the channel"

This can be modified through the `config.json` file or environment variables.
#### User Customization

Users can personalize their own notification format by setting:
- **Prefix**: Text that will appear before the user’s name.
- **User Name**: The user’s nickname in Discord.
- **Suffix**: Text that will appear after the user’s name (join or leave notification).

Users can adjust their settings through the web interface (if integrated), depending on the configuration.

----
## Configuration Priority

The bot will load configurations based on the following priority order:
1. **Environment Variables** (Highest priority)
2. **Configuration File (`config.json`)**
3. **Default Values** (If no config is provided)

---
Here’s a table summarizing which configurations need to be set to enable specific features in the **Chiwawa** Discord bot, based on the settings in the configuration file.

|**Feature** |**Config Settings** |**Required Config Items to Enable** |
|-|-|-|
|**Voice Notifications (TTS)** |Determines if TTS voice notifications are enabled. | `config.discord.tts.region`, `config.discord.tts.token` should be provided. |
|**User Customization** |Determines if users can customize their notifications. | `config.database.uri` should be provided. |
|**API Server** |Determines if the API server is running and accessible. | `config.api.port`, `config.api.redirectUri`, `config.api.sessionSecret` should be provided. |
|**Discord OAuth2 Integration** |Allows OAuth2 login via Discord for user authentication. | `config.api.oauth2.clientId`, `config.api.oauth2.clientSecret` should be provided. |
### Explanation of Config Settings:

1. **Voice Notifications (TTS)**:
	- **`config.discord.tts.region`** and **`config.discord.tts.token`** must be provided to enable the Microsoft Text-to-Speech service.
2. **User Customization**:
	- **`config.database.uri`** should point to a valid database connection to store user preferences.
3. **API Server**:
	- **`config.api.port`**, **`config.api.redirectUri`**, and **`config.api.sessionSecret`** need to be provided for the API to function properly.
4. **Discord OAuth2 Integration**:
	- **`config.api.oauth2.clientId`** and **`config.api.oauth2.clientSecret`** must be provided to integrate with Discord's OAuth2 system.

Each of these configurations plays a critical role in enabling the corresponding functionality within the **Chiwawa** bot, providing the flexibility to customize or disable certain features depending on your needs.

---
## Temporary Access via Bot Message for Admins (No OAuth2.0)
When the API is enabled but OAuth2.0 is not enabled, the system will work as follows:
- **Trigger Mechanism**: A Discord user (limited to bot administrators) can send a message to the bot with a special mention (e.g., `@botname`) to trigger the bot to generate a temporary access code. This code will be used to generate a unique link that allows the admin to access a management page.
- **Code Generation and Redirection**:
	- When an admin sends the message with a mention to the bot, the bot will generate a **temporary code**.
	- The bot will reply with the generated link (containing the code) that can be used to access the management page.
- **Code Binding to Requestor**:
	- The code will be associated with the admin who requested it, ensuring only the admin can use the link.
	- The bot will store this code and the requesting admin’s details for later verification or access.
- **Private Message (Recommended)**:
	- It's recommended to request the code via **Private Message (PM)** to ensure that the generated code is shared only with the requesting admin. This prevents unauthorized access to the management page.

### Example Scenario:

1. Admin sends: `@botname`
2. Bot responds with the link: `https://your-redirect-uri.com?code=<temporary code>`
3. Admin clicks on the link to access the management page.

**Note**: This approach should be used only when OAuth2.0 authentication is not available and ensures that the temporary code functionality is used securely for admin-only access to the management interface.
