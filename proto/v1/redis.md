# Redis Schema (v1)

|Type|Key|Value|Writer|Readers|
|-|-|-|-|-|
|SET|chiwawa:v1:guild_ids|string[]|main|dashboard|
|PUB|chiwawa:v1:config:updated|payload: AppConfig|dashboard|main|
|PUB|chiwawa:v1:guilds:updated|payload: { type, guildId }|main|dashboard|
|GET/SET|chiwawa:v1:speech:{userId}:{guildId}:{join\|leave}|bytes: cached Opus speech, empty = muted|main|main|

`chiwawa:v1:speech:*` caches the resolved join/leave speech per user per guild, keyed by
identity rather than content — a Postgres lookup + TTS synthesis away. Every entry is
guild-scoped: a member's nickname (and therefore the rendered speech) can differ per guild
even when the user's message template/mute setting is the same everywhere, so there is no
shared cross-guild tier.

There is still no invalidation channel: whichever service writes a user's message
template/mute setting must `DEL` the matching `chiwawa:v1:speech:{userId}:{guildId}:join`/
`...:leave` pair as part of that write. A change to the user's global (non-guild-specific)
notice must `DEL` the pair for every guild the user is in, since any of them may be
inheriting that notice.
