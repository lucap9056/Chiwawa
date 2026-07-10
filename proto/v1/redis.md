# Redis Schema (v1)

|Type|Key|Value|Writer|Readers|
|-|-|-|-|-|
|SET|chiwawa:v1:guild_ids|string[]|main|dashboard|
|PUB|chiwawa:v1:config:updated|payload: AppConfig|dashboard|main|
|PUB|chiwawa:v1:guilds:updated|payload: { type, guildId }|main|dashboard|
|GET/SET|chiwawa:v1:speech:{userId}:{guildId}:{join\|leave}|bytes: cached Opus speech, empty = muted|main|main|

`chiwawa:v1:speech:*` caches the resolved join/leave speech per user per guild, keyed by
identity rather than content — a Postgres lookup + TTS synthesis away. There is no
invalidation channel for it: whichever service writes a user's message template/mute
setting must `DEL` the matching `chiwawa:v1:speech:{userId}:{guildId}:join` and
`...:leave` keys (both, or every guild's keys if the change was to the user's global
notice) as part of that write.
