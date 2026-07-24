import type { RedisClient, SQL } from "bun";
import { None, Ok, type Option, Some } from "resultant.js/rustify";
import { vi } from "vitest";
import type { AppConfig, SpeechNotice } from "#/models";
import type { State } from "#/services";
import type { Cache } from "#/services/cache";
import type { Database } from "#/services/database";
import type { IssueToken, TTSMessage } from "#/services/microsoft-tts";
import type {
    DiscordGuild,
    DiscordGuildMember,
    DiscordUser,
    OAuth2Provider,
    OAuth2Token,
} from "#/services/oauth2-provider";
import type { Session, Sessions } from "#/services/sessions";

// ---- Fake Redis client (services/sessions, services/cache) ----

export interface FakeRedisClient {
    store: Map<string, string>;
    sets: Map<string, Set<string>>;
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    smismember: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;
}

export const createFakeRedisClient = (): FakeRedisClient => {
    const store = new Map<string, string>();
    const sets = new Map<string, Set<string>>();

    return {
        store,
        sets,
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        set: vi.fn(async (key: string, value: string) => {
            store.set(key, value);
            return "OK";
        }),
        del: vi.fn(async (...keys: string[]) => {
            let count = 0;
            for (const key of keys) {
                if (store.delete(key)) count++;
            }
            return count;
        }),
        smismember: vi.fn(async (key: string, ...members: string[]) => {
            const set = sets.get(key) ?? new Set<string>();
            return members.map((member) => (set.has(member) ? 1 : 0));
        }),
        publish: vi.fn(async () => 0),
    };
};

export const asRedisClient = (fake: FakeRedisClient): RedisClient => fake as unknown as RedisClient;

// ---- Fake SQL tag (services/database/postgres.ts) ----

export interface FakeSqlCall {
    text: string;
    values: unknown[];
}

export interface FakeSql {
    (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
    calls: FakeSqlCall[];
    queueResponse: (rows: unknown[]) => void;
    array: <T>(value: T) => T;
    begin: <T>(fn: (tx: FakeSql) => Promise<T>) => Promise<T>;
}

export const createFakeSql = (): FakeSql => {
    const calls: FakeSqlCall[] = [];
    const responseQueue: unknown[][] = [];

    const sqlTag = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
        calls.push({ text: strings.join("?"), values });
        return responseQueue.shift() ?? [];
    }) as FakeSql;

    sqlTag.calls = calls;
    sqlTag.queueResponse = (rows: unknown[]) => {
        responseQueue.push(rows);
    };
    sqlTag.array = <T>(value: T) => value;
    sqlTag.begin = async <T>(fn: (tx: FakeSql) => Promise<T>) => fn(sqlTag);

    return sqlTag;
};

export const asSql = (fake: FakeSql): SQL => fake as unknown as SQL;

// ---- Domain value factories ----

export const fakeOAuth2Token = (overrides: Partial<OAuth2Token> = {}): OAuth2Token => ({
    access_token: "fake-access-token",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "fake-refresh-token",
    scope: "identify guilds guilds.members.read",
    ...overrides,
});

export const fakeDiscordUser = (overrides: Partial<DiscordUser> = {}): DiscordUser => ({
    id: "1",
    username: "fake-user",
    discriminator: "0",
    global_name: "Fake User",
    avatar: null,
    ...overrides,
});

export const fakeDiscordGuild = (overrides: Partial<DiscordGuild> = {}): DiscordGuild => ({
    id: "100",
    name: "Fake Guild",
    icon: null,
    splash: null,
    ...overrides,
});

export const fakeDiscordGuildMember = (overrides: Partial<DiscordGuildMember> = {}): DiscordGuildMember => ({
    roles: [],
    flags: 0 as DiscordGuildMember["flags"],
    joined_at: null,
    deaf: false,
    mute: false,
    user: fakeDiscordUser(),
    ...overrides,
});

export const fakeSession = (overrides: Partial<Session> = {}): Session => ({
    isAdmin: false,
    sessionId: "fake-session-id",
    userId: "1",
    userToken: fakeOAuth2Token(),
    expireAt: new Date(Date.now() + 3600_000),
    guildIds: [],
    ...overrides,
});

export const fakeAppConfig = (overrides: Partial<AppConfig> = {}): AppConfig => ({
    defaultJoinSuffix: "",
    defaultLeaveSuffix: "",
    defaultVoiceModel: "",
    ttsRegion: undefined,
    ttsApiKey: undefined,
    admins: [],
    ...overrides,
});

export const fakeSpeechNotice = (overrides: Partial<SpeechNotice> = {}): SpeechNotice => ({
    inheritGlobal: false,
    muted: false,
    joinMessage: undefined,
    leaveMessage: undefined,
    ...overrides,
});

// ---- Service fakes (server/* layer, assembled into a fake State) ----

export const createFakeOAuth2Provider = (): OAuth2Provider => ({
    getAuthorizeUrl: vi.fn(
        (state: string, codeChallenge: string) =>
            `https://discord.com/fake-authorize?state=${state}&challenge=${codeChallenge}`,
    ),
    base: vi.fn(async () => Ok<OAuth2Token, Error>(fakeOAuth2Token())),
    refresh: vi.fn(async () => Ok<OAuth2Token, Error>(fakeOAuth2Token())),
    revoke: vi.fn(async () => Ok<void, Error>(undefined)),
    getUser: vi.fn(async () => Ok<DiscordUser, Error>(fakeDiscordUser())),
    getGuilds: vi.fn(async () => Ok<DiscordGuild[], Error>([])),
    getGuildMember: vi.fn(async () => Ok<DiscordGuildMember, Error>(fakeDiscordGuildMember())),
});

export const createFakeDatabase = (): Database => ({
    getAppConfig: vi.fn(async () => Ok<Option<AppConfig>, Error>(None<AppConfig>())),
    setAppConfig: vi.fn(async () => Ok<void, Error>(undefined)),
    getUserSpeechNotice: vi.fn(async () => Ok<SpeechNotice, Error>(fakeSpeechNotice())),
    setUserSpeechNotice: vi.fn(async () => Ok<void, Error>(undefined)),
});

export const createFakeCache = (): Cache => ({
    intersectGuildIds: vi.fn(async (guildIds: string[]) => Ok<string[], Error>(guildIds)),
    saveConfig: vi.fn(async () => Ok<number, Error>(0)),
});

export const createFakeSessions = (): Sessions => ({
    create: vi.fn(async (isAdmin: boolean, user: DiscordUser, oauthToken: OAuth2Token) =>
        Ok<Session, Error>(fakeSession({ isAdmin, userId: user.id, userToken: oauthToken })),
    ),
    get: vi.fn(async () => Ok<Option<Session>, Error>(None<Session>())),
    del: vi.fn(async () => Ok<void, Error>(undefined)),
    update: vi.fn(async () => Ok<void, Error>(undefined)),
});

export const createFakeTTS = (): TTSMessage => ({
    getCredentials: vi.fn(() => ({ region: "fake-region", apiKey: "fake-api-key" })),
    getIssueToken: vi.fn(
        async (): Promise<IssueToken> => ({
            token: "fake-tts-token",
            expiresAt: Date.now() + 600_000,
            region: "fake-region",
        }),
    ),
    getLanguages: vi.fn(async () => ({})),
});

export const createFakeState = (overrides: Partial<State> = {}): State => ({
    defaultAdmins: [],
    oauth2Provider: createFakeOAuth2Provider(),
    db: createFakeDatabase(),
    cache: createFakeCache(),
    sessions: createFakeSessions(),
    tts: createFakeTTS(),
    updateTTS: vi.fn(async () => Ok<void, Error>(undefined)),
    dispose: vi.fn(async () => {}),
    ...overrides,
});

export { Some, None, Ok };
