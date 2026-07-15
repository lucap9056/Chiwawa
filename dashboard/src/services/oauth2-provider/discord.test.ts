import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDiscordGuildMember, fakeDiscordUser } from "#/server/test/fakes";
import { newOAuth2Provider } from "./discord";

const CLIENT_ID = "client-id";
const CLIENT_SECRET = "client-secret";
const REDIRECT_URI = "https://dashboard.example.com/callback";

describe("services/oauth2-provider/discord", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("getAuthorizeUrl builds the Discord authorize URL with PKCE params", () => {
        const provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

        const url = provider.getAuthorizeUrl("state-123", "challenge-abc");

        expect(url).toContain("https://discord.com/oauth2/authorize?");
        expect(url).toContain(`client_id=${CLIENT_ID}`);
        expect(url).toContain(`redirect_uri=${encodeURIComponent(REDIRECT_URI)}`);
        expect(url).toContain("response_type=code");
        expect(url).toContain("scope=guilds+identify+guilds.members.read");
        expect(url).toContain("state=state-123");
        expect(url).toContain("code_challenge=challenge-abc");
        expect(url).toContain("code_challenge_method=S256");
    });

    describe("base", () => {
        it("returns Ok(token) and posts the code/verifier on success", async () => {
            const token = { access_token: "a", token_type: "Bearer", expires_in: 3600, refresh_token: "r", scope: "s" };
            fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(token), { status: 200 }));
            const provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

            const result = await provider.base("auth-code", "verifier-xyz");

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toEqual(token);
            const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe("https://discord.com/api/oauth2/token");
            const body = init.body as URLSearchParams;
            expect(body.get("code")).toBe("auth-code");
            expect(body.get("code_verifier")).toBe("verifier-xyz");
            expect(body.get("grant_type")).toBe("authorization_code");
        });

        it("returns Err when Discord responds non-2xx", async () => {
            fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }));
            const provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

            const result = await provider.base("bad-code", "verifier-xyz");

            expect(result.isErr()).toBe(true);
        });
    });

    describe("refresh", () => {
        it("returns Err without calling fetch when there is no refresh_token", async () => {
            const provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

            const result = await provider.refresh({
                access_token: "a",
                token_type: "Bearer",
                expires_in: 3600,
                refresh_token: "",
                scope: "s",
            });

            expect(result.isErr()).toBe(true);
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it("dedupes concurrent refreshes for the same refresh_token into a single fetch", async () => {
            let resolveFetch!: (value: Response) => void;
            fetchMock.mockReturnValueOnce(
                new Promise<Response>((resolve) => {
                    resolveFetch = resolve;
                }),
            );
            const provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
            const token = {
                access_token: "a",
                token_type: "Bearer",
                expires_in: 3600,
                refresh_token: "rt",
                scope: "s",
            };

            const call1 = provider.refresh({
                access_token: "",
                token_type: "Bearer",
                expires_in: 0,
                refresh_token: "rt",
                scope: "",
            });
            const call2 = provider.refresh({
                access_token: "",
                token_type: "Bearer",
                expires_in: 0,
                refresh_token: "rt",
                scope: "",
            });

            resolveFetch(new Response(JSON.stringify(token), { status: 200 }));
            const [result1, result2] = await Promise.all([call1, call2]);

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(result1.isOk()).toBe(true);
            expect(result2.isOk()).toBe(true);
            expect(result1.unwrap()).toEqual(token);
            expect(result2.unwrap()).toEqual(token);
        });

        it("issues a fresh fetch for a subsequent refresh after the in-flight one settles", async () => {
            const token = {
                access_token: "a",
                token_type: "Bearer",
                expires_in: 3600,
                refresh_token: "rt",
                scope: "s",
            };
            fetchMock.mockResolvedValue(new Response(JSON.stringify(token), { status: 200 }));
            const provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
            const tokenArg = {
                access_token: "",
                token_type: "Bearer" as const,
                expires_in: 0,
                refresh_token: "rt",
                scope: "",
            };

            await provider.refresh(tokenArg);
            await provider.refresh(tokenArg);

            expect(fetchMock).toHaveBeenCalledTimes(2);
        });
    });

    describe("revoke", () => {
        it("sends Basic auth and the token to revoke, Ok on success", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
            const provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

            const result = await provider.revoke("token-to-revoke");

            expect(result.isOk()).toBe(true);
            const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            const headers = init.headers as Record<string, string>;
            expect(headers.Authorization).toBe(
                `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`, "utf8").toString("base64")}`,
            );
            const body = init.body as URLSearchParams;
            expect(body.get("token")).toBe("token-to-revoke");
        });

        it("returns Err when Discord responds non-2xx", async () => {
            fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 401 }));
            const provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

            const result = await provider.revoke("bad-token");

            expect(result.isErr()).toBe(true);
        });
    });

    describe("getUser / getGuilds / getGuildMember", () => {
        it("getUser parses the Discord response on success", async () => {
            const user = fakeDiscordUser({ id: "42" });
            fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(user), { status: 200 }));
            const provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

            const result = await provider.getUser({
                access_token: "at",
                token_type: "Bearer",
                expires_in: 3600,
                refresh_token: "rt",
                scope: "s",
            });

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toEqual(user);
            const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe("https://discord.com/api/v10/users/@me");
            const headers = init.headers as Record<string, string>;
            expect(headers.Authorization).toBe("Bearer at");
        });

        it("getGuilds returns Err on a non-2xx Discord response", async () => {
            fetchMock.mockResolvedValueOnce(new Response("Forbidden", { status: 403, statusText: "Forbidden" }));
            const provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

            const result = await provider.getGuilds({
                access_token: "at",
                token_type: "Bearer",
                expires_in: 3600,
                refresh_token: "rt",
                scope: "s",
            });

            expect(result.isErr()).toBe(true);
        });

        it("getGuildMember hits the per-guild member endpoint", async () => {
            const member = fakeDiscordGuildMember();
            fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(member), { status: 200 }));
            const provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

            const result = await provider.getGuildMember(
                { access_token: "at", token_type: "Bearer", expires_in: 3600, refresh_token: "rt", scope: "s" },
                "999",
            );

            expect(result.isOk()).toBe(true);
            const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe("https://discord.com/api/v10/users/@me/guilds/999/member");
        });
    });
});
