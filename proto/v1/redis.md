# Redis Schema (v1)

|Type|Key|Value|Writer|Readers|
|-|-|-|-|-|
|SET|chiwawa:v1:guild_ids|string[]|main|dashboard|
|PUB|chiwawa:v1:config:updated|payload: AppConfig|dashboard|main|
|PUB|chiwawa:v1:guilds:updated|payload: { type, guildId }|main|dashboard|
