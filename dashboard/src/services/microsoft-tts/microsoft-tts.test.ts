import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchIssueToken, initializeTTS } from "./index";

const REGION = "eastus";
const API_KEY = "api-key";

describe("services/microsoft-tts", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("fetchIssueToken", () => {
        it("returns Ok with a token expiring one minute before Azure's real 10-minute validity", async () => {
            fetchMock.mockResolvedValueOnce(new Response("azure-token"));
            const now = Date.now();

            const result = await fetchIssueToken(now, REGION, API_KEY);

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toEqual({
                token: "azure-token",
                expiresAt: now + (10 * 60 - 60) * 1000,
                region: REGION,
            });
        });

        it("passes the subscription key header to the correct regional endpoint", async () => {
            fetchMock.mockResolvedValueOnce(new Response("t"));

            await fetchIssueToken(Date.now(), REGION, API_KEY);

            const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe(`https://${REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`);
            const headers = init.headers as Record<string, string>;
            expect(headers["Ocp-Apim-Subscription-Key"]).toBe(API_KEY);
        });

        it("wraps a rejected fetch's Error as-is in Err", async () => {
            fetchMock.mockRejectedValueOnce(new Error("network down"));

            const result = await fetchIssueToken(Date.now(), REGION, API_KEY);

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr().message).toBe("network down");
        });

        it("wraps a non-Error rejection with a generic message", async () => {
            fetchMock.mockRejectedValueOnce("boom");

            const result = await fetchIssueToken(Date.now(), REGION, API_KEY);

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr().message).toBe("Failed to issue TTS token.");
        });
    });

    describe("initializeTTS / getIssueToken", () => {
        it("fetches a token on first call when there is no cached token yet", async () => {
            fetchMock.mockResolvedValueOnce(new Response("t1"));
            const tts = initializeTTS(REGION, API_KEY);

            const token = await tts.getIssueToken();

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(token.token).toBe("t1");
            expect(token.region).toBe(REGION);
        });

        it("returns the cached token without re-fetching while it's still valid", async () => {
            fetchMock.mockResolvedValueOnce(new Response("t1"));
            const tts = initializeTTS(REGION, API_KEY);

            await tts.getIssueToken();
            const second = await tts.getIssueToken();

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(second.token).toBe("t1");
        });

        it("re-fetches once the cached token has expired", async () => {
            const expired = { token: "old", expiresAt: Date.now() - 1000, region: REGION };
            fetchMock.mockResolvedValueOnce(new Response("fresh"));
            const tts = initializeTTS(REGION, API_KEY, expired);

            const token = await tts.getIssueToken();

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(token.token).toBe("fresh");
        });

        it("dedupes concurrent refreshes into a single fetch when expired", async () => {
            fetchMock.mockResolvedValueOnce(new Response("only-one"));
            const tts = initializeTTS(REGION, API_KEY);

            const [a, b] = await Promise.all([tts.getIssueToken(), tts.getIssueToken()]);

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(a.token).toBe("only-one");
            expect(b.token).toBe("only-one");
        });

        // This is deliberate degrade-gracefully behavior, not a bug: TTS is a
        // non-essential feature, so a fetch failure yields a short-lived
        // (2 min) empty-token fallback instead of failing the caller. That
        // short TTL turns the client's next natural request into a retry
        // timer. Do not change this to propagate the error instead.
        it("soft-fails to a short-lived empty token instead of throwing when Azure is unreachable", async () => {
            fetchMock.mockRejectedValueOnce(new Error("azure down"));
            const before = Date.now();
            const tts = initializeTTS(REGION, API_KEY);

            const token = await tts.getIssueToken();
            const after = Date.now();

            expect(token.token).toBe("");
            expect(token.region).toBe(REGION);
            expect(token.expiresAt).toBeGreaterThanOrEqual(before + 2 * 60 * 1000);
            expect(token.expiresAt).toBeLessThanOrEqual(after + 2 * 60 * 1000);
        });

        it("does not re-fetch immediately after a soft-fail, since the fallback token isn't expired yet", async () => {
            fetchMock.mockRejectedValueOnce(new Error("azure down"));
            const tts = initializeTTS(REGION, API_KEY);

            await tts.getIssueToken();
            const second = await tts.getIssueToken();

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(second.token).toBe("");
        });
    });
});
